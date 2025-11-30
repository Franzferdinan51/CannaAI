# AgentEvolver Integration for CannaAI

## Overview

AgentEvolver is a self-evolving AI framework that provides autonomous learning capabilities for the CannaAI cannabis cultivation management system. It implements a service-oriented architecture with three core self-evolution capabilities:

1. **Self-Questioning Task Generation** - The system generates and asks itself questions to explore solutions
2. **Self-Navigating Exploration** - Autonomous exploration of solution spaces
3. **Self-Attributing Learning** - Credit assignment and causal inference for learning from outcomes

## Architecture

### Service-Oriented Dataflow

AgentEvolver runs as a separate microservice that CannaAI communicates with via REST API. This architecture provides:

- **Separation of Concerns** - AI evolution logic isolated from CannaAI core
- **Scalability** - Can be scaled independently
- **Flexibility** - Can be replaced or upgraded without affecting CannaAI
- **Real-time Processing** - Event-driven architecture for immediate feedback
- **State Persistence** - Learning state saved across restarts

### Integration Points

```
┌─────────────────┐         HTTP/REST         ┌──────────────────┐
│   CannaAI       │ ◄──────────────────────► │   AgentEvolver   │
│   (Port 3000)   │                          │   (Port 8001)    │
└─────────────────┘                          └──────────────────┘
       │                                              │
       │                                              ▼
       │                                      ┌──────────────┐
       └──────────────────────────────────────► Self-Evolving │
                                                AI Engine     │
                                                 └──────────────┘
```

## Quick Start

### 1. Installation

Run the installation script to set up AgentEvolver:

```bash
cd agentevolver
bash install.sh
```

This will:
- Check Python 3.8+ installation
- Create virtual environment
- Install dependencies
- Set up configuration files
- Create launcher scripts

### 2. Configuration

Edit `config.yaml` to customize settings:

```yaml
# Core settings
agentevolver:
  enabled: true
  evolution_level: "advanced"  # basic, advanced, expert
  learning_rate: 0.1
  self_questioning: true
  self_navigation: true
  self_attribution: true

# CannaAI integration
cannaai:
  integration:
    enabled: true
    cors_origins:
      - "http://localhost:3000"
```

### 3. Starting AgentEvolver

#### Option A: Use launcher.py (Recommended)

```bash
python launcher.py
```

Or with custom config:

```bash
python launcher.py --config /path/to/config.yaml --port 8001
```

#### Option B: Use startup script

```bash
./start.sh
```

#### Option C: From CannaAI

Select option 3 or 4 from CannaAI startup menu to start with AgentEvolver.

### 4. Verification

Check if AgentEvolver is running:

```bash
curl http://localhost:8001/health
```

Or use the status script:

```bash
./status.sh
```

## Core Features

### Self-Questioning Task Generation

The system generates questions about tasks to improve understanding:

- **Meta-Cognition** - "What am I trying to accomplish?"
- **Challenge Identification** - "What could go wrong?"
- **Strategy Formation** - "What's the best approach?"
- **Reflection** - "Did I succeed? Why or why not?"

Example:
```
Input: "Analyze this plant for nutrient deficiencies"

Self-Questions Generated:
1. What stage of growth is this plant?
2. What symptoms are visible?
3. What environmental factors might contribute?
4. What is the grower's experience level?
5. What interventions are available?
```

### Self-Navigating Exploration

Autonomous exploration of solution spaces:

- **Exploration vs Exploitation** - Balances trying new approaches vs using known good ones
- **Path Memory** - Remembers successful exploration paths
- **Adaptive Navigation** - Adjusts strategy based on context
- **Multi-Path Search** - Explores multiple solution branches simultaneously

### Self-Attributing Learning

Credit assignment and causal inference:

- **Temporal Difference Learning** - Learns from the difference between predictions
- **Causal Inference** - Determines what actions led to outcomes
- **Credit Assignment** - Attributes success/failure to specific decisions
- **Reward Shaping** - Optimizes learning signals

## API Reference

### Base URL

```
http://localhost:8001
```

### Endpoints

#### Health Check

```http
GET /health
```

