# harness-eyes — 하네스에 "눈" 추가

Claude Code 하네스에서 자동 시각 검증을 수행하는 범용 도구 모음.

## 문제

하네스가 코드를 작성하고 "됩니다"라고 답하지만, 실제로 안 되는 경우가 많다:
- CSS 셀렉터와 JS 클래스명 불일치
- 인라인 스타일이 외부 CSS를 덮어쓰기
- 요소가 컨테이너 밖으로 벗어남
- 포인터/라벨 겹침
- 색상 변화 미적용

## 구성

| 파일 | 용도 | Hook 시점 |
|:-----|:-----|:---------|
| `visual-verify.ps1` | 웹 파일 수정 시 자동 스크린샷 | PostToolUse(Write\|Edit) |
| `css-js-matcher.ps1` | CSS↔JS 클래스명 교차 검증 | PostToolUse(Write\|Edit) |
| `interaction-test.js` | 버튼 클릭 → 상태 변화 E2E | 수동 또는 Stop Hook |
| `first-screen-check.js` | 첫 화면 UX 체크 (3 뷰포트) | 수동 또는 Stop Hook |
| `verify.md` | `/verify` 커맨드 템플릿 | 슬래시 커맨드 |

## 설치

### 1. 파일 복사

```bash
cp -r harness-eyes/* .claude/hooks/    # Hook 파일
cp harness-eyes/verify.md .claude/commands/verify.md  # 커맨드
```

### 2. settings.json에 Hook 등록

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/css-js-matcher.ps1",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

### 3. 수동 실행

```bash
# 상호작용 테스트
node .claude/hooks/interaction-test.js dist/index.html

# 첫 화면 체크
node .claude/hooks/first-screen-check.js dist/index.html
```

## 의존성

- Node.js
- Playwright (`npx playwright install chromium`)
- PowerShell (Windows) 또는 pwsh (macOS/Linux)

## 핵심 원칙

> 코드를 작성한 후 "됩니다"라고 답하기 전에 반드시 스크린샷을 찍어서 직접 눈으로 확인한다.
> 확인 안 했으면 "안 봤습니다"라고 솔직하게 답한다.
