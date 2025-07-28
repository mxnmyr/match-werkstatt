@echo off
echo ========================================
echo     Match Werkstatt Service Starter
echo ========================================
echo.

cd /d "%~dp0"

REM Find MongoDB
set MONGODB_CMD=mongod
where mongod >nul 2>&1
if not %errorlevel% == 0 (
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
        set MONGODB_CMD="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
        set MONGODB_CMD="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    ) else (
        echo MongoDB nicht gefunden. Starte ohne MongoDB...
        goto :start_without_mongo
    )
)

REM Create MongoDB data directory if needed
if not exist "C:\data\db" (
    echo Erstelle MongoDB Datenordner...
    mkdir "C:\data\db" 2>nul
)

echo [1/4] Starte MongoDB...
start "MongoDB" cmd /c "title MongoDB Server & echo MongoDB wird gestartet... & %MONGODB_CMD% --dbpath=C:\data\db & pause"
timeout /t 2 >nul

:start_without_mongo
echo [2/4] Starte Backend Server...
start "Backend" cmd /c "title Backend Server & echo Backend wird gestartet... & node server.cjs & pause"
timeout /t 2 >nul

echo [3/4] Starte Frontend Server...
start "Frontend" cmd /c "title Frontend Server & echo Frontend wird gestartet... & npm run dev & pause"
timeout /t 2 >nul

echo [4/4] Starte Prisma Studio...
start "Prisma" cmd /c "title Prisma Studio & echo Prisma Studio wird gestartet... & npx prisma studio & pause"

echo.
echo ========================================
echo Alle Services gestartet!
echo ========================================
echo.
echo URLs:
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:3001
echo - Prisma:   http://localhost:5555
echo.

choice /C YN /M "Browser öffnen?"
if errorlevel 1 start http://localhost:5173

pause
