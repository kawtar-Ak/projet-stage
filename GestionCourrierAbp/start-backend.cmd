@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0etc\scripts\start-backend.ps1" %*
