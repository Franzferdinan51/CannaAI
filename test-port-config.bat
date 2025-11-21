@echo off
setlocal enabledelayedexpansion
:: Test script to verify port configuration fixes

echo ========================================
echo Port Configuration Test Script
echo ========================================
echo.

:: Test 1: Check port availability detection
echo [TEST 1] Checking port 3000 availability...
netstat -ano | findstr :3000 >nul
if not errorlevel 1 (
    echo [RESULT] Port 3000 is IN USE
    echo Processes using port 3000:
    netstat -ano | findstr :3000
) else (
    echo [RESULT] Port 3000 is AVAILABLE
)
echo.

:: Test 2: Check port 3001 availability detection
echo [TEST 2] Checking port 3001 availability...
netstat -ano | findstr :3001 >nul
if not errorlevel 1 (
    echo [RESULT] Port 3001 is IN USE
    echo Processes using port 3001:
    netstat -ano | findstr :3001
) else (
    echo [RESULT] Port 3001 is AVAILABLE
)
echo.

:: Test 3: Environment variable test
echo [TEST 3] Testing environment variable setting...
set TEST_PORT=3001
echo [INFO] Set TEST_PORT=!TEST_PORT!
echo [RESULT] TEST_PORT value is: !TEST_PORT!
echo.

:: Test 4: Check if both ports are in use
echo [TEST 4] Checking if both ports are occupied...
set PORT_3000_IN_USE=0
set PORT_3001_IN_USE=0

netstat -ano | findstr :3000 >nul
if not errorlevel 1 (
    set PORT_3000_IN_USE=1
)

netstat -ano | findstr :3001 >nul
if not errorlevel 1 (
    set PORT_3001_IN_USE=1
)

if "!PORT_3000_IN_USE!"=="1" (
    if "!PORT_3001_IN_USE!"=="1" (
        echo [RESULT] BOTH ports 3000 and 3001 are IN USE
        echo [ACTION] startup.bat will display error and provide kill options
    ) else (
        echo [RESULT] Only port 3000 is IN USE, port 3001 is available
        echo [ACTION] startup.bat will offer port 3001 as alternative
    )
) else (
    if "!PORT_3001_IN_USE!"=="1" (
        echo [RESULT] Only port 3001 is IN USE, port 3000 is available
        echo [ACTION] startup.bat will use default port 3000
    ) else (
        echo [RESULT] BOTH ports are AVAILABLE
        echo [ACTION] startup.bat will use default port 3000
    )
)
echo.

echo ========================================
echo Test Complete
echo ========================================
echo.
echo Summary:
echo - Port 3000 status: %PORT_3000_IN_USE% (0=available, 1=in use)
echo - Port 3001 status: %PORT_3001_IN_USE% (0=available, 1=in use)
echo.
echo Run startup.bat to test the actual fixes
pause
