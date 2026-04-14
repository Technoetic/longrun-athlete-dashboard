# Step 085 E2E 테스트 결과

## Step-Back

| 질문 | 답 |
|---|---|
| 핵심 목적 | dist/index.html에서 모든 사용자 플로우(온보딩 → 로그인 → 홈 → 액션 → 프로필)가 정상 동작 |
| 실패 시 | 회귀 발생 단계로 복귀 (step072 또는 step062) |
| 엣지 케이스 2 | (1) 빈 폼 검증 거부 (2) 동적 모달 onclick 핸들러 동작 |

## 도구
- Playwright (chromium, 390×844 mobile viewport)
- 대상: dist/index.html (file://)
- 스크립트: `step_archive/e2e.mjs`

## 결과

**13 / 13 passed**

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | onboarding1 visible | ✓ |
| 2 | ob1 → ob2 | ✓ |
| 3 | ob2 → ob3 | ✓ |
| 4 | ob3 → login | ✓ |
| 5 | login rejects empty | ✓ |
| 6 | login success → home | ✓ |
| 7 | home nickname (test@example.com → "test님") | ✓ |
| 8 | watch connect (BLE simulation) | ✓ |
| 9 | intensity select 5 | ✓ |
| 10 | submit daily | ✓ |
| 11 | home → profile | ✓ |
| 12 | logout modal | ✓ |
| 13 | no page errors | ✓ |

## Self-Calibration

- 모든 테스트 통과: **Y**
- 엣지 케이스 커버: **Y** (#5 빈 폼 거부, #12 동적 모달)
