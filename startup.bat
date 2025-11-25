@echo off
setlocal enabledelayedexpansion
:: CannaAI Pro Hybrid Startup Script
:: This script starts the CannaAI Pro cultivation management system
:: with both Original Next.js UI and NewUI (React/Vite) support

echo ========================================
echo    CannaAI Pro - Cannabis Cultivation AI
echo    Hybrid Architecture: Next.js + React/Vite
echo    Enhanced with AgentEvolver Self-Evolving AI
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

:: Check if NewUI directory exists and set port availability flags
set NEWUI_AVAILABLE=0
if exist "NewUI\cannaai-pro" (
    set NEWUI_AVAILABLE=1
    echo [INFO] NewUI (React/Vite) found at: NewUI\cannaai-pro
) else (
    echo [WARNING] NewUI not found. Only Next.js backend will be available.
)

:: Check if required ports are available
echo [INFO] Checking port availability...
echo [INFO] Backend port (Next.js): 3000
if !NEWUI_AVAILABLE! == 1 echo [INFO] Frontend port (NewUI): 5174
echo.

:: Check backend port 3000
netstat -ano | findstr :3000 >nul
if not errorlevel 1 (
    echo [WARNING] Backend port 3000 is already in use!
    echo The following processes are using port 3000:
    netstat -ano | findstr :3000
    echo.
    set BACKEND_PORT_CONFLICT=1
) else (
    echo [INFO] Backend port 3000 is available
    set BACKEND_PORT_CONFLICT=0
)

:: Check NewUI port 5174 if NewUI is available
if !NEWUI_AVAILABLE! == 1 (
    netstat -ano | findstr :5174 >nul
    if not errorlevel 1 (
        echo [WARNING] NewUI port 5174 is already in use!
        echo The following processes are using port 5174:
        netstat -ano | findstr :5174
        echo.
        set NEWUI_PORT_CONFLICT=1
    ) else (
        echo [INFO] NewUI port 5174 is available
        set NEWUI_PORT_CONFLICT=0
    )
)

:: Handle port conflicts
if !BACKEND_PORT_CONFLICT! == 1 (
    echo [ERROR] Port conflicts detected!
    echo.
    echo Select an option:
    echo 1. Kill process^(es^) using port 3000 ^(backend^)
    if !NEWUI_AVAILABLE! == 1 (
        if !NEWUI_PORT_CONFLICT! == 1 (
            echo 2. Kill process^(es^) using port 5174 ^(NewUI^)
            echo 3. Kill all conflicting processes
            echo 4. Continue anyway ^(may fail^)
            echo 5. Exit
            set /p port_choice="Enter your choice (1-5): "
        ) else (
            echo 2. Kill all conflicting processes
            echo 3. Continue anyway ^(may fail^)
            echo 4. Exit
            set /p port_choice="Enter your choice (1-4): "
        )
    ) else (
        echo 2. Continue anyway ^(may fail^)
        echo 3. Exit
        set /p port_choice="Enter your choice (1-3): "
    )

    if "!port_choice!"=="1" (
        echo [INFO] Terminating processes using port 3000...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
            echo [INFO] Killing PID: %%a
            taskkill /PID %%a /F >nul 2>&1
        )
        echo [SUCCESS] Backend port 3000 should now be available
        echo.
        set BACKEND_PORT_CONFLICT=0
    )

    if "!port_choice!"=="2" (
        if !NEWUI_AVAILABLE! == 1 (
            if !NEWUI_PORT_CONFLICT! == 1 (
                echo [INFO] Terminating processes using port 5174...
                for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
                    echo [INFO] Killing PID: %%a
                    taskkill /PID %%a /F >nul 2>&1
                )
                echo [SUCCESS] NewUI port 5174 should now be available
                echo.
                set NEWUI_PORT_CONFLICT=0
            ) else (
                echo [INFO] Terminating all conflicting processes...
                if !BACKEND_PORT_CONFLICT! == 1 (
                    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
                        taskkill /PID %%a /F >nul 2>&1
                    )
                )
                if !NEWUI_PORT_CONFLICT! == 1 (
                    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
                        taskkill /PID %%a /F >nul 2>&1
                    )
                )
                echo [SUCCESS] All ports should now be available
                echo.
                set BACKEND_PORT_CONFLICT=0
                set NEWUI_PORT_CONFLICT=0
            )
        ) else (
            echo [WARNING] Continuing with potential port conflicts...
            echo.
        )
    )

    if "!port_choice!"=="3" (
        if !NEWUI_AVAILABLE! == 1 (
            if !NEWUI_PORT_CONFLICT! == 1 (
                echo [INFO] Terminating all conflicting processes...
                if !BACKEND_PORT_CONFLICT! == 1 (
                    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
                        taskkill /PID %%a /F >nul 2>&1
                    )
                )
                if !NEWUI_PORT_CONFLICT! == 1 (
                    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
                        taskkill /PID %%a /F >nul 2>&1
                    )
                )
                echo [SUCCESS] All ports should now be available
                echo.
                set BACKEND_PORT_CONFLICT=0
                set NEWUI_PORT_CONFLICT=0
            ) else (
                echo [WARNING] Continuing with potential port conflicts...
                echo.
            )
        ) else (
            echo [INFO] Exiting as requested...
            goto END
        )
    )

    if "!port_choice!"=="4" (
        if !NEWUI_AVAILABLE! == 1 (
            if !NEWUI_PORT_CONFLICT! == 1 (
                echo [WARNING] Continuing with potential port conflicts...
                echo.
            ) else (
                echo [INFO] Exiting as requested...
                goto END
            )
        ) else (
            echo [INFO] Exiting as requested...
            goto END
        )
    )

    if "!port_choice!"=="5" (
        if !NEWUI_AVAILABLE! == 1 (
            if !NEWUI_PORT_CONFLICT! == 1 (
                echo [INFO] Exiting as requested...
                goto END
            )
        )
    )
)

