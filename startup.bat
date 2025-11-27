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

echo [STEP 1/5] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found - install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js: %NODE_VERSION%
echo.

echo [STEP 2/5] Checking files...
if not exist "package.json" (
    echo [ERROR] Run from CannaAI root directory
    pause
    exit /b 1
)
echo [SUCCESS] Files found
echo.

echo [STEP 3/5] Checking dependencies...
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

echo [STEP 4/5] Checking database...
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

echo [STEP 5/5] Port check...
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
echo 1. Development Mode (Recommended)
echo    - Hot reload enabled
echo    - Debug logging enabled
echo    - Best for development
echo.
echo 2. Production Mode
echo    - Optimized build
echo    - Faster performance
echo    - Best for production testing
echo.
echo 3. Install Dependencies Only
echo.
echo 4. Reset Database and Start Dev Mode
echo.
echo 5. Exit
echo ========================================
set /p choice="Enter your choice (1-5): "

if "!choice!"=="1" goto DEV_MODE
if "!choice!"=="2" goto PROD_MODE
if "!choice!"=="3" goto INSTALL_ONLY
if "!choice!"=="4" goto RESET_MODE
if "!choice!"=="5" goto END

echo [ERROR] Invalid choice. Please enter 1-5.
pause
goto END

:DEV_MODE
echo.
echo [INFO] Starting CannaAI in Development Mode...
echo.
echo Features enabled:
echo ✓ Enhanced Photo Analysis v4.0
echo ✓ Real AI Trichome Analysis
echo ✓ Multi-Provider AI Integration
echo ✓ Analytics Dashboard
echo ✓ Automation System
echo ✓ Export/Import System
echo ✓ Comprehensive Testing Suite
echo.
echo Server will be available at: http://localhost:3000
echo.
echo [INFO] Starting server...
npm run dev
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
npm run start
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
goto END

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
goto DEV_MODE

:END
echo.
echo ========================================
echo CannaAI session ended
echo ========================================
echo Thank you for using CannaAI Pro!
echo Enhanced Photo Analysis System v4.0
echo.
pause
