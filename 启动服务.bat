@echo off
chcp 65001 >nul
title 地博标签打印系统

echo.
echo   ========================================
echo   =  地博标签打印系统  v2026.05
echo   ========================================
echo.

:: 尝试启动 MySQL（需要管理员权限）
echo   正在启动 MySQL...
net start MySQL84 >nul 2>&1
if %errorlevel% neq 0 (
    echo   MySQL 启动失败（请以管理员身份运行此 bat 或手动启动 MySQL）
    echo   模板功能暂不可用，SAP 查询不受影响
) else (
    echo   MySQL 已启动
)

echo.
echo   启动服务...
cd /d "D:\我的文件\地博外部项目\10标签打印系统\标签打印系统"
python sap_server.py
pause
