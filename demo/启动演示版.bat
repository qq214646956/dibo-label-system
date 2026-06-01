@echo off
title 地博标签打印系统 Demo

echo.
echo   ========================================
echo   =  地博标签打印系统 Demo 演示版
echo   ========================================
echo.
echo   浏览器打开: http://localhost:8080
echo   按 Ctrl+C 停止
echo.

start http://localhost:8080

cd /d "%~dp0"
py -m http.server 8080
if errorlevel 1 (
    echo   Python 未安装，请安装 Python 后再试
)
pause
