@echo off
REM Hibiscus - Windows Installer
REM This script checks for Node.js and sets up the application
REM Note: This is for Web Mode. For desktop app, use the .exe from Releases.

setlocal enabledelayedexpansion

title Hibiscus Installer

echo.
echo    Hibiscus Installer (Web Mode)
echo    ==============================
echo.

set "SCRIPT_DIR=%~dp0"
set "MIN_NODE_VERSION=16"

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    echo After installing Node.js, run this installer again.
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VER=%%a
for /f "tokens=1 delims=." %%a in ("%NODE_VER%") do set NODE_MAJOR=%%a

if %NODE_MAJOR% LSS %MIN_NODE_VERSION% (
    echo [WARNING] Node.js version is too old!
    echo Current: %NODE_VER%, Required: %MIN_NODE_VERSION%+
    echo.
    echo Please update Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js v%NODE_VER% found
echo.

REM Create gallery directories
if not exist "%SCRIPT_DIR%app\gallery" mkdir "%SCRIPT_DIR%app\gallery"
if not exist "%SCRIPT_DIR%app\gallery\images" mkdir "%SCRIPT_DIR%app\gallery\images"
if not exist "%SCRIPT_DIR%app\gallery\videos" mkdir "%SCRIPT_DIR%app\gallery\videos"
echo [OK] Gallery directories ready

echo.
echo    Installation Complete!
echo    ======================
echo.
echo To start the application:
echo   - Double-click 'run.bat'
echo.
echo For desktop app, download from GitHub Releases.
echo.
pause
exit /b 0
