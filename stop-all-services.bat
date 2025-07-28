@echo off
echo ========================================
echo Stopping Match Werkstatt Application
echo ========================================
echo.

echo [1/4] Stopping Node.js processes (Backend, Frontend)...
taskkill /IM node.exe /F >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Node.js processes stopped
) else (
    echo ℹ No Node.js processes found
)

echo [2/4] Stopping MongoDB processes...
taskkill /IM mongod.exe /F >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ MongoDB processes stopped
) else (
    echo ℹ No MongoDB processes found
)

echo [3/4] Stopping any remaining development servers...
netstat -ano | findstr :3001 >nul && (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    echo ✓ Backend server (port 3001) stopped
) || echo ℹ No backend server running on port 3001

netstat -ano | findstr :5174 >nul && (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    echo ✓ Frontend server (port 5174) stopped
) || echo ℹ No frontend server running on port 5174

netstat -ano | findstr :5555 >nul && (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5555') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    echo ✓ Prisma Studio (port 5555) stopped
) || echo ℹ No Prisma Studio running on port 5555

echo [4/4] Closing service terminal windows...
taskkill /FI "WindowTitle eq MongoDB Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Backend Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Frontend Server*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Prisma Studio*" /F >nul 2>&1

echo.
echo ========================================
echo All services stopped successfully!
echo ========================================
echo.
pause
