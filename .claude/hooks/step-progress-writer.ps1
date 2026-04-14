# step-progress-writer.ps1 - Step 완료 상태 자동 기록 (Stop 훅)
# 세션 종료 시 완료된 Step 및 메트릭 기록
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$stepArchive = Join-Path $projectRoot "step_archive"
$progressFile = Join-Path $stepArchive "progress.json"

# stdin에서 이벤트 JSON 읽기
$inputJson = $null
try {
    $inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {}

if (-not (Test-Path $progressFile)) { exit 0 }

$progress = Get-Content $progressFile -Raw | ConvertFrom-Json

# Stop 이벤트에서 마지막 응답 분석
$response = ""
if ($inputJson -and $inputJson.stop_response) {
    $response = $inputJson.stop_response
}

# Step 완료 패턴 감지 ("Step NNN 완료" 또는 "step NNN/NNN 완료")
$completedNew = @()
$pattern = 'Step\s*(\d{1,3})\s*/?\s*\d{0,3}\s*완료'
$matches_found = [regex]::Matches($response, $pattern, 'IgnoreCase')

foreach ($m in $matches_found) {
    $stepNum = [int]$m.Groups[1].Value
    if ($stepNum -notin $progress.completed_steps) {
        $completedNew += $stepNum
    }
}

# 새로 완료된 step 추가
if ($completedNew.Count -gt 0) {
    $allCompleted = @($progress.completed_steps) + $completedNew
    $progress.completed_steps = $allCompleted | Sort-Object -Unique
    
    # current_step 갱신 (완료된 최대 + 1)
    $maxCompleted = ($allCompleted | Measure-Object -Maximum).Maximum
    if ($maxCompleted -lt $progress.total_steps) {
        $progress.current_step = $maxCompleted + 1
    }
    
    Write-Host "PROGRESS: Steps completed this session: $($completedNew -join ', ')"
    Write-Host "PROGRESS: Total completed: $($progress.completed_steps.Count)/$($progress.total_steps)"
}

# 세션 종료 시간 기록
$sessions = @($progress.session_history)
if ($sessions.Count -gt 0) {
    $lastSession = $sessions[-1]
    $lastSession | Add-Member -NotePropertyName 'ended_at' -NotePropertyValue (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') -Force
    $lastSession | Add-Member -NotePropertyName 'steps_completed' -NotePropertyValue $completedNew.Count -Force
    $sessions[-1] = $lastSession
    $progress.session_history = $sessions
}

$progress.last_updated = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
$progress | ConvertTo-Json -Depth 5 | Out-File -FilePath $progressFile -Encoding UTF8 -Force

Write-Host "Progress saved to progress.json"
exit 0
