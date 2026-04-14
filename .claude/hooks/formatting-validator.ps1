# formatting-validator.ps1 - 코드 포매팅 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Formatting Validator Start ==="

$failed = $false
$srcDir = Join-Path $projectRoot "src"

if (-not (Test-Path $srcDir)) {
    Write-Log "WARNING: src/ not found, skipping"
    exit 0
}

# src 내 파일 존재 확인
$srcFiles = Get-ChildItem -Path $srcDir -Recurse -File -ErrorAction SilentlyContinue
if ($srcFiles.Count -eq 0) {
    Write-Log "WARNING: src/ is empty, skipping"
    exit 0
}

# Biome 포매팅 검사
Push-Location $projectRoot
$output = & npx @biomejs/biome format src/ 2>&1 | Out-String
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -eq 0) {
    Write-Log "PASS: Biome formatting check passed"
} else {
    Write-Log "FAIL: Biome formatting issues found"
    Write-Log $output
    $failed = $true
}

Write-Log "=== Formatting Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
