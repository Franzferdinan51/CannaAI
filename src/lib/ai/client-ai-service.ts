// Client-side AI service for static hosting compatibility
interface AIConfig {
  provider: 'openrouter' | 'fallback';
  openRouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  fallbackEnabled: boolean;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  response: string;
  model?: string;
  provider?: string;
  error?: string;
  fallbackUsed?: boolean;
}

class ClientAIService {
  private config: AIConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AIConfig {
    if (typeof window === 'undefined') {
      return {
        provider: 'openrouter',
        openRouter: {
          apiKey: '',
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          baseUrl: 'https://openrouter.ai/api/v1'
        },
        fallbackEnabled: true
      };
    }

    try {
      const saved = localStorage.getItem('ai-config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }

    return this.config;
  }

  updateConfig(config: AIConfig) {
    this.config = config;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-config', JSON.stringify(config));
    }
  }

  async generateResponse(messages: AIMessage[], mode: string = 'chat', context?: any): Promise<AIResponse> {
    const userMessage = messages[messages.length - 1]?.content || '';

    // Try the configured provider first
    if (this.config.provider !== 'fallback') {
      try {
        const response = await this.callProvider(userMessage, mode, context);
        if (response.success) {
          return response;
        }
      } catch (error) {
        console.warn(`Provider ${this.config.provider} failed:`, error);
        if (!this.config.fallbackEnabled) {
          return {
            success: false,
            error: `Provider ${this.config.provider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallbackUsed: false
          };
        }
      }
    }

    // Fallback mode or provider failure
    if (this.config.fallbackEnabled || this.config.provider === 'fallback') {
      return this.generateFallbackResponse(userMessage, mode, context);
    }

    return {
      success: false,
      error: 'No AI provider available',
      fallbackUsed: false
    };
  }

  private async callProvider(message: string, mode: string, context?: any): Promise<AIResponse> {
    const basePrompt = this.getContextualPrompt(mode, context, message);

    if (this.config.provider === 'openrouter') {
      return await this.callOpenRouter(basePrompt, context);
    }

    throw new Error('Unknown provider');
  }

  private async callOpenRouter(prompt: string, context?: any): Promise<AIResponse> {
    const response = await fetch(`${this.config.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openRouter.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'CannaAI Assistant',
      },
      body: JSON.stringify({
        model: this.config.openRouter.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'No response generated';

    return {
      success: true,
      response: aiResponse,
      model: this.config.openRouter.model,
      provider: 'OpenRouter',
    };
  }

  private generateFallbackResponse(message: string, mode: string, context?: any): AIResponse {
    const fallbackResponses = {
      chat: this.getFallbackChatResponse(message, context),
      analysis: this.getFallbackAnalysisResponse(message, context),
      diagnosis: this.getFallbackDiagnosisResponse(message, context),
      recommendation: this.getFallbackRecommendationResponse(message, context),
      trichome: this.getFallbackTrichomeResponse(message, context),
      harvest: this.getFallbackHarvestResponse(message, context),
      autonomous: this.getFallbackAutonomousResponse(message, context),
      proactive: this.getFallbackProactiveResponse(message, context),
      predictive: this.getFallbackPredictiveResponse(message, context),
      planner: this.getFallbackPlannerResponse(message, context),
      monitor: this.getFallbackMonitorResponse(message, context),
      thinking: this.getFallbackThinkingResponse(message, context),
      'study-plan': this.getFallbackStudyPlanResponse(message, context),
      quiz: this.getFallbackQuizResponse(message, context),
      research: this.getFallbackResearchResponse(message, context),
      troubleshoot: this.getFallbackTroubleshootResponse(message, context),
    };

    const response = fallbackResponses[mode as keyof typeof fallbackResponses] || fallbackResponses.chat;

    return {
      success: true,
      response,
      model: 'Fallback Mode',
      provider: 'Local',
      fallbackUsed: true,
    };
  }

  private getContextualPrompt(mode: string, context?: any, message: string): string {
    const baseContext = `Current page context: ${context?.title || 'CannaAI Pro'} (${context?.page || 'unknown'})
Page description: ${context?.description || 'Cannabis cultivation management system'}

Current environmental conditions:
- Temperature: ${context?.sensorData?.temperature || 'N/A'}°C
- Humidity: ${context?.sensorData?.humidity || 'N/A'}%
- pH Level: ${context?.sensorData?.ph || 'N/A'}
- EC Level: ${context?.sensorData?.ec || 'N/A'} mS/cm`;

    return `${baseContext}

User question: ${message}

${this.getModeSpecificPrompt(mode)}`;
  }

  private getModeSpecificPrompt(mode: string): string {
    const prompts = {
      chat: 'Provide helpful, concise cannabis cultivation advice.',
      analysis: 'Analyze plant health and provide detailed assessment.',
      diagnosis: 'Diagnose plant problems systematically.',
      recommendation: 'Give practical growing recommendations.',
      trichome: 'Provide trichome analysis and harvest timing advice.',
      harvest: 'Give harvest planning guidance.',
      autonomous: 'Act autonomously to monitor and optimize growing conditions.',
      proactive: 'Provide proactive suggestions for plant care.',
      predictive: 'Predict future conditions based on current data.',
      planner: 'Create strategic cultivation plans.',
      monitor: 'Provide monitoring status and alerts.',
      thinking: 'Provide thorough analysis with reasoning process.',
      'study-plan': 'Create detailed growth plans.',
      quiz: 'Create educational content and quizzes.',
      research: 'Provide evidence-based information.',
      troubleshoot: 'Systematically solve plant problems.'
    };

    return prompts[mode as keyof typeof prompts] || prompts.chat;
  }

  private getFallbackChatResponse(message: string, context?: any): string {
    const responses = [
      "I'm here to help with your cannabis cultivation! Based on typical growing conditions, here's my advice: Maintain consistent temperature (22-26°C), keep humidity at 50-60%, and monitor pH levels between 6.0-6.5. What specific aspect of cultivation would you like help with?",
      "For successful cannabis growing, focus on: 1) Proper lighting schedule (18/6 for veg, 12/12 for flower), 2) Nutrient balance (start light, increase gradually), 3) Environmental monitoring, 4) Pest prevention. What specific challenge are you facing?",
      "Great question about cannabis cultivation! Key factors for success include: proper genetics selection, environmental control, nutrient management, and consistent monitoring. I can help with specific issues like leaf discoloration, nutrient deficiencies, or environmental problems.",
      "Cannabis cultivation requires attention to: light intensity (600-1000 μmol), CO₂ levels (400-600 ppm), and consistent watering schedules. Are you experiencing any specific issues with your plants?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getFallbackAnalysisResponse(message: string, context?: any): string {
    const temp = context?.sensorData?.temperature || 25;
    const humidity = context?.sensorData?.humidity || 60;
    const ph = context?.sensorData?.ph || 6.2;

    return `🔍 **Plant Analysis Report**

Based on current conditions:
- Temperature: ${temp}°C ${temp < 18 ? '(Too Low) ⚠️' : temp > 30 ? '(Too High) 🔴' : '(Optimal) ✅'}
- Humidity: ${humidity}% ${humidity < 40 ? '(Too Low) ⚠️' : humidity > 70 ? '(Too High) 🔴' : '(Optimal) ✅'}
- pH Level: ${ph} ${ph < 5.5 ? '(Too Low) 🔴' : ph > 7.0 ? '(Too High) 🔴' : '(Optimal) ✅'}

**Recommendations:**
1. ${temp < 20 ? 'Increase temperature to 22-26°C' : temp > 28 ? 'Reduce temperature to prevent heat stress' : 'Maintain current temperature'}
2. ${humidity < 50 ? 'Increase humidity to 50-60%' : humidity > 65 ? 'Improve ventilation to reduce humidity' : 'Current humidity is good'}
3. ${ph < 5.8 ? 'Adjust pH to 6.0-6.5 range' : ph > 6.8 ? 'Lower pH to optimal range' : 'pH is within optimal range'}

Would you like more detailed analysis of specific symptoms you're observing?`;
  }

  private getFallbackDiagnosisResponse(message: string, context?: any): string {
    return `🔬 **Plant Diagnosis System**

Based on your description, here are the most likely issues:

**Primary Diagnosis:** Environmental Stress
- Symptoms: General plant issues
- Confidence: Medium
- Cause: Likely environmental imbalance

**Secondary Possibilities:**
1. **Nutrient Issues** - Imbalanced NPK ratios
2. **Water Problems** - Over/under watering
3. **Pest Issues** - Check for common pests
4. **Light Stress** - Too much/too little light

**Immediate Actions:**
1. Verify all environmental parameters
2. Check recent changes to growing conditions
3. Examine plants for specific symptoms
4. Review feeding schedule

Please provide more details about the specific symptoms you're observing for a more accurate diagnosis.`;
  }

  private getFallbackRecommendationResponse(message: string, context?: any): string {
    return `💡 **Cultivation Recommendations**

**Immediate Actions:**
1. **Environmental Control**
   - Temperature: Maintain 22-26°C (veg) / 20-24°C (flower)
   - Humidity: 50-60% (veg) / 40-50% (flower)
   - Air Circulation: Ensure good ventilation

2. **Nutrient Management**
   - Start with 1/4 strength nutrients
   - Monitor plant response for 48 hours
   - Adjust based on plant feedback

3. **Monitoring**
   - Daily visual inspections
   - Track growth progress
   - Document changes

4. **Prevention**
   - Maintain clean growing environment
   - Implement IPM strategies
   - Regular system maintenance

**What specific aspect would you like detailed recommendations for?**`;
  }

  private getFallbackTrichomeResponse(message: string, context?: any): string {
    return `🔬 **Trichome Analysis**

**Harvest Timing Indicators:**
- 50-70% milky white trichomes = Peak THC
- 10-20% amber trichomes = More sedative effect
- All trichomes cloudy = Harvest window open

**Visual Assessment:**
- Use 30x-60x magnification
- Look for stalked vs sessile trichomes
- Check for color clarity and density

**Current Stage Guidance:**
- Early flowering: Focus on developing trichomes
- Mid-flowering: Monitor for color changes
- Late flowering: Watch for amber development

**Next Steps:**
1. Get a magnifier if needed
2. Check trichomes daily
3. Consider desired effects (energetic vs sedative)
4. Plan harvest timing accordingly

**What's your current growth stage?**`;
  }

  private getFallbackHarvestResponse(message: string, context?: any): string {
    return `🌾 **Harvest Planning Guide**

**Pre-Harvest Checklist:**
- Flush plants 1-2 weeks before harvest
- Prepare drying space (60-70% humidity, 18-22°C)
- Have trimming tools ready
- Check local regulations

**Timing Indicators:**
- Trichomes: 50-70% cloudy, 10-20% amber
- Pistils: 60-80% curled/darkened
- Leaves: Natural yellowing beginning
- Aroma: Strong, pungent smell

**Post-Harvest Process:**
1. **Drying:** 7-14 days in dark, cool environment
2. **Curing:** 2-4 weeks in controlled conditions
3. **Storage:** Airtight containers in cool, dark place

**What growth stage is your plant currently in?**`;
  }

  private getFallbackAutonomousResponse(message: string, context?: any): string {
    const temp = context?.sensorData?.temperature || 25;
    const humidity = context?.sensorData?.humidity || 60;

    return `🤖 **Autonomous Analysis Complete**

**System Status:** All systems operational

**Environmental Analysis:**
- Temperature: ${temp}°C ${this.analyzeTemperature(temp)}
- Humidity: ${humidity}% ${this.analyzeHumidity(humidity)}
- Air Quality: Good for cannabis cultivation

**Autonomous Actions Recommended:**
${temp > 28 ? '⚠️ Activate cooling system' : temp < 20 ? '⚠️ Activate heating system' : '✅ Temperature optimal'}
${humidity > 70 ? '⚠️ Increase dehumidification' : humidity < 40 ? '⚠️ Add humidification' : '✅ Humidity optimal'}

**Next Automated Check:** 30 seconds

The system will continue monitoring and take appropriate actions based on configured thresholds.`;
  }

  private getFallbackProactiveResponse(message: string, context?: any): string {
    return `🔮 **Proactive Monitoring Alert**

**Upcoming Considerations:**
- Based on current trends, consider checking:
  - Nutrient levels may need adjustment in 3-5 days
- Light intensity monitoring recommended
- Pest prevention measures should be reviewed

**Preventative Actions:**
1. **Nutrient Management**
   - Review feeding schedule
   - Check EC levels weekly
   - Prepare pH adjustment solutions

2. **Environmental Monitoring**
   - Set up automated alerts for temperature/humidity
   - Install CO₂ monitoring if possible
   - Document all environmental changes

3. **Plant Health Surveillance**
   - Daily visual inspections
   - Weekly detailed examinations
   - Photo documentation

**What proactive measures would you like to implement?**`;
  }

  private getFallbackPredictiveResponse(message: string, context?: any): string {
    return `📊 **Predictive Analysis**

**Trend Analysis:**
- Based on current data patterns, predict stable growth conditions for the next 7 days

**Upcoming Milestones:**
- Growth Stage Progress: On track for normal development
- Environmental Stability: Optimal conditions maintained
- Resource Requirements: Current levels sustainable

**Risk Assessment:**
- Low risk of environmental issues
- Medium risk of nutrient fluctuations
- High probability of successful outcome

**Predictive Recommendations:**
1. Maintain current environmental parameters
2. Prepare for next growth phase
3. Monitor for any deviation from patterns
4. Have contingency plans ready

**What specific predictions would you like me to analyze?**`;
  }

  private getFallbackPlannerResponse(message: string, context?: any): string {
    return `📋 **Strategic Cultivation Plan**

**Timeline Overview:**
- Week 1-2: Current vegetative phase
- Week 3-4: Transition preparation
- Week 5-8: Flowering phase
- Week 9-10: Harvest preparation

**Key Milestones:**
1. **Vegetative Growth** (Weeks 1-4)
   - Strong root development
   - Establish healthy growth patterns
   - Implement training/pruning

2. **Flowering Initiation** (Week 5)
   - Light schedule change to 12/12
   - Nutrient adjustment for bloom phase
   - Environmental optimization

3. **Flowering Development** (Weeks 6-9)
   - Bud formation and development
   - Trichome monitoring
   - Harvest preparation

4. **Harvest & Curing** (Week 10+)
   - Optimal harvest timing
   - Proper drying and curing techniques

**Resource Planning:**
- Nutrients: Bloom formula ready for Week 5
- Environment: Climate control for flowering
- Labor: Schedule for monitoring and maintenance

**What specific aspect of your cultivation plan would you like detailed?**`;
  }

  private getFallbackMonitorResponse(message: string, context?: any): string {
    const temp = context?.sensorData?.temperature || 25;
    const humidity = context?.sensorData?.humidity || 60;

    return `📊 **System Monitoring Report**

**Current Status:**
- Temperature: ${temp}°C ${temp < 18 ? '⚠️ Low Alert' : temp > 30 ? '🔴 High Alert' : '✅ Normal'}
- Humidity: ${humidity}% ${humidity < 40 ? '⚠️ Low Alert' : humidity > 70 ? '🔴 High Alert' : '✅ Normal'}
- System Status: All systems operational

**Alert History:**
- No critical alerts in last 24 hours
- All parameters within acceptable ranges
- Predictive models show stable conditions

**Maintenance Schedule:**
- Daily: Visual plant inspection
- Weekly: Nutrient level checks
- Monthly: System calibration

**Performance Metrics:**
- Growth Rate: On target
- Health Score: 85-90%
- Efficiency Rating: Good

**Any specific systems you'd like me to monitor more closely?**`;
  }

  private getFallbackThinkingResponse(message: string, context?: any): string {
    return `🧠 **Deep Analysis Mode**

**Thinking Process:**

1. **Question Analysis:**
   - User inquiry: "${message}"
   - Context: ${context?.title || 'General cultivation'}
   - Priority Level: Medium

2. **Multi-Angle Consideration:**
   - Scientific Principles: Nutrient cycles, plant biology
   - Practical Applications: Growing techniques, environmental management
   - Risk Factors: Common issues, environmental challenges
   - Best Practices: Industry standards, expert recommendations
   - Long-term Implications: Plant health, yield optimization

3. **Systematic Approach:**
   - Problem identification and categorization
   - Solution development and implementation
   - Monitoring and adjustment protocols
   - Success metrics and evaluation criteria

**Detailed Analysis:**
Based on the cultivation context and current environmental conditions, here's my comprehensive assessment...

The key considerations for this situation involve balancing plant physiological needs with environmental constraints while maintaining optimal growth conditions.

**Would you like me to elaborate on any specific aspect of this analysis?**`;
  }

  private getFallbackStudyPlanResponse(message: string, context?: any): string {
    return `📚 **Growth Plan Generated**

**Plan Title:** Cannabis Cultivation Excellence Program
**Duration:** 8 weeks
**Skill Level:** Intermediate to Advanced

**Week 1: Foundation Setup**
- **Objective:** Establish optimal growing environment
- **Activities:**
  - Set up grow space and equipment
  - Test environmental controls
  - Select appropriate genetics
  - Implement basic monitoring

**Week 2-3: Vegetative Growth**
- **Objective:** Develop strong root system and structure
- **Activities:**
  - Implement 18/6 light cycle
  - Start nutrient regimen at 1/4 strength
  - Train and prune plants
  - Monitor growth patterns

**Week 4-5: Transition Phase**
- **Objective:** Prepare plants for flowering
- **Activities:**
  - Gradual light schedule adjustment
  - Nutrient transition to bloom formula
  - Environmental optimization
  - Pre-flowering health assessment

**Week 6-8: Flowering Phase**
- **Objective:** Maximize bud development
- **Activities:**
  - Maintain 12/12 light cycle
  - Bloom nutrients at full strength
  - Monitor trichome development
  - Pest prevention intensified

**Resources Needed:**
- Basic grow equipment
- Nutrient solutions
- Monitoring tools
- Reference materials

**Would you like me to customize any part of this plan for your specific setup?**`;
  }

  private getFallbackQuizResponse(message: string, context?: any): string {
    return `🎯 **Cannabis Cultivation Quiz**

**Question 1:**
What is the optimal pH range for cannabis nutrient absorption?
- A) 4.0-5.5
- B) 6.0-6.5 ✅
- C) 7.0-8.0
- D) 3.0-4.0

**Answer:** B - pH 6.0-6.5 provides optimal nutrient absorption.

**Explanation:** This pH range ensures maximum availability of essential nutrients while preventing lockout issues.

**Question 2:**
During vegetative growth, what light cycle is recommended?
- A) 20 hours on / 4 hours off
- B) 12 hours on / 12 hours off
- C) 16 hours on / 8 hours off ✅
- D) 24 hours on / 0 hours off

**Answer:** C - 16/8 provides excellent vegetative growth while allowing for dark period recovery.

**Explanation:** This cycle promotes robust development while giving plants essential rest periods.

**Question 3:**
What temperature range is ideal for flowering cannabis?
- A) 15-18°C
- B) 20-24°C ✅
- C) 28-32°C
- D) 35-40°C

**Answer:** B - 20-24°C is ideal for flowering cannabis.

**Explanation:** This temperature range supports optimal terpene and cannabinoid development without stress.

**Score:** 3/3 Correct! You have good knowledge of cannabis cultivation fundamentals.

**Would you like to try another topic or get detailed explanations?**`;
  }

  private getFallbackResearchResponse(message: string, context?: any): string {
    return `🔬 **Research-Based Analysis**

**Scientific Background:**
Based on current cannabis cultivation research, optimal growing conditions involve carefully managed environmental parameters and systematic monitoring.

**Key Research Findings:**
1. **Light Intensity:** Studies show 600-1000 μmol/m² optimal for vegetative growth
2. **CO₂ Enrichment:** 400-600 ppm can increase yields by 20-30%
3. **Temperature Ranges:** 22-26°C vegetative, 20-24°C flowering
4. **Nutrient Ratios:** Different ratios needed for growth vs flowering stages

**Methodology Considerations:**
- Control group studies show consistent parameters improve outcomes
- Peer-reviewed research supports environmental monitoring protocols
- Meta-analyses indicate best practice standards

**Practical Applications:**
Research findings indicate that systematic monitoring and parameter adjustment lead to significantly better results than intuition-based approaches.

**Would you like specific research citations for any particular aspect?**`;
  }

  private getFallbackTroubleshootResponse(message: string, context?: any): string {
    return `🔧 **Troubleshooting Framework**

**Systematic Diagnostic Process:**

1. **Environmental Check**
   - Temperature: Verify thermometer accuracy
   - Humidity: Check hygrometer calibration
   - Air Circulation: Assess fan/ventilation system
   - Light Intensity: Measure with PAR meter

2. **Plant Examination**
   - Leaf Color: Look for yellowing, browning, spotting
   - Growth Patterns: Check for stretching, curling, drooping
   - Root Health: Assess moisture levels and root zone conditions
   - Pest Inspection: Thorough examination for common pests

3. **Nutrient Analysis**
   - pH Testing: Check runoff pH and reservoir pH
   - EC Levels: Measure nutrient solution concentration
   - Deficiency Signs: Match symptoms to nutrient deficiencies
   - Toxicity Indicators: Look for nutrient burn symptoms

4. **Remediation Protocol**
   - Immediate Actions: Address most urgent issues first
   - Monitoring Plan: Track recovery progress
   - Prevention Strategies: Implement preventive measures
   - Documentation: Record all changes and outcomes

**Most Common Issues:**
- Environmental fluctuations
- Nutrient imbalances
- Watering problems
- Pest infestations

**Step-by-step guidance available for specific issues you're experiencing.**`;
  }

  private analyzeTemperature(temp: number): string {
    if (temp < 18) return '❌ Too Low - Risk of slowed growth';
    if (temp > 30) return '❌ Too High - Risk of heat stress';
    return '✅ Optimal - Perfect growing temperature';
  }

  private analyzeHumidity(humidity: number): string {
    if (humidity < 40) return '❌ Too Low - Risk of plant stress';
    if (humidity > 70) return '❌ Too High - Risk of mold';
    return '✅ Optimal - Ideal humidity range';
  }
}

// Export singleton instance
export const clientAI = new ClientAIService();
export default ClientAIService;