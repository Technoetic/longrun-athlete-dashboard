# destructive-guard.ps1 - 파괴적 명령 차단
# PreToolUse(Bash) 훅: rm -rf, git push --force, DROP TABLE 등 위험 명령 차단
param()

$ErrorActionPreference = "Continue"

# stdin에서 이벤트 JSON 읽기
$inputJson = $null
try {
    $inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
} catch {
    exit 0
}

$command = $inputJson.tool_input.command
if (-not $command) { exit 0 }

# 파괴적 패턴 목록
$destructivePatterns = @(
    'rm\s+-rf\s+/',
    'rm\s+-rf\s+\.',
    'rm\s+-rf\s+\*',
    'rm\s+-rf\s+~',
    'rmdir\s+/s',
    'del\s+/f\s+/s',
    'git\s+push\s+--force',
    'git\s+push\s+-f\s',
    'git\s+reset\s+--hard',
    'git\s+clean\s+-fd',
    'git\s+checkout\s+\.\s*$',
    'DROP\s+TABLE',
    'DROP\s+DATABASE',
    'TRUNCATE\s+TABLE',
    'npm\s+publish',
    'npx\s+-y\s',
    'chmod\s+777',
    'mkfs\.',
    ':(){.*\|.*&',
    'dd\s+if=.*of=/'
)

foreach ($pattern in $destructivePatterns) {
    if ($command -match $pattern) {
        Write-Host "BLOCKED: Destructive command detected"
        Write-Host "Pattern: $pattern"
        Write-Host "Command: $command"
        Write-Host "This command requires explicit user approval."
        exit 1
    }
}

exit 0
