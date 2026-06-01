@echo off
title Start DiboLabelService

set "NSSM=%~dp0nssm.exe"
set "SERVICE_NAME=DiboLabelService"

echo Starting DiboLabelService...
%NSSM% start %SERVICE_NAME%

if %errorlevel% equ 0 (
    echo Service started.
) else (
    echo Start failed or already running.
)

timeout /t 3 >nul
%NSSM% status %SERVICE_NAME%
pause
