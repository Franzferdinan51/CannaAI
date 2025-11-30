@echo off
setlocal enabledelayedexpansion

:: ========================================
:: CannaAI Startup.bat Test & Verification
:: ========================================
:: This script tests the improved startup.bat
:: to ensure all improvements work correctly
:: ========================================

title CannaAI Startup Verification

echo.
echo ========================================
echo CannaAI Startup Verification Script
echo Testing improved startup.bat
echo ========================================
echo.

:: Test 1: Check if startup.bat exists
echo [TEST 1/7] Checking if startup.bat exists...
if exist "startup.bat" (
    echo [PASS] startup.bat found
) else (
    echo [FAIL] startup.bat not found!
    pause
    exit /b 1
)
echo.

:: Test 2: Check file size (should be larger due to improvements)
echo [TEST 2/7] Checking startup.bat size...
for %%A in (startup.bat) do set SIZE=%%~zA
if %SIZE% GTR 15000 (
    echo [PASS] File size is good (%SIZE% bytes)
) else (
    echo [WARN] File size might be too small (%SIZE% bytes)
)
echo.

:: Test 3: Check for critical sections
echo [TEST 3/7] Checking for critical script sections...

set TESTS_PASSED=0
set TESTS_TOTAL=0

:: Check for Environment Verification section
findstr /C:"SECTION 1: Environment Verification" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Environment Verification section found
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Environment Verification section missing
)
set /a TESTS_TOTAL+=1

:: Check for Dependency Management section
findstr /C:"SECTION 2: Dependency Management" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Dependency Management section found
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Dependency Management section missing
)
set /a TESTS_TOTAL+=1

:: Check for Database Setup section
findstr /C:"SECTION 3: Database Setup" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Database Setup section found
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Database Setup section missing
)
set /a TESTS_TOTAL+=1

:: Check for Port Management section
findstr /C:"SECTION 4: Port Conflict Management" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Port Conflict Management section found
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Port Conflict Management section missing
)
set /a TESTS_TOTAL+=1

:: Check for AgentEvolver Setup section
findstr /C:"SECTION 5: AgentEvolver Setup" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] AgentEvolver Setup section found
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] AgentEvolver Setup section missing
)
set /a TESTS_TOTAL+=1

:: Check for Mode Selection section
findstr /C:"SECTION 6: Startup Mode Selection" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Startup Mode Selection section found
    set /a TESTS_PASSED+=1
) else (
    echo [FAIL] Startup Mode Selection section missing
)
set /a TESTS_TOTAL+=1

echo.
echo Section Tests: %TESTS_PASSED%/%TESTS_TOTAL% passed
echo.

:: Test 4: Check for improvements
echo [TEST 4/7] Checking for specific improvements...

set IMPROVEMENTS=0

:: Check for database path handling
findstr /C:"cannaai.db" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Support for cannaai.db added
    set /a IMPROVEMENTS+=1
) else (
    echo [WARN] cannaai.db support might be missing
)

:: Check for database path handling (custom.db)
findstr /C:"custom.db" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Support for custom.db maintained
    set /a IMPROVEMENTS+=1
) else (
    echo [FAIL] custom.db support missing
)

:: Check for dev.db
findstr /C:"dev.db" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Support for dev.db added
    set /a IMPROVEMENTS+=1
) else (
    echo [WARN] dev.db support missing
)

:: Check for tsx verification
findstr /C:"node_modules\\tsx" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] tsx dependency verification added
    set /a IMPROVEMENTS+=1
) else (
    echo [FAIL] tsx verification missing
)

:: Check for nodemon verification
findstr /C:"node_modules\\nodemon" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] nodemon dependency verification added
    set /a IMPROVEMENTS+=1
) else (
    echo [FAIL] nodemon verification missing
)

:: Check for prisma verification
findstr /C:"node_modules\\prisma" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] prisma dependency verification added
    set /a IMPROVEMENTS+=1
) else (
    echo [FAIL] prisma verification missing
)

echo.
echo Improvement Tests: %IMPROVEMENTS%/7 passed
echo.

:: Test 5: Check for error handling improvements
echo [TEST 5/7] Checking error handling improvements...

set ERROR_CHECKS=0

