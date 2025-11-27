@echo off
setlocal enabledelayedexpansion

:: CannaAI Startup Script - Windows Native Version with AgentEvolver

cls
echo.
echo ========================================
echo    CannaAI - Cannabis Cultivation AI
echo    Enhanced with AgentEvolver AI
echo ========================================
echo.

echo [STEP 1/6] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found - install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js: %NODE_VERSION%
echo.

echo [STEP 2/6] Checking files...
if not exist "package.json" (
    echo [ERROR] Run from CannaAI root directory
    pause
    exit /b 1
)
echo [SUCCESS] Files found
echo.

echo [STEP 3/6] Checking dependencies...
if not exist "node_modules" (
    echo Installing packages...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Install failed
        pause
        exit /b 1
    )
    echo [SUCCESS] Installed
) else (
    echo [SUCCESS] Dependencies OK
)
echo.

echo [STEP 4/6] Checking database...
set DB_FOUND=0
if exist "db\cannaai.db" (
    set DB_FOUND=1
    echo [SUCCESS] Found db\cannaai.db
) else if exist "db\custom.db" (
    set DB_FOUND=1
    echo [SUCCESS] Found db\custom.db
) else (
    echo Initializing database...
    call npm run db:push
    echo [INFO] Database ready
)
echo.

echo [STEP 5/6] Checking ports...
set SELECTED_PORT=3000
netstat -ano | findstr /C:":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 3000 in use
    echo 1. Kill process  2. Use 3001  3. Exit
    set /p port_choice="Choice: "
    if "!port_choice!"=="2" set SELECTED_PORT=3001
    if "!port_choice!"=="3" goto END
)
echo Using port %SELECTED_PORT%
echo.

echo [STEP 6/6] Checking AgentEvolver...
set AGENTEVOLVER_AVAILABLE=0
if exist "agentevolver" (
    set AGENTEVOLVER_AVAILABLE=1
    echo [SUCCESS] AgentEvolver directory found
) else (
    echo [INFO] AgentEvolver not installed (optional)
)
echo.

echo ========================================
echo    Select Startup Mode
echo ========================================
echo.
if %AGENTEVOLVER_AVAILABLE% equ 1 (
    echo 1. Development Mode
    echo 2. Development Mode + AgentEvolver
    echo 3. Production Mode
    echo 4. Production Mode + AgentEvolver
    echo 5. AgentEvolver Server Only
    echo 6. Development Mode + DB Reset
    echo 7. Install Dependencies Only
    echo 8. Exit
    echo.
    set /p choice="Enter choice (1-8): "
) else (
    echo 1. Development Mode
    echo 2. Production Mode
    echo 3. Development Mode + DB Reset
    echo 4. Install Dependencies Only
    echo 5. Exit
    echo.
    set /p choice="Enter choice (1-5): "
)

if "!choice!"=="1" goto DEV
if "!choice!"=="2" goto DEV_AGENT
if "!choice!"=="3" goto PROD
if "!choice!"=="4" goto PROD_AGENT
if "!choice!"=="5" goto AGENT_ONLY
if "!choice!"=="6" goto RESET
if "!choice!"=="7" goto INSTALL
goto END

:DEV
cls
echo ========================================
echo    Development Mode
echo ========================================
echo.
echo Server: http://127.0.0.1:%SELECTED_PORT%
echo.
set PORT=%SELECTED_PORT%
set NODE_ENV=development
npm run dev
if %errorlevel% neq 0 pause
goto END

:DEV_AGENT
cls
echo ========================================
echo    Development Mode + AgentEvolver
echo ========================================
echo.
echo Server: http://127.0.0.1:%SELECTED_PORT%
echo AgentEvolver: http://localhost:8001
echo.

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found - AgentEvolver requires Python
    pause
    exit /b 1
)

:: Install AgentEvolver dependencies if needed
echo Installing AgentEvolver dependencies...
cd agentevolver
python -m pip install -r requirements.txt >nul 2>&1
cd ..

echo Starting AgentEvolver...
start "AgentEvolver Server" /min cmd /c "cd agentevolver && python server.py"

echo Waiting for AgentEvolver to start...
timeout /t 3 /nobreak >nul 2>&1

set PORT=%SELECTED_PORT%
set NODE_ENV=development
echo Starting CannaAI...
npm run dev
if %errorlevel% neq 0 pause
goto END

:PROD
cls
echo ========================================
echo    Production Mode
echo ========================================
echo.
echo Building for production...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    pause
    exit /b 1
)
echo Starting production server...
set PORT=%SELECTED_PORT%
set NODE_ENV=production
npm run start
if %errorlevel% neq 0 pause
goto END

:PROD_AGENT
cls
echo ========================================
echo    Production Mode + AgentEvolver
echo ========================================
echo.

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found - AgentEvolver requires Python
    pause
    exit /b 1
)

echo Building for production...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    pause
    exit /b 1
)

echo Installing AgentEvolver dependencies...
cd agentevolver
python -m pip install -r requirements.txt >nul 2>&1
cd ..

echo Starting AgentEvolver...
start "AgentEvolver Server" /min cmd /c "cd agentevolver && python server.py"
timeout /t 3 /nobreak >nul 2>&1

echo Starting production server...
set PORT=%SELECTED_PORT%
set NODE_ENV=production
npm run start
if %errorlevel% neq 0 pause
goto END

:AGENT_ONLY
cls
echo ========================================
echo    AgentEvolver Server Only
echo ========================================
echo.

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found - install from https://python.org/
    pause
    exit /b 1
)

if not exist "agentevolver" (
    echo [ERROR] AgentEvolver directory not found
    pause
    exit /b 1
)

echo Installing dependencies...
cd agentevolver
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Install failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo Starting AgentEvolver Server...
echo Server: http://localhost:8001
echo Press Ctrl+C to stop
echo.
cd agentevolver
python server.py
cd ..
goto END

:RESET
cls
echo ========================================
echo    Database Reset
echo ========================================
echo.
echo WARNING: This will delete all data!
set /p confirm="Continue? (y/N): "
if /i not "!confirm!"=="y" goto END
call npm run db:reset
echo Starting development mode...
echo.
goto DEV

:INSTALL
cls
echo ========================================
echo    Installing Dependencies
echo ========================================
echo.
call npm install
if %errorlevel% equ 0 (
    if exist "agentevolver" (
        echo Installing AgentEvolver dependencies...
        cd agentevolver
        python -m pip install -r requirements.txt
        cd ..
    )
    echo.
    echo [SUCCESS] All dependencies installed
) else (
    echo [ERROR] Install failed
)
echo.
pause
goto END

:END
cls
echo.
echo ========================================
echo    CannaAI Session Ended
echo ========================================
echo.
echo Thank you for using CannaAI!
echo.
pause
exit /b 0
