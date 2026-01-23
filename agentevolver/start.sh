#!/bin/bash
echo "[AgentEvolver] Starting Server..."
cd backend
source .venv/bin/activate
python3 server.py
