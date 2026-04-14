# stylelint-validator.ps1 - stylelint CSS 린팅 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "stylelint-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step010_stylelint_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Stylelint Validator Start ==="

$failed = $false

$stylelintDir = Join-Path $projectRoot "node_modules/stylelint"
if (Test-Path $stylelintDir) {
    Write-Log "PASS: stylelint found"
} else {
    Write-Log "ERROR: stylelint not found. FIX: npm install -D stylelint stylelint-config-standard"
    $failed = $true
}

$configDir = Join-Path $projectRoot "node_modules/stylelint-config-standard"
if (Test-Path $configDir) {
    Write-Log "PASS: stylelint-config-standard found"
} else {
    Write-Log "WARNING: stylelint-config-standard not found"
}

if (-not $failed) {
    try {
        Push-Location $projectRoot
        $output = & npx stylelint --version 2>&1
        Pop-Location
        Write-Log "stylelint version: $output"
    } catch {
        Pop-Location
        Write-Log "ERROR: stylelint --version failed - $_"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# stylelint CSS 린팅 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Stylelint Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
