@echo off
setlocal enabledelayedexpansion

echo ========================================
echo     Match Werkstatt Service Manager
echo ========================================
echo.

REM Configuration - Edit these paths if needed
set PROJECT_DIR=%~dp0
set MONGODB_DATA_PATH=C:\data\db

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
    ) else if exist "%PROGRAMFILES%\MongoDB\Server\*\bin\mongod.exe" (
        for /d %%i in ("%PROGRAMFILES%\MongoDB\Server\*") do (
            if exist "%%i\bin\mongod.exe" set MONGODB_PATH="%%i\bin\mongod.exe"
        )
    )
)

REM Set the working directory to the project folder
cd /d "%PROJECT_DIR%"

echo Current directory: %CD%
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found! 
    echo Make sure you're running this from the project root directory.
    echo.
    pause
    exit /b 1
)

REM Check if server.cjs exists
if not exist "server.cjs" (
    echo ERROR: server.cjs not found!
    echo Make sure the backend server file exists.
    echo.
    pause
    exit /b 1
)

echo ✓ Project files found
echo.

REM Check if MongoDB is available
if "%MONGODB_PATH%"=="" (
    echo ERROR: MongoDB not found!
    echo.
    echo MongoDB installation not detected. Please:
    echo 1. Install MongoDB from: https://www.mongodb.com/try/download/community
    echo 2. Or edit this script and set the correct MONGODB_PATH
    echo.
    echo Common installation paths:
    echo - C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
    echo - C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
    echo.
    pause
    exit /b 1
)

REM Check if MongoDB data directory exists
if not exist "%MONGODB_DATA_PATH%" (
    echo MongoDB data directory not found: %MONGODB_DATA_PATH%
    echo Creating MongoDB data directory...
    mkdir "%MONGODB_DATA_PATH%" 2>nul
    if exist "%MONGODB_DATA_PATH%" (
        echo ✓ MongoDB data directory created: %MONGODB_DATA_PATH%
    ) else (
        echo ERROR: Could not create MongoDB data directory!
        echo Please create manually: %MONGODB_DATA_PATH%
        echo Or run as Administrator
        echo.
        pause
        exit /b 1
    )
) else (
    echo ✓ MongoDB data directory found: %MONGODB_DATA_PATH%
)

echo ✓ MongoDB found: %MONGODB_PATH%
echo.

echo Starting services with 3-second delays between each...
echo.

echo [1/4] Starting MongoDB Database Server...
echo Command: %MONGODB_PATH% --dbpath=%MONGODB_DATA_PATH%
start "MongoDB-Server" cmd /k "%MONGODB_PATH% --dbpath=%MONGODB_DATA_PATH%"
echo ✓ MongoDB terminal opened
timeout /t 3 /nobreak >nul

echo [2/4] Starting Backend API Server...
echo Command: node server.cjs
start "Backend-Server" cmd /k "node server.cjs"
echo ✓ Backend terminal opened
timeout /t 3 /nobreak >nul

echo [3/4] Starting Frontend Development Server...
echo Command: npm run dev
start "Frontend-Server" cmd /k "npm run dev"
echo ✓ Frontend terminal opened
timeout /t 3 /nobreak >nul

echo [4/4] Starting Prisma Studio Database Admin...
echo Command: npx prisma studio
start "Prisma-Studio" cmd /k "npx prisma studio"
echo ✓ Prisma Studio terminal opened

echo.
echo ========================================
echo    🚀 All services started successfully!
echo ========================================
echo.
echo Services and their URLs:
echo ┌─────────────────────┬─────────────────────────────┐
echo │ Service             │ URL                         │
echo ├─────────────────────┼─────────────────────────────┤
echo │ MongoDB             │ mongodb://localhost:27017   │
echo │ Backend API         │ http://localhost:3001       │
echo │ Frontend App        │ http://localhost:5174       │
echo │ Prisma Studio       │ http://localhost:5555       │
echo └─────────────────────┴─────────────────────────────┘
echo.
echo 📋 Notes:
echo - Each service runs in its own terminal window
echo - Check the terminal windows for logs and status
echo - Use Ctrl+C in each terminal to stop individual services
echo - Run 'stop-all-services.bat' to stop all services at once
echo.
echo 🌐 Open your browser and navigate to:
echo    http://localhost:5174
echo.

REM Ask if user wants to open the application automatically
choice /C YN /M "Do you want to open the application in your browser now? (Y/N)"
if errorlevel 2 goto :skip_open
if errorlevel 1 (
    echo Opening application in default browser...
    timeout /t 2 /nobreak >nul
    start http://localhost:5174
)

:skip_open
echo.
echo Press any key to close this window...
pause >nul
