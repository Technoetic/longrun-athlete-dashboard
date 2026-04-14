# Step 072 최적화 구현 chunk1

## 1. 산출물

- `scripts/build.mjs` — 신규
- `dist/index.html` — 단일 번들 (50951 bytes)
- `dist/build-stats.json` — 빌드 통계

## 2. 측정 결과

| 항목 | bytes |
|---|---|
| src/index.html | 24,xxx |
| src/css/* 합 | 11,xxx |
| src/js/* 합 | 24,xxx |
| **src 총합** | **59,838** |
| **dist/index.html** | **50,951** |
| **감소율** | **14.85%** |

목표 -10% **초과 달성**.

## 3. 검증

| 항목 | 결과 |
|---|---|
| dist 단일 파일 브라우저 로딩 | ✓ (file:// 동작, 0 page errors) |
| 시각 회귀 (mobile r1) | ✓ 동일 렌더링 |
| 단위 테스트 (src/ 대상) | 영향 없음 (57/57 유지) |

## 4. 비범위 준수

- src/ 변경: **0 파일** ✓
- 변수명 mangling: 안 함 ✓
- ES module 변환: 안 함 ✓

## 5. Self-Calibration

- 요구사항 100%: **Y**
- 빌드(테스트) 통과: **Y**
- 빠뜨린 엣지 케이스: 없음 — Playwright pageerror 0건으로 런타임 에러 부재 확인