echo [INFO] Port check completed
echo.

:: Display startup options
echo ========================================
echo Select startup mode:
echo.
echo Hybrid Architecture Options ^(Recommended^):
echo 1. Hybrid Development Mode ^(Next.js Backend + NewUI Frontend^)
echo 2. Hybrid Production Mode ^(Optimized Build + NewUI^)
echo 3. Backend Only Development ^(Next.js Server Only^)
echo 4. NewUI Only Development ^(React/Vite Frontend Only^)
echo.
echo Legacy Options:
echo 5. Development Mode + AgentEvolver ^(Self-Evolving AI^)
echo 6. Production Mode + AgentEvolver ^(Self-Evolving AI^)
echo 7. Development Mode + Database Reset
echo 8. Install Dependencies Only ^(Backend + NewUI^)
echo 9. Remote Development Mode ^(Tailscale + Network^)
echo 10. AgentEvolver Server Only ^(Self-Evolving AI Backend^)
echo 11. Help & Information
echo 12. Exit
echo ========================================
set /p choice="Enter your choice (1-12): "

if "!choice!"=="1" goto HYBRID_DEV_MODE
if "!choice!"=="2" goto HYBRID_PROD_MODE
if "!choice!"=="3" goto BACKEND_ONLY_DEV
if "!choice!"=="4" goto NEWUI_ONLY_DEV
if "!choice!"=="5" goto DEV_MODE_AGENTEVOLVER
if "!choice!"=="6" goto PROD_MODE_AGENTEVOLVER
if "!choice!"=="7" goto DEV_RESET
if "!choice!"=="8" goto INSTALL_ONLY
if "!choice!"=="9" goto REMOTE_DEV_MODE
if "!choice!"=="10" goto AGENTEVOLVER_ONLY
if "!choice!"=="11" goto HELP_INFO
if "!choice!"=="12" goto END

echo [ERROR] Invalid choice. Please enter 1-12.
pause
goto :EOF

:DEV_MODE
echo.
echo [INFO] Starting CannaAI in Development Mode...
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)
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
set PORT=!PORT!
npm run dev
goto END

:PROD_MODE
echo.
echo [INFO] Building CannaAI for Production...
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)
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
set PORT=!PORT!
npm run start
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
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)
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
set PORT=!PORT!
npm run dev
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
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)
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
set HOST=0.0.0.0
set PORT=!PORT!
npm run dev
goto END

:DEV_MODE_AGENTEVOLVER
echo.
echo [INFO] Starting AgentEvolver and CannaAI in Development Mode...
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)

:: Check if Python is available for AgentEvolver
echo [INFO] Checking Python installation...
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
echo [INFO] Installing AgentEvolver dependencies...
if exist "agentevolver" (
    cd agentevolver
    python -m pip install -r requirements.txt >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Some AgentEvolver dependencies may have failed to install
        echo AgentEvolver may not function properly
    ) else (
        echo [SUCCESS] AgentEvolver dependencies installed
    )
    cd ..

    :: Start AgentEvolver in background
    echo [INFO] Starting AgentEvolver server...
    start "AgentEvolver Server" /min cmd /c "cd agentevolver && python server.py"
    timeout /t 3 /nobreak >nul
    echo [INFO] AgentEvolver starting on http://localhost:8001
) else (
    echo [WARNING] AgentEvolver directory not found. Running without AgentEvolver features.
    echo [INFO] To enable AgentEvolver, create the agentevolver directory with required files.
)

echo.
echo [INFO] Starting CannaAI Development Server...

