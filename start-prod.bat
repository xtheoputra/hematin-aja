@echo off
setlocal
title Hematin Aja - Production
cd /d "%~dp0"

echo ============================================
echo   Hematin Aja - mode produksi (optimized)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 ( echo [X] Node.js tidak ditemukan. Install dari https://nodejs.org & pause & exit /b 1 )

if not exist "node_modules" (
  echo [1/4] Memasang dependensi...
  call npm install
  if errorlevel 1 ( echo [X] Gagal npm install. & pause & exit /b 1 )
) else ( echo [1/4] Dependensi sudah terpasang. )

if not exist "prisma\dev.db" (
  echo [2/4] Menyiapkan database + seed...
  call npm run setup
  if errorlevel 1 ( echo [X] Gagal menyiapkan database. & pause & exit /b 1 )
) else ( echo [2/4] Database sudah ada. )

echo [3/4] Build produksi ^(npm run build^)...
call npm run build
if errorlevel 1 ( echo [X] Build gagal. & pause & exit /b 1 )

echo [4/4] Menjalankan server produksi di http://localhost:3000
echo       Tekan Ctrl+C untuk berhenti.
echo.
start "" http://localhost:3000
call npm run start

endlocal
