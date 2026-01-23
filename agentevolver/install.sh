#!/bin/bash
echo "[AgentEvolver] Starting Installation..."

# Backend Setup
echo "[AgentEvolver] Setting up Backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install "git+https://github.com/modelscope/AgentEvolver.git"
cd ..

# Frontend Setup
echo "[AgentEvolver] Setting up Frontend..."
npm install
npm run build

echo "[AgentEvolver] Installation Complete."
