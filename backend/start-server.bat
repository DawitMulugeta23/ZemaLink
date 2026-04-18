@echo off
echo Starting ZemaLink Backend Server...
echo Server will run at http://localhost:8000
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"
php -S localhost:8000 router.php