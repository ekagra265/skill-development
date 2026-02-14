@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_PYTHON=%ROOT%\.venv311\Scripts\python.exe"
set "BACKEND_DIR=%ROOT%\backend"
set "BACKEND_HOST=127.0.0.1"
set "BACKEND_PORT=9877"

if not exist "%VENV_PYTHON%" (
  echo [ERROR] Missing virtual environment: "%ROOT%\.venv311"
  echo Create it with:
  echo   py -3.11 -m venv "%ROOT%\.venv311"
  echo   "%ROOT%\.venv311\Scripts\python.exe" -m pip install -r "%BACKEND_DIR%\requirements.txt"
  exit /b 1
)

if not exist "%BACKEND_DIR%\app\main.py" (
  echo [ERROR] Backend app not found at "%BACKEND_DIR%\app\main.py"
  exit /b 1
)

pushd "%BACKEND_DIR%" || exit /b 1
echo Starting AgriPulse backend at http://%BACKEND_HOST%:%BACKEND_PORT%
"%VENV_PYTHON%" -m uvicorn app.main:app --reload --host %BACKEND_HOST% --port %BACKEND_PORT%
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
