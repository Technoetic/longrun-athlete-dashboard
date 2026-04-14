# step-dependency-gate.ps1 - Step 선행 의존성 파일 존재 검증
# PreToolUse 훅: Step 실행 전 필요한 선행 청크/파일이 존재하는지 게이팅
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$stepArchive = Join-Path $projectRoot "step_archive"
$progressFile = Join-Path $stepArchive "progress.json"

# stdin에서 이벤트 JSON 읽기
$inputJson = $null
try {
    $inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {
    exit 0
}

# Bash 명령에서 step 실행 감지
$command = $inputJson.tool_input.command
if (-not $command) { exit 0 }

# step 파일 읽기 패턴 감지 (cat step_archive/stepNNN.md 등)
if ($command -notmatch 'step(\d{3})') { exit 0 }

$stepNum = [int]$Matches[1]

# progress.json에서 현재 완료된 step 확인
if (Test-Path $progressFile) {
    $progress = Get-Content $progressFile -Raw | ConvertFrom-Json
    $completedSteps = @($progress.completed_steps)
} else {
    $completedSteps = @()
}

# step 의존성 맵 로드
$depsFile = Join-Path $stepArchive "step-deps.json"
if (-not (Test-Path $depsFile)) { exit 0 }

$deps = Get-Content $depsFile -Raw | ConvertFrom-Json
$stepKey = "step{0:D3}" -f $stepNum
$stepDeps = $deps.$stepKey

if (-not $stepDeps) { exit 0 }

# 선행 의존성 파일 존재 확인
$missing = @()
foreach ($dep in $stepDeps.required_files) {
    $depPath = Join-Path $projectRoot $dep
    # 와일드카드 지원
    if ($dep -match '\*') {
        $resolved = Get-ChildItem -Path (Split-Path $depPath -Parent) -Filter (Split-Path $depPath -Leaf) -ErrorAction SilentlyContinue
        if ($resolved.Count -eq 0) {
            $missing += $dep
        }
    } else {
        if (-not (Test-Path $depPath)) {
            $missing += $dep
        }
    }
}

if ($missing.Count -gt 0) {
    Write-Host "GATE BLOCKED: Step $stepNum requires missing files:"
    foreach ($m in $missing) {
        Write-Host "  - $m"
    }
    Write-Host "Complete prerequisite steps first."
    exit 1
}

Write-Host "GATE PASS: Step $stepNum dependencies satisfied"
exit 0
