# lhci-validator.ps1 - Lighthouse CI 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "lhci-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step009_lhci_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== LHCI Validator Start ==="

$failed = $false

# @lhci/cli 확인
$lhciDir = Join-Path $projectRoot "node_modules/@lhci/cli"
if (Test-Path $lhciDir) {
    Write-Log "PASS: @lhci/cli found in node_modules"
} else {
    # npx로 사용 가능한지 확인
    try {
        Push-Location $projectRoot
        $output = & npx @lhci/cli --version 2>&1
        Pop-Location
        Write-Log "LHCI version (via npx): $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: @lhci/cli not found. FIX: npm install -D @lhci/cli"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# Lighthouse CI 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== LHCI Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
