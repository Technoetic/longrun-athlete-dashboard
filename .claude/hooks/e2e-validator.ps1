# e2e-validator.ps1 - E2E 테스트 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== E2E Validator Start ==="

$failed = $false

# Playwright 테스트 실행
try {
    Push-Location $projectRoot
    
    # playwright.config가 있으면 사용
    $configFile = Get-ChildItem -Path $projectRoot -Filter "playwright.config.*" -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($configFile) {
        Write-Log "Using config: $($configFile.Name)"
        $output = & npx playwright test 2>&1
    } else {
        # tests 디렉토리가 있으면 직접 실행
        $testsDir = Join-Path $projectRoot "tests"
        if (Test-Path $testsDir) {
            $output = & npx playwright test 2>&1
        } else {
            Write-Log "No playwright config or tests/ directory found"
            Write-Log "PASS: No E2E tests to run (skipped)"
            Pop-Location
            exit 0
        }
    }
    
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    Write-Log ($output | Out-String)
    
    if ($exitCode -eq 0) {
        Write-Log "PASS: All E2E tests passed"
    } else {
        Write-Log "FAIL: E2E tests failed"
        $failed = $true
    }
} catch {
    Pop-Location
    Write-Log "FAIL: E2E test execution error - $_"
    $failed = $true
}

Write-Log "=== E2E Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
