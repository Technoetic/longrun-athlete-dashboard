# harness-logger.ps1 - 하네스 관측 로그 (JSON Lines)
# Stop 훅: 매 세션 종료 시 구조화된 로그 기록
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile = Join-Path $projectRoot "step_archive" "harness-log.jsonl"

# stdin에서 이벤트 JSON 읽기
$inputJson = $null
try {
    $inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {}

# 세션 메트릭 수집
$logEntry = @{
    timestamp = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffZ')
    event = 'session_end'
    session_id = [guid]::NewGuid().ToString().Substring(0, 8)
    metrics = @{
        src_file_count = 0
        src_total_lines = 0
    }
}

# src/ 통계 (가볍게)
$srcDir = Join-Path $projectRoot "src"
if (Test-Path $srcDir) {
    $files = Get-ChildItem -Path $srcDir -Recurse -File -ErrorAction SilentlyContinue
    $logEntry.metrics.src_file_count = $files.Count
}

# dist 크기
$distHtml = Join-Path $projectRoot "dist" "index.html"
if (Test-Path $distHtml) {
    $logEntry.metrics | Add-Member -NotePropertyName 'dist_size_kb' -NotePropertyValue ([math]::Round((Get-Item $distHtml).Length / 1024, 1))
}

# progress.json 현황
$progressFile = Join-Path $projectRoot "step_archive" "progress.json"
if (Test-Path $progressFile) {
    $progress = Get-Content $progressFile -Raw | ConvertFrom-Json
    $logEntry.metrics | Add-Member -NotePropertyName 'steps_completed' -NotePropertyValue $progress.completed_steps.Count
    $logEntry.metrics | Add-Member -NotePropertyName 'current_step' -NotePropertyValue $progress.current_step
    $logEntry.metrics | Add-Member -NotePropertyName 'total_steps' -NotePropertyValue $progress.total_steps
}

# JSON Lines 포맷으로 기록 (한 줄씩 추가)
$jsonLine = $logEntry | ConvertTo-Json -Depth 5 -Compress
$jsonLine | Out-File -FilePath $logFile -Append -Encoding UTF8

Write-Host "HARNESS LOG: Session recorded to harness-log.jsonl"
exit 0
