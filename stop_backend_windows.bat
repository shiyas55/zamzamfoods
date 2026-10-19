@echo off
setlocal EnableDelayedExpansion
title Stop Zamzam Foods Backend
color 0C

echo ==============================================================================
echo                 STOP ZAMZAM FOODS LOCAL BACKEND SERVER
echo ==============================================================================
echo.

echo Terminating backend process on port 8000...
powershell -NoProfile -Command "
$connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue;
if ($connections) {
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess;
        if ($procId -gt 0) {
            Write-Host ('Stopping process ID: ' + $procId);
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue;
        }
    }
    Write-Host '[SUCCESS] Backend server stopped cleanly.' -ForegroundColor Green;
} else {
    Write-Host '[INFO] Backend server is not running on port 8000.' -ForegroundColor Yellow;
}
"

echo.
pause
