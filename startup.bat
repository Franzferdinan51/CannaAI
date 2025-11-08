@echo off
setlocal enabledelayedexpansion
:: CannaAI Startup Script
:: This script starts the CannaAI cultivation management system

echo ========================================
echo    CannaAI - Cannabis Cultivation AI
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%

:: Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the CannaAI root directory.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Dependencies not found. Installing npm packages...
    echo This may take a few minutes on first run...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully
    echo.
)

:: Check if database exists
if not exist "db\custom.db" (
    echo [INFO] Database not found. Setting up database...
    call npm run db:push
    if errorlevel 1 (
        echo [WARNING] Database setup had issues, but continuing...
    ) else (
        echo [SUCCESS] Database setup completed
    )
    echo.
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Check if PowerShell is available for logging
where powershell >nul 2>nul
if errorlevel 1 (
    set USE_LOGGING=0
    echo [WARNING] PowerShell not found. Logging will be console only.
) else (
    set USE_LOGGING=1
)

:: Check if port 3000 is already in use
echo [INFO] Checking if port 3000 is available...
netstat -ano | findstr :3000 >nul
if not errorlevel 1 (
    echo [WARNING] Port 3000 is already in use!
    echo.
    echo The following processes are using port 3000:
    netstat -ano | findstr :3000
    echo.
    echo Select an option:
    echo 1. Kill process^(es^) using port 3000
    echo 2. Use alternative port ^(3001^)
    echo 3. Continue anyway ^(may fail^)
    echo 4. Exit
    set /p port_choice="Enter your choice (1-4): "

    if "!port_choice!"=="1" (
        echo [INFO] Terminating processes using port 3000...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
            echo [INFO] Killing PID: %%a
            taskkill /PID %%a /F >nul 2>&1
        )
        echo [SUCCESS] Port 3000 should now be available
        echo.
        set USE_ALT_PORT=0
    )

    if "!port_choice!"=="2" (
        set USE_ALT_PORT=1
        echo [INFO] Will use port 3001 instead
        echo.
    )

    if "!port_choice!"=="3" (
        set USE_ALT_PORT=0
        echo [WARNING] Continuing with potential port conflict...
        echo.
    )

    if "!port_choice!"=="4" (
        goto END
    )
) else (
    set USE_ALT_PORT=0
    echo [INFO] Port 3000 is available
    echo.
)

:: Display startup options
echo ========================================
echo Select startup mode:
echo 1. Development Mode ^(with hot reload - Local^)
echo 2. Production Mode ^(optimized build - Local^)
echo 3. Development Mode + Database Reset
echo 4. Install Dependencies Only
echo 5. Remote Development Mode ^(Tailscale + Network^)
echo 6. Exit
echo ========================================
set /p choice="Enter your choice (1-6): "

if "!choice!"=="1" goto DEV_MODE
if "!choice!"=="2" goto PROD_MODE
if "!choice!"=="3" goto DEV_RESET
if "!choice!"=="4" goto INSTALL_ONLY
if "!choice!"=="5" goto REMOTE_DEV_MODE
if "!choice!"=="6" goto END

echo [ERROR] Invalid choice. Please enter 1-5.
pause
goto :EOF

:DEV_MODE
echo.
echo [INFO] Starting CannaAI in Development Mode...
if "!USE_ALT_PORT!"=="1" (
    echo [INFO] Server will be available at: http://127.0.0.1:3001
    set PORT=3001
) else (
    echo [INFO] Server will be available at: http://127.0.0.1:3000
    set PORT=3000
)
echo [INFO] Console output will be displayed below
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Set PORT environment variable and start
echo [INFO] Starting server with PORT=!PORT!...
cmd /c "set PORT=!PORT! && npm run dev"
goto END

:PROD_MODE
echo.
echo [INFO] Building CannaAI for Production...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo [SUCCESS] Build completed successfully
echo [INFO] Starting CannaAI in Production Mode...
if "!USE_ALT_PORT!"=="1" (
    echo [INFO] Server will be available at: http://127.0.0.1:3001
    set PORT=3001
) else (
    echo [INFO] Server will be available at: http://127.0.0.1:3000
    set PORT=3000
)
echo [INFO] Console output will be displayed below
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Set PORT environment variable and start
echo [INFO] Starting server with PORT=!PORT!...
cmd /c "set PORT=!PORT! && npm run start"
goto END

:DEV_RESET
echo.
echo [WARNING] This will reset the database and start in development mode
echo [WARNING] All existing data will be lost!
set /p confirm="Are you sure you want to continue? (y/N): "
if /i not "!confirm!"=="y" goto END

echo [INFO] Resetting database...
call npm run db:reset
if errorlevel 1 (
    echo [ERROR] Database reset failed
    pause
    exit /b 1
)

echo [SUCCESS] Database reset completed
echo [INFO] Starting in Development Mode...
if "!USE_ALT_PORT!"=="1" (
    echo [INFO] Server will be available at: http://127.0.0.1:3001
    set PORT=3001
) else (
    echo [INFO] Server will be available at: http://127.0.0.1:3000
    set PORT=3000
)
echo [INFO] Console output will be displayed below
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Set PORT environment variable and start
echo [INFO] Starting server with PORT=!PORT!...
cmd /c "set PORT=!PORT! && npm run dev"
goto END

:INSTALL_ONLY
echo.
echo [INFO] Installing/updating dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [SUCCESS] Dependencies installed/updated successfully
echo [INFO] You can now run the script again to start the application
goto END

:REMOTE_DEV_MODE
echo.
echo [INFO] Starting CannaAI in Remote Development Mode...
echo [INFO] This mode enables network access for Tailscale and local network connections
if "!USE_ALT_PORT!"=="1" (
    echo [INFO] Server will be available at: http://0.0.0.0:3001
    echo [INFO] Local access: http://127.0.0.1:3001
    set PORT=3001
) else (
    echo [INFO] Server will be available at: http://0.0.0.0:3000
    echo [INFO] Local access: http://127.0.0.1:3000
    set PORT=3000
)
echo [INFO] Network access enabled for Tailscale and LAN connections
echo [INFO] Console output will be displayed below
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Set HOST and PORT environment variables for remote access and start
echo [INFO] Starting remote server with HOST=0.0.0.0 and PORT=!PORT!...
cmd /c "set HOST=0.0.0.0 && set PORT=!PORT! && npm run dev"
goto END

:END
echo.
echo ========================================
echo CannaAI session ended
echo ========================================
pause