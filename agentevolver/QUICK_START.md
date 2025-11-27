# AgentEvolver Quick Start Guide

## Installation (One-Time Setup)

```bash
cd agentevolver
bash install.sh
```

This will:
- Set up Python virtual environment
- Install all dependencies
- Create required directories
- Create launcher scripts (start.sh, stop.sh, status.sh)

## Starting AgentEvolver

### Option 1: From CannaAI (Recommended)
```bash
startup.bat
# Select option 3 or 4
```

### Option 2: Direct Launch
```bash
cd agentevolver
python launcher.py
```

### Option 3: Using Scripts
```bash
cd agentevolver
./start.sh
```

## Checking Status

```bash
curl http://localhost:8001/health
```

Or use the script:
```bash
cd agentevolver
./status.sh
```

## Testing

```bash
cd agentevolver
python test_client.py
```

## Configuration

Edit configuration:
```bash
agentevolver/config.yaml
```

Local overrides (optional):
```bash
agentevolver/config.local.yaml
```

## API Endpoints

- **Health:** `GET http://localhost:8001/health`
- **Optimize:** `POST http://localhost:8001/optimize`
- **Metrics:** `GET http://localhost:8001/metrics`
- **History:** `GET http://localhost:8001/history`

## Troubleshooting

### Port already in use
```bash
# Kill existing process
taskkill /PID <PID> /F

# Or use different port
python launcher.py --port 8002
```

### Module not found
```bash
cd agentevolver
pip install -r requirements.txt
pip install PyYAML
```

### Check logs
```bash
cat logs/agentevolver.log
```

## Files Created by install.sh

```
agentevolver/
├── .venv/                    # Virtual environment
├── logs/agentevolver.log     # Log file
├── data/                     # Database files
├── cache/                    # Cache directory
├── backups/                  # Backup directory
├── start.sh                  # Start script
├── stop.sh                   # Stop script
└── status.sh                 # Status script
```

## Key Features

✅ Self-questioning task generation
✅ Self-navigating exploration
✅ Self-attributing learning
✅ Service-oriented architecture
✅ YAML configuration
✅ Plugin support
✅ State persistence
✅ Event-driven dataflow

## Need Help?

- Full docs: `README.md`
- Installation fix summary: `../AGENTEVOLVER_INTEGRATION_FIX.md`
- Check status: `python launcher.py --status`
- View help: `python launcher.py --help`
