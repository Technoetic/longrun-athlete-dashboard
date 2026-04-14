# session-start.ps1 - 세션 시작 시 프로젝트 규모 자동 출력
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $PSScriptRoot "session-start.log"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Tee-Object -FilePath $logFile -Append
}

Write-Log "=== Session Start ==="
Write-Log "Project root: $projectRoot"

# 프로젝트 규모 파악
$srcDir = Join-Path $projectRoot "src"
if (Test-Path $srcDir) {
    $fileCount = (Get-ChildItem -Path $srcDir -Recurse -File | Measure-Object).Count
    $jsFiles = (Get-ChildItem -Path $srcDir -Recurse -File -Filter "*.js" | Measure-Object).Count
    $cssFiles = (Get-ChildItem -Path $srcDir -Recurse -File -Filter "*.css" | Measure-Object).Count
    $htmlFiles = (Get-ChildItem -Path $srcDir -Recurse -File -Filter "*.html" | Measure-Object).Count
    
    Write-Log "=== Project Scale ==="
    Write-Log "Total files in src/: $fileCount"
    Write-Log "  JS files: $jsFiles"
    Write-Log "  CSS files: $cssFiles"
    Write-Log "  HTML files: $htmlFiles"
} else {
    Write-Log "src/ directory not found - new project"
    $fileCount = 0
}

# 서브에이전트 전략 제안
if ($fileCount -ge 1000) {
    Write-Log "Scale: LARGE (1000+ files) -> 20+ subagents recommended"
} elseif ($fileCount -ge 100) {
    Write-Log "Scale: MEDIUM (100-1000 files) -> 10-20 subagents recommended"
} else {
    Write-Log "Scale: SMALL (<100 files) -> 5-10 subagents recommended"
}

# package.json 확인
$pkgJson = Join-Path $projectRoot "package.json"
if (Test-Path $pkgJson) {
    Write-Log "=== Dependencies ==="
    $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
    if ($pkg.dependencies) {
        Write-Log "Dependencies: $($pkg.dependencies.PSObject.Properties.Name -join ', ')"
    }
    if ($pkg.devDependencies) {
        Write-Log "DevDependencies: $($pkg.devDependencies.PSObject.Properties.Name -join ', ')"
    }
}

# tokei가 있으면 실행
$tokeiPath = Get-Command tokei -ErrorAction SilentlyContinue
if ($tokeiPath -and (Test-Path $srcDir)) {
    Write-Log "=== tokei Code Stats ==="
    $tokeiOutput = & tokei $srcDir 2>&1
    Write-Log ($tokeiOutput | Out-String)
}

Write-Log "=== Session Start Complete ==="
exit 0
