@echo off
REM Hibiscus - Run Script
REM Starts the Hibiscus Web Server
title Hibiscus - AI Art Studio

cd /d "%~dp0app"

echo.
echo    Hibiscus - AI Art Studio
echo    =========================
echo.

REM Create gallery folder if not exists
if not exist "gallery" mkdir gallery
if not exist "gallery\images" mkdir gallery\images
if not exist "gallery\videos" mkdir gallery\videos

echo Starting server...
echo.
echo    Local:   http://localhost:3333
echo    Network: http://%COMPUTERNAME%:3333
echo.
echo Press Ctrl+C to stop the server
echo.

REM Open browser after a short delay
start "" http://localhost:3333

REM Start the Node.js server
node server.js

echo.
echo Server stopped.
pause