if "!USE_ALT_PORT!"=="1" (
    echo [INFO] CannaAI will be available at: http://127.0.0.1:3001
    set PORT=3001
) else (
    echo [INFO] CannaAI will be available at: http://127.0.0.1:3000
    set PORT=3000
)
if exist "agentevolver" (
    echo [INFO] AgentEvolver AI enhancements enabled
) else (
    echo [INFO] Running in standard mode (AgentEvolver not available)
)
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Set PORT environment variable and start
echo [INFO] Starting CannaAI with PORT=!PORT!...
call npm run dev
goto END

:PROD_MODE_AGENTEVOLVER
echo.
echo [INFO] Starting AgentEvolver and CannaAI in Production Mode...
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)

:: Check if Python is available for AgentEvolver
echo [INFO] Checking Python installation...
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo AgentEvolver requires Python 3.8+ to run
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

:: Install AgentEvolver dependencies
echo [INFO] Installing AgentEvolver dependencies...
if exist "agentevolver" (
    cd agentevolver
    python -m pip install -r requirements.txt >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Some AgentEvolver dependencies may have failed to install
        echo AgentEvolver may not function properly
    ) else (
        echo [SUCCESS] AgentEvolver dependencies installed
    )
    cd ..

    :: Start AgentEvolver in background
    echo [INFO] Starting AgentEvolver server...
    start "AgentEvolver Server" /min cmd /c "cd agentevolver && python server.py"
    timeout /t 3 /nobreak >nul
    echo [INFO] AgentEvolver server running on http://localhost:8001
) else (
    echo [WARNING] AgentEvolver directory not found. Building without AgentEvolver.
    echo [INFO] To enable AgentEvolver, create the agentevolver directory with required files.
)

echo [INFO] Building CannaAI for Production...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo [SUCCESS] Build completed successfully
echo [INFO] Starting CannaAI Production Server...

if "!USE_ALT_PORT!"=="1" (
    echo [INFO] CannaAI will be available at: http://127.0.0.1:3001
    set PORT=3001
) else (
    echo [INFO] CannaAI will be available at: http://127.0.0.1:3000
    set PORT=3000
)
if exist "agentevolver" (
    echo [INFO] AgentEvolver AI enhancements enabled in production mode
) else (
    echo [INFO] Running in standard production mode (AgentEvolver not available)
)
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Set PORT environment variable and start
echo [INFO] Starting production server with PORT=!PORT!...
call npm run start
goto END

:AGENTEVOLVER_ONLY
echo.
echo [INFO] Starting AgentEvolver Server Only...

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
echo [INFO] Installing AgentEvolver dependencies...
if exist "agentevolver" (
    cd agentevolver
    python -m pip install -r requirements.txt
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
echo 🤖 AgentEvolver Self-Evolving AI Capabilities:
echo    • Self-questioning task generation
echo    • Experience-guided exploration
echo    • Attribution-based credit assignment
echo    • Continuous capability evolution
echo.

if exist "agentevolver" (
    cd agentevolver
    python server.py
    cd ..
) else (
    echo [ERROR] AgentEvolver directory not found.
    pause
    exit /b 1
)
goto END

:HYBRID_DEV_MODE
echo.
echo [INFO] Starting CannaAI Pro in Hybrid Development Mode...
echo [INFO] This will start both Next.js backend and NewUI frontend
echo.
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting hybrid mode.
    goto END
)
if "!NEWUI_PORT_CONFLICT!"=="1" (
    echo [ERROR] NewUI port 5174 is still in use. Resolve the conflict before starting hybrid mode.
    goto END
)

:: Check if NewUI is available
if !NEWUI_AVAILABLE! == 0 (
    echo [ERROR] NewUI not found! Please ensure NewUI\cannaai-pro directory exists.
    echo [INFO] You can download and extract NewUI to use this mode.
    pause
    goto :EOF
)

:: Install dependencies for both backend and NewUI if needed
echo [INFO] Installing dependencies...
call npm install --silent
cd NewUI\cannaai-pro
call npm install --silent
cd ..\..
echo [SUCCESS] Dependencies installed/updated
echo.

echo [INFO] Starting Hybrid Development Server...
echo [INFO] Next.js Backend will be available at: http://127.0.0.1:3000
echo [INFO] NewUI Frontend will be available at: http://127.0.0.1:5174
echo [INFO] Press Ctrl+C to stop both servers
echo.

:: Start hybrid development
call npm run dev
goto END

:HYBRID_PROD_MODE
echo.
echo [INFO] Starting CannaAI Pro in Hybrid Production Mode...
echo [INFO] This will build and start both backend and NewUI
echo.
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting hybrid mode.
    goto END
)
if "!NEWUI_PORT_CONFLICT!"=="1" (
    echo [ERROR] NewUI port 5173/5174 is still in use. Resolve the conflict before starting hybrid mode.
    goto END
)

