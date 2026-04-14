# research-chunk-validator.ps1 - 단일 조사 결과 청크 검증
param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$ErrorActionPreference = "Stop"
$claudeDir = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $FilePath)) {
    $FilePath = Join-Path $claudeDir $FilePath
}

if (-not (Test-Path $FilePath)) {
    Write-Host "ERROR: File not found: $FilePath"
    exit 1
}

$failed = $false
$fileName = Split-Path $FilePath -Leaf

Write-Host "=== Validating: $fileName ==="

$content = [System.IO.File]::ReadAllBytes($FilePath)

# BOM 검사
if ($content.Length -ge 3 -and $content[0] -eq 0xEF -and $content[1] -eq 0xBB -and $content[2] -eq 0xBF) {
    Write-Host "FAIL: BOM detected - remove UTF-8 BOM"
    $failed = $true
} else {
    Write-Host "PASS: No BOM"
}

# CRLF 검사
$text = [System.IO.File]::ReadAllText($FilePath)
if ($text -match "`r`n") {
    Write-Host "WARNING: CRLF line endings detected (should be LF)"
} else {
    Write-Host "PASS: LF line endings"
}

# 줄수 검사
$lines = ($text -split "`n").Count
if ($lines -gt 500) {
    Write-Host "FAIL: $lines lines exceeds 500 line limit"
    $failed = $true
} else {
    Write-Host "PASS: $lines lines (limit: 500)"
}

# 파일 크기 검사
$sizeKB = [math]::Round((Get-Item $FilePath).Length / 1024, 2)
if ($sizeKB -gt 50) {
    Write-Host "FAIL: ${sizeKB}KB exceeds 50KB limit"
    $failed = $true
} else {
    Write-Host "PASS: ${sizeKB}KB (limit: 50KB)"
}

# 빈 파일 검사
if ($text.Trim().Length -eq 0) {
    Write-Host "FAIL: File is empty"
    $failed = $true
} else {
    Write-Host "PASS: File has content"
}

if ($failed) {
    Write-Host "`nRESULT: FAIL"
    exit 1
} else {
    Write-Host "`nRESULT: PASS"
    exit 0
}
