@echo off
echo ========================================
echo     MongoDB Installation Guide
echo ========================================
echo.

echo Dieser Guide hilft Ihnen bei der MongoDB Installation.
echo.

echo 📋 Schritt 1: MongoDB herunterladen
echo ────────────────────────────────────────
echo 1. Öffnen Sie: https://www.mongodb.com/try/download/community
echo 2. Wählen Sie:
echo    - Version: 7.0 oder höher
echo    - Platform: Windows
echo    - Package: msi
echo 3. Klicken Sie auf "Download"
echo.

choice /C YN /M "Haben Sie MongoDB bereits heruntergeladen? (Y/N)"
if errorlevel 2 (
    echo Öffne Download-Seite im Browser...
    start https://www.mongodb.com/try/download/community
    echo.
    echo Laden Sie MongoDB herunter und starten Sie dieses Script erneut.
    pause
    exit /b 0
)

echo.
echo 📋 Schritt 2: MongoDB installieren
echo ────────────────────────────────────────
echo 1. Führen Sie die heruntergeladene .msi-Datei aus
echo 2. Wählen Sie "Complete" Installation
echo 3. Aktivieren Sie "Install MongoDB as a Service"
echo 4. Aktivieren Sie "Install MongoDB Compass" (empfohlen)
echo.

choice /C YN /M "Haben Sie MongoDB installiert? (Y/N)"
if errorlevel 2 (
    echo.
    echo Installieren Sie MongoDB zuerst und starten Sie dieses Script erneut.
    pause
    exit /b 0
)

echo.
echo 📋 Schritt 3: Installation prüfen
echo ────────────────────────────────────────

REM Check if MongoDB is now available
where mongod >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ MongoDB ist im System PATH verfügbar
    mongod --version
    goto :mongodb_found
)

REM Check common installation paths
if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
    echo ✓ MongoDB gefunden: C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe
    "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --version
    goto :mongodb_found
) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
    echo ✓ MongoDB gefunden: C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe
    "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --version
    goto :mongodb_found
) else (
    echo ❌ MongoDB wurde nicht gefunden!
    echo.
    echo Mögliche Lösungen:
    echo 1. Starten Sie die Installation erneut
    echo 2. Starten Sie den Computer neu
    echo 3. Fügen Sie MongoDB manuell zum PATH hinzu:
    echo    C:\Program Files\MongoDB\Server\[VERSION]\bin\
    echo.
    pause
    exit /b 1
)

:mongodb_found
echo.
echo 📋 Schritt 4: Datenordner erstellen
echo ────────────────────────────────────────

set MONGODB_DATA_PATH=C:\data\db

if not exist "%MONGODB_DATA_PATH%" (
    echo Erstelle MongoDB Datenordner: %MONGODB_DATA_PATH%
    mkdir "%MONGODB_DATA_PATH%" 2>nul
    if exist "%MONGODB_DATA_PATH%" (
        echo ✓ Datenordner erstellt: %MONGODB_DATA_PATH%
    ) else (
        echo ❌ Konnte Datenordner nicht erstellen!
        echo Führen Sie dieses Script als Administrator aus oder erstellen Sie manuell:
        echo %MONGODB_DATA_PATH%
        pause
        exit /b 1
    )
) else (
    echo ✓ Datenordner existiert bereits: %MONGODB_DATA_PATH%
)

echo.
echo 📋 Schritt 5: MongoDB Service prüfen
echo ────────────────────────────────────────

sc query MongoDB >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ MongoDB Service ist installiert
    sc query MongoDB | find "RUNNING" >nul
    if %errorlevel% == 0 (
        echo ✓ MongoDB Service läuft bereits
    ) else (
        echo ℹ MongoDB Service ist gestoppt
        choice /C YN /M "MongoDB Service jetzt starten? (Y/N)"
        if errorlevel 1 (
            net start MongoDB
            if %errorlevel% == 0 (
                echo ✓ MongoDB Service gestartet
            ) else (
                echo ❌ MongoDB Service konnte nicht gestartet werden
            )
        )
    )
) else (
    echo ℹ MongoDB Service nicht gefunden (manueller Start erforderlich)
)

echo.
echo ========================================
echo     🎉 MongoDB Setup abgeschlossen!
echo ========================================
echo.
echo Sie können jetzt die Match Werkstatt Anwendung starten:
echo.
echo ▶️  start-match-werkstatt.bat
echo.

choice /C YN /M "Match Werkstatt jetzt starten? (Y/N)"
if errorlevel 1 (
    echo Starte Match Werkstatt...
    call start-match-werkstatt.bat
)

pause
