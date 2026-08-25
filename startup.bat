@echo off
setlocal
cd /d "%~dp0"

echo CannaAI startup
echo.

where node >nul 2>&1 || (
  echo Node.js 22 or newer is required.
  exit /b 1
)

if not exist "node_modules\.bin\tsx.cmd" (
  echo Installing backend dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist "NewUI\cannaai-pro\node_modules\.bin\vite.cmd" (
  echo Installing frontend dependencies...
  pushd "NewUI\cannaai-pro"
  call npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
)

echo [1] Development
echo [2] Production
echo [3] Build only
set /p "choice=Choose a mode [1-3]: "

if "%choice%"=="2" (
  call npm run build
  if errorlevel 1 exit /b 1
  call npm run start
  exit /b %errorlevel%
)

if "%choice%"=="3" (
  call npm run build
  exit /b %errorlevel%
)

call npm run dev
exit /b %errorlevel%
