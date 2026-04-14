# Step 1 - 하네스 프리플라이트 체크

모든 도구 설치 검증, progress.json 초기화, .claude/ 경로 치환 맵을 확인한다.

## 실행 내용

### 1. 도구 설치 일괄 검증

다음 도구가 설치되어 있는지 확인한다. 미설치 시 자동 설치를 시도한다 (최대 3회 재시도).

| 도구 | 확인 명령 | 설치 명령 | 필수/선택 |
|:---|:---|:---|:---|
| Node.js | node --version | - | 필수 |
| npm | npm --version | - | 필수 |
| Playwright | npx playwright --version | npx playwright install chromium | 필수 |
| Biome | npx biome --version | npm i -D @biomejs/biome | 필수 |
| Stylelint | npx stylelint --version | npm i -D stylelint | 필수 |
| Vitest | npx vitest --version | npm i -D vitest | 필수 |
| c8 | npx c8 --version | npm i -D c8 | 선택 |
| jscpd | npx jscpd --version | npm i -D jscpd | 선택 |
| madge | npx madge --version | npm i -D madge | 선택 |
| tokei | tokei --version | scoop install tokei | 선택 |
| semgrep | semgrep --version | pip install semgrep | 선택 |

### 2. 실패 처리 정책

- **필수 도구 실패**: 3회 재시도 후에도 실패하면 사용자 개입 요청 (치명적 오류)
- **선택 도구 실패**: 경고 기록 후 계속 진행. 해당 도구가 필요한 Step에서 스킵 처리

### 3. progress.json 초기화 확인

step_archive/progress.json이 존재하면 로드하여 이전 진행 상태를 확인한다.
존재하지 않으면 step-progress-loader.ps1이 SessionStart 훅에서 자동 생성한다.

### 4. .claude/ 경로 치환 맵 확인

이후 Step에서 .claude/에 저장하라는 지시가 있으면 step_archive/로 경로를 치환한다.
치환 규칙:
- .claude/xxx.md -> step_archive/xxx.md
- step_archive/screenshots/ -> step_archive/screenshots/
- step_archive/ -> step_archive/ (이중 경로 방지)

### 5. 결과 기록

검증 결과를 step_archive/step001_preflight.md에 저장한다:
- 도구별 설치 상태 (OK/FAIL/SKIP)
- progress.json 상태 (NEW/RESUMED from stepNNN)
- 총 소요 시간

서브에이전트는 항상 haiku를 사용한다.

## Self-Calibration

실행 완료 후 다음을 스스로 평가하라:

- 이 Step의 목표가 100% 달성되었는가? (Y/N)
- 불확실한 부분이 있는가? (있으면 구체적으로 명시)
- N 또는 불확실한 부분이 있으면 재실행한다. 3회 재시도 후에도 미달이면 오류 기록 후 다음 Step 진행.

---

이 지침을 완료한 즉시 자동으로 step002.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
