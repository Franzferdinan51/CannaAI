@echo off
setlocal enabledelayedexpansion

:: CannaAI Startup Script - Fixed Version
echo.
echo ========================================
echo    CannaAI - Cannabis Cultivation AI
echo ========================================
echo.

echo [STEP 1/6] Checking Node.js installation...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js version: %NODE_VERSION%
echo.

echo [STEP 2/6] Checking project files...
if not exist "package.json" (
    echo [ERROR] package.json not found
    pause
    exit /b 1
)
echo [SUCCESS] package.json found
if not exist "server.ts" (
    echo [ERROR] server.ts not found
    pause
    exit /b 1
)
echo [SUCCESS] server.ts found
echo.

echo [STEP 3/6] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] Installing npm packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed
) else (
    echo [SUCCESS] node_modules found
)
echo.

echo [STEP 4/6] Checking database...
set DB_EXISTS=0
if exist "db\cannaai.db" (
    set DB_EXISTS=1
    echo [SUCCESS] Found database: db\cannaai.db
) else if exist "db\custom.db" (
    set DB_EXISTS=1
    echo [SUCCESS] Found database: db\custom.db
) else if exist "prisma\dev.db" (
    set DB_EXISTS=1
    echo [SUCCESS] Found database: prisma\dev.db
) else (
    echo [INFO] No database found. Initializing...
    call npm run db:push
    if errorlevel 1 (
        echo [WARNING] Database setup had issues, but continuing...
    )
)
echo.

echo [STEP 5/6] Checking port 3000...
set SELECTED_PORT=3000
netstat -ano | findstr :3000 >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 3000 is in use!
    echo Use alternative port 3001? (Y/N)
    set /p alt="Choose: "
    if /i "!alt!"=="Y" set SELECTED_PORT=3001
)
echo [SUCCESS] Using port %SELECTED_PORT%
echo.

echo [STEP 6/6] Select mode:
echo 1. Development Mode
echo 2. Production Mode
echo 3. Exit
set /p mode="Enter choice (1-3): "

if "!mode!"=="1" goto DEV
if "!mode!"=="2" goto PROD
goto END

:DEV
echo.
echo [INFO] Starting in Development Mode...
echo [INFO] Server at http://127.0.0.1:%SELECTED_PORT%
echo.
set PORT=%SELECTED_PORT%
set NODE_ENV=development
echo Starting server...
echo ----------------------------------------
npm run dev
if errorlevel 1 (
    echo [ERROR] Server failed
    pause
    exit /b 1
)
goto END

:PROD
echo.
echo [INFO] Building for Production...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [SUCCESS] Build completed
echo.
echo [INFO] Starting Production Server...
echo [INFO] Server at http://127.0.0.1:%SELECTED_PORT%
echo.
set PORT=%SELECTED_PORT%
set NODE_ENV=production
echo Starting server...
echo ----------------------------------------
npm run start
if errorlevel 1 (
    echo [ERROR] Server failed
    pause
    exit /b 1
)
goto END

:END
echo.
echo ========================================
echo Session ended
echo ========================================
pause
