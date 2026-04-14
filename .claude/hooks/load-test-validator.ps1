# load-test-validator.ps1 - 부하 테스트 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Load Test Validator Start ==="

$failed = $false

# 프로젝트 유형에 따른 부하 테스트 방법 결정
$distHtml = Join-Path $projectRoot "dist/index.html"

if (Test-Path $distHtml) {
    # 정적 HTML 프로젝트 -> Playwright 기반 성능 측정
    try {
        Push-Location $projectRoot
        $testScript = @"
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // 성능 측정
    const start = Date.now();
    await page.goto('file://${distHtml.Replace('\', '/')}');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;
    
    // 메모리 사용량
    const metrics = await page.evaluate(() => {
        return {
            domNodes: document.querySelectorAll('*').length,
            jsHeapUsed: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
        };
    });
    
    // 반복 로드 테스트 (10회)
    const times = [];
    for (let i = 0; i < 10; i++) {
        const s = Date.now();
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        times.push(Date.now() - s);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    console.log(JSON.stringify({
        initialLoadMs: loadTime,
        avgReloadMs: Math.round(avg),
        minReloadMs: min,
        maxReloadMs: max,
        domNodes: metrics.domNodes,
        status: avg < 3000 ? 'PASS' : 'FAIL'
    }, null, 2));
    
    await browser.close();
    
    if (avg >= 3000) process.exit(1);
})();
"@
        $testFile = Join-Path $projectRoot "_load_test_temp.js"
        $testScript | Set-Content $testFile -Encoding UTF8
        $output = & node $testFile 2>&1
        $exitCode = $LASTEXITCODE
        Remove-Item $testFile -ErrorAction SilentlyContinue
        Pop-Location
        
        Write-Log ($output | Out-String)
        
        if ($exitCode -eq 0) {
            Write-Log "PASS: Load test passed"
        } else {
            Write-Log "FAIL: Load test failed (avg reload > 3s)"
            $failed = $true
        }
    } catch {
        Pop-Location
        Write-Log "FAIL: Load test error - $_"
        $failed = $true
    }
} else {
    Write-Log "WARNING: No dist/index.html - checking for server-based project"
    
    # k6 또는 artillery 확인
    try {
        $k6Path = Get-Command k6 -ErrorAction Stop
        Write-Log "k6 found: $($k6Path.Source)"
    } catch {
        Write-Log "k6 not found"
    }
    
    try {
        Push-Location $projectRoot
        $output = & npx artillery --version 2>&1
        Pop-Location
        Write-Log "Artillery version: $output"
    } catch {
        Pop-Location
        Write-Log "Artillery not found"
    }
}

Write-Log "=== Load Test Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
