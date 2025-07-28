@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Match Werkstatt (ohne MongoDB)
echo ========================================
echo.

REM Set the working directory to the project folder
cd /d "%~dp0"

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

echo WARNUNG: MongoDB wird übersprungen!
echo Die Anwendung läuft nur mit JSON-Dateien im storage/ Ordner.
echo Für vollständige Funktionalität installieren Sie MongoDB.
echo.

echo Starting services with 3-second delays between each...
echo.

echo [1/2] Starting Backend API Server...
echo Command: node server.cjs
start "Backend Server - Match Werkstatt" cmd /k "title Backend Server - Match Werkstatt & echo [Backend] Starting Backend Server... & echo [Backend] API will be available at: http://localhost:3001 & echo [Backend] WARNING: Running without MongoDB! & echo [Backend] Press Ctrl+C to stop & echo. & node server.cjs"
echo ✓ Backend terminal opened
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Development Server...
echo Command: npm run dev
start "Frontend Server - Match Werkstatt" cmd /k "title Frontend Server - Match Werkstatt & echo [Frontend] Starting Frontend Development Server... & echo [Frontend] Application will be available at: http://localhost:5173 & echo [Frontend] Press Ctrl+C to stop & echo. & npm run dev"
echo ✓ Frontend terminal opened

echo.
echo ========================================
echo    🚀 Services started (ohne MongoDB)!
echo ========================================
echo.
echo Services und URLs:
echo ┌─────────────────────┬─────────────────────────────┐
echo │ Service             │ URL                         │
echo ├─────────────────────┼─────────────────────────────┤
echo │ Backend API         │ http://localhost:3001       │
echo │ Frontend App        │ http://localhost:5174       │
echo └─────────────────────┴─────────────────────────────┘
echo.
echo ⚠️  WICHTIGER HINWEIS:
echo - MongoDB ist NICHT installiert/gestartet
echo - Neue Aufträge werden nur in JSON-Dateien gespeichert
echo - Einige erweiterte Funktionen sind nicht verfügbar
echo.
echo 📥 MongoDB installieren:
echo    https://www.mongodb.com/try/download/community
echo.

REM Ask if user wants to open the application automatically
choice /C YN /M "Möchten Sie die Anwendung jetzt im Browser öffnen? (Y/N)"
if errorlevel 2 goto :skip_open
if errorlevel 1 (
    echo Öffne Anwendung im Standard-Browser...
    timeout /t 2 /nobreak >nul
    start http://localhost:5174
)

:skip_open
echo.
echo Drücken Sie eine beliebige Taste zum Schließen...
pause >nul