:: Check if NewUI is available
if !NEWUI_AVAILABLE! == 0 (
    echo [ERROR] NewUI not found! Please ensure NewUI\cannaai-pro directory exists.
    pause
    goto :EOF
)

:: Build both frontend and backend
echo [INFO] Building NewUI frontend...
cd NewUI\cannaai-pro
call npm run build
if errorlevel 1 (
    echo [ERROR] NewUI build failed
    cd ..\..
    pause
    exit /b 1
)
echo [SUCCESS] NewUI frontend built successfully
cd ..\..

echo [INFO] Building Next.js backend...
call npm run build:backend
if errorlevel 1 (
    echo [ERROR] Backend build failed
    pause
    exit /b 1
)
echo [SUCCESS] Backend built successfully

echo [INFO] Starting Hybrid Production Server...
echo [INFO] Next.js Backend will be available at: http://127.0.0.1:3000
echo [INFO] NewUI Frontend will be available at: http://127.0.0.1:5173
echo [INFO] Press Ctrl+C to stop both servers
echo.

:: Start hybrid production
call npm run start
goto END

:BACKEND_ONLY_DEV
echo.
echo [INFO] Starting Backend Only Development Mode...
echo [INFO] This will start only the Next.js server (port 3000)
echo.
if "!BACKEND_PORT_CONFLICT!"=="1" (
    echo [ERROR] Backend port 3000 is still in use. Resolve the conflict before starting.
    goto END
)
echo [INFO] Next.js Backend will be available at: http://127.0.0.1:3000
echo [INFO] API endpoints will be available at: http://127.0.0.1:3000/api/
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Start backend only
call npm run dev:backend
goto END

:NEWUI_ONLY_DEV
echo.
echo [INFO] Starting NewUI Only Development Mode...
echo [INFO] This will start only the React/Vite frontend (port 5174)
echo.
if "!NEWUI_PORT_CONFLICT!"=="1" (
    echo [ERROR] NewUI port 5174 is still in use. Resolve the conflict before starting.
    goto END
)

:: Check if NewUI is available
if !NEWUI_AVAILABLE! == 0 (
    echo [ERROR] NewUI not found! Please ensure NewUI\cannaai-pro directory exists.
    pause
    goto :EOF
)

echo [INFO] NewUI will be available at: http://127.0.0.1:5174
echo [INFO] Make sure the backend is running separately on port 3000
echo [INFO] Press Ctrl+C to stop the server
echo.

:: Start NewUI only
cd NewUI\cannaai-pro
call npm run dev
cd ..\..
goto END

:HELP_INFO
echo.
echo ========================================
echo CannaAI Pro Hybrid Architecture Information
echo ========================================
echo.
echo Understanding the Hybrid Architecture:
echo -------------------------------------
echo CannaAI Pro now uses a hybrid architecture with two separate UIs:
echo.
echo 1. Next.js Backend (Port 3000):
echo    - Primary API server and backend logic
echo    - Original Next.js frontend (legacy)
echo    - Socket.IO real-time communication
echo    - Database operations and server-side rendering
echo.
echo 2. NewUI Frontend (Port 5174):
echo    - Modern React/Vite application
echo    - Enhanced user interface with advanced features
echo    - Improved performance and development experience
echo    - Uses shadcn/ui components and Tailwind CSS
echo.
echo Startup Modes Explained:
echo ------------------------
echo.
echo Hybrid Development Mode:
echo   Starts both backend and frontend simultaneously
echo   Recommended for most development workflows
echo   Hot reload enabled for both UIs
echo.
echo Hybrid Production Mode:
echo   Builds and starts optimized production versions
echo   Best for testing production builds locally
echo   Frontend served from port 5173, backend from 3000
echo.
echo Backend Only Development:
echo   Starts only the Next.js server
echo   Useful when working on backend APIs or database
echo   Access original Next.js UI at http://127.0.0.1:3000
echo.
echo NewUI Only Development:
echo   Starts only the React/Vite frontend
echo   Requires backend to be running separately
echo   Faster frontend development with hot reload
echo.
echo Port Configuration:
echo -------------------
echo Backend (Next.js):    3000
echo Frontend (NewUI):     5174 (dev), 5173 (prod)
echo AgentEvolver:         8001 (if enabled)
echo.
echo File Structure:
echo ---------------
echo Root directory:           CannaAI Pro backend
echo NewUI\cannaai-pro\:       React/Vite frontend
echo agentevolver\:            Self-evolving AI (optional)
echo.
echo For more information, see:
echo - DASHBOARD_ENHANCEMENT.md in NewUI\cannaai-pro\
echo - CLAUDE.md in root directory
echo.
echo Press any key to return to main menu...
pause >nul
goto START_MENU

:START_MENU
cls
goto :EOF

:END
echo.
echo ========================================
echo CannaAI Pro session ended
echo ========================================
echo Thank you for using CannaAI Pro!
echo.
pause
