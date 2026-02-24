# CannaAI Model Selection Guide for OpenClaw Agents

## 🎯 Best Models for Each Task

### **Visual Plant Analysis** 🌿
**Use: Qwen 3.5 Plus (`bailian/qwen3.5-plus`)**

**Why:**
- ✅ BEST at recognizing plant diseases
- ✅ Excellent at nutrient deficiency detection
- ✅ Great pest identification
- ✅ High accuracy on visual symptoms
- ✅ FREE via Alibaba quota

**Use Cases:**
- Plant health analysis from photos
- Nutrient deficiency diagnosis
- Pest and disease identification
- Trichome analysis
- Leaf symptom analysis

**Example:**
```typescript
const analysis = await sendToOpenClaw(messages, {
  taskType: 'visual',
  model: 'bailian/qwen3.5-plus',  // BEST for plant vision
});
```

---

### **Complex Diagnosis** 🧠
**Use: GPT-4 / ChatGPT (`openai-codex:default`)**

**Why:**
- ✅ Most advanced reasoning
- ✅ Best for complex multi-factor analysis
- ✅ Excellent at connecting symptoms to root causes
- ✅ Comprehensive treatment recommendations

**Use Cases:**
- Complex multi-symptom diagnosis
- Environmental optimization strategies
- Advanced cultivation planning
- Research and analysis

**Note:** Limited daily quota (~100-200 messages/day on $20 plan)

**Example:**
```typescript
const diagnosis = await sendToOpenClaw(messages, {
  taskType: 'complex',
  model: 'openai-codex:default',
});
```

---

### **General Text Tasks** 💬
**Use: MiniMax M2.5 (`minimax-portal/MiniMax-M2.5`)**

**Why:**
- ✅ FREE (no quota limits)
- ✅ Fast response times
- ✅ Good for general Q&A
- ✅ No ban risk

**Use Cases:**
- General cultivation questions
- Text-based recommendations
- Data summarization
- Routine queries

**Example:**
```typescript
const response = await sendToOpenClaw(messages, {
  taskType: 'text',
  model: 'minimax-portal/MiniMax-M2.5',  // FREE
});
```

---

### **Vision Tasks (Alternative)** 👁️
**Use: Kimi K2.5 (`nvidia/moonshotai/kimi-k2.5`)**

**Why:**
- ✅ FREE via NVIDIA
- ✅ Good vision capabilities
- ✅ Good alternative when Qwen quota is low

**Use Cases:**
- Backup for Qwen 3.5 Plus
- General image analysis
- When Qwen quota is exhausted

**Example:**
```typescript
const vision = await sendToOpenClaw(messages, {
  taskType: 'visual',
  model: 'nvidia/moonshotai/kimi-k2.5',  // FREE vision
});
```

---

## 📊 Model Comparison

| Task | Best Model | Alternative | Cost |
|------|------------|-------------|------|
| **Plant Health (Photos)** | Qwen 3.5 Plus | Kimi K2.5 | FREE (quota) |
| **Nutrient Deficiency** | Qwen 3.5 Plus | GPT-4 | FREE (quota) |
| **Pest/Disease ID** | Qwen 3.5 Plus | GPT-4 | FREE (quota) |
| **Complex Diagnosis** | GPT-4 | Qwen 3.5 Plus | Limited |
| **General Q&A** | MiniMax M2.5 | Qwen 3.5 Plus | FREE |
| **Text Analysis** | MiniMax M2.5 | Qwen 3.5 Plus | FREE |
| **Image Analysis** | Qwen 3.5 Plus | Kimi K2.5 | FREE (quota) |

---

## 🎯 Automatic Model Selection

The OpenClaw provider automatically selects the best model:

```typescript
// Visual analysis → Qwen 3.5 Plus (BEST)
sendToOpenClaw(messages, { taskType: 'visual' });

// Complex diagnosis → GPT-4
sendToOpenClaw(messages, { taskType: 'complex' });

// General text → MiniMax M2.5 (FREE)
sendToOpenClaw(messages, { taskType: 'text' });
```

---

## 💡 Best Practices

### **For Plant Health Analysis:**
1. **Always use Qwen 3.5 Plus** for photo analysis
2. Include growth stage context
3. Provide environmental data (temp, humidity, VPD)
4. Ask for specific diagnosis + treatment

### **For Complex Issues:**
1. Use GPT-4 for multi-symptom cases
2. Provide full history
3. Include all environmental factors
4. Ask for root cause analysis

### **For General Questions:**
1. Use MiniMax M2.5 (FREE, unlimited)
2. Save Qwen/GPT quota for visual/complex tasks
3. Good for routine cultivation advice

---

## 📈 Quota Management

### **Qwen 3.5 Plus (Alibaba):**
- **Quota:** 18K/month, 9K/week, 1.2K/5hr
- **Usage:** Visual plant analysis ONLY
- **Priority:** High (save for photos)

### **GPT-4 (OpenAI):**
- **Limit:** ~100-200 messages/day ($20 plan)
- **Usage:** Complex diagnosis ONLY
- **Priority:** Critical (save for complex cases)

### **MiniMax M2.5:**
- **Limit:** FREE, unlimited
- **Usage:** All general text tasks
- **Priority:** Default

---

## 🔧 Configuration

Set environment variables to customize models:

```bash
# Best model for visual plant analysis
export OPENCLAW_VISUAL_MODEL='bailian/qwen3.5-plus'

# Best model for complex diagnosis
export OPENCLAW_ADVANCED_MODEL='openai-codex:default'

# Default model for general tasks
export OPENCLAW_MODEL='minimax-portal/MiniMax-M2.5'
```

---

**Recommendation:** Use Qwen 3.5 Plus for ALL plant photo analysis - it's the BEST at recognizing plant health issues! 🌿✨
