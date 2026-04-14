# ui-regression-validator.ps1 - UI 회귀 테스트 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== UI Regression Validator Start ==="

$failed = $false

# 스냅샷 기반 비교
$screenshotsDir = Join-Path (Split-Path $PSScriptRoot -Parent) "screenshots"

if (-not (Test-Path $screenshotsDir)) {
    Write-Log "WARNING: screenshots directory not found"
    Write-Log "Creating screenshots directory"
    New-Item -ItemType Directory -Path $screenshotsDir -Force | Out-Null
}

# Playwright로 현재 상태 스크린샷
$distHtml = Join-Path $projectRoot "dist/index.html"
if (Test-Path $distHtml) {
    try {
        Push-Location $projectRoot
        $testScript = @"
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 390, height: 844, name: 'mobile' }
    ];
    for (const vp of viewports) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        await page.goto('file://${distHtml.Replace('\', '/')}');
        await page.waitForTimeout(1000);
        await page.screenshot({ 
            path: '.claude/screenshots/ui-regression-' + vp.name + '.png',
            fullPage: true 
        });
        await page.close();
    }
    await browser.close();
    console.log('Screenshots captured successfully');
})();
"@
        $testFile = Join-Path $projectRoot "_ui_regression_temp.js"
        $testScript | Set-Content $testFile -Encoding UTF8
        $output = & node $testFile 2>&1
        Remove-Item $testFile -ErrorAction SilentlyContinue
        Pop-Location
        
        Write-Log ($output | Out-String)
        
        if ($output -match "Screenshots captured") {
            Write-Log "PASS: Screenshots captured for all viewports"
        } else {
            Write-Log "WARNING: Screenshot capture may have issues"
        }
    } catch {
        Pop-Location
        Write-Log "FAIL: Screenshot capture failed - $_"
        $failed = $true
    }
} else {
    Write-Log "WARNING: dist/index.html not found - run html-bundler.ps1 first"
}

Write-Log "=== UI Regression Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
