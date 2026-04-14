# biome-validator.ps1 - Biome 포매팅/린팅 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "biome-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step011_biome_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Biome Validator Start ==="

$failed = $false

$biomeDir = Join-Path $projectRoot "node_modules/@biomejs/biome"
if (Test-Path $biomeDir) {
    Write-Log "PASS: @biomejs/biome found"
} else {
    Write-Log "ERROR: @biomejs/biome not found. FIX: npm install -D --save-exact @biomejs/biome"
    $failed = $true
}

# biome.json 설정 파일 확인
$biomeConfig = Join-Path $projectRoot "biome.json"
if (Test-Path $biomeConfig) {
    Write-Log "PASS: biome.json found"
} else {
    Write-Log "WARNING: biome.json not found. FIX: npx @biomejs/biome init"
}

if (-not $failed) {
    try {
        Push-Location $projectRoot
        $output = & npx @biomejs/biome --version 2>&1
        Pop-Location
        Write-Log "Biome version: $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: biome --version failed - $_"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# Biome 포매팅/린팅 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Biome Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
