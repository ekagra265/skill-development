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
  )
)

if not defined NEXT_PUBLIC_API_BASE_URL set "NEXT_PUBLIC_API_BASE_URL=%DEFAULT_API_BASE_URL%"
if not defined HOSTNAME set "HOSTNAME=127.0.0.1"
if not defined PORT set "PORT=3000"

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

where pnpm.cmd >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pushd "%ROOT%" || exit /b 1
  echo Starting AgriPulse frontend with pnpm at http://%HOSTNAME%:%PORT%
  echo Using NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%
  pnpm.cmd dev --hostname %HOSTNAME% --port %PORT%
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

where npm.cmd >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pushd "%ROOT%" || exit /b 1
  echo Starting AgriPulse frontend with npm at http://%HOSTNAME%:%PORT%
  echo Using NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%
  npm.cmd run dev -- --hostname %HOSTNAME% --port %PORT%
  set "EXIT_CODE=%ERRORLEVEL%"
  popd
  exit /b %EXIT_CODE%
)

echo [ERROR] Neither pnpm nor npm is available on PATH.
exit /b 1
