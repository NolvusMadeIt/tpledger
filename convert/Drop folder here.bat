@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Drag a project folder onto this file.
  echo You can also:  node to-desktop.mjs C:\path\to\app
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org then try again.
  pause
  exit /b 1
)
if not exist "node_modules\@electron\packager" (
  echo Installing converter once…
  call npm install
)
node to-desktop.mjs %*
echo.
pause
