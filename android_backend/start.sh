#!/data/data/com.termux/files/usr/bin/bash
# CannaAI Android - Start Script
# Run this to start the Python backend server

echo "🌱 Starting CannaAI Android Backend..."

cd /data/data/com.termux/files/home/.openclaw/workspace/CannaAI/android_backend

# Start the Python server
python3 cannaai_server.py
