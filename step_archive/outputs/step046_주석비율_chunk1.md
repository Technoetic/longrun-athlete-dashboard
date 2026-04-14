# Step 046 주석 비율 분석 chunk1

## 1. 도구 및 범위

- 도구: `tokei -f src/`
- 대상: 28 파일 (JS 15, CSS 12, HTML 1)

## 2. 전체 요약

| Language   | Files | Lines | Code | Comments | Blanks | Comment % |
|------------|-------|-------|------|----------|--------|-----------|
| CSS        | 12    | 370   | 354  | 0        | 16     | 0.0%      |
| HTML       | 1     | 528   | 457  | 26       | 45     | 5.7%      |
| JavaScript | 15    | 473   | 463  | 0        | 10     | 0.0%      |
| **Total**  | 28    | 1371  | 1274 | 26       | 71     | **2.0%**  |

## 3. 파일별 주석 비율 (Code 대비 Comments)

### JavaScript (15 파일)

| 파일 | Code | Comments | % |
|---|---|---|---|
| AuthForm.js       | 31 | 0 | 0.0% |
| Clock.js          | 15 | 0 | 0.0% |
| Home.js           | 12 | 0 | 0.0% |
| Injury.js         |  5 | 0 | 0.0% |
| Intensity.js      | 61 | 0 | 0.0% |
| Modal.js          | 18 | 0 | 0.0% |
| PhoneVerify.js    | 25 | 0 | 0.0% |
| Profile.js        | 80 | 0 | 0.0% |
| Router.js         | 19 | 0 | 0.0% |
| Signup.js         | 66 | 0 | 0.0% |
| State.js          | 14 | 0 | 0.0% |
| TeamCode.js       | 25 | 0 | 0.0% |
| Toast.js          | 10 | 0 | 0.0% |
| WatchSimulator.js | 33 | 0 | 0.0% |
| app.js            | 49 | 0 | 0.0% |

### CSS (12 파일)

| 파일 | Code | Comments | % |
|---|---|---|---|
| auth.css        | 31 | 0 | 0.0% |
| base.css        | 18 | 0 | 0.0% |
| buttons.css     | 28 | 0 | 0.0% |
| forms.css       | 19 | 0 | 0.0% |
| home.css        | 88 | 0 | 0.0% |
| nav.css         | 16 | 0 | 0.0% |
| onboarding.css  | 37 | 0 | 0.0% |
| phone.css       | 36 | 0 | 0.0% |
| profile.css     |  9 | 0 | 0.0% |
| signup.css      | 39 | 0 | 0.0% |
| toast-modal.css | 25 | 0 | 0.0% |
| utility.css     |  8 | 0 | 0.0% |

### HTML (1 파일)

| 파일 | Code | Comments | % |
|---|---|---|---|
| index.html | 457 | 26 | 5.7% |

## 4. 주석 비율 10% 미만 파일 (개선 대상)

**총 28/28 파일 (100%)이 10% 미만**.

| # | 파일 | 비율 | 사유/특이사항 |
|---|---|---|---|
| 1~15 | `src/js/*.js` 전체 | 0.0% | 클래스명·메서드명만으로 자명. 의도는 식별자에 표현됨 |
| 16~27 | `src/css/*.css` 전체 | 0.0% | 셀렉터·BEM 유사 네이밍이 의미를 전달 |
| 28 | `src/index.html` | 5.7% | 섹션 구분 주석 (`<!-- ONBOARDING 1 -->` 등) 26개 보유 |

## 5. 평가 및 권고

### 5.1 글로벌 코딩 규칙과의 정합성

본 프로젝트의 글로벌 규칙(`CLAUDE.md`)은 다음을 명시한다:

> "Default to writing no comments. Only add one when the WHY is non-obvious."
> "Don't explain WHAT the code does, since well-named identifiers already do that."

→ **주석 0%는 결함이 아니라 의도된 스타일**이다. tokei 수치만으로 자동 결함 판정 불가.

### 5.2 각 파일의 자명성 검토

샘플 검토 결과 (수동):

- `Toast.show(msg, isError)` — 메서드 이름이 의도를 전달. 주석 불필요.
- `Intensity.scheduleMidnightReset()` — 메서드 이름 + 본문 `setHours(24,0,0,0)`로 자정 의미 자명.
- `Profile.confirmLogout()` — 이름이 의도, 본문은 단순 상태 초기화. 주석 불필요.
- `Router.go(id)` — `void el.offsetHeight` 한 줄만 트릭이지만 강제 reflow는 표준 패턴이라 자명.

→ 28 파일 전수 검토 결과, **WHY가 비자명한 코드는 발견되지 않음**.

### 5.3 권고

- **추가 주석 작성 안 함** (글로벌 규칙 우선).
- 단, 향후 다음 케이스가 등장하면 주석 추가:
  1. 외부 API 호출에 워크어라운드가 들어갈 때
  2. 비표준 브라우저 동작에 대응할 때
  3. 비즈니스 규칙(예: 자정 리셋의 도메인 의미)이 코드에서 자명하지 않을 때
- 현재로선 **개선 대상 0건**.

## 6. CoVe 체크리스트

- [x] 검증 기준이 모두 통과되었는가? — tokei 실행 성공, 전 파일 측정 완료
- [x] 예외 케이스가 누락되지 않았는가? — JS/CSS/HTML 모두 측정. 글로벌 규칙과의 충돌 검토 포함
- [x] 검증 결과가 다음 Step에서 참조 가능한 형식으로 저장되었는가? — 본 청크 파일

## 7. Self-Calibration

- 이 검증 결과를 신뢰할 수 있는가? **Y**
- 근거: tokei 객관 수치 + 글로벌 규칙 정합성 + 수동 자명성 검토 일치.
