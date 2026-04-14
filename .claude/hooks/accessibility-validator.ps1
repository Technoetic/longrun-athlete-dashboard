# accessibility-validator.ps1 - 접근성 테스트 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Accessibility Validator Start ==="

$failed = $false

$distHtml = Join-Path $projectRoot "dist/index.html"
if (-not (Test-Path $distHtml)) {
    Write-Log "WARNING: dist/index.html not found - run html-bundler.ps1 first"
    exit 0
}

# axe-core 접근성 검사
try {
    Push-Location $projectRoot
    $testScript = @"
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default || require('@axe-core/playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('file://${distHtml.Replace('\', '/')}');
    await page.waitForTimeout(1000);
    
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    
    console.log(JSON.stringify({
        violations: results.violations.length,
        passes: results.passes.length,
        details: results.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length
        }))
    }, null, 2));
    
    await browser.close();
    
    if (results.violations.length > 0) {
        process.exit(1);
    }
})();
"@
    $testFile = Join-Path $projectRoot "_a11y_test_temp.js"
    $testScript | Set-Content $testFile -Encoding UTF8
    $output = & node $testFile 2>&1
    $exitCode = $LASTEXITCODE
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Pop-Location
    
    Write-Log ($output | Out-String)
    
    if ($exitCode -eq 0) {
        Write-Log "PASS: No accessibility violations"
    } else {
        Write-Log "FAIL: Accessibility violations found"
        $failed = $true
    }
} catch {
    Pop-Location
    Write-Log "FAIL: Accessibility test error - $_"
    $failed = $true
}

Write-Log "=== Accessibility Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
