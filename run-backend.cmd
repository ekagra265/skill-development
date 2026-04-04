@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_PYTHON=%ROOT%\.venv311\Scripts\python.exe"
set "BACKEND_DIR=%ROOT%\backend"
set "BACKEND_HOST=127.0.0.1"
set "BACKEND_PORT=9877"
set "ENV_FILE=%ROOT%\.env.local"
set "UVICORN_RELOAD="

if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if /i "%%~A"=="AGRIPULSE_API_KEY_ENABLED" set "AGRIPULSE_API_KEY_ENABLED=%%~B"
    if /i "%%~A"=="AGRIPULSE_API_KEY" set "AGRIPULSE_API_KEY=%%~B"
    if /i "%%~A"=="AGRIPULSE_PRICE_SOURCE" set "AGRIPULSE_PRICE_SOURCE=%%~B"
    if /i "%%~A"=="AGRIPULSE_DATA_GOV_API_KEY" set "AGRIPULSE_DATA_GOV_API_KEY=%%~B"
    if /i "%%~A"=="AGRIPULSE_DATA_GOV_RESOURCE_ID" set "AGRIPULSE_DATA_GOV_RESOURCE_ID=%%~B"
    if /i "%%~A"=="AGRIPULSE_DATA_GOV_PAGE_SIZE" set "AGRIPULSE_DATA_GOV_PAGE_SIZE=%%~B"
    if /i "%%~A"=="AGRIPULSE_DATA_GOV_MAX_RECORDS" set "AGRIPULSE_DATA_GOV_MAX_RECORDS=%%~B"
    if /i "%%~A"=="AGRIPULSE_DATA_GOV_TIMEOUT_SEC" set "AGRIPULSE_DATA_GOV_TIMEOUT_SEC=%%~B"
    if /i "%%~A"=="AGRIPULSE_DATA_GOV_TOTAL_TIMEOUT_SEC" set "AGRIPULSE_DATA_GOV_TOTAL_TIMEOUT_SEC=%%~B"
  )
)
if not defined AGRIPULSE_API_KEY_ENABLED set "AGRIPULSE_API_KEY_ENABLED=0"
if not defined AGRIPULSE_PRICE_SOURCE set "AGRIPULSE_PRICE_SOURCE=local_csv"
if not defined AGRIPULSE_DATA_GOV_API_KEY set "AGRIPULSE_DATA_GOV_API_KEY="
if /i "%AGRIPULSE_BACKEND_RELOAD%"=="1" set "UVICORN_RELOAD=--reload"

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
"%VENV_PYTHON%" -m uvicorn app.main:app %UVICORN_RELOAD% --host %BACKEND_HOST% --port %BACKEND_PORT%
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
