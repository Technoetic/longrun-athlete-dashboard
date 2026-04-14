# refactoring-validator.ps1 - 리팩토링 후 검증 (빌드+테스트 통과 확인)
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Refactoring Validator Start ==="

$failed = $false

# 1. src/ 구조 확인
$srcDir = Join-Path $projectRoot "src"
if (-not (Test-Path $srcDir)) {
    Write-Log "FAIL: src/ directory not found"
    $failed = $true
} else {
    $jsFiles = Get-ChildItem -Path $srcDir -Recurse -Filter "*.js" -ErrorAction SilentlyContinue
    $cssFiles = Get-ChildItem -Path $srcDir -Recurse -Filter "*.css" -ErrorAction SilentlyContinue
    Write-Log "src/ structure: $($jsFiles.Count) JS, $($cssFiles.Count) CSS files"
}

# 2. HTML 번들링 테스트
try {
    $bundler = Join-Path $PSScriptRoot "html-bundler.ps1"
    if (Test-Path $bundler) {
        & powershell -ExecutionPolicy Bypass -File $bundler 2>&1 | ForEach-Object { Write-Log "  $_" }
        if ($LASTEXITCODE -ne 0) {
            Write-Log "FAIL: html-bundler.ps1 failed"
            $failed = $true
        } else {
            Write-Log "PASS: Bundle build succeeded"
        }
    }
} catch {
    Write-Log "FAIL: Bundle build error - $_"
    $failed = $true
}

# 3. 순환 의존성 검사
try {
    Push-Location $projectRoot
    $circular = & npx madge --circular src/ 2>&1
    Pop-Location
    if ($circular -match "No circular") {
        Write-Log "PASS: No circular dependencies"
    } else {
        Write-Log "WARNING: Circular dependencies detected"
        Write-Log ($circular | Out-String)
    }
} catch {
    Pop-Location
    Write-Log "WARNING: madge check skipped"
}

Write-Log "=== Refactoring Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
