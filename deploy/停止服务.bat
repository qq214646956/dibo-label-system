@echo off
title Stop DiboLabelService

set "NSSM=%~dp0nssm.exe"
set "SERVICE_NAME=DiboLabelService"

echo Stopping DiboLabelService...
%NSSM% stop %SERVICE_NAME%

if %errorlevel% equ 0 (
    echo Service stopped.
) else (
    echo Stop failed or already stopped.
)

timeout /t 2 >nul
%NSSM% status %SERVICE_NAME%
pause
