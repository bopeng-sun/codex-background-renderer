@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\start.ps1" -Mode Connect
if errorlevel 1 pause
