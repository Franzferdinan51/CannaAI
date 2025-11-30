@echo off
setlocal enabledelayedexpansion

:: CannaAI Pro - Cannabis Cultivation AI
:: Production-Ready Startup Script with Enhanced Photo Analysis System

cls
echo.
echo ========================================
echo    CannaAI - Cannabis Cultivation AI
echo    Enhanced with Professional Photo Analysis
echo    Version 4.0 - Production Ready
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
    echo [SUCCESS] Backend dependencies installed
) else (
    :: Check if concurrently is installed (required for npm run dev)
    if not exist "node_modules\.bin\concurrently" (
        echo [WARNING] concurrently package not found in node_modules\.bin
        echo Installing missing dependencies...
        call npm install
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to install dependencies
            pause
            exit /b 1
        )
        echo [SUCCESS] Dependencies installed
    ) else (
        echo [SUCCESS] Backend dependencies OK
    )
)

:: Check NewUI frontend dependencies
if exist "NewUI\cannaai-pro" (
    if not exist "NewUI\cannaai-pro\node_modules" (
        echo Installing frontend dependencies...
        cd NewUI\cannaai-pro
        call npm install
        if !errorlevel! neq 0 (
            echo [WARNING] Frontend dependency install failed
            echo Frontend features may not work correctly
        ) else (
            echo [SUCCESS] Frontend dependencies installed
        )
        cd ..\..
    ) else (
        echo [SUCCESS] Frontend dependencies OK
    )
) else (
    echo [WARNING] NewUI directory not found - frontend features may not work
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
    if %errorlevel% neq 0 (
        echo [WARNING] Database setup had issues, continuing anyway...
    ) else (
        echo [SUCCESS] Database ready
    )
)
echo.

echo [STEP 5/6] Checking Python for AgentEvolver...
where python >nul 2>nul
if !errorlevel! neq 0 (
    echo [WARNING] Python not found - AgentEvolver features will be unavailable
    echo AgentEvolver requires Python 3.8+ from https://python.org/
    echo To set up AgentEvolver: cd agentevolver ^&^& bash install.sh
) else (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo [SUCCESS] Python: !PYTHON_VERSION!
    echo [INFO] AgentEvolver features available
    if exist "agentevolver\install.sh" (
        echo [INFO] Run: cd agentevolver ^&^& bash install.sh
        echo [INFO] For proper AgentEvolver setup with YAML config
    )
)
echo.

echo [STEP 6/6] Port check...
netstat -ano | findstr :3000 >nul
if not errorlevel 1 (
    echo [WARNING] Port 3000 already in use
    echo The following processes are using port 3000:
    netstat -ano | findstr :3000
    echo.
    set /p kill_process="Kill the process? (y/N): "
    if /i "!kill_process!"=="y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
            echo Killing PID: %%a
            taskkill /PID %%a /F >nul 2>&1
        )
        timeout /t 2 /nobreak >nul
    )
)
echo.

echo ========================================
echo Startup Options:
echo.
echo Enhanced Photo Analysis Modes:
echo 1. Development Mode - Full Photo Analysis v4.0
echo    * Real AI Trichome Analysis
echo    * Multi-Provider AI Integration
echo    * 40+ Diagnostic Categories
echo    * Analytics Dashboard
echo.
echo 2. Production Mode - Optimized Build
echo    * Faster Performance
echo    * All Photo Analysis Features
echo.
echo AgentEvolver AI Modes:
echo 3. Development + AgentEvolver
echo    * Self-Questioning Task Generation
echo    * Self-Navigating Exploration
echo    * Self-Attributing Learning
echo    * Service-Oriented Architecture
echo    * Enhanced Photo Analysis
echo.
echo 4. Production + AgentEvolver
echo    * Self-Evolving AI in Production
echo    * All Self-Evolution Features
echo    * Complete Integration
echo.
echo Utility Modes:
echo 5. Install Dependencies Only
echo.
echo 6. Reset Database and Start Dev Mode
echo.
echo 7. AgentEvolver Server Only
echo    ^(Run install.sh first for full setup^)
echo.
echo 8. Exit
echo ========================================
set /p choice="Enter your choice (1-8): "

