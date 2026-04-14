# token-budget-guard.ps1 - 토큰 예산 가드레일
# PostToolUse 훅: 세션 내 누적 도구 호출 횟수를 추적하여 예산 초과 경고
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$archiveDir = Join-Path $projectRoot "step_archive"
$budgetFile = Join-Path $archiveDir "session_budget.json"

# 예산 설정
$MAX_TOOL_CALLS = 500        # 세션당 최대 도구 호출 수
$WARN_THRESHOLD = 0.75       # 75%에서 경고
$CRITICAL_THRESHOLD = 0.90   # 90%에서 서브에이전트 위임 권고

# 현재 예산 로드 또는 초기화
if (Test-Path $budgetFile) {
    $budget = Get-Content $budgetFile -Raw | ConvertFrom-Json
} else {
    $budget = @{
        session_start = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
        tool_calls = 0
        warnings_issued = 0
        max_tool_calls = $MAX_TOOL_CALLS
    }
}

# 호출 카운트 증가
$budget.tool_calls = $budget.tool_calls + 1
$ratio = $budget.tool_calls / $MAX_TOOL_CALLS

# 임계값 체크
if ($ratio -ge $CRITICAL_THRESHOLD) {
    Write-Host "BUDGET CRITICAL: $($budget.tool_calls)/$MAX_TOOL_CALLS tool calls ($('{0:P0}' -f $ratio))"
    Write-Host "Delegate remaining work to subagents to preserve context."
    $budget.warnings_issued = $budget.warnings_issued + 1
} elseif ($ratio -ge $WARN_THRESHOLD) {
    Write-Host "BUDGET WARNING: $($budget.tool_calls)/$MAX_TOOL_CALLS tool calls ($('{0:P0}' -f $ratio))"
    $budget.warnings_issued = $budget.warnings_issued + 1
}

# 저장
$budget | ConvertTo-Json | Out-File -FilePath $budgetFile -Encoding UTF8 -Force

exit 0
