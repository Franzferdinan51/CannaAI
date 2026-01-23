
@echo off
setlocal EnableDelayedExpansion

:: --- Configuration ---
set "VENV_DIR=.venv"
set "BACKEND_DIR=backend"
set "REQUIREMENTS_FILE=%BACKEND_DIR%\requirements.txt"
set "PORT=8000"
set "HOST=0.0.0.0"

:: --- Styling ---
title AgentEvolver Dashboard Launcher
color 0B
cls

echo ===============================================================================
echo      AGENT EVOLVER DASHBOARD LAUNCHER
echo ===============================================================================
echo.

:: --- 1. Prerequisite Check: Python ---
echo [SYSTEM] Checking for Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python is not detected in your PATH.
    echo         Please install Python 3.9+ and add it to your PATH.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%I in ('python --version 2^>^&1') do set "PYTHON_VER=%%I"
echo [OK] Python detected: %PYTHON_VER%
echo.

:: --- 2. Virtual Environment Setup ---
if not exist "%VENV_DIR%" (
    echo [SETUP] Creating Virtual Environment in "%VENV_DIR%"...
    python -m venv %VENV_DIR%
    if !errorlevel! neq 0 (
        color 0C
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [INFO] Virtual environment found.
)

:: --- 3. Activate Virtual Environment ---
echo [SETUP] Activating Virtual Environment...
call "%VENV_DIR%\Scripts\activate.bat"
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)
echo [OK] Environment active (%VENV_DIR%).
echo.

:: --- 4. Install Dependencies ---
if exist "%REQUIREMENTS_FILE%" (
    echo [SETUP] Checking and installing basic dependencies...
    pip install -r "%REQUIREMENTS_FILE%"
    if !errorlevel! neq 0 (
        color 0C
        echo.
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [OK] Basic dependencies installed.
)

:: --- 5. Install AgentEvolver Core (ModelScope) ---
echo.
echo [SETUP] Checking/Installing ModelScope AgentEvolver from GitHub...
echo         Repo: https://github.com/modelscope/AgentEvolver
pip install "git+https://github.com/modelscope/AgentEvolver.git"
if !errorlevel! neq 0 (
    color 0E
    echo [WARNING] Failed to install AgentEvolver from GitHub.
    echo           Please ensure Git is installed and added to PATH.
    echo           The dashboard will run in SIMULATION MODE until this is resolved.
    echo.
) else (
    echo [OK] AgentEvolver Core installed successfully.
)
echo.

:: --- 6. API Key Check (Optional) ---
if "%API_KEY%"=="" (
    echo [INFO] API_KEY environment variable is not set.
    echo        Google Gemini features (Chat, Media, Live) require an API Key.
    echo.
    set /p "USER_KEY=Enter Google Cloud API Key (Leave empty to skip): "
    if not "!USER_KEY!"=="" (
        set "API_KEY=!USER_KEY!"
        echo [OK] API_KEY set for this session.
    )
) else (
    echo [OK] API_KEY found in environment.
)
echo.

:: --- 7. Start Server ---
echo ===============================================================================
echo [START] Starting AgentEvolver Backend Server...
echo [INFO]  Host: %HOST%
echo [INFO]  Port: %PORT%
echo [INFO]  Dashboard URL: http://localhost:%PORT%
echo [INFO]  Press Ctrl+C to stop the server.
echo ===============================================================================
echo.

:: Change to backend directory
cd %BACKEND_DIR%

:: Run Uvicorn
python -m uvicorn server:app --reload --host %HOST% --port %PORT%

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Server crashed or failed to start.
    echo         Check the logs above for details.
    pause
)

call deactivate