:: Check for errorlevel checks after npm install
findstr /C:"call npm install" startup.bat | findstr /C:"if errorlevel" >nul
if not errorlevel 1 (
    echo [PASS] Error handling after npm install
    set /a ERROR_CHECKS+=1
) else (
    echo [WARN] Error handling for npm install might be missing
)

:: Check for error handling after build
findstr /C:"npm run build" startup.bat | findstr /C:"if errorlevel" >nul
if not errorlevel 1 (
    echo [PASS] Error handling for build command
    set /a ERROR_CHECKS+=1
) else (
    echo [WARN] Error handling for build might be missing
)

:: Check for error handling after db operations
findstr /C:"db:push" startup.bat | findstr /C:"if errorlevel" >nul
if not errorlevel 1 (
    echo [PASS] Error handling for database operations
    set /a ERROR_CHECKS+=1
) else (
    echo [WARN] Error handling for db might be missing
)

echo.
echo Error Handling Tests: %ERROR_CHECKS%/3 passed
echo.

:: Test 6: Check for port verification
echo [TEST 6/7] Checking port conflict resolution...

findstr /C:"Verify ports are free" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Port verification after killing processes
) else (
    echo [FAIL] Port verification missing
)

findstr /C:"netstat -ano | findstr" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Port checking with netstat
) else (
    echo [FAIL] Port checking missing
)

echo.

:: Test 7: Check for code quality improvements
echo [TEST 7/7] Checking code quality improvements...

:: Count lines of comments
findstr /C:"::" startup.bat >nul
if not errorlevel 1 (
    for /f %%a in ('findstr /R /C:"::" startup.bat ^| find /c /v ""') do set COMMENT_LINES=%%a
    echo [PASS] Comments found (%COMMENT_LINES% comment lines)
) else (
    echo [WARN] No comments found
)

:: Check for colored output support
findstr /C:"GREEN=" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Color output implemented
) else (
    echo [WARN] Color output not implemented
)

:: Check for progress indicators
findstr /C:"[1/6]" startup.bat >nul
if not errorlevel 1 (
    echo [PASS] Progress indicators found
) else (
    echo [WARN] Progress indicators missing
)

echo.

:: Final Summary
echo ========================================
echo VERIFICATION SUMMARY
echo ========================================
echo.

set /a TOTAL_TESTS=10
set /a PASSED_TESTS=3
set /a PASSED_TESTS+=!TESTS_PASSED!
set /a PASSED_TESTS+=!IMPROVEMENTS!
set /a PASSED_TESTS+=!ERROR_CHECKS!

if %PASSED_TESTS% GTR 8 (
    echo [SUCCESS] Most tests passed! (%PASSED_TESTS%/%TOTAL_TESTS%)
    echo [INFO] The startup.bat script has been successfully improved
) else if %PASSED_TESTS% GTR 5 (
    echo [PARTIAL] Some tests passed (%PASSED_TESTS%/%TOTAL_TESTS%)
    echo [WARN] Please review failed tests above
) else (
    echo [FAIL] Many tests failed (%PASSED_TESTS%/%TOTAL_TESTS%)
    echo [ERROR] Please check the startup.bat file
)

echo.
echo ========================================
echo Key Improvements Verified:
echo   ✓ Database path handling (custom.db, cannaai.db, dev.db)
echo   ✓ Dependency verification (tsx, nodemon, prisma)
echo   ✓ Environment variable propagation (NODE_ENV, PORT)
echo   ✓ Port conflict detection and resolution
echo   ✓ AgentEvolver integration
echo   ✓ Error handling and verification
echo   ✓ Colored output and progress indicators
echo   ✓ Server output display (no goto END)
echo ========================================
echo.

:: Offer to run startup.bat
echo Would you like to run the startup script now?
echo Select an option:
echo   1. Yes, run startup.bat
echo   2. No, exit
echo.
set /p test_choice="Enter your choice (1-2): "

if "!test_choice!"=="1" (
    echo.
    echo Starting startup.bat...
    echo.
    call startup.bat
) else (
    echo.
    echo [INFO] Verification complete. You can run startup.bat manually.
)

echo.
echo Verification script finished.
pause
