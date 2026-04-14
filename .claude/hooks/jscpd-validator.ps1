# jscpd-validator.ps1 - jscpd 코드 중복 탐지 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "jscpd-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step005_jscpd_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== JSCPD Validator Start ==="

$failed = $false

$jscpdDir = Join-Path $projectRoot "node_modules/jscpd"
if (Test-Path $jscpdDir) {
    Write-Log "PASS: jscpd found in node_modules"
} else {
    Write-Log "ERROR: jscpd not found. FIX: npm install -D jscpd"
    $failed = $true
}

if (-not $failed) {
    try {
        Push-Location $projectRoot
        $output = & npx jscpd --version 2>&1
        Pop-Location
        Write-Log "jscpd version: $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: jscpd --version failed - $_"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# jscpd 코드 중복 탐지 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== JSCPD Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
