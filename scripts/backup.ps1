# 2GO Automated MongoDB Database Backup Script (PowerShell)
param(
    [string]$DbUri = "mongodb://localhost:27017/2go_dev",
    [string]$BackupDir = "./backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TargetFolder = "$BackupDir/backup_$Timestamp"

Write-Host "📦 Starting 2GO Database Backup..." -ForegroundColor Cyan
Write-Host "Target: $TargetFolder"

if (!(Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

mongodump --uri="$DbUri" --out="$TargetFolder"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 2GO Database Backup Completed Successfully: $TargetFolder" -ForegroundColor Green
} else {
    Write-Host "⚠️ mongodump returned exit code: $LASTEXITCODE. Verify mongodump is in PATH or container is running." -ForegroundColor Yellow
}
