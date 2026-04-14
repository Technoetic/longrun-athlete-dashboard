# css-js-matcher.ps1
# PostToolUse Hook (Write|Edit) — CSS 셀렉터와 JS classList 교차 검증
# 범용: src/ 하위의 CSS와 JS를 자동 스캔
#
# CSS에서 .foo.bar--active 를 쓰는데 JS에서 classList.add("active") 하면 불일치 감지
#
# 사용법: settings.json의 PostToolUse에 등록
# { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/css-js-matcher.ps1", "timeout": 15 }] }

param()

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = (Get-Location).Path

# stdin에서 tool input 읽기
$input_json = $null
try { $input_json = $input | ConvertFrom-Json } catch {}

$filePath = ""
if ($input_json.tool_input.file_path) { $filePath = $input_json.tool_input.file_path }
elseif ($input_json.tool_response.filePath) { $filePath = $input_json.tool_response.filePath }

# CSS 또는 JS 파일 수정 시에만 실행
if ($filePath -and $filePath -notmatch '\.(css|js|jsx|tsx)$') {
    exit 0
}

# CSS에서 클래스 셀렉터 추출 (.foo--bar, .foo.bar 등)
$cssClasses = @{}
$cssFiles = Get-ChildItem -Path "$projectRoot/src" -Recurse -Filter "*.css" -ErrorAction SilentlyContinue
foreach ($file in $cssFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    # .class-name 패턴 추출 (BEM 포함)
    $matches = [regex]::Matches($content, '\.([a-zA-Z][a-zA-Z0-9_-]*(?:--[a-zA-Z0-9_-]+)?)')
    foreach ($m in $matches) {
        $cls = $m.Groups[1].Value
        if ($cls.Length -gt 2) { $cssClasses[$cls] = $file.Name }
    }
}

# JS에서 classList.add/remove/toggle/contains에 사용된 클래스명 추출
$jsClasses = @{}
$jsFiles = Get-ChildItem -Path "$projectRoot/src" -Recurse -Include "*.js","*.jsx","*.tsx" -ErrorAction SilentlyContinue
foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    # classList.add("foo"), classList.remove("bar") 등
    $matches = [regex]::Matches($content, 'classList\.\w+\(\s*["\x27]([a-zA-Z][a-zA-Z0-9_-]*(?:--[a-zA-Z0-9_-]+)?)["\x27]')
    foreach ($m in $matches) {
        $cls = $m.Groups[1].Value
        $jsClasses[$cls] = $file.Name
    }
    # className = "foo bar" 패턴
    $matches2 = [regex]::Matches($content, 'className\s*=\s*["\x27]([^"'']+)["\x27]')
    foreach ($m in $matches2) {
        $classes = $m.Groups[1].Value -split '\s+'
        foreach ($cls in $classes) {
            if ($cls.Length -gt 2) { $jsClasses[$cls] = $file.Name }
        }
    }
}

# JS에서 쓰는 클래스가 CSS에 없으면 경고
$mismatches = @()
foreach ($cls in $jsClasses.Keys) {
    if (-not $cssClasses.ContainsKey($cls)) {
        # 일반적인 클래스(active, hidden 등)는 스킵
        if ($cls -notmatch '^(active|hidden|visible|disabled|open|closed)$') {
            $mismatches += "JS '$($jsClasses[$cls])' uses class '$cls' but no CSS rule found"
        }
    }
}

if ($mismatches.Count -gt 0) {
    $msg = "CSS-JS 클래스 불일치 발견:`n" + ($mismatches -join "`n")
    $result = @{
        hookSpecificOutput = @{
            hookEventName = "PostToolUse"
            additionalContext = $msg
        }
    } | ConvertTo-Json -Depth 3
    Write-Output $result
}

exit 0
