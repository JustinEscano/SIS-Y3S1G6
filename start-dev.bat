@echo off
echo ========================================
echo  Starting SIS in Development Mode
echo ========================================
echo.
echo This will rebuild containers if code changed
echo.

docker-compose up --build

pause
