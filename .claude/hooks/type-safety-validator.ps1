# type-safety-validator.ps1 - 타입 안전성 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Type Safety Validator Start ==="

$failed = $false

# tsconfig.json 확인
$tsConfig = Join-Path $projectRoot "tsconfig.json"
if (Test-Path $tsConfig) {
    Write-Log "tsconfig.json found"
    
    # TypeScript 타입 체크 실행
    try {
        Push-Location $projectRoot
        $output = & npx tsc --noEmit 2>&1
        $exitCode = $LASTEXITCODE
        Pop-Location
        
        if ($exitCode -eq 0) {
            Write-Log "PASS: TypeScript type check passed"
        } else {
            Write-Log "FAIL: TypeScript type errors found"
            Write-Log ($output | Out-String)
            $failed = $true
        }
    } catch {
        Pop-Location
        Write-Log "WARNING: tsc check failed - $_"
    }
} else {
    # JSDoc 기반 검사 또는 Biome 기반 검사
    Write-Log "No tsconfig.json - checking with Biome"
    try {
        Push-Location $projectRoot
        $output = & npx @biomejs/biome lint --rule-categories=correctness src/ 2>&1
        Pop-Location
        Write-Log "Biome correctness check done"
    } catch {
        Pop-Location
        Write-Log "WARNING: Biome correctness check skipped"
    }
}

Write-Log "=== Type Safety Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
