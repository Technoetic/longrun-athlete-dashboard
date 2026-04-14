# linting-validator.ps1 - 코드 린팅 검증 (Biome + Stylelint)
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Linting Validator Start ==="

$failed = $false
$srcDir = Join-Path $projectRoot "src"

if (-not (Test-Path $srcDir)) {
    Write-Log "WARNING: src/ not found, skipping"
    exit 0
}

$srcFiles = Get-ChildItem -Path $srcDir -Recurse -File -ErrorAction SilentlyContinue
if ($srcFiles.Count -eq 0) {
    Write-Log "WARNING: src/ is empty, skipping"
    exit 0
}

# 1. Biome JS 린팅
$jsFiles = Get-ChildItem -Path $srcDir -Recurse -Filter "*.js" -ErrorAction SilentlyContinue
if ($jsFiles.Count -gt 0) {
    Push-Location $projectRoot
    $output = & npx @biomejs/biome lint src/ 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    if ($exitCode -eq 0) {
        Write-Log "PASS: Biome lint passed"
    } else {
        Write-Log "FAIL: Biome lint issues found"
        Write-Log $output
        $failed = $true
    }
} else {
    Write-Log "SKIP: No JS files to lint"
}

# 2. Stylelint CSS 린팅
$cssFiles = Get-ChildItem -Path $srcDir -Recurse -Filter "*.css" -ErrorAction SilentlyContinue
if ($cssFiles.Count -gt 0) {
    Push-Location $projectRoot
    $output = & npx stylelint "src/**/*.css" 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    if ($exitCode -eq 0) {
        Write-Log "PASS: Stylelint passed"
    } else {
        Write-Log "FAIL: Stylelint issues found"
        Write-Log $output
        $failed = $true
    }
} else {
    Write-Log "SKIP: No CSS files to lint"
}

Write-Log "=== Linting Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
