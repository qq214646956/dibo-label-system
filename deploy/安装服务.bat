@echo off
title DiboLabelService Setup

set "DEPLOY_DIR=%~dp0"
set "DEPLOY_DIR=%DEPLOY_DIR:~0,-1%"
set "NSSM=%DEPLOY_DIR%\nssm.exe"
set "PYTHON_EXE=C:\Users\Administrator\AppData\Local\Programs\Python\Python311\python.exe"
set "SERVICE_NAME=DiboLabelService"

echo ============================================
echo   DiboLabelService Setup
echo ============================================
echo   Dir: %DEPLOY_DIR%
echo   Python: %PYTHON_EXE%
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Run as Administrator!
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python not found: %PYTHON_EXE%
    pause
    exit /b 1
)

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found
    pause
    exit /b 1
)

echo [1/5] Stopping old service...
%NSSM% stop %SERVICE_NAME% >nul 2>&1
%NSSM% remove %SERVICE_NAME% confirm >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/5] Installing service...
%NSSM% install %SERVICE_NAME% "%PYTHON_EXE%" sap_server.py
if %errorlevel% neq 0 (
    echo [ERROR] Install failed!
    pause
    exit /b 1
)

echo [3/5] Configuring...
%NSSM% set %SERVICE_NAME% AppDirectory "%DEPLOY_DIR%"
%NSSM% set %SERVICE_NAME% DisplayName "DiBo Label Print System"
%NSSM% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM% set %SERVICE_NAME% AppExit Default Restart
%NSSM% set %SERVICE_NAME% AppRestartDelay 5000

echo [4/5] Starting service...
%NSSM% start %SERVICE_NAME%

echo [5/5] Status check...
timeout /t 3 /nobreak >nul
%NSSM% status %SERVICE_NAME%

echo.
echo ============================================
echo   Done! Visit http://192.168.0.231:5000
echo ============================================
pause
