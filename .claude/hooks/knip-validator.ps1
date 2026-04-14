# knip-validator.ps1 - knip 미사용 코드 탐지 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "knip-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step007_knip_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Knip Validator Start ==="

$failed = $false

$knipDir = Join-Path $projectRoot "node_modules/knip"
if (Test-Path $knipDir) {
    Write-Log "PASS: knip found in node_modules"
} else {
    Write-Log "ERROR: knip not found. FIX: npm install -D knip typescript"
    $failed = $true
}

# typescript도 필요
$tsDir = Join-Path $projectRoot "node_modules/typescript"
if (Test-Path $tsDir) {
    Write-Log "PASS: typescript found"
} else {
    Write-Log "ERROR: typescript not found. FIX: npm install -D typescript"
    $failed = $true
}

if (-not $failed) {
    try {
        Push-Location $projectRoot
        $output = & npx knip --version 2>&1
        Pop-Location
        Write-Log "knip version: $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: knip --version failed - $_"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# knip 미사용 코드 탐지 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Knip Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
