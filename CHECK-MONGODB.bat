@echo off
echo ==========================================
echo  MongoDB Installation Checker
echo ==========================================
echo.

echo Suche nach MongoDB Installation...
echo.

REM Prüfe ob mongod im PATH ist
where mongod >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ mongod gefunden im System PATH
    for /f "delims=" %%i in ('where mongod') do echo    Pfad: %%i
    echo.
    echo Version:
    mongod --version | findstr "db version"
    echo.
    goto :found
)

echo ❌ mongod nicht im System PATH gefunden
echo.
echo Suche in Standard-Installationspfaden...

REM Prüfe Standard-Installationspfade
set FOUND_MONGODB=0

if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
    echo ✅ MongoDB 8.0 gefunden: C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
    "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --version | findstr "db version"
    set FOUND_MONGODB=1
)

if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    echo ✅ MongoDB 7.0 gefunden: C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --version | findstr "db version"
    set FOUND_MONGODB=1
)

if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
    echo ✅ MongoDB 6.0 gefunden: C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe
    "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --version | findstr "db version"
    set FOUND_MONGODB=1
)

if exist "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" (
    echo ✅ MongoDB 5.0 gefunden: C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe
    "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" --version | findstr "db version"
    set FOUND_MONGODB=1
)

if %FOUND_MONGODB% == 0 (
    echo ❌ MongoDB in Standard-Pfaden nicht gefunden!
    echo.
    echo 📥 MongoDB installieren:
    echo    1. Gehen Sie zu: https://www.mongodb.com/try/download/community
    echo    2. Laden Sie MongoDB Community Server herunter
    echo    3. Installieren Sie mit "Complete" Setup
    echo    4. Aktivieren Sie "Install MongoDB as a Service"
    echo.
    choice /C YN /M "Download-Seite jetzt öffnen?"
    if errorlevel 1 start https://www.mongodb.com/try/download/community
    goto :end
)

:found
echo.
echo Prüfe MongoDB Service...
sc query MongoDB >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ MongoDB Service ist installiert
    sc query MongoDB | find "RUNNING" >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ MongoDB Service läuft
    ) else (
        echo ⚠️  MongoDB Service ist gestoppt
        choice /C YN /M "MongoDB Service starten?"
        if errorlevel 1 (
            net start MongoDB
        )
    )
) else (
    echo ℹ️  MongoDB Service nicht installiert (manueller Start erforderlich)
)

echo.
echo Prüfe MongoDB Datenordner...
if exist "C:\data\db" (
    echo ✅ MongoDB Datenordner existiert: C:\data\db
) else (
    echo ⚠️  MongoDB Datenordner nicht gefunden
    choice /C YN /M "Datenordner erstellen?"
    if errorlevel 1 (
        mkdir "C:\data\db" 2>nul
        if exist "C:\data\db" (
            echo ✅ Datenordner erstellt: C:\data\db
        ) else (
            echo ❌ Fehler beim Erstellen des Datenordners
            echo    Führen Sie das Script als Administrator aus
        )
    )
)

:end
echo.
echo ==========================================
echo  MongoDB Check abgeschlossen
echo ==========================================
pause
