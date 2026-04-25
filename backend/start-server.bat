@echo off
echo Starting ZemaLink Backend Server...
echo Server will run at http://127.0.0.1:8000
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"

:: Create sessions folder if it doesn't exist
if not exist "sessions" mkdir "sessions"

:: Set PHP temp directory
set TMPDIR=%CD%\sessions
set TEMP=%CD%\sessions

php -S 127.0.0.1:8000 router.php