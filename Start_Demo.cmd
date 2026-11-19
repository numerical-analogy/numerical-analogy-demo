@echo off
cd /d "%~dp0"
echo Open http://localhost:8765 in your browser.
py -3 -m http.server 8765 --bind 127.0.0.1 --directory dist
pause
