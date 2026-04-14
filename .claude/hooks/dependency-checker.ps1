# dependency-checker.ps1 - 의존성 자동 확인 및 설치 제안
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "dependency-checker.log"
$claudeDir = Split-Path $PSScriptRoot -Parent

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

"" | Set-Content $logFile
Write-Log "=== Dependency Checker Start ==="

$failed = $false
$missingPackages = @()

# 1. package.json 분석
$pkgJsonPath = Join-Path $projectRoot "package.json"
if (Test-Path $pkgJsonPath) {
    $pkg = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
    Write-Log "package.json found"
    
    # devDependencies 확인
    if ($pkg.devDependencies) {
        foreach ($dep in $pkg.devDependencies.PSObject.Properties) {
            $depDir = Join-Path $projectRoot "node_modules/$($dep.Name)"
            if (-not (Test-Path $depDir)) {
                Write-Log "MISSING: $($dep.Name)"
                $missingPackages += $dep.Name
            }
        }
    }
    
    # dependencies 확인
    if ($pkg.dependencies) {
        foreach ($dep in $pkg.dependencies.PSObject.Properties) {
            $depDir = Join-Path $projectRoot "node_modules/$($dep.Name)"
            if (-not (Test-Path $depDir)) {
                Write-Log "MISSING: $($dep.Name)"
                $missingPackages += $dep.Name
            }
        }
    }
}

# 2. 설계 문서에서 필요 라이브러리 추출
$designChunks = Get-ChildItem -Path $claudeDir -Filter "step030_*chunk*.md" -ErrorAction SilentlyContinue
$designChunks += Get-ChildItem -Path $claudeDir -Filter "step031_*chunk*.md" -ErrorAction SilentlyContinue

foreach ($chunk in $designChunks) {
    $content = Get-Content $chunk.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        Write-Log "Scanning design doc: $($chunk.Name)"
        # npm 패키지 패턴 감지
        $matches = [regex]::Matches($content, 'npm install[^\n]*?(\S+)')
        foreach ($m in $matches) {
            Write-Log "  Referenced package: $($m.Groups[1].Value)"
        }
    }
}

# 3. 결과 보고
if ($missingPackages.Count -gt 0) {
    Write-Log ""
    Write-Log "=== MISSING PACKAGES ==="
    Write-Log "Run: npm install"
    Write-Log "Or individually:"
    foreach ($pkg in $missingPackages) {
        Write-Log "  npm install $pkg"
    }
    $failed = $true
} else {
    Write-Log "All declared dependencies are installed"
}

Write-Log "=== Dependency Checker Complete ==="

if ($failed) {
    Write-Log "STATUS: FAIL - Missing packages detected"
    exit 1
} else {
    Write-Log "STATUS: PASS"
    exit 0
}
