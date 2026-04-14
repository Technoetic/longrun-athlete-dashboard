# semgrep-validator.ps1 - Semgrep 정적 분석 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "semgrep-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step006_semgrep_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Semgrep Validator Start ==="

$failed = $false

try {
    $semgrepPath = Get-Command semgrep -ErrorAction Stop
    Write-Log "PASS: semgrep found: $($semgrepPath.Source)"
    $version = & semgrep --version 2>&1
    Write-Log "Semgrep version: $version"
} catch {
    Write-Log "ERROR: semgrep not found. FIX: pip install semgrep"
    $failed = $true
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# Semgrep 정적 분석 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Semgrep Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
