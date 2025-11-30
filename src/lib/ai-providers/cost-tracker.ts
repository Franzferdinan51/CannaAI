/**
 * Cost Tracker and Budget Management
 * Monitors and tracks AI provider costs with budget controls
 */

export interface CostRecord {
  provider: string;
  model: string;
  timestamp: Date;
  requestId: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  cost: number;
  requestType: 'text' | 'vision' | 'analysis' | 'chat';
  metadata?: Record<string, any>;
}

export interface Budget {
  daily: number;
  weekly: number;
  monthly: number;
  annual: number;
}

export interface BudgetAlert {
  threshold: number; // Percentage (e.g., 80 for 80%)
  action: 'warn' | 'stop';
  recipients?: string[];
}

export interface BudgetConfig {
  budgets: Budget;
  alerts: BudgetAlert[];
  currency: string;
  enabled: boolean;
}

export interface CostSummary {
  total: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byType: Record<string, number>;
  period: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export class CostTracker {
  private records: CostRecord[] = [];
  private config: BudgetConfig;
  private alerts: BudgetAlert[] = [];

  constructor(config: BudgetConfig) {
    this.config = config;
  }

  /**
   * Record a cost
   */
  record(cost: Omit<CostRecord, 'timestamp'>): void {
    const record: CostRecord = {
      ...cost,
      timestamp: new Date()
    };

    this.records.push(record);

    // Check budget alerts
    this.checkBudgetAlerts();

    // Keep only last 90 days of records to prevent memory issues
    this.cleanup();
  }

  /**
   * Get cost summary for a time period
   */
  getSummary(period?: { start: Date; end: Date }): CostSummary {
    const now = Date.now();
    let filteredRecords = this.records;

    if (period) {
      filteredRecords = this.records.filter(
        r => r.timestamp >= period.start && r.timestamp <= period.end
      );
    } else {
      // Default: last 30 days
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      filteredRecords = this.records.filter(r => r.timestamp >= thirtyDaysAgo);
    }

    const total = filteredRecords.reduce((sum, r) => sum + r.cost, 0);

    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const record of filteredRecords) {
      byProvider[record.provider] = (byProvider[record.provider] || 0) + record.cost;
      byModel[record.model] = (byModel[record.model] || 0) + record.cost;
      byType[record.requestType] = (byType[record.requestType] || 0) + record.cost;
    }

    const period = {
      daily: this.getPeriodCost(1),
      weekly: this.getPeriodCost(7),
      monthly: this.getPeriodCost(30)
    };

    return {
      total,
      byProvider,
      byModel,
      byType,
      period
    };
  }

