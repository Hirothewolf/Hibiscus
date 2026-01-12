@echo off
REM Hibiscus - Build Script
REM Builds the Electron desktop application

setlocal enabledelayedexpansion

title Hibiscus Build

echo.
echo    Hibiscus Build Script
echo    ======================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

echo [OK] Node.js and npm found
echo.

REM Create gallery folders
if not exist "app\gallery" mkdir app\gallery
if not exist "app\gallery\images" mkdir app\gallery\images
if not exist "app\gallery\videos" mkdir app\gallery\videos
if not exist "app\modules" mkdir app\modules
echo [OK] Application directories ready

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)

REM Clean previous build
if exist "dist" (
    echo.
    echo Cleaning previous build...
    rmdir /s /q dist 2>nul
    timeout /t 2 >nul
    echo [OK] Previous build cleaned
)

echo.
echo Building Windows portable app...
echo.

call npm run build:win
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed!
    echo.
    echo Common fixes:
    echo   - Run as Administrator
    echo   - Check internet connection
    echo   - Delete node_modules and run: npm install
    echo.
    pause
    exit /b 1
)

echo.
echo    Build Complete!
echo    ===============
echo.
echo Output: dist\Hibiscus 1.0.0.exe
echo.

REM Ask to open folder
set /p OPEN_FOLDER="Open output folder? (Y/N): "
if /i "%OPEN_FOLDER%"=="Y" (
    start "" "%SCRIPT_DIR%dist"
)

pause
