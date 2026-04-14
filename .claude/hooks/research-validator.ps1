# research-validator.ps1 - 조사 결과 청크 검증 (BOM/CRLF/줄수/파일크기)
param(
    [string]$FilePath
)

$ErrorActionPreference = "Stop"
$claudeDir = Split-Path $PSScriptRoot -Parent

function Write-Log($msg) {
    Write-Host $msg
}

$failed = $false

if (-not $FilePath) {
    # 모든 청크 파일 검증
    $chunks = Get-ChildItem -Path $claudeDir -Filter "*.md" | Where-Object { $_.Name -match "chunk" }
    if ($chunks.Count -eq 0) {
        Write-Log "WARNING: No chunk files found to validate"
        exit 0
    }
} else {
    if (-not (Test-Path $FilePath)) {
        $FilePath = Join-Path $claudeDir $FilePath
    }
    $chunks = @(Get-Item $FilePath)
}

foreach ($chunk in $chunks) {
    Write-Log "--- Validating: $($chunk.Name) ---"
    
    $content = [System.IO.File]::ReadAllBytes($chunk.FullName)
    
    # BOM 검사
    if ($content.Length -ge 3 -and $content[0] -eq 0xEF -and $content[1] -eq 0xBB -and $content[2] -eq 0xBF) {
        Write-Log "WARNING: BOM detected in $($chunk.Name)"
    } else {
        Write-Log "PASS: No BOM"
    }
    
    # CRLF 검사
    $text = [System.IO.File]::ReadAllText($chunk.FullName)
    if ($text -match "`r`n") {
        Write-Log "WARNING: CRLF line endings in $($chunk.Name)"
    } else {
        Write-Log "PASS: LF line endings"
    }
    
    # 줄수 검사 (500줄 이하)
    $lines = ($text -split "`n").Count
    if ($lines -gt 500) {
        Write-Log "FAIL: $($chunk.Name) has $lines lines (max 500)"
        $failed = $true
    } else {
        Write-Log "PASS: $lines lines (max 500)"
    }
    
    # 파일 크기 검사 (50KB 이하)
    $sizeKB = [math]::Round($chunk.Length / 1024, 2)
    if ($sizeKB -gt 50) {
        Write-Log "FAIL: $($chunk.Name) is ${sizeKB}KB (max 50KB)"
        $failed = $true
    } else {
        Write-Log "PASS: ${sizeKB}KB"
    }
}

if ($failed) { exit 1 } else { exit 0 }
