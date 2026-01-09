@echo off
REM Hibiscus - Build Script for Windows
REM This creates a standalone .exe installer

title Building Hibiscus

echo.
echo ═══════════════════════════════════════════════════
echo    Building Hibiscus
echo ═══════════════════════════════════════════════════
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found

REM Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

echo [OK] npm found

REM Create gallery folder if not exists
if not exist "app\gallery" mkdir app\gallery
echo [OK] Gallery directory ready

REM Install dependencies
echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Build the application
echo.
echo Building Windows installer...
call npm run build:win
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════
echo    ✓ Build Complete!
echo ═══════════════════════════════════════════════════
echo.
echo Output files are in the 'dist' folder:
echo   - Hibiscus Setup.exe (Installer)
echo   - Hibiscus.exe (Portable)
echo.
pause
