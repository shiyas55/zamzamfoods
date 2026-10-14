@echo off
setlocal EnableDelayedExpansion
title Enable Zamzam Foods Auto-Start on Windows Boot
color 0A

echo ==============================================================================
echo       ENABLE ZAMZAM FOODS AUTO-START ON WINDOWS BOOT
echo ==============================================================================
echo.

cd /d "%~dp0"

powershell -NoProfile -Command "
$startup = [System.IO.Path]::Combine([Environment]::GetFolderPath('Startup'), 'Zamzam Foods.lnk');
$ws = New-Object -ComObject WScript.Shell;
$s = $ws.CreateShortcut($startup);
$s.TargetPath = '%~dp0start_zamzam_all.bat';
$s.WorkingDirectory = '%~dp0';
$icon = '%~dp0frontend\src-tauri\icons\icon.ico';
if (Test-Path $icon) { $s.IconLocation = $icon; }
$s.Description = 'Zamzam Foods Auto-Start on Windows Startup';
$s.WindowStyle = 7;
$s.Save();
Write-Host '[SUCCESS] Zamzam Foods will now start automatically whenever Windows turns on!' -ForegroundColor Green;
"

echo.
echo ==============================================================================
echo Press any key to exit...
pause >nul
