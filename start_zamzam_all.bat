@echo off
setlocal EnableDelayedExpansion
title Launch Zamzam Foods
color 0B

cd /d "%~dp0"

:: Auto-Create or Update Desktop Shortcut to current folder location
powershell -NoProfile -Command "
$desktop = [System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Zamzam Foods.lnk');
$ws = New-Object -ComObject WScript.Shell;
$s = $ws.CreateShortcut($desktop);
$s.TargetPath = '%~dp0start_zamzam_all.bat';
$s.WorkingDirectory = '%~dp0';
$icon = '%~dp0frontend\src-tauri\icons\icon.ico';
if (Test-Path $icon) { $s.IconLocation = $icon; }
$s.Description = 'Zamzam Foods Wholesale & Distribution Management';
$s.Save();
" >nul 2>&1

echo ==============================================================================
echo             ZAMZAM FOODS — DESKTOP APPLICATION LAUNCHER
echo ==============================================================================
echo.

:: Clear any stale WebView2 locks and stuck processes
taskkill /f /im "Zamzam Foods.exe" >nul 2>&1
del /f /q "%LocalAppData%\com.zamzamfoods.desktop\EBWebView\Default\lockfile" >nul 2>&1
del /f /q "%LocalAppData%\Programs\Zamzam Foods\EBWebView\Default\lockfile" >nul 2>&1
del /f /q "%LocalAppData%\Zamzam Foods\EBWebView\Default\lockfile" >nul 2>&1

:: Start backend service if not already listening on port 8000
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 8000); Write-Host 'OPEN'; $c.Close() } catch { Write-Host 'CLOSED' }" 2>nul | findstr "OPEN" >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/2] Starting local backend engine connected to Aiven Cloud DB...
    start "Zamzam Foods Backend Engine" cmd /k "%~dp0start_backend_windows.bat"
    
    echo Connecting to Aiven PostgreSQL Database...
    set /a attempts=0
    :WAIT_LOOP
    set /a attempts+=1
    timeout /t 1 /nobreak >nul
    powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 8000); Write-Host 'OPEN'; $c.Close() } catch { Write-Host 'CLOSED' }" 2>nul | findstr "OPEN" >nul 2>&1
    if %errorlevel% equ 0 goto BACKEND_UP
    if !attempts! geq 25 goto BACKEND_UP
    goto WAIT_LOOP
) else (
    echo [1/2] Local backend engine is already running on port 8000.
)
:BACKEND_UP

echo.
echo [2/2] Opening Zamzam Foods Application...

:: Check for native Zamzam Foods.exe first, then fallback to Edge/Chrome App Mode
set "APP_OPENED=0"

if exist "%~dp0Zamzam Foods.exe" (
    echo Launching Native Desktop App: "%~dp0Zamzam Foods.exe"...
    start "" "%~dp0Zamzam Foods.exe"
    set "APP_OPENED=1"
) else if exist "%LocalAppData%\Programs\Zamzam Foods\Zamzam Foods.exe" (
    echo Launching Installed Desktop App...
    start "" "%LocalAppData%\Programs\Zamzam Foods\Zamzam Foods.exe"
    set "APP_OPENED=1"
) else if exist "%~dp0frontend\src-tauri\target\release\Zamzam Foods.exe" (
    echo Launching Release Desktop App...
    start "" "%~dp0frontend\src-tauri\target\release\Zamzam Foods.exe"
    set "APP_OPENED=1"
)

if "!APP_OPENED!"=="0" (
    if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
        start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:8000/
        set "APP_OPENED=1"
    ) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
        start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:8000/
        set "APP_OPENED=1"
    ) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000/
        set "APP_OPENED=1"
    ) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000/
        set "APP_OPENED=1"
    ) else (
        start http://127.0.0.1:8000/
    )
)

timeout /t 2 /nobreak >nul
exit
