@echo off
setlocal EnableDelayedExpansion
title Zamzam Foods - WhatsApp Automation Bridge
color 0A

cd /d "%~dp0whatsapp-bridge"

:: 1. Check if WhatsApp Bridge is already running on port 3005
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 3005); Write-Host 'OPEN'; $c.Close() } catch { Write-Host 'CLOSED' }" 2>nul | findstr "OPEN" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] WhatsApp Bridge is already ACTIVE on http://localhost:3005
    exit /b 0
)

:: 2. Find Node.js binary on Windows 10 / 11
set "NODE_CMD=node"
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    ) else if exist "%LocalAppData%\Programs\node\node.exe" (
        set "NODE_CMD=%LocalAppData%\Programs\node\node.exe"
        set "PATH=%LocalAppData%\Programs\node;%PATH%"
    ) else (
        echo [ERROR] Node.js is not found on this Windows system!
        echo Please download and install Node.js (LTS version) from:
        echo https://nodejs.org/
        if not "%~1"=="/silent" pause
        exit /b 1
    )
)

:: 3. Ensure node_modules exist
if not exist "node_modules" (
    echo [INFO] Installing WhatsApp Bridge packages...
    call npm install --no-audit --no-fund
)

echo ==============================================================================
echo             ZAMZAM FOODS - WHATSAPP AUTOMATION BRIDGE
echo                      Windows 10 / Windows 11
echo ==============================================================================
echo.
echo Starting WhatsApp Bridge on http://localhost:3005 ...
echo.

if "%~1"=="/silent" (
    "%NODE_CMD%" server.js
) else (
    "%NODE_CMD%" server.js
    pause
)