Returns server health status and metrics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-27T10:00:00Z",
  "metrics": {
    "total_optimizations": 150,
    "successful_evolutions": 142,
    "failed_evolutions": 8,
    "average_improvement": 0.075
  }
}
```

#### Prompt Optimization

```http
POST /optimize
```

Optimize prompts using self-evolving AI.

**Request Body:**
```json
{
  "prompt": "Analyze this plant for health issues",
  "context": {
    "strain": "Blue Dream",
    "symptoms": ["yellow leaves", "slow growth"],
    "environment": {
      "temperature": 75,
      "humidity": 60
    }
  },
  "task_type": "analysis"
}
```

**Response:**
```json
{
  "success": true,
  "optimized_prompt": "As a cannabis cultivation expert, analyze this Blue Dream cannabis plant for health issues including yellow leaves and slow growth. Consider the environment (75°F, 60% humidity). Provide specific, actionable recommendations.",
  "improvement": 0.087,
  "suggestions": [
    {
      "type": "domain_expertise",
      "description": "Added cannabis cultivation expertise context"
    },
    {
      "type": "strain_specificity",
      "description": "Added Blue Dream strain-specific context"
    }
  ],
  "confidence": 0.912,
  "processing_time": 0.023
}
```

#### Get Metrics

```http
GET /metrics
```

Returns performance metrics.

**Response:**
```json
{
  "total_optimizations": 150,
  "successful_evolutions": 142,
  "failed_evolutions": 8,
  "average_improvement": 0.075,
  "accuracy": 0.89,
  "response_time": 0.031,
  "evolution_progress": 0.67
}
```

#### Evolution History

```http
GET /history?limit=50
```

Returns evolution history.

**Response:**
```json
{
  "history": [
    {
      "id": "uuid-123",
      "timestamp": "2025-11-27T10:00:00Z",
      "original_prompt": "Analyze this plant",
      "optimized_prompt": "Analyze this cannabis plant",
      "improvement": 0.05,
      "task_type": "analysis",
      "processing_time": 0.02
    }
  ],
  "total_records": 150
}
```

#### Update Configuration

```http
POST /config
```

Update AgentEvolver configuration.

**Request Body:**
```json
{
  "enabled": true,
  "evolution_level": "advanced",
  "learning_rate": 0.1,
  "auto_optimization": true
}
```

**Response:**
```json
{
  "success": true,
  "config": { ... }
}
```

## Configuration Guide

### Configuration File Structure

See `config.yaml` for full configuration options:

```yaml
# Server Configuration
server:
  host: "0.0.0.0"      # Listen address
  port: 8001            # Port number
  reload: false         # Auto-reload on changes

# AgentEvolver Core
agentevolver:
  enabled: true
  mode: "service"
  evolution_level: "advanced"
  learning_rate: 0.1
  performance_threshold: 0.8
  auto_optimization: true

  # Self-Evolution Capabilities
  self_questioning: true
  self_navigation: true
  self_attribution: true

# CannaAI Integration
cannaai:
  integration:
    enabled: true
    cors_origins:
      - "http://localhost:3000"
    api_prefix: "/api/agentevolver"

  # Feature Flags
  features:
    prompt_optimization: true
    performance_tracking: true
    cannabis_expertise: true
    strain_specific_analysis: true

# Dataflow Architecture
dataflow:
  service_oriented: true
  real_time_processing: true
  event_driven: true
  state_management: "persistent"

# Logging
logging:
  level: "INFO"
  file: "logs/agentevolver.log"
  max_size: "10MB"
  backup_count: 5
```

### Environment Variables

Override configuration with environment variables:

```bash
export AGENTEVOLVER_PORT=8001
export AGENTEVOLVER_LEVEL=expert
export AGENTEVOLVER_AUTO_OPT=true
python launcher.py
```

## Development

### Project Structure

```
agentevolver/
├── launcher.py          # Main entry point
├── server.py            # FastAPI server
├── config.yaml          # Configuration file
├── config.local.yaml    # Local overrides
├── install.sh           # Installation script
├── start.sh             # Start script
├── stop.sh              # Stop script
├── status.sh            # Status check script
├── test_client.py       # Test client
├── requirements.txt     # Python dependencies
├── README.md            # This file
├── logs/                # Log files
├── data/                # Database and state
├── cache/               # Cache files
├── backups/             # Backup files
└── plugins/             # Plugin directory
    └── cannaai/         # CannaAI-specific plugins
```

### Testing

Run the test client:

```bash
python test_client.py
```

This will test:
- Server connectivity
- Health endpoints
- Prompt optimization
- Metrics retrieval

### Custom Development

#### Creating Plugins

1. Create plugin file in `plugins/cannaai/`:

```python
# plugins/cannaai/strain_analyzer.py

def analyze_strain(strain_name, context):
    # Your plugin logic
    return {
        "recommended_nutrients": [...],
        "optimal_conditions": {...}
    }
