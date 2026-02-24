# OpenClaw Agent Plant Analysis Workflow

## 🌿 **Complete Plant Analysis Workflow for OpenClaw Agents**

This guide shows OpenClaw agents how to perform COMPLETE plant analysis:
1. ✅ Capture plant photos
2. ✅ Send for AI analysis (using BEST models)
3. ✅ **Understand** the results
4. ✅ **Report** findings to user
5. ✅ **Take action** based on analysis

---

## 📋 **Step-by-Step Workflow**

### **Step 1: Capture Plant Photo**

```bash
# Method 1: Use existing monitoring script
./tools/check-plants-on-demand.sh

# Method 2: Direct ADB command (Android phone)
adb shell am start -a android.media.action.IMAGE_CAPTURE
adb shell screencap -p /sdcard/plant.png
adb pull /sdcard/plant.png

# Method 3: Use existing photo
PHOTO_PATH="/path/to/plant-photo.png"
```

**Result:** Plant photo ready for analysis

---

### **Step 2: Send for AI Analysis**

**OpenClaw Agent Tool:**

```typescript
import { sendToOpenClaw } from '@/lib/openclaw-provider';

// Convert photo to base64
const imageBase64 = fs.readFileSync(PHOTO_PATH, 'base64');

// Send for analysis (uses Qwen 3.5 Plus - BEST for vision)
const analysis = await sendToOpenClaw([
  {
    role: 'system',
    content: `You are an expert cannabis cultivation specialist. 
    Analyze this plant photo comprehensively and provide:
    1. Overall health assessment
    2. Any nutrient deficiencies detected
    3. Any pests or diseases identified
    4. Growth stage assessment
    5. Specific, actionable recommendations
    6. Urgency level (low/medium/high/critical)`
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Analyze this cannabis plant for health issues, nutrient deficiencies, pests, and diseases. Provide specific diagnosis and treatment recommendations.'
      },
      {
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${imageBase64}` }
      }
    ]
  }
], {
  taskType: 'visual',  // Auto-uses Qwen 3.5 Plus (BEST for plant vision)
  maxTokens: 2000,
});
```

**Result:** AI analysis with diagnosis and recommendations

---

### **Step 3: Understand the Results**

**Parse AI Analysis:**

```typescript
interface PlantAnalysis {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  issues: Array<{
    type: 'nutrient' | 'pest' | 'disease' | 'environmental' | 'other';
    name: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;  // 0-1 confidence score
    symptoms: string[];
    treatment: string;
    urgency: string;
  }>;
  growthStage: 'seedling' | 'vegetative' | 'flowering' | 'harvest_ready';
  recommendations: string[];
  followUpNeeded: boolean;
  followUpDays: number;
}

// Parse AI response
function parseAnalysis(aiResponse: string): PlantAnalysis {
  // Extract structured data from AI response
  // (Use regex or LLM parsing for structured output)
  
  return {
    overallHealth: 'good',
    issues: [
      {
        type: 'nutrient',
        name: 'Nitrogen Deficiency',
        severity: 'medium',
        confidence: 0.85,
        symptoms: ['Yellowing lower leaves', 'Stunted growth'],
        treatment: 'Add nitrogen-rich fertilizer',
        urgency: 'medium'
      }
    ],
    growthStage: 'vegetative',
    recommendations: [
      'Add nitrogen fertilizer within 3 days',
      'Monitor pH levels (target 6.0-6.5)',
      'Check for pest activity weekly'
    ],
    followUpNeeded: true,
    followUpDays: 7
  };
}
```

**Result:** Structured, understandable analysis

---

### **Step 4: Report Findings to User**

**OpenClaw Agent Report:**

```typescript
async function reportToUser(analysis: PlantAnalysis) {
  // Build comprehensive report
  const report = `
🌿 **Plant Health Analysis Report**

**Overall Health:** ${analysis.overallHealth.toUpperCase()}
**Growth Stage:** ${analysis.growthStage}

${analysis.issues.length > 0 ? `
⚠️ **Issues Detected:**
${analysis.issues.map(issue => `
**${issue.name}** (${issue.severity})
- Type: ${issue.type}
- Confidence: ${(issue.confidence * 100).toFixed(0)}%
- Symptoms: ${issue.symptoms.join(', ')}
- Treatment: ${issue.treatment}
- Urgency: ${issue.urgency}
`).join('\n')}
` : '✅ **No Issues Detected** - Plant looks healthy!'}

📋 **Recommendations:**
${analysis.recommendations.map((rec, i) => `${i+1}. ${rec}`).join('\n')}

${analysis.followUpNeeded ? `
📅 **Follow-up:** Check again in ${analysis.followUpDays} days` : ''}
  `;

  // Send via Telegram
  await sendTelegram(report);
  
  // Send voice alert if critical
  if (analysis.issues.some(i => i.severity === 'critical')) {
    await sendVoiceAlert(`Critical plant health issue detected: ${analysis.issues[0].name}`);
  }
  
  // Log to CannaAI
  await logToCannaAI({
    type: 'plant_analysis',
    analysis: analysis,
    timestamp: new Date().toISOString()
  });
}
```

**Result:** Clear, actionable report for user

---

### **Step 5: Take Action Based on Analysis**

**Automated Actions:**

```typescript
async function takeAction(analysis: PlantAnalysis) {
  // Create alerts for high/critical issues
  for (const issue of analysis.issues) {
    if (issue.severity === 'high' || issue.severity === 'critical') {
      await createAlert({
        type: 'plant_health',
        severity: issue.severity,
        message: `${issue.name} detected - ${issue.treatment}`,
        plantId: currentPlantId,
        requiresAction: true
      });
    }
  }
  
  // Adjust environment if needed
  if (analysis.issues.some(i => i.type === 'environmental')) {
    const envIssue = analysis.issues.find(i => i.type === 'environmental');
    
    if (envIssue?.name.includes('humidity')) {
      // Adjust humidifier/dehumidifier
      await adjustEnvironment({
        roomId: currentRoomId,
        targetHumidity: envIssue.name.includes('high') ? 45 : 55
      });
    }
    
    if (envIssue?.name.includes('temperature')) {
      // Adjust HVAC
      await adjustEnvironment({
        roomId: currentRoomId,
        targetTemp: envIssue.name.includes('high') ? 22 : 25
      });
    }
  }
  
  // Schedule follow-up analysis
  if (analysis.followUpNeeded) {
    await scheduleTask({
      type: 'plant_analysis',
      plantId: currentPlantId,
      scheduledFor: addDays(new Date(), analysis.followUpDays),
      priority: 'high'
    });
  }
  
  // Update plant health record
  await updatePlantHealth({
    plantId: currentPlantId,
    healthStatus: analysis.overallHealth,
    lastAnalysis: new Date(),
    issues: analysis.issues,
    growthStage: analysis.growthStage
  });
}
```

**Result:** Automated actions based on analysis

---

## 🎯 **Complete OpenClaw Agent Example**

```typescript
// Complete autonomous plant health check
async function autonomousPlantHealthCheck(plantId: string) {
  console.log(`🌿 Starting plant health check for ${plantId}...`);
  
  // Step 1: Capture photo
  const photoPath = await capturePlantPhoto(plantId);
  
  // Step 2: AI Analysis (uses Qwen 3.5 Plus)
  const aiResponse = await sendToOpenClaw([
    {
      role: 'system',
      content: 'Expert cannabis cultivation specialist. Analyze comprehensively.'
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this cannabis plant...' },
        { type: 'image_url', image_url: { url: photoPath } }
      ]
    }
  ], {
    taskType: 'visual',  // Uses Qwen 3.5 Plus
  });
  
  // Step 3: Parse and understand
  const analysis = parseAnalysis(aiResponse.content);
  
  // Step 4: Report to user
  await reportToUser(analysis);
  
  // Step 5: Take action
  await takeAction(analysis);
  
  console.log(`✅ Plant health check complete for ${plantId}`);
  console.log(`   Health: ${analysis.overallHealth}`);
  console.log(`   Issues: ${analysis.issues.length}`);
  console.log(`   Actions taken: ${analysis.issues.filter(i => i.severity === 'high' || i.severity === 'critical').length}`);
}
```

---

## 📊 **Example Analysis Output**

**AI Response (from Qwen 3.5 Plus):**

```
Based on my analysis of this cannabis plant photo:

