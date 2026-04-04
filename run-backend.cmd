@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_PYTHON=%ROOT%\.venv311\Scripts\python.exe"
set "BACKEND_DIR=%ROOT%\backend"
set "ENV_FILE=%ROOT%\.env.local"
set "UVICORN_RELOAD="
if not defined BACKEND_HOST set "BACKEND_HOST=127.0.0.1"
if not defined BACKEND_PORT set "BACKEND_PORT=9877"
set "BACKEND_DOCS_URL=http://%BACKEND_HOST%:%BACKEND_PORT%/docs"
set "BACKEND_HEALTH_URL=http://%BACKEND_HOST%:%BACKEND_PORT%/health"

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
    if /i "%%~A"=="AGRIPULSE_REPORTS_DB_PATH" set "AGRIPULSE_REPORTS_DB_PATH=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_ENABLED" set "AGRIPULSE_AUTH_ENABLED=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_SECRET_KEY" set "AGRIPULSE_AUTH_SECRET_KEY=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_TOKEN_EXP_MINUTES" set "AGRIPULSE_AUTH_TOKEN_EXP_MINUTES=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_REFRESH_TOKEN_EXP_DAYS" set "AGRIPULSE_AUTH_REFRESH_TOKEN_EXP_DAYS=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_DB_PATH" set "AGRIPULSE_AUTH_DB_PATH=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_ALLOW_SIGNUP" set "AGRIPULSE_AUTH_ALLOW_SIGNUP=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_PASSWORD_MIN_LENGTH" set "AGRIPULSE_AUTH_PASSWORD_MIN_LENGTH=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_BOOTSTRAP_DEMO_USER" set "AGRIPULSE_AUTH_BOOTSTRAP_DEMO_USER=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_DEMO_USERNAME" set "AGRIPULSE_AUTH_DEMO_USERNAME=%%~B"
    if /i "%%~A"=="AGRIPULSE_AUTH_DEMO_PASSWORD" set "AGRIPULSE_AUTH_DEMO_PASSWORD=%%~B"
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

set "BACKEND_PORT_PID="
for /f "tokens=2,5" %%A in ('netstat -ano ^| findstr LISTENING ^| findstr /C:":%BACKEND_PORT%"') do (
  set "BACKEND_PORT_PID=%%B"
)

if defined BACKEND_PORT_PID (
  curl.exe -s --max-time 4 "%BACKEND_HEALTH_URL%" >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo [INFO] Backend already running on %BACKEND_DOCS_URL% with PID %BACKEND_PORT_PID%.
    exit /b 0
  )
  echo [WARN] Port %BACKEND_PORT% is occupied by unresponsive PID %BACKEND_PORT_PID%.
  echo Attempting automatic restart...
  taskkill /PID %BACKEND_PORT_PID% /F >nul 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Could not stop PID %BACKEND_PORT_PID%.
    echo Run this manually, then retry:
    echo   taskkill /PID %BACKEND_PORT_PID% /F
    exit /b 1
  )
  ping -n 2 127.0.0.1 >nul
)

pushd "%BACKEND_DIR%" || exit /b 1
echo Starting AgriPulse backend at %BACKEND_DOCS_URL%
"%VENV_PYTHON%" -m uvicorn app.main:app %UVICORN_RELOAD% --host %BACKEND_HOST% --port %BACKEND_PORT%
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
