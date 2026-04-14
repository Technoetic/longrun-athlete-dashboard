# playwright-validator.ps1 - Playwright 환경 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "playwright-validator.log"
$resultFile = Join-Path (Join-Path $projectRoot "step_archive") "step002_playwright_test.md"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Playwright Validator Start ==="

$failed = $false

# 1. Playwright 설치 확인
try {
    $npxPath = Get-Command npx -ErrorAction Stop
    Write-Log "npx found: $($npxPath.Source)"
} catch {
    Write-Log "ERROR: npx not found"
    $failed = $true
}

# 2. Playwright 패키지 확인
$nodeModules = Join-Path $projectRoot "node_modules"
$playwrightDir = Join-Path $nodeModules "playwright"
if (Test-Path $playwrightDir) {
    Write-Log "playwright package found"
} else {
    Write-Log "WARNING: playwright not in node_modules - attempting global check"
    try {
        Push-Location $projectRoot
        $version = & npx playwright --version 2>&1
        Pop-Location
        Write-Log "Playwright version: $version"
    } catch {
        Write-Log "ERROR: Playwright not available"
        $failed = $true
    }
}

# 3. 브라우저 설치 확인
try {
    Push-Location $projectRoot
    $testScript = @"
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    console.log('Browser launched successfully');
    await browser.close();
    console.log('Browser closed successfully');
})();
"@
    $testFile = Join-Path $projectRoot "_playwright_test_temp.js"
    $testScript | Set-Content $testFile -Encoding UTF8
    $output = & node $testFile 2>&1
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Pop-Location
    Write-Log "Browser test: $($output | Out-String)"
    if ($output -match "Browser launched successfully") {
        Write-Log "PASS: Playwright browser works"
    } else {
        Write-Log "ERROR: Browser launch failed"
        $failed = $true
    }
} catch {
    Pop-Location
    Write-Log "ERROR: Browser test failed - $_"
    $failed = $true
}

# 결과 파일 생성
$status = if ($failed) { "FAIL" } else { "PASS" }
@"
# Playwright 환경 테스트 결과

**Status**: $status
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 검증 항목
- npx 사용 가능: $(if (-not $failed) { "YES" } else { "CHECK LOG" })
- Playwright 패키지: $(if (Test-Path $playwrightDir) { "installed" } else { "global/npx" })
- 브라우저 실행: $(if (-not $failed) { "OK" } else { "FAILED" })

## 로그
``````
$(Get-Content $logFile -Raw)
``````
"@ | Set-Content $resultFile -Encoding UTF8

Write-Log "=== Playwright Validator Complete: $status ==="

if ($failed) { exit 1 } else { exit 0 }
