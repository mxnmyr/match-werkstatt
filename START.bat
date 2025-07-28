@echo off
echo.
echo ==========================================
echo  Match Werkstatt - Service Starter
echo ==========================================
echo.

cd /d "%~dp0"

REM MongoDB Pfad automatisch erkennen
set MONGODB_CMD=
where mongod >nul 2>&1
if %errorlevel% == 0 (
    set MONGODB_CMD=mongod
) else (
    REM Suche in Standard-Installationspfaden
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
        set MONGODB_CMD="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
        set MONGODB_CMD="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        set MONGODB_CMD="C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
    ) else if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
        set MONGODB_CMD="C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
    ) else (
        echo WARNUNG: MongoDB nicht gefunden!
        echo Installieren Sie MongoDB oder starten Sie den Service manuell.
        echo.
        choice /C YN /M "Ohne MongoDB fortfahren?"
        if errorlevel 2 exit /b 1
        goto :skip_mongodb
    )
)

REM MongoDB Datenordner erstellen
if not exist "C:\data\db" (
    echo Erstelle MongoDB Datenordner...
    mkdir "C:\data\db" 2>nul
)

echo [1/4] MongoDB starten...
echo Kommando: %MONGODB_CMD%
start "MongoDB Server" cmd /k "title MongoDB Server & echo MongoDB Server wird gestartet... & %MONGODB_CMD% --dbpath=C:\data\db"
timeout /t 2 >nul

:skip_mongodb
echo [2/4] Backend starten...
start "Backend Server" cmd /k "title Backend Server & echo Backend Server wird gestartet... & node server.cjs"
timeout /t 2 >nul

echo [3/4] Frontend starten...
start "Frontend Server" cmd /k "title Frontend Server & echo Frontend Server wird gestartet... & npm run dev"
timeout /t 2 >nul

echo [4/4] Prisma Studio starten...
start "Prisma Studio" cmd /k "title Prisma Studio & echo Prisma Studio wird gestartet... & npx prisma studio"
timeout /t 2 >nul

echo.
echo ==========================================
echo  🚀 Alle Services gestartet!
echo ==========================================
echo.
echo 📱 Anwendungs-URLs:
echo  ┌─────────────────────────────────────────┐
echo  │ Frontend:     http://localhost:5175    │
echo  │ Backend API:  http://localhost:3001    │
echo  │ Prisma Admin: http://localhost:5555    │
echo  │ MongoDB:      mongodb://localhost:27017│
echo  └─────────────────────────────────────────┘
echo.
echo 💡 HINWEIS: 
echo - 4 Terminal-Fenster wurden geöffnet
echo - Schließen Sie die Fenster um Services zu stoppen
echo - Oder verwenden Sie STOP.bat
echo.

timeout /t 3 >nul
echo Browser wird geöffnet...
start http://localhost:5175

echo.
echo ✅ Setup abgeschlossen! Viel Erfolg!
pause