if "!choice!"=="1" goto DEV_MODE
if "!choice!"=="2" goto PROD_MODE
if "!choice!"=="3" goto DEV_MODE_AGENTEVOLVER
if "!choice!"=="4" goto PROD_MODE_AGENTEVOLVER
if "!choice!"=="5" goto INSTALL_ONLY
if "!choice!"=="6" goto RESET_MODE
if "!choice!"=="7" goto AGENTEVOLVER_ONLY
if "!choice!"=="8" goto END

echo [ERROR] Invalid choice. Please enter 1-8.
pause
goto END

:DEV_MODE
echo.
echo [INFO] Starting CannaAI in Development Mode...
echo.
echo Features enabled:
echo * Enhanced Photo Analysis v4.0
echo * Real AI Trichome Analysis
echo * Multi-Provider AI Integration (8 providers)
echo * 40+ Diagnostic Categories
echo * Analytics Dashboard (Real-time)
echo * Automation System (IF-THEN workflows)
echo * Export/Import System (6 formats)
echo * Notification System (Multi-channel)
echo * Mobile PWA Support
echo * Comprehensive Testing Suite (345+ tests)
echo.
echo Server will be available at: http://localhost:3000
echo.
echo [INFO] Starting server...
call npm run dev
if %errorlevel% neq 0 (
    echo [ERROR] Development server failed to start
    echo This may be due to missing dependencies or port conflicts
    pause
    exit /b 1
)
goto END

:PROD_MODE
echo.
echo [INFO] Building for production...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [SUCCESS] Build completed
echo.
echo [INFO] Starting Production Server...
echo Server will be available at: http://localhost:3000
echo.
call npm run start
if %errorlevel% neq 0 (
    echo [ERROR] Production server failed to start
    pause
    exit /b 1
)
goto END

:DEV_MODE_AGENTEVOLVER
echo.
echo [INFO] Starting CannaAI + AgentEvolver in Development Mode...
echo.

:: Check if Python is available
where python >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Python is not installed or not in PATH
    echo AgentEvolver requires Python 3.8+ to run
    echo Please install Python from https://python.org/
    echo [INFO] Continuing without AgentEvolver...
    echo.
)

:: Install AgentEvolver dependencies if exists
if exist "agentevolver" (
    :: Only install/start AgentEvolver if Python is available
    where python >nul 2>nul
    if not errorlevel 1 (
        echo [INFO] Installing AgentEvolver dependencies...
        cd agentevolver
        python -m pip install -r requirements.txt >nul 2>&1
        if errorlevel 1 (
            echo [WARNING] Some AgentEvolver dependencies may have failed to install
            echo AgentEvolver may not function properly
        ) else (
            echo [SUCCESS] AgentEvolver dependencies installed
        )
        cd ..

        :: Check if launcher.py exists
        if exist "agentevolver\launcher.py" (
            :: Start AgentEvolver using launcher.py
            echo [INFO] Starting AgentEvolver server...
            start "AgentEvolver Server" /min cmd /c "cd agentevolver && python launcher.py"
            timeout /t 3 /nobreak >nul
            echo [SUCCESS] AgentEvolver launcher started
            echo [INFO] AgentEvolver running on http://localhost:8001
            echo [INFO] Configuration: agentevolver\config.yaml
        ) else if exist "agentevolver\server.py" (
            :: Fallback to server.py for backward compatibility
            echo [WARNING] launcher.py not found, using legacy server.py
            echo [WARNING] Please run install.sh to set up proper AgentEvolver
            start "AgentEvolver Server" /min cmd /c "cd agentevolver && python server.py"
            timeout /t 3 /nobreak >nul
            echo [INFO] AgentEvolver running on http://localhost:8001
        ) else (
            echo [ERROR] No AgentEvolver entry point found
            echo [INFO] Please ensure launcher.py or server.py exists
        )
    ) else (
        echo [INFO] Python not found. Skipping AgentEvolver installation and startup.
        echo [INFO] Install Python to enable AgentEvolver features.
    )
) else (
    echo [WARNING] AgentEvolver directory not found. Running without AgentEvolver.
    echo [INFO] To enable AgentEvolver, create the agentevolver directory with required files.
)

