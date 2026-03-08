@echo off
REM NIVTO License Key Generator - Quick Access Script
REM 
REM This batch file provides easy access to the license key generator
REM without needing to remember the exact node command

echo.
echo ================================================
echo   NIVTO Staff Manager - License Key Generator
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    echo Alternatively, you can use the Python version:
    echo   python generate_license.py %*
    echo.
    pause
    exit /b 1
)

REM If no arguments provided, show menu
if "%1"=="" goto :menu

REM Otherwise, run with provided arguments
node generate-license.js %*
goto :end

:menu
echo What would you like to do?
echo.
echo [1] Generate 1-Month License (30 days) - R349
echo [2] Generate 3-Month License (90 days) - R947
echo [3] Generate 6-Month License (180 days) - R1794
echo [4] Generate 1-Year License (365 days) - R3588
echo [5] Generate Custom Duration License
echo [6] Bulk Generate Multiple Licenses
echo [7] Exit
echo.
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" (
    node generate-license.js 30
    goto :menu
)
if "%choice%"=="2" (
    node generate-license.js 90
    goto :menu
)
if "%choice%"=="3" (
    node generate-license.js 180
    goto :menu
)
if "%choice%"=="4" (
    node generate-license.js 365
    goto :menu
)
if "%choice%"=="5" (
    set /p days="Enter number of days: "
    node generate-license.js %days%
    goto :menu
)
if "%choice%"=="6" (
    set /p count="Enter number of licenses to generate: "
    set /p days="Enter days per license: "
    node generate-license.js --bulk %count% %days%
    goto :menu
)
if "%choice%"=="7" (
    goto :end
)

echo Invalid choice. Please try again.
echo.
goto :menu

:end
echo.
pause
