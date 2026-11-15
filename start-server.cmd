@echo off
cd /d "%~dp0"
start "Mars Story Atlas" /min cmd /c "node server.mjs > server.log 2>&1"