echo.
echo [INFO] Starting CannaAI Development Server...
echo.
echo Features enabled:
echo * Enhanced Photo Analysis v4.0
echo * Real AI Trichome Analysis
echo * AgentEvolver Self-Evolving AI
echo   - Self-questioning task generation
echo   - Self-navigating exploration
echo   - Self-attributing learning
echo   - Service-oriented architecture
echo * Multi-Provider AI Integration
echo * Continuous Learning ^^^& Adaptation
echo.
echo CannaAI:  http://localhost:3000
if exist "agentevolver" (
    if exist "agentevolver\launcher.py" (
        echo AgentEvolver: http://localhost:8001 ^(launcher.py^)
    ) else if exist "agentevolver\server.py" (
        echo AgentEvolver: http://localhost:8001 ^(legacy mode^)
    )
)
echo.
echo [INFO] Starting server...
call npm run dev
if !errorlevel! neq 0 (
    echo [ERROR] Development server failed to start
    echo This may be due to missing dependencies or port conflicts
    pause
    exit /b 1
)
goto END

:PROD_MODE_AGENTEVOLVER
echo.
echo [INFO] Building and Starting CannaAI + AgentEvolver Production Mode...
echo.

:: Check if Python is available
where python >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Python is not installed or not in PATH
    echo AgentEvolver requires Python 3.8+ to run
    echo Please install Python from https://python.org/
    echo [INFO] Continuing without AgentEvolver...
    echo.
)

:: Install AgentEvolver dependencies if exists
if exist "agentevolver" (
    :: Only install/start AgentEvolver if Python is available
    where python >nul 2>nul
    if not errorlevel 1 (
        echo [INFO] Installing AgentEvolver dependencies...
        cd agentevolver
        python -m pip install -r requirements.txt >nul 2>&1
        if errorlevel 1 (
            echo [WARNING] Some AgentEvolver dependencies may have failed to install
            echo AgentEvolver may not function properly
        ) else (
            echo [SUCCESS] AgentEvolver dependencies installed
        )
        cd ..

        :: Check if launcher.py exists
        if exist "agentevolver\launcher.py" (
            :: Start AgentEvolver using launcher.py
            echo [INFO] Starting AgentEvolver server...
            start "AgentEvolver Server" /min cmd /c "cd agentevolver && python launcher.py"
            timeout /t 3 /nobreak >nul
            echo [SUCCESS] AgentEvolver launcher started
            echo [INFO] AgentEvolver running on http://localhost:8001
            echo [INFO] Configuration: agentevolver\config.yaml
        ) else if exist "agentevolver\server.py" (
            :: Fallback to server.py for backward compatibility
            echo [WARNING] launcher.py not found, using legacy server.py
            echo [WARNING] Please run install.sh to set up proper AgentEvolver
            start "AgentEvolver Server" /min cmd /c "cd agentevolver && python server.py"
            timeout /t 3 /nobreak >nul
            echo [INFO] AgentEvolver running on http://localhost:8001
        ) else (
            echo [ERROR] No AgentEvolver entry point found
            echo [INFO] Please ensure launcher.py or server.py exists
        )
    ) else (
        echo [INFO] Python not found. Skipping AgentEvolver installation and startup.
        echo [INFO] Install Python to enable AgentEvolver features.
    )
) else (
    echo [WARNING] AgentEvolver directory not found. Building without AgentEvolver.
)

