@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "ENV_FILE=%ROOT%\.env.local"
set "DEFAULT_API_BASE_URL=http://127.0.0.1:9877"

if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if /i "%%~A"=="NEXT_PUBLIC_API_BASE_URL" set "NEXT_PUBLIC_API_BASE_URL=%%~B"
    if /i "%%~A"=="NEXT_PUBLIC_API_KEY" set "NEXT_PUBLIC_API_KEY=%%~B"
    if /i "%%~A"=="AGRIPULSE_FRONTEND_MODE" set "AGRIPULSE_FRONTEND_MODE=%%~B"
  )
)

if not defined NEXT_PUBLIC_API_BASE_URL set "NEXT_PUBLIC_API_BASE_URL=%DEFAULT_API_BASE_URL%"
if not defined HOSTNAME set "HOSTNAME=127.0.0.1"
if not defined PORT set "PORT=3000"
if not defined AGRIPULSE_FRONTEND_MODE set "AGRIPULSE_FRONTEND_MODE=prod"
if /i not "%AGRIPULSE_FRONTEND_MODE%"=="dev" if /i not "%AGRIPULSE_FRONTEND_MODE%"=="prod" set "AGRIPULSE_FRONTEND_MODE=prod"
set "FRONTEND_URL=http://%HOSTNAME%:%PORT%"

if not exist "%ROOT%\package.json" (
  echo [ERROR] package.json not found in "%ROOT%"
  exit /b 1
)

if not exist "%ROOT%\node_modules" (
  echo [ERROR] node_modules not found.
  echo Install dependencies first:
  echo   pnpm install
  echo or
  echo   npm install
  exit /b 1
)

set "FRONTEND_PORT_PID="
for /f "tokens=2,5" %%A in ('netstat -ano ^| findstr LISTENING ^| findstr /C:":%PORT%"') do (
  set "FRONTEND_PORT_PID=%%B"
)

if defined FRONTEND_PORT_PID (
  curl.exe -s -I --max-time 4 "%FRONTEND_URL%" >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    echo [INFO] Frontend already running on %FRONTEND_URL% with PID %FRONTEND_PORT_PID%.
    exit /b 0
  )
  echo [WARN] Port %PORT% is occupied by unresponsive PID %FRONTEND_PORT_PID%.
  echo Attempting automatic restart...
  taskkill /PID %FRONTEND_PORT_PID% /F >nul 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Could not stop PID %FRONTEND_PORT_PID%.
    echo Run this manually, then retry:
    echo   taskkill /PID %FRONTEND_PORT_PID% /F
    exit /b 1
  )
  ping -n 2 127.0.0.1 >nul
)

echo %NEXT_PUBLIC_API_BASE_URL% | findstr /I "localhost" >nul
if %ERRORLEVEL% EQU 0 (
  echo [WARN] NEXT_PUBLIC_API_BASE_URL uses localhost.
  echo        For faster local calls, prefer: http://127.0.0.1:9877
)

where pnpm.cmd >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pushd "%ROOT%" || exit /b 1
  if /i "%AGRIPULSE_FRONTEND_MODE%"=="prod" (
    echo Building AgriPulse frontend with pnpm for production mode...
    pnpm.cmd build
    if %ERRORLEVEL% NEQ 0 (
      set "EXIT_CODE=%ERRORLEVEL%"
      popd
      exit /b %EXIT_CODE%
    )
    echo Starting AgriPulse frontend with pnpm in production mode at %FRONTEND_URL%
    echo Set AGRIPULSE_FRONTEND_MODE=dev in .env.local for live-reload mode.
    echo Using NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%
    pnpm.cmd run start --hostname %HOSTNAME% --port %PORT%
    set "EXIT_CODE=%ERRORLEVEL%"
    popd
    exit /b %EXIT_CODE%
  )
  echo Starting AgriPulse frontend with pnpm in dev mode at %FRONTEND_URL%
  echo Using NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%
  pnpm.cmd dev --hostname %HOSTNAME% --port %PORT%
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

where npm.cmd >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pushd "%ROOT%" || exit /b 1
  if /i "%AGRIPULSE_FRONTEND_MODE%"=="prod" (
    echo Building AgriPulse frontend with npm for production mode...
    npm.cmd run build
    if %ERRORLEVEL% NEQ 0 (
      set "EXIT_CODE=%ERRORLEVEL%"
      popd
      exit /b %EXIT_CODE%
    )
    echo Starting AgriPulse frontend with npm in production mode at %FRONTEND_URL%
    echo Set AGRIPULSE_FRONTEND_MODE=dev in .env.local for live-reload mode.
    echo Using NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%
    npm.cmd run start -- --hostname %HOSTNAME% --port %PORT%
    set "EXIT_CODE=%ERRORLEVEL%"
    popd
    exit /b %EXIT_CODE%
  )
  echo Starting AgriPulse frontend with npm in dev mode at %FRONTEND_URL%
  echo Using NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%
  npm.cmd run dev -- --hostname %HOSTNAME% --port %PORT%
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

echo [ERROR] Neither pnpm nor npm is available on PATH.
exit /b 1
