@echo off
setlocal EnableDelayedExpansion
title Zamzam Foods — Local Backend Server (Aiven Cloud DB)
color 0A

echo ==============================================================================
echo             ZAMZAM FOODS — LOCAL BACKEND SERVER (100%% FREE)
echo               Connected to Online Aiven PostgreSQL Database
echo ==============================================================================
echo.

cd /d "%~dp0"

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    pause
    exit /b 1
)

:: Virtual environment check
if not exist ".venv" (
    echo [1/3] Creating Python virtual environment...
    python -m venv .venv
)

echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat

:: Install dependencies if django is missing
python -c "import django" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing backend dependencies...
    pip install -r backend\requirements.txt
)

:: Set Live Aiven Cloud Database URL
set "DATABASE_URL=postgres://avnadmin:AVNS__5t4TpkXOy-BXhofK6i@pg-65e4170-zamzamfoods.h.aivencloud.com:18638/defaultdb?sslmode=require"
set "DJANGO_ENV=development"
set "DJANGO_DEBUG=True"

echo [3/3] Checking database schema on Aiven Cloud...
python backend\manage.py migrate --noinput

echo.
echo ==============================================================================
echo  BACKEND SERVER RUNNING AT: http://127.0.0.1:8000/api/v1/
echo  ONLINE DATABASE          : Aiven PostgreSQL Cloud
echo  NO RAILWAY / NO VERCEL   : 100%% Free Local Setup
echo ==============================================================================
echo Keep this window open while using the Zamzam Foods Desktop application.
echo.

python backend\manage.py runserver 127.0.0.1:8000
pause
