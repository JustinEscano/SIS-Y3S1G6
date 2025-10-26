@echo off
echo ========================================
echo  Starting SIS Application with Docker
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running!
echo.
echo Starting all services...
echo - MongoDB Database
echo - Backend API (port 5000)
echo - Frontend App (port 3000)
echo.

docker-compose up

echo.
echo Application stopped.
pause
