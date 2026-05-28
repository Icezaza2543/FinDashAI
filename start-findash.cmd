@echo off
setlocal
title FinDash AI Web App

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js / npm was not found.
  echo Install Node.js LTS first, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if %ERRORLEVEL%==0 (
  echo FinDash AI is already running.
  start "" "http://127.0.0.1:5173"
  exit /b 0
)

if not exist "node_modules" (
  echo Installing dependencies. This only happens the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting FinDash AI...
start "" powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173'"
call npm run dev

echo.
echo FinDash AI stopped.
pause
