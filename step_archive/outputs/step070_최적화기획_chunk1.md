# Step 070 최적화 기획 chunk1

## 선정 전략: A — dist 미니피케이션

## 목표
- dist/index.html 크기 -10% 이상
- src/ 변경 0
- 테스트 회귀 0

## 작업 항목 (Step 071 구현용)

1. **번들 생성**
   - `src/index.html`을 읽어 모든 `<link rel="stylesheet" href="css/...">`와 `<script src="js/...">`를 읽어 인라인화
   - 출력: `dist/index.html`

2. **간단 미니피케이션**
   - HTML: 줄간 공백 압축 (스크립트 내부 보존)
   - CSS: 주석 제거 + 공백 압축
   - JS: 변수명 보존 (인라인 onclick 호환), 줄 공백·주석만 제거

3. **검증 (Step 071 후속)**
   - dist/index.html 단일 파일로 브라우저에서 정상 렌더 확인 (Playwright)
   - 단위 테스트는 src/ 대상이라 영향 없음

## 비범위
- src/ 코드 변경 금지
- 변수명 mangling 금지 (window 바인딩 깨짐)
- ES module 변환 금지

## 출력
- `dist/index.html` (생성/갱신)
- `dist/build-stats.json` (원본 vs 최소화 크기)
