# evidence-pack.ps1 - 증거팩 자동 생성 (Stop 훅)
# 세션 종료 시 로그+패치+테스트 결과를 하나의 번들로 저장
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$archiveDir = Join-Path $projectRoot "step_archive"
$evidenceDir = Join-Path $archiveDir "evidence"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$packDir = Join-Path $evidenceDir "pack_$timestamp"

# evidence 디렉토리 생성
if (-not (Test-Path $evidenceDir)) {
    New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
}
New-Item -ItemType Directory -Path $packDir -Force | Out-Null

# 1. Git diff (최근 변경 패치)
try {
    $diff = & git -C $projectRoot diff HEAD~1 --stat 2>$null
    if ($diff) {
        $diff | Out-File -FilePath (Join-Path $packDir "git_diff_stat.txt") -Encoding UTF8
    }
    
    $fullDiff = & git -C $projectRoot diff HEAD~1 2>$null
    if ($fullDiff) {
        $fullDiff | Out-File -FilePath (Join-Path $packDir "git_diff_full.patch") -Encoding UTF8
    }
} catch {}

# 2. progress.json 스냅샷
$progressFile = Join-Path $archiveDir "progress.json"
if (Test-Path $progressFile) {
    Copy-Item $progressFile (Join-Path $packDir "progress_snapshot.json")
}

# 3. harness-log.jsonl 최근 항목
$logFile = Join-Path $archiveDir "harness-log.jsonl"
if (Test-Path $logFile) {
    Get-Content $logFile -Tail 20 | Out-File -FilePath (Join-Path $packDir "recent_harness_log.jsonl") -Encoding UTF8
}

# 4. 빌드 상태
$distHtml = Join-Path $projectRoot "dist" "index.html"
$buildStatus = @{
    timestamp = $timestamp
    dist_exists = (Test-Path $distHtml)
    dist_size_kb = 0
}
if (Test-Path $distHtml) {
    $buildStatus.dist_size_kb = [math]::Round((Get-Item $distHtml).Length / 1024, 1)
}
$buildStatus | ConvertTo-Json | Out-File -FilePath (Join-Path $packDir "build_status.json") -Encoding UTF8

# 5. 훅 로그 수집
$hookLogs = Get-ChildItem -Path $PSScriptRoot -Filter "*.log" -ErrorAction SilentlyContinue
foreach ($log in $hookLogs) {
    $lastLines = Get-Content $log.FullName -Tail 30 -ErrorAction SilentlyContinue
    if ($lastLines) {
        $lastLines | Out-File -FilePath (Join-Path $packDir "hook_$($log.Name)") -Encoding UTF8
    }
}

# 6. 매니페스트 생성
$files = Get-ChildItem -Path $packDir -File
$manifest = @{
    pack_id = "pack_$timestamp"
    created_at = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
    file_count = $files.Count
    files = @($files | ForEach-Object { $_.Name })
}
$manifest | ConvertTo-Json | Out-File -FilePath (Join-Path $packDir "manifest.json") -Encoding UTF8

Write-Host "EVIDENCE PACK: Created at step_archive/evidence/pack_$timestamp/ ($($files.Count + 1) files)"
exit 0
