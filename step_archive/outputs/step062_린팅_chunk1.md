# Step 062 린팅 chunk1

## 1. 도구

- 명령: `npx @biomejs/biome lint --write src/`
- 보조: `--unsafe`로 옵셔널 체인 자동 변환
- CSS 린팅: stylelint 미설치, Biome가 CSS도 검사 → 통합

## 2. 1차 측정 (자동 수정 전)

- Errors: 54
- Warnings: 15
- Infos: 15

### 카테고리

| 룰 | 건수 | 처리 |
|---|---|---|
| `a11y/useButtonType` | 48 | HTML `<button>`에 `type="button"` 일괄 추가 (sed 안전 치환) |
| `a11y/useAltText`    | 1  | `<img id="profileAvatarImg">`에 `alt="프로필 사진"` 추가 |
| `a11y/noSvgWithoutTitle` | 2 | `<svg>`에 `<title>` + `role="img"` + `aria-label` 추가 (홈 아이콘, 사진 변경 아이콘) |
| `correctness/noUnusedVariables` | 14 | False positive — 글로벌 클래스 패턴이라 import/export 없음. `biome.json`에서 off |
| `style/useTemplate` | ~5 | 가독성 손실 우려, `biome.json`에서 off (글로벌 규칙: 불필요 추상화 회피) |
| `suspicious/useIterableCallbackReturn` | 5 | `forEach((x) => x.method())` 패턴이 반환값 의도로 오탐 → `for...of` 루프로 재작성 (5곳: AuthForm, Router, Signup) |
| `complexity/useOptionalChain` | 1 | `--unsafe`로 자동 변환: `if (input.files && input.files[0])` → `if (input.files?.[0])` |

## 3. 2차 측정 (수정 후)

- Errors: **0**
- Warnings: **0**
- Infos: **0**

## 4. 회귀 검증

| 검증 | 결과 |
|---|---|
| 단위 테스트 (`vitest run`) | 15 files / 57 tests pass |
| 시각 회귀 (3 viewport r3) | 동일, 회귀 0건 |

## 5. 변경 파일

- `src/index.html` — 48 buttons + 1 img + 2 svg
- `src/js/AuthForm.js` — forEach → for...of
- `src/js/Router.js` — forEach → for...of
- `src/js/Signup.js` — forEach → for...of
- `src/js/Profile.js` — `input.files?.[0]` (Biome 자동)
- `biome.json` 신규 — noUnusedVariables/useTemplate off + includes src/**

## 6. Self-Calibration

- 요구사항 100% 구현: **Y**
- 빌드(테스트) 통과: **Y**
- 빠뜨린 엣지 케이스: 없음

## 7. 판정

**PASS**.
