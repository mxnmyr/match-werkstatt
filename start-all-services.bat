@echo off
echo =====================echo [1/4] Starting MongoDB...
start "MongoDB" cmd /k "%MONGODB_PATH% --dbpath=C:\data\db"
timeout /t 3 /nobreak

:skip_mongodb

echo [2/4] Starting Backend Server...
start "Backend" cmd /k "node server.cjs"
timeout /t 3 /nobreak

echo [3/4] Starting Frontend Development Server...
start "Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak

echo [4/4] Starting Prisma Studio Database Admin...
start "Prisma" cmd /k "npx prisma studio"===
echo Starting Match Werkstatt Application
echo ========================================
echo.

REM Set the working directory to the project folder
cd /d "%~dp0"

REM Try to find MongoDB installation
set MONGODB_PATH=
where mongod >nul 2>&1
if %errorlevel% == 0 (
    set MONGODB_PATH=mongod
) else (
    REM Check common MongoDB installation paths
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
        set MONGODB_PATH="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
        set MONGODB_PATH="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        set MONGODB_PATH="C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        set MONGODB_PATH="C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
    )
)

if "%MONGODB_PATH%"=="" (
    echo WARNING: MongoDB not found! 
    echo The application will run with limited functionality.
    echo To install MongoDB, run: install-mongodb.bat
    echo.
    choice /C YN /M "Continue without MongoDB? (Y/N)"
    if errorlevel 2 exit /b 1
    goto :skip_mongodb
)

echo [1/4] Starting MongoDB...
start "MongoDB Server" cmd /k "echo Starting MongoDB Server... & %MONGODB_PATH% --dbpath=C:\data\db"
timeout /t 3 /nobreak

:skip_mongodb

echo [2/4] Starting Backend Server...
start "Backend Server" cmd /k "echo Starting Backend Server... & node server.cjs"
timeout /t 3 /nobreak

echo [3/4] Starting Frontend Development Server...
start "Frontend Server" cmd /k "echo Starting Frontend Development Server... & npm run dev"
timeout /t 3 /nobreak

echo [4/4] Starting Prisma Studio (Database Admin)...
start "Prisma Studio" cmd /k "echo Starting Prisma Studio... & npx prisma studio"
timeout /t 2 /nobreak

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Services running:
echo - MongoDB: Default port 27017
echo - Backend: http://localhost:3001
echo - Frontend: http://localhost:5174
echo - Prisma Studio: http://localhost:5555
echo.
echo To stop all services, close the respective terminal windows.
echo.
pause
