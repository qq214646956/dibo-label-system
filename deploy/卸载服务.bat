@echo off
chcp 65001 >nul
title 卸载地博标签打印系统服务

set "DEPLOY_DIR=D:\10标签打印系统\标签打印系统_部署版\标签打印系统_部署版"
set "NSSM=%DEPLOY_DIR%\nssm.exe"
set "SERVICE_NAME=DiboLabelService"

echo.
echo   =========================================
echo   =  卸载地博标签打印系统 - Windows 服务
echo   =========================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo   [错误] 请右键 - 以管理员身份运行此脚本！
    pause
    exit /b 1
)

echo   正在停止服务...
%NSSM% stop %SERVICE_NAME%
timeout /t 3 /nobreak >nul

echo   正在删除服务...
%NSSM% remove %SERVICE_NAME% confirm
if %errorlevel% equ 0 (
    echo   服务已卸载成功！
) else (
    echo   卸载失败，服务可能已不存在。
)

pause
