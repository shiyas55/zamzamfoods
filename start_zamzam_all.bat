@echo off
setlocal EnableDelayedExpansion
title Launch Zamzam Foods
color 0B

echo Starting Zamzam Foods Local Engine...
cd /d "%~dp0"

:: Start backend in minimized window if not already running on port 8000
powershell -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet" | findstr "True" >nul 2>&1
if %errorlevel% neq 0 (
    echo Launching local backend service...
    start /min "" cmd /c "%~dp0start_backend_windows.bat"
    timeout /t 3 /nobreak >nul
) else (
    echo Local backend service already active on port 8000.
)

:: Launch the Desktop App if exe exists
if exist "frontend\src-tauri\target\release\Zamzam Foods.exe" (
    start "" "frontend\src-tauri\target\release\Zamzam Foods.exe"
) else if exist "%LocalAppData%\Programs\Zamzam Foods\Zamzam Foods.exe" (
    start "" "%LocalAppData%\Programs\Zamzam Foods\Zamzam Foods.exe"
) else (
    echo Backend is ready! You can now launch your Zamzam Foods desktop app.
)
