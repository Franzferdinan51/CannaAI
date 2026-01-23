@echo off
echo [AgentEvolver] Starting Installation...

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    exit /b 1
)

:: Backend Setup
echo [AgentEvolver] Setting up Backend...
cd backend
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate

echo Installing requirements...
pip install -r requirements.txt
pip install "git+https://github.com/modelscope/AgentEvolver.git"
cd ..

:: Frontend Setup
echo [AgentEvolver] Setting up Frontend...
call npm install
echo Building Frontend...
call npm run build

echo [AgentEvolver] Installation Complete.
