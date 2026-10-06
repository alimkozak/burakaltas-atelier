@echo off
chcp 65001 >nul
title Burak Altas Atelier - Uzaktan onizleme
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
node onizleme.js
pause
