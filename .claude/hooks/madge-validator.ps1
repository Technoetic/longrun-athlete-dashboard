# madge-validator.ps1 - madge 순환 의존성 탐지 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "madge-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step012_madge_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Madge Validator Start ==="

$failed = $false

$madgeDir = Join-Path $projectRoot "node_modules/madge"
if (Test-Path $madgeDir) {
    Write-Log "PASS: madge found"
} else {
    Write-Log "ERROR: madge not found. FIX: npm install -D madge"
    $failed = $true
}

if (-not $failed) {
    try {
        Push-Location $projectRoot
        $output = & npx madge --version 2>&1
        Pop-Location
        Write-Log "madge version: $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: madge --version failed - $_"
        $failed = $true
    }
}

# 순환 의존성 체크 (src가 있으면)
$srcDir = Join-Path $projectRoot "src"
if (-not $failed -and (Test-Path $srcDir)) {
    try {
        Push-Location $projectRoot
        $circular = & npx madge --circular src/ 2>&1
        Pop-Location
        Write-Log "Circular dependency check: $($circular | Out-String)"
    } catch {
        Pop-Location
        Write-Log "WARNING: circular check failed (may be OK if no JS files yet)"
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# madge 순환 의존성 탐지 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Madge Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