  /**
   * Get cost for specific provider
   */
  getProviderCost(provider: string, period?: { start: Date; end: Date }): number {
    const records = this.filterByPeriod(period);
    return records
      .filter(r => r.provider === provider)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get most expensive providers
   */
  getTopProviders(limit: number = 10): Array<{ provider: string; cost: number; percentage: number }> {
    const summary = this.getSummary();
    const total = summary.total;

    return Object.entries(summary.byProvider)
      .map(([provider, cost]) => ({
        provider,
        cost,
        percentage: total > 0 ? (cost / total) * 100 : 0
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  /**
   * Get cost trends over time
   */
  getCostTrends(days: number = 30): Array<{ date: string; cost: number; requests: number }> {
    const trends: Record<string, { cost: number; requests: number }> = {};
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trends[dateStr] = { cost: 0, requests: 0 };
    }

    for (const record of this.records) {
      if (record.timestamp >= startDate) {
        const dateStr = record.timestamp.toISOString().split('T')[0];
        if (trends[dateStr]) {
          trends[dateStr].cost += record.cost;
          trends[dateStr].requests += 1;
        }
      }
    }

    return Object.entries(trends).map(([date, data]) => ({
      date,
      ...data
    }));
  }

  /**
   * Estimate cost for upcoming requests
   */
  estimateCost(requests: Array<{
    provider: string;
    tokensIn: number;
    tokensOut: number;
    type: CostRecord['requestType'];
  }>): number {
    return requests.reduce((sum, req) => {
      // This would need to use actual provider pricing
      const pricePerToken = this.getPricePerToken(req.provider);
      return sum + (req.tokensIn + req.tokensOut) * pricePerToken;
    }, 0);
  }

  /**
   * Check if budget would be exceeded
   */
  wouldExceedBudget(additionalCost: number, period: 'daily' | 'weekly' | 'monthly' | 'annual' = 'monthly'): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const currentCost = this.getPeriodCost(this.getDaysForPeriod(period));
    const budget = this.config.budgets[period];
    const projectedCost = currentCost + additionalCost;

    return projectedCost > budget;
  }

  /**
   * Check budget alerts
   */
  private checkBudgetAlerts(): void {
    if (!this.config.enabled) {
      return;
    }

    for (const alert of this.config.alerts) {
      const dailyCost = this.getPeriodCost(1);
      const weeklyCost = this.getPeriodCost(7);
      const monthlyCost = this.getPeriodCost(30);
      const annualCost = this.getPeriodCost(365);

      const alerts: Array<{ period: string; current: number; budget: number; percentage: number }> = [];

      if (dailyCost > (this.config.budgets.daily * alert.threshold) / 100) {
        alerts.push({
          period: 'daily',
          current: dailyCost,
          budget: this.config.budgets.daily,
          percentage: (dailyCost / this.config.budgets.daily) * 100
        });
      }

      if (weeklyCost > (this.config.budgets.weekly * alert.threshold) / 100) {
        alerts.push({
          period: 'weekly',
          current: weeklyCost,
          budget: this.config.budgets.weekly,
          percentage: (weeklyCost / this.config.budgets.weekly) * 100
        });
      }

      if (monthlyCost > (this.config.budgets.monthly * alert.threshold) / 100) {
        alerts.push({
          period: 'monthly',
          current: monthlyCost,
          budget: this.config.budgets.monthly,
          percentage: (monthlyCost / this.config.budgets.monthly) * 100
        });
      }

      if (annualCost > (this.config.budgets.annual * alert.threshold) / 100) {
        alerts.push({
          period: 'annual',
          current: annualCost,
          budget: this.config.budgets.annual,
          percentage: (annualCost / this.config.budgets.annual) * 100
        });
      }

      if (alerts.length > 0) {
        console.warn('🚨 Budget alert:', alerts);
        // In a real implementation, you would send notifications here
      }
    }
  }

  private getPeriodCost(days: number): number {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    return this.records
      .filter(r => r.timestamp >= startDate && r.timestamp <= endDate)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  private getDaysForPeriod(period: string): number {
    switch (period) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'annual': return 365;
      default: return 30;
    }
  }

  private filterByPeriod(period?: { start: Date; end: Date }): CostRecord[] {
    if (!period) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return this.records.filter(r => r.timestamp >= thirtyDaysAgo);
    }
    return this.records.filter(
      r => r.timestamp >= period.start && r.timestamp <= period.end
    );
  }

  private getPricePerToken(provider: string): number {
    // This is a simplified implementation
    // In reality, you would use the actual provider pricing
    const prices: Record<string, number> = {
      openrouter: 0.0002,
      gemini: 0.00015,
      groq: 0.0001,
      together: 0.00012,
      claude: 0.001,
      perplexity: 0.0004,
      'lm-studio': 0 // Free
    };

    return prices[provider] || 0.0002;
  }

  private cleanup(): void {
    // Keep only last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    this.records = this.records.filter(r => r.timestamp >= ninetyDaysAgo);
  }

  /**
   * Export cost data
   */
  export(period?: { start: Date; end: Date }): CostRecord[] {
    return this.filterByPeriod(period);
  }

  /**
   * Update budget configuration
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): {
    daily: { current: number; budget: number; percentage: number };
    weekly: { current: number; budget: number; percentage: number };
    monthly: { current: number; budget: number; percentage: number };
    annual: { current: number; budget: number; percentage: number };
  } {
    const daily = this.getPeriodCost(1);
    const weekly = this.getPeriodCost(7);
    const monthly = this.getPeriodCost(30);
    const annual = this.getPeriodCost(365);

    return {
      daily: {
        current: daily,
        budget: this.config.budgets.daily,
        percentage: (daily / this.config.budgets.daily) * 100
      },
      weekly: {
        current: weekly,
        budget: this.config.budgets.weekly,
        percentage: (weekly / this.config.budgets.weekly) * 100
      },
      monthly: {
        current: monthly,
        budget: this.config.budgets.monthly,
        percentage: (monthly / this.config.budgets.monthly) * 100
      },
      annual: {
        current: annual,
        budget: this.config.budgets.annual,
        percentage: (annual / this.config.budgets.annual) * 100
      }
    };
  }
}

// Global instance
let costTracker: CostTracker | null = null;

export function getCostTracker(config?: Partial<BudgetConfig>): CostTracker {
  if (!costTracker) {
    costTracker = new CostTracker({
      budgets: {
        daily: 10,
        weekly: 50,
        monthly: 200,
        annual: 2000
      },
      alerts: [
        { threshold: 80, action: 'warn' },
        { threshold: 95, action: 'stop' }
      ],
      currency: 'USD',
      enabled: true,
      ...config
    });
  }
  return costTracker;
}

export function shutdownCostTracker(): void {
  costTracker = null;
}
