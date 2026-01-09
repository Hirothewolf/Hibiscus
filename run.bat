@echo off
REM Hibiscus - Run Script
title Hibiscus

cd /d "%~dp0app"

echo.
echo 🌺 ═══════════════════════════════════════════════════
echo    Hibiscus - AI Art Studio
echo ═════════════════════════════════════════════════════
echo.

REM Create gallery folder if not exists
if not exist "gallery" mkdir gallery

echo Starting server...
echo Opening browser at http://localhost:3333
echo.

REM Open browser after a short delay
start "" http://localhost:3333

REM Start the Node.js server
node server.js

echo.
echo Server stopped.
pause
