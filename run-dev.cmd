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

where powershell.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/k','call ""%ROOT%\run-backend.cmd""' -WindowStyle Normal" >nul 2>nul
  powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>nul
  powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/k','call ""%ROOT%\run-frontend.cmd""' -WindowStyle Normal" >nul 2>nul
) else (
  start "AgriPulse Backend" cmd /k call "%ROOT%\run-backend.cmd"
  ping -n 3 127.0.0.1 >nul
  start "AgriPulse Frontend" cmd /k call "%ROOT%\run-frontend.cmd"
)

echo.
echo Backend : http://127.0.0.1:9877/docs
echo Frontend: http://127.0.0.1:3000
echo.
start "" http://127.0.0.1:9877/docs >nul 2>nul
start "" http://127.0.0.1:3000 >nul 2>nul
echo Browser tabs opened for backend docs and frontend.
echo.
echo Close each terminal window to stop that service.

exit /b 0
