@echo off
REM Hibiscus - Windows Installer
REM This script checks for Node.js and sets up the application

setlocal enabledelayedexpansion

title Hibiscus Installer

echo.
echo ═══════════════════════════════════════════════════
echo    🌺 Hibiscus Installer
echo ═══════════════════════════════════════════════════
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

REM Create gallery directory
if not exist "%SCRIPT_DIR%app\gallery" mkdir "%SCRIPT_DIR%app\gallery"
echo [OK] Gallery directory ready

REM Create run.bat
echo Creating run script...
(
echo @echo off
echo title ArtPollinations Studio
echo cd /d "%%~dp0app"
echo echo.
echo echo 🎨 Starting ArtPollinations Studio...
echo echo.
echo start http://localhost:3333
echo node server.js
) > "%SCRIPT_DIR%run.bat"
echo [OK] Run script created: run.bat

REM Create desktop shortcut
echo.
set /p CREATE_SHORTCUT="Create desktop shortcut? (Y/N): "
if /i "%CREATE_SHORTCUT%"=="Y" (
    call :CreateShortcut
)

echo.
echo ═══════════════════════════════════════════════════
echo    ✓ Installation Complete!
echo ═══════════════════════════════════════════════════
echo.
echo To start the application:
echo   - Double-click 'run.bat'
echo   - Or use the desktop shortcut
echo.
pause
exit /b 0

:CreateShortcut
REM Create VBS script to generate shortcut
set "SHORTCUT_VBS=%TEMP%\create_shortcut.vbs"
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = oWS.SpecialFolders^("Desktop"^) ^& "\Hibiscus.lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%SCRIPT_DIR%run.bat"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%"
echo oLink.Description = "AI Image ^& Video Generation Studio"
echo oLink.IconLocation = "shell32.dll,145"
echo oLink.Save
) > "%SHORTCUT_VBS%"
cscript //nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%"
echo [OK] Desktop shortcut created
goto :eof
