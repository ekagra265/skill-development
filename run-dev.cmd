@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if not exist "%ROOT%\run-backend.cmd" (
  echo [ERROR] Missing file: "%ROOT%\run-backend.cmd"
  exit /b 1
)

if not exist "%ROOT%\run-frontend.cmd" (
  echo [ERROR] Missing file: "%ROOT%\run-frontend.cmd"
  exit /b 1
)

echo Launching AgriPulse backend and frontend in separate terminals...
start "AgriPulse Backend" cmd /k "\"%ROOT%\run-backend.cmd\""
timeout /t 2 >nul
start "AgriPulse Frontend" cmd /k "\"%ROOT%\run-frontend.cmd\""

echo.
echo Backend : http://127.0.0.1:9877/docs
echo Frontend: http://127.0.0.1:3000
echo.
echo Close each terminal window to stop that service.

exit /b 0
