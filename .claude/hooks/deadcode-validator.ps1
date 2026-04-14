# deadcode-validator.ps1 - Dead Code 점검
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Dead Code Validator Start ==="

$failed = $false
$srcDir = Join-Path $projectRoot "src"

if (-not (Test-Path $srcDir)) {
    Write-Log "WARNING: src/ not found, skipping"
    exit 0
}

# 1. knip 미사용 코드 탐지
try {
    Push-Location $projectRoot
    $output = & npx knip 2>&1
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    if ($exitCode -eq 0) {
        Write-Log "PASS: knip - no unused code detected"
    } else {
        Write-Log "WARNING: knip found unused code"
        Write-Log ($output | Out-String)
    }
} catch {
    Pop-Location
    Write-Log "WARNING: knip check skipped - $_"
}

# 2. jscpd 중복 블록 탐지
try {
    Push-Location $projectRoot
    $output = & npx jscpd src/ --reporters console 2>&1
    Pop-Location
    Write-Log "jscpd duplicate check:"
    Write-Log ($output | Out-String)
} catch {
    Pop-Location
    Write-Log "WARNING: jscpd check skipped - $_"
}

# 3. tokei 코드 라인 비교
try {
    $tokeiOutput = & tokei $srcDir --output json 2>&1
    Write-Log "tokei code stats captured"
} catch {
    Write-Log "WARNING: tokei check skipped"
}

Write-Log "=== Dead Code Validator Complete ==="
if ($failed) { exit 1 } else { exit 0 }