```

2. Register plugin in configuration:

```yaml
plugins:
  core_plugins:
    - "strain_analyzer"
```

#### Extending Self-Evolution

To add new self-evolution capabilities, extend the `AgentEvolverCore` class in `server.py`:

```python
class AgentEvolverCore:
    def self_diagnosis(self):
        """Self-diagnostic capabilities"""
        # Implementation
        pass
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```
Error: [Errno 10048] Only one usage of each socket address
```

**Solution:**
```bash
# Check what's using the port
netstat -ano | findstr :8001

# Kill the process
taskkill /PID <PID> /F

# Or use a different port
python launcher.py --port 8002
```

#### 2. Python Not Found

```
Error: python is not recognized as an internal or external command
```

**Solution:**
- Install Python 3.8+ from https://python.org
- Ensure Python is in your PATH
- Use full path: `C:\Python38\python.exe launcher.py`

#### 3. Module Not Found

```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Install dependencies
pip install -r requirements.txt

# Or run install script
bash install.sh

# Or use virtual environment
source .venv/bin/activate
pip install -r requirements.txt
```

#### 4. Configuration Not Loading

```
Warning: Failed to load config from config.yaml
```

**Solution:**
```bash
# Check YAML syntax
python -c "import yaml; yaml.safe_load(open('config.yaml'))"

# Check file permissions
ls -l config.yaml

# Validate with launcher
python launcher.py --status
```

#### 5. AgentEvolver Not Starting

**Check logs:**
```bash
# Check launcher status
python launcher.py --status

# Check server logs
cat logs/agentevolver.log

# Test manually
python launcher.py --help
python server.py
```

### Debug Mode

Enable debug logging:

```yaml
# config.yaml
logging:
  level: "DEBUG"
```

Or via command line:

```bash
python launcher.py 2>&1 | tee debug.log
```

## Performance Tuning

### Optimization Settings

```yaml
# config.yaml
performance:
  optimization:
    enabled: true
    min_improvement_threshold: 0.01
    optimization_frequency: 100
    batch_size: 50

  # Caching
  caching:
    enabled: true
    ttl: 3600
    max_size: 1000
```

### Resource Usage

Monitor resource usage:

```bash
# Check CPU and memory
top -p $(pgrep -f launcher.py)

# Check disk usage
du -sh logs/ data/ cache/

# Monitor network
netstat -ano | findstr :8001
```

## Security Considerations

### Authentication (Production)

For production deployments, enable authentication:

```yaml
security:
  authentication:
    enabled: true
    method: "api_key"  # api_key, jwt, oauth
    api_key: "your-secret-key"
```

### Rate Limiting

```yaml
security:
  rate_limiting:
    enabled: true
    requests_per_minute: 1000
```

### CORS

Limit CORS origins in production:

```yaml
cannaai:
  integration:
    cors_origins:
      - "https://yourdomain.com"
```

## FAQ

### Q: What's the difference between launcher.py and server.py?

**A:** `launcher.py` is the main entry point that:
- Loads configuration
- Initializes the AgentEvolver framework
- Manages the server lifecycle
- Provides command-line interface

`server.py` contains the FastAPI server implementation and business logic.

### Q: Can I run AgentEvolver without CannaAI?

**A:** Yes, AgentEvolver is designed as a standalone service. You can run it independently and integrate it with any application.

### Q: How do I integrate with my own application?

**A:** Send HTTP requests to the AgentEvolver API. See the API Reference section for endpoints and examples.

### Q: Is the full AgentEvolver framework required?

**A:** No, the current implementation includes a mock server that provides basic functionality. Install the full framework with `pip install agentevolver` for advanced features.

### Q: How does self-evolution work?

**A:** The system continuously:
1. Generates questions about tasks (self-questioning)
2. Explores solution spaces (self-navigation)
3. Learns from outcomes (self-attribution)
4. Updates its own parameters based on feedback
5. Applies learnings to future tasks

### Q: Can I disable specific features?

**A:** Yes, configure in `config.yaml`:

```yaml
agentevolver:
  self_questioning: false
  self_navigation: false
  self_attribution: false
```

## Support

For issues or questions:
1. Check the logs: `logs/agentevolver.log`
2. Run diagnostics: `./status.sh`
3. Test connectivity: `python test_client.py`
4. Review configuration: `python launcher.py --status`

## License

AgentEvolver is part of the CannaAI project. See the main project license for details.

---

**Version:** 1.0.0
**Last Updated:** 2025-11-27
