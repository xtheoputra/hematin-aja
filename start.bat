@echo off
setlocal
title Hematin Aja - Dev Server
cd /d "%~dp0"

echo ============================================
echo   Hematin Aja - menjalankan proyek
echo ============================================
echo.

REM --- Cek Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js tidak ditemukan.
  echo     Install dulu dari https://nodejs.org ^(versi 18 atau lebih baru^).
  echo.
  pause
  exit /b 1
)

REM --- Install dependensi bila belum ada ---
if not exist "node_modules" (
  echo [1/3] Memasang dependensi ^(npm install^)...
  call npm install
  if errorlevel 1 ( echo [X] Gagal npm install. & pause & exit /b 1 )
) else (
  echo [1/3] Dependensi sudah terpasang.
)

REM --- Siapkan database bila belum ada ---
if not exist "prisma\dev.db" (
  echo [2/3] Menyiapkan database + seed data ^(npm run setup^)...
  call npm run setup
  if errorlevel 1 ( echo [X] Gagal menyiapkan database. & pause & exit /b 1 )
) else (
  echo [2/3] Database sudah ada.
)

REM --- Jalankan dev server ---
echo [3/3] Menjalankan aplikasi di http://localhost:3000
echo       Tekan Ctrl+C untuk berhenti.
echo.
start "" http://localhost:3000
call npm run dev

endlocal
