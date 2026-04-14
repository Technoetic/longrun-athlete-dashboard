# evaluator-trigger.ps1 - # EVAL 마커 감지 시 evaluator 스킬 실행 알림 출력
# PostToolUse(Read) 이벤트에서 실행
# Claude Code 하네스는 훅 stdout을 Claude에 주입하므로, EVAL 마커가 감지되면
# Claude가 /evaluator 스킬을 실행하도록 지시 메시지를 출력한다.
param()

$ErrorActionPreference = "Continue"

# stdin에서 tool_input JSON 읽기 (visual-verify.ps1과 동일한 패턴)
$inputJson = $null
try { $inputJson = $input | ConvertFrom-Json } catch {}

if (-not $inputJson) { exit 0 }

# Read 도구로 읽은 파일 경로 추출
$filePath = ""
if ($inputJson.tool_input.file_path) { $filePath = $inputJson.tool_input.file_path }
elseif ($inputJson.tool_response.filePath) { $filePath = $inputJson.tool_response.filePath }

if (-not $filePath) { exit 0 }

# step_archive/stepNNN.md 파일에만 반응
if ($filePath -notmatch "step_archive[/\\]step\d{3}\.md$") { exit 0 }

# 파일 내용에 # EVAL 마커가 있는지 확인
if (-not (Test-Path $filePath)) { exit 0 }

$content = Get-Content $filePath -Raw -Encoding UTF8
if ($content -match "(?m)^#\s*EVAL") {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "[EVALUATOR-TRIGGER] # EVAL 마커 감지됨: $filePath"
    Write-Host "지금 즉시 /evaluator 스킬을 실행하여 루브릭 평가를 수행하라."
    Write-Host "========================================"
    Write-Host ""
}

exit 0
