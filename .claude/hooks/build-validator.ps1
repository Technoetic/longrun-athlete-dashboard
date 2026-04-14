# build-validator.ps1 - 빌드 검증
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== Build Validator Start ==="

$failed = $false

# dist/index.html 존재 확인
$distHtml = Join-Path $projectRoot "dist/index.html"
if (Test-Path $distHtml) {
    $fileSize = [math]::Round((Get-Item $distHtml).Length / 1024, 2)
    Write-Log "PASS: dist/index.html exists (${fileSize}KB)"
    
    # 기본 유효성 검사
    $content = Get-Content $distHtml -Raw -Encoding UTF8
    
    if ($content -match '<html') {
        Write-Log "PASS: Valid HTML structure"
    } else {
        Write-Log "FAIL: Missing <html> tag"
        $failed = $true
    }
    
    if ($content -match '<script>') {
        Write-Log "PASS: Inline scripts present"
    } else {
        Write-Log "WARNING: No inline scripts found"
    }
    
    if ($content -match '<style>') {
        Write-Log "PASS: Inline styles present"
    } else {
        Write-Log "WARNING: No inline styles found"
    }
    
    # 외부 참조가 남아있지 않은지 확인
    if ($content -match 'src="js/') {
        Write-Log "FAIL: Unbundled JS references remain"
        $failed = $true
    }
    if ($content -match 'href="css/') {
        Write-Log "FAIL: Unbundled CSS references remain"
        $failed = $true
    }
} else {
    Write-Log "FAIL: dist/index.html not found"
    Write-Log "FIX: Run html-bundler.ps1 first"
    $failed = $true
}

Write-Log "=== Build Validator Complete ==="

if ($failed) { exit 1 } else { exit 0 }
