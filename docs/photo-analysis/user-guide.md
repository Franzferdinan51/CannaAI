# Photo Analysis User Guide

## Overview

The CultivAI Pro Photo Analysis System is a comprehensive AI-powered tool for diagnosing plant health, detecting pests and diseases, analyzing nutrient deficiencies, and determining harvest readiness through advanced image analysis. This guide will walk you through everything you need to know to get the most out of this powerful feature.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Taking High-Quality Photos](#taking-high-quality-photos)
3. [Using Photo Analysis](#using-photo-analysis)
4. [Understanding Your Results](#understanding-your-results)
5. [Trichome Analysis](#trichome-analysis)
6. [Interpreting AI Recommendations](#interpreting-ai-recommendations)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before you begin using photo analysis:

1. **Configure AI Provider**: You need to set up an AI provider in Settings
   - OpenRouter (recommended for production) - Cloud-based, reliable
   - LM Studio (for local development) - Local, privacy-focused

2. **Camera Setup**: You'll need a device capable of taking clear photos
   - Smartphone camera (minimum 8MP)
   - USB microscope (for trichome analysis)
   - DSLR/mirrorless camera with macro lens

3. **Lighting**: Good lighting is crucial for accurate analysis
   - Natural daylight or LED grow lights
   - Avoid shadows and glare
   - Even illumination preferred

### First Analysis

Let's start with your first plant photo analysis:

1. Navigate to the **Dashboard**
2. Click on the **Analyze** tab
3. Upload or capture a photo of your plant
4. Fill in the plant details (strain, symptoms, etc.)
5. Click **Analyze Plant**

## Taking High-Quality Photos

### General Plant Health Photos

For comprehensive plant health analysis:

#### Camera Settings
- **Resolution**: Minimum 1920x1080 (2MP), recommended 4MP+
- **Focus**: Manual focus on the affected area
- **ISO**: Low ISO (100-400) for less noise
- **Format**: JPEG or PNG

#### Composition Tips

**DO:**
- Fill the frame with the plant/leaf
- Get close to show details (6-12 inches for leaves)
- Include both healthy and affected areas
- Take multiple angles if needed
- Show the entire leaf (top and underside if relevant)
- Capture the context (whole plant if overall health issue)

**DON'T:**
- Use blur or out-of-focus images
- Take photos in low light
- Include your hand or tools in the shot
- Use heavy filters or effects
- Take wide shots showing the entire room

#### Lighting Best Practices

1. **Natural Light**: Best for overall assessment
   - Morning or late afternoon light
   - Avoid harsh midday sun
   - Use diffused light when possible

2. **Artificial Light**: Controlled environment
   - Full spectrum LED grow lights
   - Avoid yellow/warm lights for diagnosis
   - Ensure even illumination

3. **Microscope Photos**: For trichome analysis
   - USB microscope with 100x+ magnification
   - Ring light for even illumination
   - Focus on trichome-rich areas

#### Photo Examples

**Good Examples:**
- Close-up of yellowing leaf showing pattern
- Clear photo of pest infestation
- Sharp image of powdery mildew
- Well-lit healthy leaf for comparison

**Poor Examples:**
- Blurry or out-of-focus images
- Photos taken in dim light
- Images with heavy shadows
- Wide shots with no detail

### Trichome Analysis Photos

For accurate trichome maturity assessment:

#### Equipment Needed
- **USB Microscope**: Minimum 100x magnification
  - Recommended: Dino-Lite AM3113 or similar
  - Alternative: Clip-on macro lens for smartphone (50-100x)

#### Camera Setup
- **Resolution**: Highest available
- **Focus**: Manual adjustment crucial
- **Stability**: Use tripod or stable mount
- **Lighting**: LED ring light for even illumination

#### Capture Technique

1. **Select Sample Area**:
   - Choose a representative bud
   - Avoid fan leaves
   - Focus on top canopy buds
   - Multiple samples for accuracy

2. **Positioning**:
   - Keep microscope steady
   - Ensure even pressure
   - Avoid crushing trichomes
   - Focus on trichome heads

3. **Multiple Shots**:
   - Take 3-5 photos per sample
   - Vary focus points slightly
   - Capture different bud areas
   - Document date and strain

#### Photo Quality Checklist

Before analyzing trichome photos, ensure:
- [ ] Trichomes are clearly visible
- [ ] Image is in sharp focus
- [ ] Colors are accurate (not washed out)
- [ ] No motion blur
- [ ] Adequate magnification (100x minimum)
- [ ] Even lighting without glare

## Using Photo Analysis

### Step-by-Step Process

#### 1. Access Photo Analysis

Navigate to **Dashboard → Analyze** tab in the web interface.

#### 2. Enter Plant Information

Fill in all relevant details for best results:

**Required Fields:**
- **Strain**: Select from dropdown or type custom
- **Leaf Symptoms**: Describe what you observe (be specific)
  - Example: "Yellowing on lower leaves starting from tips, moving inward"
  - Example: "White powdery coating on upper leaves, especially new growth"

**Optional but Helpful:**
- **pH Level**: Current runoff pH (if measured)
- **Temperature**: Current grow environment temperature
- **Humidity**: Current humidity percentage
- **Growing Medium**: Soil, coco, hydro, etc.
- **Growth Stage**: Seedling, vegetative, pre-flower, flower, flush
- **Plant ID**: Link to specific plant record
- **Pest/Disease Focus**: If you suspect specific issue
- **Urgency**: How quickly you need help
- **Additional Notes**: Any other relevant information

#### 3. Upload Photo

**Upload Options:**
- Drag and drop image file
- Click to browse and select
- Paste from clipboard (Ctrl/Cmd + V)
- Take photo directly (mobile)

**Supported Formats:**
- JPEG/JPG
- PNG
- WEBP
- HEIC (automatically converted)
- Maximum file size: 50MB

#### 4. Submit Analysis

Click **"Analyze Plant"** and wait for results (usually 3-5 seconds).

### Analysis Options

#### Quick Analysis
- Just upload photo + basic info
- Get fast, general assessment
- Good for routine monitoring

#### Comprehensive Analysis
- Include all environmental data
- Upload high-quality images
- Detailed multi-factor diagnosis
- Best for problem solving

#### Trichome-Specific Analysis
- Use trichome analysis endpoint
- Requires microscope images
- Detailed maturity assessment
- Harvest timing recommendations

## Understanding Your Results

### Analysis Report Structure

Your analysis results contain several key sections:

#### 1. Primary Diagnosis

**Example:**
```json
{
  "diagnosis": "Nitrogen Deficiency (Early Stage)",
  "confidence": 92,
  "severity": "mild",
  "healthScore": 72
}
```

**What This Means:**
- **Diagnosis**: The most likely issue identified
- **Confidence**: How certain the AI is (0-100%)
- **Severity**: mild, moderate, severe, or critical
- **Health Score**: Overall plant health (0-100)

#### 2. Symptoms Matched

Lists specific symptoms detected in the image:
- Yellowing pattern observed
- Chlorosis between veins
- Affected lower leaves first
- No signs of pests

#### 3. Causes

Root causes identified:
- Insufficient nitrogen in feeding schedule
- pH lockout preventing uptake
- Cold soil temperature
- Overwatering reducing nutrient uptake

#### 4. Treatment Recommendations

**Structured by Priority:**

**Immediate Actions (24-48 hours):**
- Apply nitrogen supplement: 1-2ml/L of 20-5-5 fertilizer
- Water with pH 6.0-6.5 solution
- Check and adjust feeding schedule

**Short-term (1-2 weeks):**
- Continue targeted feeding
- Monitor for improvement
- Address any environmental factors

**Long-term (ongoing):**
- Implement prevention strategies
- Regular monitoring schedule
- Adjust feeding program

#### 5. Purple Strain Analysis

For purple varieties, special analysis determines:

**Genetic Purple** (Healthy):
- Purple on stems, petioles, leaf undersides only
- Uniform, consistent coloration
- No yellowing or distress
- Triggered by cool nights (65°F/18°C)

**Deficiency Purple** (Problem):
- Purple in actual leaf tissue
- Patchy or spotted pattern
- Always accompanied by other symptoms
- Usually phosphorus deficiency

#### 6. Pest & Disease Detection

If pests or diseases are detected:

**Pest Information:**
- Pest species (e.g., Spider Mites)
- Severity level
- Estimated population
- Life stage (egg, larva, adult)
- Treatment protocol with exact dosages

**Disease Information:**
- Disease name and pathogen
- Classification (bacterial, fungal, viral)
- Spread risk assessment
- Treatment and prevention
- Expected prognosis

#### 7. Nutrient Analysis

Complete nutrient profile:

**Deficiencies Detected:**
- Nutrient name and classification
- Current vs. optimal levels
- Treatment with exact dosages
- Application method (foliar, soil, etc.)

**Toxicities (if any):**
- Excess nutrients
- Flushing recommendations
- Correction timeline

#### 8. Environmental Factors

Current conditions affecting health:
- Temperature stress
- Humidity issues
- Light burn or stress
- pH problems
- Water quality

#### 9. Trichome Analysis (if visible)

For flower photos with sufficient magnification:

**Maturity Distribution:**
- Clear trichomes: 10% (too early)
- Cloudy trichomes: 70% (peak potency)
- Amber trichomes: 20% (some sedation)

**Harvest Readiness:**
- Ready: Yes/No
- Recommendation: Detailed timing
- Days until optimal: Estimated window

#### 10. Visual Changes

If you have previous analyses:
- Comparison to last visit
- Improving/stable/worsening trends
- Rate of change
- Predictions for future

#### 11. Confidence Scores

Each section includes confidence levels:
- Overall diagnosis confidence
- Image analysis quality
- Limiting factors (poor lighting, etc.)
- Recommendations for better results

### Interpreting Confidence Scores

**90-100%**: Very high confidence
- Clear visual evidence
- Multiple confirming symptoms
- Classic presentation
- Highly reliable diagnosis

**70-89%**: High confidence
- Good visual evidence
- Most symptoms present
- Likely accurate
- Proceed with treatment

**50-69%**: Moderate confidence
- Some visual evidence
- Mixed symptoms
- Possible but uncertain
- Consider additional testing

**Below 50%**: Low confidence
- Limited visual evidence
- Unclear or conflicting symptoms
- Uncertain diagnosis
- Take additional photos, consult expert

### Health Score Interpretation

**90-100**: Excellent health
- Optimal growing conditions
- No significant issues
- Continue current regimen

**75-89**: Good health
- Minor issues present
- Easy to correct
- Monitor closely

**50-74**: Fair health
- Noticeable problems
- Requires intervention
- Follow treatment plan

**25-49**: Poor health
- Significant issues
- Urgent attention needed
- Aggressive treatment

**0-24**: Critical
- Severe problems
- Immediate action required
- Consider expert consultation

## Trichome Analysis

### Understanding Trichome Maturity

Trichomes are the crystal-like resin glands on cannabis flowers and leaves. Their color and clarity indicate maturity and harvest readiness.

#### Trichome Types & Appearance

**Clear Trichomes (Early Stage)**
- Appearance: Transparent, glass-like
- Size: Small to medium heads
- Location: Throughout bud structure
- What it means: Too early to harvest
- THC content: Low (mostly CBGA precursor)

**Cloudy/Milky Trichomes (Peak THC)**
- Appearance: Cloudy white, milky
- Size: Bulbous heads, fully developed
- Location: Dense coverage on buds
- What it means: Peak potency window
- THC content: Maximum THC production

**Amber Trichomes (CBN Production)**
- Appearance: Amber/yellow-brown color
- Size: Larger, more opaque heads
- Location: Predominantly on flowers
- What it means: Beginning to degrade
- Effects: More sedative, sleep-inducing

### Harvest Timing Guide

#### By Trichome Percentage

**0-10% Amber: Too Early**
- Color: Mostly clear
- Effects: Uplifting, cerebral, energizing
- Recommendation: Wait 2-3 weeks
- Best for: Sativa strains, daytime use

**10-30% Amber: Optimal Window Opening**
- Color: Mostly cloudy with some amber
- Effects: Strong cerebral and body
- Recommendation: Preparing to harvest
- Timeline: Harvest in 1-2 weeks

**30-50% Amber: PEAK HARVEST**
- Color: Balanced cloudy and amber
- Effects: Maximum potency with body stone
- Recommendation: Harvest now
- Timeline: Prime harvest window

**50-70% Amber: Still Good**
- Color: More amber than cloudy
- Effects: Heavy body, sedative
- Recommendation: Good for relaxation
- Timeline: Still optimal

**70-100% Amber: Late Harvest**
- Color: Mostly amber
- Effects: Strong sedation, couch-lock
- Recommendation: Too late for peak THC
- Timeline: Past peak, CBN heavy

### Strain-Specific Timing

#### Indica Strains
- Can handle 40-60% amber
- Longer flowering time
- More amber = heavier body effects
- Good for pain relief, sleep

#### Sativa Strains
- Better harvested earlier (10-30% amber)
- Longer flowering cycle
- More cloudy = cerebral effects
- Good for energy, creativity

#### Hybrid Strains
- Balance based on phenotype
- Monitor multiple plants
- Individual plant variation common
- Choose based on desired effects

### Using Trichome Analysis Results

#### AI Assessment Includes:

1. **Overall Maturity**
   - Dominant stage (clear/cloudy/amber/mixed)
   - Percentage breakdown
   - Confidence score

2. **Trichome Distribution**
   - Exact percentages
   - Density assessment
   - Health indicators

3. **Harvest Readiness**
   - Ready/not ready status
   - Days until optimal
   - Specific recommendations

4. **Detailed Findings**
   - Trichome health
   - Any degradation
   - Pest/disease signs
   - Pistil coloration

5. **Technical Quality**
   - Image resolution
   - Focus quality
   - Lighting adequacy
   - Magnification appropriateness

#### Example Analysis Result:

```json
{
  "trichomeAnalysis": {
    "overallMaturity": {
      "stage": "mixed",
      "percentage": 45,
      "confidence": 0.88,
      "recommendation": "Peak harvest window - harvest within 3-5 days for optimal potency"
    },
    "trichomeDistribution": {
      "clear": 15,
      "cloudy": 65,
      "amber": 20,
      "density": "heavy"
    },
    "harvestReadiness": {
      "ready": true,
      "recommendation": "Ideal trichome development achieved",
      "estimatedHarvestTime": "3-5 days",
      "peakDays": 4
    }
  }
}
```

### Best Practices for Trichome Analysis

#### Sample Selection

1. **Top Canopy**: Uppermost buds receive most light
2. **Multiple Samples**: Test 3-5 different buds
3. **Consistent Location**: Same area each time
4. **Avoid**: Fan leaves, lower buds, stems

#### Monitoring Schedule

**Early Flowering** (Weeks 1-3):
- Check weekly
- Look for trichome development
- Track progression

**Mid-Late Flowering** (Weeks 4-7):
- Check every 2-3 days
- Monitor amber development
- Prepare for harvest

**Peak Window** (Weeks 6-9):
- Check daily
- Fine-tune harvest timing
- Document progression

#### Documentation

Keep records of:
- Date of each analysis
- Trichome percentages
- Photos for comparison
- Harvest date
- Final observations
- Effects assessment

## Interpreting AI Recommendations

### Treatment Protocol Structure

All recommendations follow this format:

#### Immediate Actions (0-48 hours)

**Example:**
```json
{
  "immediate": [
    "Apply nitrogen supplement: 1-2ml/L of 20-5-5 liquid fertilizer",
    "Water with pH 6.0-6.5 solution",
    "Remove heavily affected leaves",
    "Increase air circulation"
  ]
}
```

**What to Do:**
- Follow exact dosages specified
- Use recommended products
- Document what you did
- Monitor for changes

#### Short-term Actions (1-2 weeks)

**Example:**
```json
{
  "shortTerm": [
    "Continue targeted feeding schedule",
    "Monitor soil pH daily",
    "Check for new growth",
    "Adjust nutrients based on response"
  ]
}
```

**What to Do:**
- Establish monitoring routine
- Adjust based on progress
- Take follow-up photos
- Keep detailed notes

#### Long-term Actions (ongoing)

**Example:**
```json
{
  "longTerm": [
    "Implement prevention strategies",
    "Maintain optimal environmental conditions",
    "Regular inspection schedule",
    "Optimize feeding program"
  ]
}
```

**What to Do:**
- Build prevention into routine
- Stay proactive
- Track long-term trends
- Refine techniques

### Understanding Dosages

#### Fertilizer Recommendations

**Format:** X-Y ml/L (milliliters per liter)

**Example:** "1-2ml/L of 20-5-5 fertilizer"

**Translation:**
- 1ml per liter of water = light dose
- 2ml per liter of water = moderate dose
- Start light, increase as needed

**Calculation Examples:**
- 1 gallon = 3.78 liters
- 5 gallon reservoir = 18.9 liters
- Dose = 18.9 × 1-2ml = 18.9-37.8ml

#### Application Methods

**Soil Drench:**
- Apply to soil around base
- Water in thoroughly
- Avoid foliage contact
- Repeat as directed

**Foliar Spray:**
- Spray on leaves undersides
- Apply in dark cycle
- Fine mist, not dripping
- Ensure good coverage

**Hydroponic:**
- Add directly to reservoir
- Check EC/pH after adding
- Mix thoroughly
- Monitor nutrient levels

### Prevention Strategies

After treating the immediate issue, implement:

#### Environmental Controls

1. **Temperature**
   - Maintain 68-78°F (20-26°C) day/night
   - Avoid large swings
   - Monitor with thermometers

2. **Humidity**
   - 40-60% RH standard
   - Adjust based on growth stage
   - Use dehumidifier/humidifier

3. **Air Circulation**
   - Oscillating fans for air movement
   - Avoid dead air zones
   - Prevent hot spots

4. **Lighting**
   - Appropriate intensity
   - Correct distance from canopy
   - Consistent schedule

#### Nutrition Management

1. **Feeding Schedule**
   - Follow strain-specific needs
   - Monitor plant response
   - Adjust based on growth stage

2. **pH Monitoring**
   - Check runoff pH
   - Maintain 6.0-7.0 range
   - Adjust inputs as needed

3. **Water Quality**
   - Test source water
   - Use appropriate nutrients
   - Monitor EC/TDS levels

### Follow-up Schedule

#### Recommended Timeline

**After Treatment:**
- Day 1-2: Check for immediate response
- Day 3-5: Assess early improvements
- Week 1: Evaluate progress
- Week 2: Determine if more treatment needed

#### Success Indicators

Look for:
- New healthy growth
- Symptoms not spreading
- Improved coloration
- Increased vigor
- Normal development

#### When to Escalate

Contact an expert if:
- Symptoms worsen after treatment
- No improvement after 1 week
- Multiple issues present
- Plant health declining rapidly
- Uncertain diagnosis

## Best Practices

### For Best Analysis Results

#### Before Taking Photos

1. **Clean the Plant**
   - Remove dust and debris
   - Check for water spots
   - Ensure leaves are dry

2. **Prepare Environment**
   - Turn off fans temporarily
   - Ensure even lighting
   - Remove obstacles

3. **Gather Information**
   - Note recent changes
   - Review feeding schedule
   - Check environmental logs

#### Photo Composition

1. **Fill the Frame**
   - Get close to subject
   - Fill 80% of frame with plant
   - Avoid empty background

2. **Multiple Angles**
   - Top and bottom of leaves
   - Different affected areas
   - Healthy tissue for comparison

3. **Focus on Details**
   - Use manual focus
   - Check sharpness before submitting
   - Multiple shots if needed

#### Information Accuracy

**Be Specific:**
- Describe exact symptoms
- Note location on plant
- Include timeline of changes
- Mention recent activities

**Be Honest:**
- Report actual conditions
- Don't exaggerate problems
- Include all relevant details
- Ask if uncertain

### For Treatment Success

#### Follow Recommendations Exactly

1. **Dosages**
   - Measure accurately
   - Use recommended products
   - Start with lower doses

2. **Timing**
   - Follow prescribed schedule
   - Don't skip applications
   - Complete full treatment course

3. **Monitoring**
   - Document changes
   - Take follow-up photos
   - Note plant response

#### Prevention is Key

1. **Regular Monitoring**
   - Weekly photo analysis
   - Visual inspections
   - Environmental checks

2. **Record Keeping**
   - Track all analyses
   - Document treatments
   - Monitor trends

3. **Proactive Care**
   - Maintain optimal conditions
   - Follow feeding schedules
   - Stay ahead of problems

### For Trichome Analysis

#### Equipment Preparation

1. **Microscope Setup**
   - Clean lens before use
   - Check lighting
   - Ensure stability
   - Calibrate if needed

2. **Sample Selection**
   - Choose representative buds
   - Multiple samples recommended
   - Consistent locations

#### Capture Technique

1. **Focus Carefully**
   - Use manual focus
   - Check trichome heads
   - Avoid camera shake

2. **Multiple Shots**
   - 3-5 photos per sample
   - Vary focus slightly
   - Document date/time

#### Harvest Decision

1. **Consider Multiple Factors**
   - Trichome percentage
   - Pistil coloration
   - Strain characteristics
   - Desired effects

2. **Plan Harvest**
   - Prepare equipment
   - Schedule drying space
   - Consider workload

## Troubleshooting

### Common Issues

#### Analysis Fails or Returns Errors

**Problem:** "No AI providers configured"

**Solution:**
1. Go to Settings → AI Configuration
2. Configure OpenRouter API key (recommended)
3. Or set up LM Studio locally
4. Save settings and retry

---

**Problem:** "Image processing failed"

**Solutions:**
1. Check image format (JPEG, PNG, WEBP, HEIC)
2. Reduce file size (under 50MB)
3. Check image resolution (minimum 800x600)
4. Ensure image is not corrupted
5. Try different image

---

**Problem:** "Analysis timeout"

**Solutions:**
1. Try smaller image
2. Simplify symptom description
3. Check internet connection
4. Try again in a few minutes
5. Contact support if persistent

#### Poor Analysis Results

**Problem:** "Low confidence score" or "Uncertain diagnosis"

**Causes & Solutions:**

1. **Poor Image Quality**
   - Solution: Retake photo with better lighting
   - Ensure sharp focus
   - Get closer to subject
   - Use higher resolution

2. **Insufficient Detail**
   - Solution: Upload multiple angles
   - Include close-ups of affected areas
   - Show both healthy and sick tissue
   - Capture whole symptom pattern

3. **Incomplete Information**
   - Solution: Fill in all relevant fields
   - Include environmental data
   - Describe symptoms thoroughly
   - Note recent changes

4. **Lighting Issues**
   - Solution: Use natural or full-spectrum LED light
   - Avoid shadows and glare
   - Ensure even illumination
   - No flash or mixed lighting

5. **Wrong Focus Area**
   - Solution: Focus on affected area
   - Avoid blur or out-of-focus
   - Use manual focus if available
   - Try multiple focus points

#### Trichome Analysis Issues

**Problem:** "Insufficient magnification"

**Solution:**
- Use minimum 100x magnification
- USB microscope recommended
- Clip-on macro lens for phones
- Professional camera with macro lens

---

**Problem:** "Trichomes not visible"

**Causes & Solutions:**

1. **Too Early in Flowering**
   - Solution: Wait until week 4-5
   - Early flowers have few trichomes
   - Check again in 1-2 weeks

2. **Poor Image Quality**
   - Solution: Clean microscope lens
   - Check lighting
   - Improve focus
   - Retake with higher quality

3. **Wrong Sample Area**
   - Solution: Sample flower buds, not fan leaves
   - Choose top canopy buds
   - Focus on resinous areas

4. **Washed Out Colors**
   - Solution: Adjust lighting
   - Avoid overexposure
   - Check white balance
   - Ensure accurate colors

#### Treatment Not Working

**Problem:** "Symptoms not improving after treatment"

**Troubleshooting Steps:**

1. **Verify Diagnosis**
   - Was the AI confidence high (>70%)?
   - Did you follow all recommendations?
   - Is the issue correctly identified?

2. **Check Treatment Application**
   - Were dosages correct?
   - Was schedule followed exactly?
   - Were products used as specified?
   - Was application method correct?

3. **Environmental Factors**
   - Are conditions optimal?
   - Temperature and humidity in range?
   - Adequate airflow?
   - Proper lighting?

4. **Underlying Issues**
   - pH problems causing lockout?
   - Root health affecting uptake?
   - Secondary infections?
   - Environmental stress?

5. **Time Factor**
   - Has enough time passed?
   - Most treatments take 3-7 days
   - Some issues require multiple treatments
   - Be patient with slow recovery

#### Repeated Issues

**Problem:** "Same problem keeps occurring"

**Solutions:**

1. **Root Cause Analysis**
   - Environmental issues?
   - Nutrient program problems?
   - Water quality issues?
   - Genetic problems?

2. **Prevention Strategy**
   - Implement long-term fixes
   - Regular monitoring schedule
   - Proactive treatments
   - Improve growing conditions

3. **Expert Consultation**
   - Contact experienced grower
   - Consult agricultural extension
   - Join grow community forums
   - Professional testing

### Getting Help

#### Before Contacting Support

1. **Gather Information**
   - Screenshots of analysis
   - Photos used for analysis
   - Treatment applied
   - Timeline of events

2. **Troubleshoot Common Issues**
   - Check this guide
   - Review API documentation
   - Try basic fixes

3. **Document Everything**
   - Keep analysis history
   - Screenshot results
   - Note error messages
   - Record what you tried

#### Contact Information

For additional help:
- Review the comprehensive manual
- Check the FAQ section
- Consult the troubleshooting guide
- Join community forums
- Contact technical support

#### What to Include in Support Request

When contacting support, include:

1. **Problem Description**
   - What issue occurred?
   - When did it start?
   - What were you trying to do?

2. **Screenshots**
   - Error messages
   - Analysis results
   - Photo quality
   - Settings configuration

3. **Steps Taken**
   - What did you try?
   - What worked/didn't work?
   - Current status?

4. **Environment Details**
   - Browser/device
   - Version of system
   - Network connection
   - Any recent changes

### Frequently Asked Questions

#### General Questions

**Q: How often should I analyze my plants?**
A: Weekly for healthy plants, every 2-3 days if issues present, daily during flowering for trichome monitoring.

**Q: Can I analyze multiple plants at once?**
A: Yes, use batch analysis feature or analyze each plant individually.

**Q: Do I need to pay for AI analysis?**
A: Using OpenRouter requires an API key (pay-per-use). LM Studio is free but requires local setup.

**Q: How accurate is the AI diagnosis?**
A: Accuracy is 85-95% for clear visual symptoms with good photos. Confidence scores indicate reliability.

**Q: Can I save analysis results?**
A: Yes, all analyses are automatically saved to your history and can be exported.

#### Technical Questions

**Q: What image formats are supported?**
A: JPEG, PNG, WEBP, HEIC, and TIFF. HEIC is automatically converted to JPEG.

**Q: What's the maximum file size?**
A: 50MB for direct uploads. Images are automatically compressed for analysis.

**Q: Can I use a microscope?**
A: Yes, USB microscopes work great for trichome analysis (100x+ magnification).

**Q: Do I need internet for analysis?**
A: Yes, AI analysis requires internet connection unless using local LM Studio.

**Q: How long does analysis take?**
A: Usually 3-5 seconds. Complex analyses may take up to 10 seconds.

#### Troubleshooting Questions

**Q: My analysis failed, what now?**
A: Check AI provider configuration, verify image quality, try smaller file, check internet connection.

**Q: Can I analyze without symptoms?**
A: Yes, upload photo + basic info for general health assessment.

**Q: What if confidence is low?**
A: Retake photo with better quality, provide more information, or consult expert.

**Q: How do I know if treatment is working?**
A: Look for new healthy growth, symptoms not spreading, improved coloration within 3-7 days.

**Q: Can I delete analysis history?**
A: Yes, you can delete individual entries or clear entire history.

## Conclusion

The CultivAI Pro Photo Analysis System is a powerful tool for plant health management. By following this guide, you'll be able to:

- Take professional-quality diagnostic photos
- Understand AI analysis results
- Interpret treatment recommendations
- Make informed harvesting decisions
- Troubleshoot common issues

Remember: Quality input (good photos + accurate information) leads to quality output (accurate diagnosis + effective treatment).

For additional help, consult the FAQ, troubleshooting guide, or contact support.
