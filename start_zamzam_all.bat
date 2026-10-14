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

:: Start backend service in minimized window if not already listening on port 8000
powershell -NoProfile -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet" 2>nul | findstr "True" >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/2] Starting local engine connected to Aiven Cloud DB...
    start /min "Zamzam Foods Backend Engine" cmd /c "%~dp0start_backend_windows.bat"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/2] Local engine is already active on port 8000.
)

:: Launch the Desktop Application
echo [2/2] Opening Zamzam Foods Application...
if exist "%~dp0Zamzam Foods.exe" (
    start "" "%~dp0Zamzam Foods.exe"
) else if exist "%~dp0zamzam_foods_windows_complete_package\Zamzam Foods.exe" (
    start "" "%~dp0zamzam_foods_windows_complete_package\Zamzam Foods.exe"
) else if exist "%LocalAppData%\Programs\Zamzam Foods\Zamzam Foods.exe" (
    start "" "%LocalAppData%\Programs\Zamzam Foods\Zamzam Foods.exe"
) else if exist "%~dp0frontend\src-tauri\target\release\Zamzam Foods.exe" (
    start "" "%~dp0frontend\src-tauri\target\release\Zamzam Foods.exe"
) else (
    echo.
    echo Backend is ready! Please run your Zamzam Foods desktop app or open http://localhost:5173
)

timeout /t 2 /nobreak >nul
exit
