import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Mock cost data
let costData = {
  expenses: [
    { id: 1, category: 'Nutrients', description: 'General Hydroponics Flora Series', amount: 45, date: '2024-05-01', type: 'recurring' },
    { id: 2, category: 'Equipment', description: 'LED Grow Light 1000W', amount: 299, date: '2024-03-20', type: 'one-time' },
    { id: 3, category: 'Utilities', description: 'Electricity Bill', amount: 120, date: '2024-05-15', type: 'recurring' }
  ],
  revenue: [
    { id: 1, strain: 'Blue Dream', weight: 125, pricePerGram: 12, total: 1500, date: '2024-04-20', quality: 'A' },
    { id: 2, strain: 'OG Kush', weight: 110, pricePerGram: 15, total: 1650, date: '2024-03-25', quality: 'A+' }
  ]
};

export async function GET() {
  try {
    const totalExpenses = costData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalRevenue = costData.revenue.reduce((sum, revenue) => sum + revenue.total, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const totalWeight = costData.revenue.reduce((sum, revenue) => sum + revenue.weight, 0);
    const costPerGram = totalWeight > 0 ? totalExpenses / totalWeight : 0;

    return NextResponse.json({
      success: true,
      data: costData,
      statistics: {
        totalExpenses,
        totalRevenue,
        netProfit,
        profitMargin,
        costPerGram,
        totalWeight
      }
    });
  } catch (error) {
    console.error('Get cost data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, category, description, amount, date, strain, weight, pricePerGram } = body;

    if (type === 'expense') {
      if (!category || !description || !amount || !date) {
        return NextResponse.json(
          { error: 'Missing required fields for expense' },
          { status: 400 }
        );
      }

      const newExpense = {
        id: Date.now(),
        category,
        description,
        amount,
        date,
        type: body.expenseType || 'one-time'
      };

      costData.expenses.push(newExpense);

      return NextResponse.json({
        success: true,
        expense: newExpense,
        message: 'Expense added successfully'
      });

    } else if (type === 'revenue') {
      if (!strain || !weight || !pricePerGram || !date) {
        return NextResponse.json(
          { error: 'Missing required fields for revenue' },
          { status: 400 }
        );
      }

      const total = weight * pricePerGram;
      const newRevenue = {
        id: Date.now(),
        strain,
        weight,
        pricePerGram,
        total,
        date,
        quality: body.quality || 'A'
      };

      costData.revenue.push(newRevenue);

      return NextResponse.json({
        success: true,
        revenue: newRevenue,
        message: 'Revenue recorded successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be expense or revenue' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Add cost data error:', error);
    return NextResponse.json(
      { error: 'Failed to add cost data' },
      { status: 500 }
    );
  }
}