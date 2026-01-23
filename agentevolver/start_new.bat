@echo off
echo [AgentEvolver] Starting Server...
cd backend
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate
) else (
    echo [WARNING] Virtual environment not found, trying global python...
)
python server.py
