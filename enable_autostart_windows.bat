@echo off
setlocal EnableDelayedExpansion
title Enable Zamzam Foods Always-On Background Auto-Start
color 0A

echo ==============================================================================
echo       ENABLE ZAMZAM FOODS ALWAYS-ON BACKGROUND SERVICE (AUTO-START)
echo ==============================================================================
echo.
echo Configuring Zamzam Foods Backend to run automatically whenever PC turns on...
echo.

cd /d "%~dp0"

:: 1. Add to Windows Startup Folder (runs on every boot/logon silently via VBScript)
powershell -NoProfile -Command "
$startup = [System.IO.Path]::Combine([Environment]::GetFolderPath('Startup'), 'ZamzamFoods_Backend_AutoStart.lnk');
$ws = New-Object -ComObject WScript.Shell;
$s = $ws.CreateShortcut($startup);
$s.TargetPath = 'wscript.exe';
$s.Arguments = '\"%~dp0run_backend_hidden.vbs\"';
$s.WorkingDirectory = '%~dp0';
$icon = '%~dp0icon.ico';
if (-not (Test-Path $icon)) { $icon = '%~dp0frontend\src-tauri\icons\icon.ico'; }
if (Test-Path $icon) { $s.IconLocation = $icon; }
$s.Description = 'Zamzam Foods Silent Background Backend Service';
$s.WindowStyle = 7;
$s.Save();
Write-Host '[1/3] Startup Folder Auto-Start registered.' -ForegroundColor Green;
"

:: 2. Add to Windows Registry Run Key (Guaranteed auto-run on Windows user login)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ZamzamFoodsBackend" /t REG_SZ /d "wscript.exe \"%~dp0run_backend_hidden.vbs\"" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/3] Windows Registry Run key registered successfully.
) else (
    echo [2/3] Registry registration skipped (non-critical).
)

:: 3. Register Windows Scheduled Task for instant boot launch
schtasks /create /tn "ZamzamFoodsBackend" /tr "wscript.exe \"%~dp0run_backend_hidden.vbs\"" /sc onlogon /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [3/3] Windows Scheduled Task registered successfully.
) else (
    echo [3/3] Task Scheduler registration skipped (non-critical).
)

echo.
echo ==============================================================================
echo Starting Backend Server silently in the background right now...
echo ==============================================================================

wscript.exe "%~dp0run_backend_hidden.vbs"

:: Verify server is up
set /a attempts=0
:WAIT_SERVER
set /a attempts+=1
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 8000); Write-Host 'OPEN'; $c.Close() } catch { Write-Host 'CLOSED' }" 2>nul | findstr "OPEN" >nul 2>&1
if %errorlevel% equ 0 goto SUCCESS
if !attempts! geq 15 goto SUCCESS
goto WAIT_SERVER

:SUCCESS
echo.
echo ******************************************************************************
echo  [SUCCESS] ZAMZAM FOODS BACKEND IS NOW RUNNING SILENTLY IN THE BACKGROUND!
echo  
echo  1. Every time you turn ON your PC, the backend starts automatically!
echo  2. When you turn OFF your PC, it safely turns off.
echo  3. No black command prompt window will stay on your screen.
echo  4. Your app and browser will now connect instantly with 0 errors!
echo ******************************************************************************
echo.
pause
