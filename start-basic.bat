@echo off
cd /d "%~dp0"

echo Starte Match Werkstatt Services...
echo.

echo 1. MongoDB...
start cmd /k "title MongoDB & mongod --dbpath=C:\data\db"

timeout /t 2 >nul

echo 2. Backend...
start cmd /k "title Backend & node server.cjs"

timeout /t 2 >nul

echo 3. Frontend...
start cmd /k "title Frontend & npm run dev"

timeout /t 2 >nul

echo 4. Prisma Studio...
start cmd /k "title Prisma & npx prisma studio"

echo.
echo Fertig! Alle Services gestartet.
echo Frontend: http://localhost:5174
pause
