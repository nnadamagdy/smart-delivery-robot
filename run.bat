@echo off
setlocal
cd /d "%~dp0"
title Smart Delivery Robot Launcher

if /i "%~1"=="test" goto :tests

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install the LTS version from https://nodejs.org and run again.
  pause & exit /b 1
)

rem ---- pick a stable Python (3.12 / 3.13 / 3.11 / 3.10), never a preview build ----
set "PY="
for %%V in (3.12 3.13 3.11 3.10) do (
  if not defined PY (
    py -%%V --version >nul 2>nul && set "PY=py -%%V"
  )
)
if defined PY goto :havepy

where python >nul 2>nul
if errorlevel 1 goto :nopy
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set "PYV=%%v"
for /f "tokens=1,2 delims=." %%a in ("%PYV%") do set "PYMIN=%%b"
if %PYMIN% GEQ 14 goto :badpy
set "PY=python"
goto :havepy

:badpy
echo.
echo [WARNING] Your Python is %PYV%, a preview version. Some packages have no installers for it.
where winget >nul 2>nul
if errorlevel 1 goto :nopy
choice /m "Install Python 3.12 now with winget"
if errorlevel 2 goto :nopy
winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
echo.
echo Python 3.12 is installed. Close this window and double-click run.bat again.
pause & exit /b 0

:nopy
echo [ERROR] No supported Python found. Install Python 3.12 from https://www.python.org/downloads/
echo         ^(tick "Add python.exe to PATH"^), then run this file again.
pause & exit /b 1

:havepy
echo Using Python: %PY%

rem ---- remove a venv that was built with an unsupported Python ----
set "VV="
if exist "backend\.venv\Scripts\python.exe" for /f "tokens=2" %%v in ('"backend\.venv\Scripts\python.exe" --version 2^>^&1') do set "VV=%%v"
if defined VV for /f "tokens=1,2 delims=." %%a in ("%VV%") do if %%b GEQ 14 (
  echo Removing old virtual environment built with Python %VV%...
  rmdir /s /q backend\.venv
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo [1/3] Creating backend virtual environment...
  %PY% -m venv backend\.venv
  if errorlevel 1 ( echo [ERROR] Could not create the virtual environment. & pause & exit /b 1 )
)
echo [1/3] Installing backend packages...
"backend\.venv\Scripts\python.exe" -m pip install -q --only-binary=:all: -r backend\requirements.txt
if errorlevel 1 (
  echo [ERROR] pip install failed. Deleting the virtual environment so the next run starts clean.
  echo         Install Python 3.12 from python.org and run this file again.
  rmdir /s /q backend\.venv
  pause & exit /b 1
)

if not exist "frontend\node_modules" (
  echo [2/3] Installing frontend packages ^(first run only, may take a few minutes^)...
  pushd frontend
  call npm install
  if errorlevel 1 ( popd & echo [ERROR] npm install failed. & pause & exit /b 1 )
  popd
) else (
  echo [2/3] Frontend packages already installed.
)

echo [3/3] Starting backend and frontend...
start "Robot Backend - port 8000" /D "%~dp0backend" cmd /k ".venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
start "Robot Frontend - port 5173" /D "%~dp0frontend" cmd /k "npm run dev"

echo Waiting for the servers to start...
timeout /t 7 /nobreak >nul
start "" http://localhost:5173
echo.
echo Dashboard: http://localhost:5173    API docs: http://127.0.0.1:8000/docs
echo To stop everything, close the two server windows.
echo To run all tests: run.bat test
exit /b 0

:tests
if not exist "backend\.venv\Scripts\python.exe" ( echo Run run.bat once first to set up the project. & pause & exit /b 1 )
echo === Backend tests ===
pushd backend
".venv\Scripts\python.exe" -m pytest -q
popd
if exist "frontend\node_modules" (
  echo === Frontend tests ===
  pushd frontend
  call npm test
  popd
)
pause
exit /b 0