echo [INFO] Building CannaAI for Production...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [SUCCESS] Build completed
echo.
echo [INFO] Starting Production Server...
echo CannaAI:  http://localhost:3000
if exist "agentevolver" (
    if exist "agentevolver\launcher.py" (
        echo AgentEvolver: http://localhost:8001 ^(launcher.py^)
    ) else if exist "agentevolver\server.py" (
        echo AgentEvolver: http://localhost:8001 ^(legacy mode^)
    )
)
echo.
call npm run start
if !errorlevel! neq 0 (
    echo [ERROR] Production server failed to start
    pause
    exit /b 1
)
goto END

:AGENTEVOLVER_ONLY
echo.
echo [INFO] Starting AgentEvolver Server Only...
echo.

:: Check if Python is available
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo AgentEvolver requires Python 3.8+ to run
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

:: Display Python version
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [INFO] Python version: %PYTHON_VERSION%

:: Install AgentEvolver dependencies
if exist "agentevolver" (
    echo [INFO] Installing AgentEvolver dependencies...
    cd agentevolver
    call python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install AgentEvolver dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [ERROR] AgentEvolver directory not found.
    echo [INFO] Please create the agentevolver directory with required files.
    pause
    exit /b 1
)

echo [SUCCESS] Dependencies installed successfully
echo [INFO] Starting AgentEvolver server...
echo [INFO] Server will be available at: http://localhost:8001
echo [INFO] Press Ctrl+C to stop the server
echo.
echo [AGENTEVOLVER] Self-Evolving AI Capabilities:
echo    - Self-questioning task generation
echo    - Self-navigating exploration
echo    - Self-attributing learning
echo    - Service-oriented dataflow architecture
echo    - Continuous capability evolution
echo    - Cannabis cultivation expertise
echo.

if exist "agentevolver" (
    cd agentevolver
    :: Check for launcher.py first (recommended entry point)
    if exist "launcher.py" (
        echo [INFO] Starting AgentEvolver with launcher.py...
        echo [INFO] Configuration: config.yaml
        echo [INFO] Features: Self-questioning, self-navigating, self-attributing
        echo.
        call python launcher.py
    ) else if exist "server.py" (
        echo [WARNING] Using legacy server.py - launcher.py not found
        echo [WARNING] Run install.sh for proper setup
        echo.
        call python server.py
    ) else (
        echo [ERROR] No entry point found (launcher.py or server.py)
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [ERROR] AgentEvolver directory not found.
    pause
    exit /b 1
)
goto END

:INSTALL_ONLY
echo.
echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Install failed
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed
echo.
echo ========================================
echo Installation completed successfully
echo ========================================
echo.
pause
exit /b 0

:RESET_MODE
echo.
echo [WARNING] This will reset the database and start in development mode
echo [WARNING] All existing data will be lost!
set /p confirm="Are you sure? (y/N): "
if /i not "!confirm!"=="y" goto END

echo.
echo [INFO] Resetting database...
call npm run db:reset
if %errorlevel% neq 0 (
    echo [ERROR] Database reset failed
    pause
    exit /b 1
)
echo [SUCCESS] Database reset completed
echo.
echo [INFO] Starting Development Mode...
echo.

:: Skip to the actual dev mode execution without the greeting
echo Features enabled:
echo * Enhanced Photo Analysis v4.0
echo * Real AI Trichome Analysis
echo * Multi-Provider AI Integration (8 providers)
echo * 40+ Diagnostic Categories
echo * Analytics Dashboard (Real-time)
echo * Automation System (IF-THEN workflows)
echo * Export/Import System (6 formats)
echo * Notification System (Multi-channel)
echo * Mobile PWA Support
echo * Comprehensive Testing Suite (345+ tests)
echo.
echo Server will be available at: http://localhost:3000
echo.
echo [INFO] Starting server...
call npm run dev
if %errorlevel% neq 0 (
    echo [ERROR] Development server failed to start
    echo This may be due to missing dependencies or port conflicts
    pause
    exit /b 1
)
exit /b 0

:END
echo.
echo ========================================
echo CannaAI session ended
echo ========================================
echo Thank you for using CannaAI Pro!
echo Enhanced Photo Analysis System v4.0
echo [AGENTEVOLVER] Self-Evolving AI Ready
echo.
pause
