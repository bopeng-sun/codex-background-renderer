@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\start.ps1" -Mode Preview
if errorlevel 1 pause
