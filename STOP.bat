@echo off
echo.
echo ==========================================
echo  Match Werkstatt - Service Stopper
echo ==========================================
echo.

echo Beende alle Match Werkstatt Services...
echo.

echo [1/5] Beende Node.js Prozesse (Frontend, Backend, Prisma)...
taskkill /IM node.exe /F >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js Prozesse beendet
) else (
    echo ℹ️  Keine Node.js Prozesse gefunden
)

echo [2/5] Beende MongoDB Prozesse...
taskkill /IM mongod.exe /F >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ MongoDB Prozesse beendet
) else (
    echo ℹ️  Keine MongoDB Prozesse gefunden
)

echo [3/5] Prüfe und beende Port-spezifische Prozesse...

REM Port 5175 (Frontend)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5175 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! == 0 echo ✅ Frontend Server (Port 5175) beendet
)

REM Port 3001 (Backend)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! == 0 echo ✅ Backend Server (Port 3001) beendet
)

REM Port 5555 (Prisma Studio)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :5555 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! == 0 echo ✅ Prisma Studio (Port 5555) beendet
)

REM Port 27017 (MongoDB)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :27017 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if !errorlevel! == 0 echo ✅ MongoDB Server (Port 27017) beendet
)

echo [4/5] Schließe Service Terminal-Fenster...
taskkill /FI "WindowTitle eq MongoDB Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Backend Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Frontend Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Prisma Studio*" /F >nul 2>&1
echo ✅ Terminal-Fenster geschlossen

echo [5/5] Aufräumen...
REM Kurz warten damit Prozesse sauber beendet werden
timeout /t 1 >nul

echo.
echo ==========================================
echo  🛑 Alle Services beendet!
echo ==========================================
echo.
echo Status-Überprüfung:
echo.

REM Überprüfe ob noch Prozesse laufen
netstat -ano | findstr ":5175 :3001 :5555 :27017" | findstr LISTENING >nul 2>&1
if %errorlevel% == 0 (
    echo ⚠️  WARNUNG: Einige Ports sind noch belegt!
    echo    Führen Sie 'netstat -ano | findstr "5175 3001 5555 27017"' aus
    echo    um zu prüfen welche Prozesse noch laufen.
) else (
    echo ✅ Alle Ports sind frei
)

echo.
echo 💡 HINWEIS:
echo - Alle Match Werkstatt Services wurden beendet
echo - Sie können die Anwendung mit START.bat neu starten
echo.

pause
