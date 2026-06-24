# Hematin Aja - skrip start (PowerShell)
# Jalankan: klik kanan > Run with PowerShell, atau:  powershell -ExecutionPolicy Bypass -File .\start.ps1
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "============================================" -ForegroundColor Green
Write-Host "  Hematin Aja - menjalankan proyek" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[X] Node.js tidak ditemukan. Install dari https://nodejs.org (v18+)." -ForegroundColor Red
  Read-Host "Tekan Enter untuk keluar"; exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "[1/3] Memasang dependensi (npm install)..." -ForegroundColor Cyan
  npm install
} else { Write-Host "[1/3] Dependensi sudah terpasang." }

if (-not (Test-Path "prisma\dev.db")) {
  Write-Host "[2/3] Menyiapkan database + seed (npm run setup)..." -ForegroundColor Cyan
  npm run setup
} else { Write-Host "[2/3] Database sudah ada." }

Write-Host "[3/3] Menjalankan aplikasi di http://localhost:3000 (Ctrl+C untuk berhenti)`n" -ForegroundColor Cyan
Start-Process "http://localhost:3000"
npm run dev
