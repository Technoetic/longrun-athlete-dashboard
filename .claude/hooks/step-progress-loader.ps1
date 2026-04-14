# step-progress-loader.ps1 - Step 진행 상태 로드 (SessionStart)
# 새 세션 시작 시 이전 진행 상태를 로드하여 컨텍스트에 주입
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$stepArchive = Join-Path $projectRoot "step_archive"
$progressFile = Join-Path $stepArchive "progress.json"

Write-Host "=== Step Progress Loader ==="

if (-not (Test-Path $progressFile)) {
    Write-Host "No progress file found. Starting fresh."
    Write-Host "Next step: step001"
    
    # 초기 progress.json 생성
    $initial = @{
        last_updated = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
        current_step = 1
        total_steps = 111
        completed_steps = @()
        failed_steps = @()
        skipped_steps = @()
        session_history = @()
        eval_rounds = @{
            r1 = @{ step = 49;  result = $null; score = $null }
            r2 = @{ step = 69;  result = $null; score = $null }
            r3 = @{ step = 104; result = $null; score = $null }
        }
        metrics = @{
            total_sessions = 0
            total_duration_minutes = 0
            steps_per_session_avg = 0
        }
    } | ConvertTo-Json -Depth 5
    
    $initial | Out-File -FilePath $progressFile -Encoding UTF8 -Force
    exit 0
}

$progress = Get-Content $progressFile -Raw | ConvertFrom-Json

$completedCount = $progress.completed_steps.Count
$failedCount = $progress.failed_steps.Count
$currentStep = $progress.current_step
$totalSteps = $progress.total_steps

Write-Host "Progress: $completedCount/$totalSteps completed"
Write-Host "Current step: step$('{0:D3}' -f $currentStep)"
Write-Host "Failed steps: $failedCount"

if ($failedCount -gt 0) {
    Write-Host "Failed step list: $($progress.failed_steps -join ', ')"
}

# 세션 카운터 증가
$progress.metrics.total_sessions = $progress.metrics.total_sessions + 1
$sessionEntry = @{
    session_id = $progress.metrics.total_sessions
    started_at = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
    starting_step = $currentStep
}

$sessionList = @($progress.session_history) + @($sessionEntry)
$progress.session_history = $sessionList
$progress.last_updated = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')

$progress | ConvertTo-Json -Depth 5 | Out-File -FilePath $progressFile -Encoding UTF8 -Force

Write-Host "Session #$($progress.metrics.total_sessions) started"
Write-Host "=== Ready to resume from step$('{0:D3}' -f $currentStep) ==="
exit 0