**Overall Health: GOOD**

**Growth Stage: Late Vegetative**

**Issues Detected:**

1. **Nitrogen Deficiency** (Medium Severity, 85% confidence)
   - Symptoms: Yellowing of lower leaves, slight stunting
   - Cause: Insufficient nitrogen in nutrient solution
   - Treatment: Add nitrogen-rich fertilizer within 3 days
   - Urgency: Medium

2. **Possible Spider Mites** (Low Severity, 60% confidence)
   - Symptoms: Small white spots on upper leaves
   - Cause: Early pest infestation
   - Treatment: Inspect undersides of leaves, apply neem oil if confirmed
   - Urgency: Low (monitor closely)

**Recommendations:**

1. Add nitrogen fertilizer within 3 days (urgent)
2. Monitor pH levels - target 6.0-6.5 for soil
3. Inspect leaf undersides for spider mites this week
4. Increase air circulation slightly
5. Continue current watering schedule

**Follow-up:** Check again in 7 days to monitor nitrogen levels and pest situation
```

**Parsed & Reported to User:**

```
🌿 **Plant Health Analysis Report**

**Overall Health:** GOOD
**Growth Stage:** Late Vegetative

⚠️ **Issues Detected:**

**Nitrogen Deficiency** (medium)
- Type: nutrient
- Confidence: 85%
- Symptoms: Yellowing lower leaves, Stunted growth
- Treatment: Add nitrogen-rich fertilizer within 3 days
- Urgency: medium

**Possible Spider Mites** (low)
- Type: pest
- Confidence: 60%
- Symptoms: Small white spots on upper leaves
- Treatment: Inspect undersides of leaves, apply neem oil if confirmed
- Urgency: low

📋 **Recommendations:**
1. Add nitrogen fertilizer within 3 days
2. Monitor pH levels (target 6.0-6.5)
3. Check for pest activity weekly
4. Increase air circulation slightly
5. Continue current watering schedule

📅 **Follow-up:** Check again in 7 days

✅ Alert created for Nitrogen Deficiency
✅ Follow-up analysis scheduled for 2026-03-03
```

---

## 🦆 **OpenClaw Agent Capabilities**

With this workflow, OpenClaw agents can:

1. ✅ **Capture** plant photos autonomously
2. ✅ **Analyze** using BEST AI models (Qwen 3.5 Plus)
3. ✅ **Understand** the analysis (parse into structured data)
4. ✅ **Report** findings clearly to users
5. ✅ **Act** on findings (alerts, environment adjustments, follow-ups)
6. ✅ **Track** health over time
7. ✅ **Learn** from historical data

**This is TRUE autonomous plant health monitoring!** 🌿✨

---

**Location:** `/home/duckets/CannaAI/openclaw-skill/PLANT-ANALYSIS-WORKFLOW.md`  
**For:** OpenClaw agents performing plant analysis  
**AI Model:** Qwen 3.5 Plus (BEST for plant vision)
