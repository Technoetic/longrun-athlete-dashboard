# axe-core-validator.ps1 - @axe-core/playwright 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "axe-core-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step003_axe_core_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Axe-Core Validator Start ==="

$failed = $false

# @axe-core/playwright 패키지 확인
$axeDir = Join-Path $projectRoot "node_modules/@axe-core/playwright"
if (Test-Path $axeDir) {
    Write-Log "PASS: @axe-core/playwright found in node_modules"
    $pkgJson = Get-Content (Join-Path $axeDir "package.json") -Raw | ConvertFrom-Json
    Write-Log "Version: $($pkgJson.version)"
} else {
    Write-Log "ERROR: @axe-core/playwright not found in node_modules"
    Write-Log "FIX: npm install -D @axe-core/playwright"
    $failed = $true
}

# 기본 import 테스트
if (-not $failed) {
    try {
        Push-Location $projectRoot
        $testScript = @"
try {
    const AxeBuilder = require('@axe-core/playwright').default || require('@axe-core/playwright');
    console.log('axe-core import: OK');
    console.log('Type: ' + typeof AxeBuilder);
} catch(e) {
    console.error('axe-core import FAILED: ' + e.message);
    process.exit(1);
}
"@
        $testFile = Join-Path $projectRoot "_axe_test_temp.js"
        $testScript | Set-Content $testFile -Encoding UTF8
        $output = & node $testFile 2>&1
        Remove-Item $testFile -ErrorAction SilentlyContinue
        Pop-Location
        Write-Log ($output | Out-String)
        if ($LASTEXITCODE -ne 0) { $failed = $true }
    } catch {
        Pop-Location
        Write-Log "ERROR: axe-core test failed - $_"
        $failed = $true
    }
}

$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# @axe-core/playwright 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 검증 항목
- @axe-core/playwright 설치: $(if (Test-Path $axeDir) { "YES" } else { "NO" })
- import 테스트: $(if (-not $failed) { "OK" } else { "FAILED" })
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Axe-Core Validator Complete: $status ==="
if ($failed) { exit 1 } else { exit 0 }
