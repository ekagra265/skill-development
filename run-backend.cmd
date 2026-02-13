@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_PYTHON=%ROOT%\.venv311\Scripts\python.exe"
set "BACKEND_DIR=%ROOT%\backend"

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
echo Starting AgriPulse backend at http://127.0.0.1:8000
"%VENV_PYTHON%" -m uvicorn app.main:app --reload
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
