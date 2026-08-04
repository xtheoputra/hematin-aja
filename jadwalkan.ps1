# Mendaftarkan pembaruan harga otomatis ke Windows Task Scheduler.
#
# Kenapa Task Scheduler dan bukan setInterval di dalam Next.js: penjadwalan di
# dalam proses aplikasi ikut mati begitu prosesnya restart — dan restart itu
# justru hal yang paling sering terjadi saat mengembangkan. Penjadwal sistem
# tetap hidup.
#
# Pakai:
#   powershell -ExecutionPolicy Bypass -File jadwalkan.ps1            # pasang (harian 07:00)
#   powershell -ExecutionPolicy Bypass -File jadwalkan.ps1 -Jam 19:30 # jam lain
#   powershell -ExecutionPolicy Bypass -File jadwalkan.ps1 -Hapus     # cabut

param(
    [string]$Jam = "07:00",
    [switch]$Hapus
)

$ErrorActionPreference = "Stop"
$NamaTugas = "Hematin Aja - Perbarui Harga"
$Proyek = $PSScriptRoot

if ($Hapus) {
    if (Get-ScheduledTask -TaskName $NamaTugas -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $NamaTugas -Confirm:$false
        Write-Output "Tugas '$NamaTugas' dicabut."
    } else {
        Write-Output "Tugas '$NamaTugas' memang belum terpasang."
    }
    return
}

$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
if (-not $npm) {
    Write-Error "npm tidak ditemukan di PATH. Pasang Node.js dulu."
    return
}

# `npm run scrape` menjalankan adapter toko; hasil & kegagalannya tercatat ke
# tabel EventLog, jadi bisa diperiksa lewat halaman /admin keesokan harinya.
$aksi = New-ScheduledTaskAction -Execute $npm.Source -Argument "run scrape" -WorkingDirectory $Proyek
$pemicu = New-ScheduledTaskTrigger -Daily -At $Jam
$setelan = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $NamaTugas -Action $aksi -Trigger $pemicu -Settings $setelan -Force | Out-Null

Write-Output "Tugas '$NamaTugas' terpasang: tiap hari pukul $Jam."
Write-Output "Folder kerja: $Proyek"
Write-Output ""
Write-Output "Periksa hasilnya besok di halaman /admin, bagian 'Catatan kejadian terakhir'."
Write-Output "Jalankan sekarang untuk mencoba:  Start-ScheduledTask -TaskName '$NamaTugas'"
