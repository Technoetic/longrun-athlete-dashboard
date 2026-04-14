# Step 071 최적화 설계 chunk1

## Step-Back

| 질문 | 답 |
|---|---|
| 핵심 문제 | dist/index.html 생성 + 미니피케이션 없음 |
| 제약 조건 | (1) src/ 변경 0 (2) 인라인 onclick 호환 → 변수명 mangling 금지 (3) 단일 파일 산출 |

## 설계

### 입력
- `src/index.html`
- `src/css/*.css` (12개)
- `src/js/*.js` (15개, app.js 포함)

### 처리 단계
1. **읽기**: src/index.html을 텍스트로 읽음
2. **CSS 인라인화**: `<link rel="stylesheet" href="css/X.css">` 매칭 → 해당 파일 읽기 → `<style>...</style>`로 치환
3. **JS 인라인화**: `<script src="js/X.js"></script>` 매칭 → 해당 파일 읽기 → `<script>...</script>`로 치환 (로딩 순서 보존)
4. **CSS 압축**: `/* ... */` 주석 제거, 줄바꿈/연속 공백 → 단일 공백, 셀렉터/`{`/`}`/`;`/`,` 주변 공백 제거
5. **JS 압축**: 한 줄 `// ...` 주석 제거 (단, URL이나 문자열 안의 `//`는 보존), 연속 공백을 단일 공백으로 (단, 문자열·정규식 보호)
6. **HTML 압축**: 줄간 공백만 제거 (`<pre>`/`<script>`/`<style>` 내부는 단계 4·5에서 이미 처리됨)
7. **출력**: `dist/index.html` 작성
8. **stats**: 원본 vs dist 크기를 `dist/build-stats.json`에 기록

### 비범위
- 변수명 mangling — 깨질 위험
- ES module 변환
- gzip — 정적 호스팅에 위임

### 도구
- Node.js 스크립트 (`scripts/build.mjs`) — 외부 의존성 없는 순수 정규식
- 또는 PowerShell 변형 — 본 환경 검토 후 결정

## CoVe

- [x] 모든 요구사항 반영
- [x] 구현 가능 (정규식으로 충분)
- [x] 이전 실패 패턴 회피 (src/ 변경 0)

## Self-Calibration

그대로 구현 가능: **Y**.
