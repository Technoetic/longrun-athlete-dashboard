# tokei-validator.ps1 - tokei 코드 통계 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "tokei-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step008_tokei_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Tokei Validator Start ==="

$failed = $false

try {
    $tokeiPath = Get-Command tokei -ErrorAction Stop
    Write-Log "PASS: tokei found: $($tokeiPath.Source)"
    $version = & tokei --version 2>&1
    Write-Log "tokei version: $version"
} catch {
    Write-Log "ERROR: tokei not found. FIX: scoop install tokei"
    $failed = $true
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# tokei 코드 통계 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Tokei Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
