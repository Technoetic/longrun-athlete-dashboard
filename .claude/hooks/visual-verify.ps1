# visual-verify.ps1
# PostToolUse Hook (Write|Edit) — 웹 프로젝트 파일 수정 시 자동 스크린샷 + 크롭
# 범용: dist/index.html 또는 프로젝트 루트의 index.html을 자동 감지
#
# 사용법: settings.json의 PostToolUse에 등록
# { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/visual-verify.ps1", "timeout": 30 }] }

param()

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = (Get-Location).Path

# stdin에서 tool input 읽기
$input_json = $null
try { $input_json = $input | ConvertFrom-Json } catch {}

# 웹 파일(html/css/js) 수정 시에만 실행
$filePath = ""
if ($input_json.tool_input.file_path) { $filePath = $input_json.tool_input.file_path }
elseif ($input_json.tool_response.filePath) { $filePath = $input_json.tool_response.filePath }

if ($filePath -and $filePath -notmatch '\.(html|css|js|jsx|tsx|vue|svelte)$') {
    exit 0
}

# dist/index.html 또는 index.html 자동 감지
$htmlFile = $null
if (Test-Path "$projectRoot/dist/index.html") { $htmlFile = "$projectRoot/dist/index.html" }
elseif (Test-Path "$projectRoot/build/index.html") { $htmlFile = "$projectRoot/build/index.html" }
elseif (Test-Path "$projectRoot/index.html") { $htmlFile = "$projectRoot/index.html" }
elseif (Test-Path "$projectRoot/src/index.html") { $htmlFile = "$projectRoot/src/index.html" }

if (-not $htmlFile) {
    # HTML 파일 없으면 스킵
    exit 0
}

# 스크린샷 디렉토리
$ssDir = "$projectRoot/.claude/screenshots"
if (-not (Test-Path $ssDir)) { New-Item -ItemType Directory -Path $ssDir -Force | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Playwright 스크린샷 스크립트 생성
$scriptContent = @"
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  try {
    const browser = await chromium.launch();
    const filePath = 'file:///' + path.resolve('$($htmlFile.Replace("\","/"))').replace(/\\\\/g, '/');
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(filePath, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '$($ssDir.Replace("\","/"))/auto-verify-${timestamp}.png', fullPage: false });
    await page.close();
    await browser.close();
  } catch(e) { process.exit(0); }
})();
"@

$tmpScript = "$projectRoot/.claude/screenshots/_tmp_verify.js"
Set-Content -Path $tmpScript -Value $scriptContent -Encoding UTF8
try {
    node $tmpScript 2>$null
} catch {}
Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue

# 결과 JSON 출력
$result = @{
    hookSpecificOutput = @{
        hookEventName = "PostToolUse"
        additionalContext = "스크린샷 촬영됨: .claude/screenshots/auto-verify-$timestamp.png — Read로 직접 확인하세요."
    }
} | ConvertTo-Json -Depth 3

Write-Output $result
exit 0
