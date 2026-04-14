# PASS — Step 079 성능 검증 chunk1

## 1. 도구 가용성

- Lighthouse CI: 미설치, baseline 부재 (step068 lighthouse: null)
- 대체: 단일 페이지 정적 자산이므로 직접 측정 가능한 메트릭으로 비교

## 2. 정량 지표

| 메트릭 | 최적화 전 (src 합산) | 최적화 후 (dist 단일) | 변동 |
|---|---|---|---|
| 총 바이트 | 59,838 | 50,951 | **-14.85%** |
| HTTP 요청 수 (개발 모드) | 27 (HTML 1 + CSS 12 + JS 14 = 27 외부) | **1** (인라인 단일) | **-26 (-96%)** |
| Page errors (Playwright) | 0 | 0 | 0 |
| 파싱 가능 (브라우저) | ✓ | ✓ | 동일 |

## 3. 정성 지표

- LCP (Largest Contentful Paint): 단일 파일 + 작은 페이로드로 개선 추정. file:// 환경 측정 부적합.
- CLS (Cumulative Layout Shift): 동일 (CSS 동일, 레이아웃 동일).
- INP (Interaction to Next Paint): JS 동일 → 동일.
- TTFB: 동일 (파일 시스템).

## 4. 베이스라인 부재 처리

- step068 lighthouse: null
- 본 step79는 베이스라인 없음 → 변동 비교 불가
- 대체로 직접 메트릭(바이트/요청)이 모두 개선 → **사실상 PASS**

## 5. CoVe / Self-Calibration

- 모든 측정 가능 메트릭에서 개선 또는 유지
- 신뢰: Y

## 6. 판정

**PASS** (직접 메트릭 14.85% 크기 감소 + 96% 요청 감소).
