@echo off
title Burak Altas Atelier - Admin paneli
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js bulunamadi. Lutfen https://nodejs.org adresinden "LTS" surumunu kurun,
  echo  sonra bu dosyaya tekrar cift tiklayin.
  echo.
  pause
  exit /b
)
node admin.js
pause
