@echo off
setlocal EnableDelayedExpansion
title Disable Zamzam Foods Auto-Start
color 0E

echo ==============================================================================
echo              DISABLE ZAMZAM FOODS AUTO-START ON WINDOWS BOOT
echo ==============================================================================
echo.

:: 1. Remove from Startup Folder
powershell -NoProfile -Command "
$startup = [System.IO.Path]::Combine([Environment]::GetFolderPath('Startup'), 'ZamzamFoods_Backend_AutoStart.lnk');
if (Test-Path $startup) { Remove-Item $startup -Force; Write-Host '[OK] Removed from Startup folder.' -ForegroundColor Green; }
$old = [System.IO.Path]::Combine([Environment]::GetFolderPath('Startup'), 'Zamzam Foods.lnk');
if (Test-Path $old) { Remove-Item $old -Force; }
"

:: 2. Remove Registry Run Key
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ZamzamFoodsBackend" /f >nul 2>&1
echo [OK] Removed from Windows Registry.

:: 3. Remove Scheduled Task
schtasks /delete /tn "ZamzamFoodsBackend" /f >nul 2>&1
echo [OK] Removed from Windows Scheduled Tasks.

echo.
echo ==============================================================================
echo [SUCCESS] Auto-start disabled. The backend will no longer start automatically.
echo ==============================================================================
echo.
pause
