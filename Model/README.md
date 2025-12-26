# CannaAI Model Conversion Tools

Clean and organized toolkit for converting ML models to GGUF format for LM Studio integration.

## 📁 Directory Structure

```
├── conversion-tools/          # Model conversion scripts
│   ├── robust-convert.py      # Main GGUF converter with fallbacks
│   └── fix-dependencies-312.py # Python 3.12 dependency resolver
├── integration-scripts/       # Web app integration
│   ├── cannai-ai-provider.js  # AI provider integration
│   └── lmstudio-model-scanner.js # Model discovery utility
├── src/                       # React components & API routes
│   └── components/
│       └── lmstudio/
│           └── LMStudioProvider.tsx
└── docs/
    └── CLAUDE.md              # Full project documentation
```

## 🚀 Quick Start

### Convert a Model to GGUF
```bash
python conversion-tools/robust-convert.py
```

### Fix Python Dependencies
```bash
python conversion-tools/fix-dependencies-312.py
```

### Web App Integration
1. Copy `integration-scripts/` to your web app
2. Copy `src/` components to your React app
3. Install dependencies and run

## 📋 Ready for New Model

This folder is now clean and ready for your new Qwen3-VL model from Kaggle. The conversion tools will work with any model you create.

---

*Cleaned and organized November 6, 2025*