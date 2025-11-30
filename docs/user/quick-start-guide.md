# Quick Start Guide - Photo Analysis (5 Minutes)

Welcome to CultivAI Pro's Photo Analysis System! This guide will get you up and running in just 5 minutes.

## What You'll Accomplish

✅ Set up AI provider
✅ Take your first plant photo
✅ Get a professional diagnosis
✅ Understand your results

---

## Step 1: Configure AI Provider (30 seconds)

You need to configure an AI provider before analyzing plants. Choose one:

### Option A: OpenRouter (Recommended) - For Production

1. **Get API Key**
   - Go to https://openrouter.ai/keys
   - Create a free account
   - Generate a new API key

2. **Configure in CultivAI Pro**
   - Navigate to **Settings → AI Configuration**
   - Select **OpenRouter** tab
   - Paste your API key
   - Click **Save & Test**

### Option B: LM Studio - For Local Development

1. **Download & Install**
   - Go to https://lmstudio.ai/
   - Download LM Studio
   - Install on your computer

2. **Start Local Server**
   - Open LM Studio
   - Click "Local Server" tab
   - Click "Start Server"
   - Default URL: http://localhost:1234

3. **Configure in CultivAI Pro**
   - Navigate to **Settings → AI Configuration**
   - Select **LM Studio** tab
   - Leave default URL (http://localhost:1234)
   - Click **Save & Test**

---

## Step 2: Navigate to Analysis (10 seconds)

1. Open CultivAI Pro in your browser
2. On the dashboard, click the **"Analyze"** tab
3. You'll see the Photo Analysis form

---

## Step 3: Take or Upload a Plant Photo (60 seconds)

### If Using a Phone:
1. Click **"Take Photo"** or **"Upload from Gallery"**
2. Select or capture a clear photo of your plant
3. Focus on the affected area (leaf, stem, etc.)

### If Using a Computer:
1. Click **"Choose File"**
2. Select a plant photo from your computer
3. Supported formats: JPEG, PNG, WEBP, HEIC

### Photo Tips for Best Results:
- **Get close**: Fill the frame with the plant/leaf
- **Good lighting**: Use natural light or LED grow lights
- **Sharp focus**: Make sure the image is clear and not blurry
- **Show details**: Capture both healthy and affected areas

**Example**: Take a close-up photo of a yellowing leaf, including the pattern of yellowing.

---

## Step 4: Enter Plant Information (60 seconds)

Fill in the required fields:

### Required Information:

**Strain**
- Type the strain name (e.g., "Granddaddy Purple", "OG Kush")
- Or select from dropdown if available

**Symptoms**
- Describe what you observe
- Be specific and detailed

**Example:**
❌ **Bad**: "Plant looks sick"
✅ **Good**: "Yellowing on lower leaves starting from tips, spreading upward. Leaves feel crispy."

### Optional Information (Helps Accuracy):

**pH Level**
- Current runoff pH (if you measure it)
- Example: 6.2

**Temperature**
- Grow room temperature
- Example: 72°F

**Humidity**
- Relative humidity percentage
- Example: 55%

**Growing Medium**
- Soil, Coco Coir, Hydroponic, etc.

**Growth Stage**
- Seedling, Vegetative, Pre-flower, Flower, Flush

---

## Step 5: Submit & Wait (15 seconds)

1. Click **"Analyze Plant"** button
2. Wait 3-5 seconds for AI processing
3. Results will appear automatically

---

## Step 6: Understand Your Results (90 seconds)

### What You'll See:

#### 1. **Primary Diagnosis**
```
Diagnosis: Nitrogen Deficiency (Early Stage)
Confidence: 92%
Severity: Mild
Health Score: 72/100
```

**What this means:**
- **Diagnosis**: What's wrong with your plant
- **Confidence**: How sure the AI is (higher = more accurate)
- **Severity**: How bad the issue is
- **Health Score**: Overall plant health (0-100)

#### 2. **Symptoms Detected**
List of symptoms found in your photo

#### 3. **Root Causes**
Why this is happening

#### 4. **Treatment Recommendations**
Step-by-step fix with exact dosages

Example:
```
Immediate Actions (0-48 hours):
• Apply nitrogen supplement: 1-2ml/L of 20-5-5 fertilizer
• Water with pH 6.0-6.5 solution
• Remove heavily affected leaves

Short-term (1-2 weeks):
• Continue targeted feeding
• Monitor for improvement
• Check pH weekly
```

#### 5. **Priority Actions**
Most critical steps to take first

---

## Example: Your First Analysis

Let's walk through a complete example:

### Input:
```
Strain: Granddaddy Purple
Symptoms: Yellowing on lower leaves starting from tips, moving upward. Older leaves affected first.
pH: 6.2
Temperature: 72°F
Humidity: 55%
Medium: Coco Coir
Growth Stage: Flowering Week 3
```

### Photo:
Close-up of lower fan leaf showing yellowing pattern

### Output:
```
✅ Diagnosis: Nitrogen Deficiency (Early Stage)
✅ Confidence: 92%
✅ Health Score: 72/100
✅ Treatment: Apply 1-2ml/L nitrogen supplement
✅ Priority: Increase nitrogen immediately
```

---

## Next Steps

### Immediate (Next 24 hours):
1. Follow treatment recommendations
2. Take action on priority items
3. Document what you did

### Follow-up (3-7 days):
1. Take another photo
2. Submit new analysis
3. Compare results to track improvement
4. Adjust treatment if needed

### Prevention (Ongoing):
1. Set up regular monitoring (weekly)
2. Maintain optimal conditions
3. Keep detailed records
4. Use analysis before issues become severe

---

## Common Questions

**Q: Why do I need an AI provider?**
A: The AI analyzes your plant photos and provides expert-level diagnosis. Without it, you can only do basic analysis.

**Q: How accurate is it?**
A: 85-95% accuracy for clear photos with visible symptoms. Confidence scores show reliability.

**Q: How often should I analyze?**
A: Weekly for healthy plants, every 2-3 days if issues present.

**Q: Can I analyze without a photo?**
A: Yes! Text-only analysis works, but photos give much more accurate results.

**Q: Is my data private?**
A: Yes. Photos are processed securely and not shared. With LM Studio, everything stays on your computer.

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| "No AI providers configured" | Configure OpenRouter or LM Studio in Settings |
| "Image processing failed" | Check format (JPEG/PNG/WEBP), reduce file size (<50MB) |
| "Low confidence score" | Retake photo with better lighting and focus |
| "Analysis timeout" | Try smaller image or check internet connection |
| "Rate limit exceeded" | Wait 15 minutes before next analysis |

---

## Getting Help

**Need more help?**
- Full User Guide: [docs/photo-analysis/user-guide.md](../photo-analysis/user-guide.md)
- FAQ: [docs/knowledge-base/faq.md](../knowledge-base/faq.md)
- Support: support@cultivaipro.com

**Want to learn more?**
- Trichome Analysis: For harvest timing
- Pest/Disease Detection: Detailed identification
- Nutrient Deficiency Guide: Complete treatment protocols
- Best Practices: Professional growing tips

---

## Congratulations! 🎉

You've completed your first plant analysis! You're now equipped to:
- Identify plant health issues
- Get professional treatment recommendations
- Monitor plant progress over time
- Make data-driven cultivation decisions

**Next:** Check out the [Comprehensive User Manual](user-manual.md) for detailed guidance on all features.

---

## Quick Reference Card

### Essential Information:
- **Strain**: Always required
- **Symptoms**: Always required, be specific
- **Photo**: Recommended, improves accuracy
- **Environmental data**: Optional but helpful

### Photo Checklist:
- [ ] Sharp focus
- [ ] Good lighting
- [ ] Close-up of affected area
- [ ] Shows symptom pattern
- [ ] Includes healthy tissue for comparison

### When to Analyze:
- Weekly routine check
- When symptoms appear
- Before harvest (trichome analysis)
- After treatment (track progress)
- When troubleshooting problems

### Red Flags (Analyze Immediately):
- Rapid yellowing or browning
- Wilting despite adequate water
- White powdery coating
- Visible pests
- Sudden leaf drop
- Stunted growth

---

**Ready to dive deeper?** Explore the [Comprehensive User Manual](user-manual.md) for advanced features, trichome analysis, automation, and expert-level cultivation guidance.
