# diff-size-guard.ps1 - 변경량 제한 가드레일
# PreToolUse 훅: 단일 파일 변경이 300줄을 초과하면 경고, 500줄 초과 시 차단
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

# stdin에서 이벤트 JSON 읽기
$inputJson = $null
try {
    $inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {
    exit 0
}

# Edit/Write 도구의 대상 파일 확인
$filePath = $null
if ($inputJson.tool_input.file_path) {
    $filePath = $inputJson.tool_input.file_path
} elseif ($inputJson.tool_input.path) {
    $filePath = $inputJson.tool_input.path
}

if (-not $filePath) { exit 0 }

# src/ 내부 파일만 검사
if ($filePath -notmatch 'src[\/]') { exit 0 }

# 새 내용의 줄 수 확인 (Write 도구)
$newContent = $inputJson.tool_input.content
if ($newContent) {
    $lineCount = ($newContent -split "`n").Count
    if ($lineCount -gt 500) {
        Write-Host "BLOCKED: File write exceeds 500 lines ($lineCount lines)"
        Write-Host "Split into smaller files or use chunked approach."
        exit 1
    }
    if ($lineCount -gt 300) {
        Write-Host "WARNING: Large file write ($lineCount lines). Consider splitting."
    }
}

# Edit 도구의 변경 크기 확인
$newString = $inputJson.tool_input.new_string
$oldString = $inputJson.tool_input.old_string
if ($newString -and $oldString) {
    $addedLines = ($newString -split "`n").Count
    $removedLines = ($oldString -split "`n").Count
    $diffSize = [Math]::Abs($addedLines - $removedLines) + [Math]::Min($addedLines, $removedLines)
    
    if ($diffSize -gt 500) {
        Write-Host "BLOCKED: Edit diff exceeds 500 lines ($diffSize lines changed)"
        Write-Host "Break into smaller edits."
        exit 1
    }
    if ($diffSize -gt 300) {
        Write-Host "WARNING: Large edit ($diffSize lines changed). Consider splitting."
    }
}

exit 0
