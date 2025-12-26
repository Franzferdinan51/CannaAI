# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the CannaAI Model directory - a specialized machine learning project focused on plant health classification and model conversion for deployment. The project contains a trained TensorFlow/Keras model for cannabis plant health analysis, along with comprehensive conversion utilities to transform the model into various formats including GGUF for use with LM Studio, llama.cpp, and other inference engines.

## Core Architecture

### Model Components
- **best_model.h5** - Trained MobileNetV2-based TensorFlow/Keras model for plant classification
- **qwen3-vl-plants.ipynb** - Jupyter notebook containing model training and development workflow
- **training_history.png** - Visualization of model training performance metrics

### Conversion Pipeline
The project implements a sophisticated multi-format conversion system:

1. **Primary Conversion Scripts**:
   - `convert-to-gguf.py` - Main conversion script with multiple output format support
   - `simple-convert.py` - Simplified GGUF conversion with error handling
   - `convert-to-gguf.bat` - Windows batch script with interactive conversion options

2. **Conversion Targets**:
   - **ONNX Format** - Cross-platform intermediate format for model interoperability
   - **GGUF Format** - Optimized for inference with llama.cpp and LM Studio
   - **TensorFlow Lite** - For mobile and edge deployment (implied from architecture)

### Integration Components
- **cannai-webapp-integration.py** - Creates integration files for the CannaAI web application
- **lm-studio-enhancer.py** - Optimizes converted models for LM Studio compatibility

## Development Commands

### Model Conversion
```bash
# Quick conversion (Windows)
convert-to-gguf.bat

# Manual conversion with options
python convert-to-gguf.py

# Simple conversion (recommended for testing)
python simple-convert.py

# Web app integration
python cannai-webapp-integration.py
```

### Environment Setup
```bash
# Install conversion dependencies
pip install -r requirements-compatible.txt

# Install full conversion suite
pip install -r requirements-gguf.txt
```

### Dependency Management
- **requirements-compatible.txt** - Stable, tested package versions (TensorFlow 2.13.0, protobuf 3.20.3)
- **requirements-gguf.txt** - Full feature set with optional packages
- **fix-dependencies.bat** - Automated dependency resolution for Windows

## Model Architecture

### Base Model Specifications
- **Architecture**: MobileNetV2 with custom classification head
- **Input Shape**: (224, 224, 3) - RGB images
- **Output**: Multi-class plant health classification
- **Framework**: TensorFlow 2.13.0 / Keras
- **Model Size**: ~15MB (H5 format)

### Classification Capabilities
The model is trained to identify:
- Plant health status (healthy vs various diseases)
- Nutrient deficiencies (including nitrogen deficiency vs purple strains)
- Environmental stress indicators
- Pest and disease identification

## Conversion Workflow

### Supported Output Formats

1. **H5 (Original)** - Native TensorFlow/Keras format
   - Preserves full model architecture and training configuration
   - Compatible with TensorFlow ecosystem
   - Best for further training or fine-tuning

2. **ONNX (Intermediate)** - Open Neural Network Exchange format
   - Cross-platform compatibility
   - Required for some conversion pipelines
   - Supports various inference engines

3. **GGUF (Optimized)** - GPT-Generated Unified Format
   - Optimized for inference speed and file size
   - Compatible with llama.cpp ecosystem
   - Supports quantization (F16, Q8_0, Q4_K_M)

### Conversion Process Flow

1. **Model Analysis** (`convert-to-gguf.py:36-55`)
   - Extracts model architecture and metadata
   - Calculates parameter counts and layer information
   - Saves model specifications to JSON

2. **ONNX Conversion** (`convert-to-gguf.py:57-83`)
   - Converts Keras model to ONNX using tf2onnx
   - Preserves computational graph and weights
   - Enables cross-platform deployment

3. **GGUF Conversion** (`simple-convert.py:80-158`)
   - Implements custom GGUF writer
   - Handles weight extraction and quantization
   - Creates metadata headers for model identification

## Integration Architecture

### LM Studio Integration
The project includes comprehensive LM Studio integration:

1. **Model Scanner** (`cannai-webapp-integration.py:13-226`)
   - Automatically discovers local LM Studio models
   - Extracts model capabilities from filenames
   - Provides model metadata management

2. **AI Provider** (`cannai-webapp-integration.py:233-472`)
   - Manages multiple model providers
   - Handles API communication with LM Studio
   - Supports vision and text generation capabilities

3. **Web App Integration**
   - Next.js API routes for model communication
   - React components for model selection and management
   - Real-time model health monitoring

### Deployment Targets

1. **Local Deployment**:
   - LM Studio with local GGUF models
   - llama.cpp server for API access
   - Direct TensorFlow inference

2. **Web Integration**:
   - Next.js API endpoints
   - React frontend components
   - WebSocket support for real-time interaction

## Development Notes

### Version Compatibility
- **TensorFlow 2.13.0** - Stable version with reliable conversion support
- **protobuf 3.20.3** - Compatible with TensorFlow 2.13, avoids conflicts
- **h5py 3.9.0** - Required for H5 model file handling

### Error Handling
- All conversion scripts include comprehensive error handling
- Dependency checking with automatic installation prompts
- Graceful fallbacks for optional features

### Performance Optimizations
- Float16 quantization for reduced model size
- Batch processing capabilities
- Memory-efficient weight extraction

## File Structure

```
Model/
├── best_model.h5                    # Trained TensorFlow model
├── qwen3-vl-plants.ipynb           # Training notebook
├── training_history.png            # Performance visualization
├── convert-to-gguf.py              # Main conversion script
├── simple-convert.py               # Simplified converter
├── convert-to-gguf.bat             # Windows batch converter
├── cannai-webapp-integration.py    # Web app integration
├── lm-studio-enhancer.py           # LM Studio optimizer
├── requirements-compatible.txt     # Stable dependencies
├── requirements-gguf.txt          # Full dependency suite
├── README-GGUF-Conversion.md       # Conversion documentation
└── fix-dependencies.bat            # Dependency resolver
```

## Common Development Tasks

### Converting a New Model
1. Place the trained model as `best_model.h5`
2. Run `convert-to-gguf.bat` and select conversion options
3. Test the converted model with LM Studio or llama.cpp
4. Create web app integration using `cannai-webapp-integration.py`

### Testing Model Conversion
1. Use `simple-convert.py` for quick validation
2. Check `model_info.json` for extracted specifications
3. Verify GGUF file creation and size optimization
4. Test model loading in target inference engine

### Updating Dependencies
1. Modify `requirements-compatible.txt` with new versions
2. Test compatibility with TensorFlow conversion pipeline
3. Update version numbers in conversion scripts
4. Run `fix-dependencies.bat` to resolve conflicts

## Troubleshooting

### Common Conversion Issues
- **Protobuf conflicts**: Use requirements-compatible.txt with protobuf 3.20.3
- **TensorFlow compatibility**: Ensure TF 2.13.0 for stable conversion support
- **Memory issues**: Close unnecessary applications during conversion
- **Build failures**: Install Visual Studio Build Tools for llama.cpp compilation

### Model Loading Issues
- Verify H5 file integrity and compatibility
- Check model input shape specifications
- Ensure proper preprocessing pipeline
- Test with sample inputs before deployment

This model conversion system provides a robust pipeline for deploying plant classification models across various platforms and inference engines, with particular strength in local deployment scenarios using LM Studio and llama.cpp.