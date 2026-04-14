# c8-validator.ps1 - c8 코드 커버리지 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "c8-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step004_c8_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== C8 Validator Start ==="

$failed = $false

$c8Dir = Join-Path $projectRoot "node_modules/c8"
if (Test-Path $c8Dir) {
    Write-Log "PASS: c8 found in node_modules"
} else {
    Write-Log "ERROR: c8 not found. FIX: npm install -D c8"
    $failed = $true
}

if (-not $failed) {
    try {
        Push-Location $projectRoot
        $output = & npx c8 --version 2>&1
        Pop-Location
        Write-Log "c8 version: $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: c8 --version failed - $_"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# c8 코드 커버리지 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== C8 Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
