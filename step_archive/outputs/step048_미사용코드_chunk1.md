# Step 048 미사용 코드 분석 chunk1

## 1. 도구 시도 및 대체

### 1차 시도: knip
- 명령: `npx knip --no-progress`
- 결과: **실패**
- 원인 1: 프로젝트 루트에 `package.json` 부재 → knip 구성 불가
- 원인 2: oxc-parser 네이티브 바인딩(`@oxc-parser/binding-win32-x64-msvc`) 미설치 + Node 20.11.0이 knip 권장 ^20.19.0 미달
- 재시도 가능성: package.json 생성 + node 업그레이드 + npm 캐시 정리 필요. 본 프로젝트는 빌드 도구 없는 vanilla HTML/JS/CSS 정적 사이트라 knip 적합도 낮음

### 2차: 수동 분석으로 대체
- 사유: 프로젝트가 ES module 미사용·import/export 없음·정적 `<script src>` 로딩 → knip의 모듈 그래프 추적 가치 자체가 낮음
- 방법: grep으로 인스턴스화·호출 그래프 직접 검증

## 2. 미사용 클래스 (Class)

전 14 클래스 모두 `app.js`에서 `new X(...)`로 인스턴스화 확인.

| 클래스 | 인스턴스화 | 사용처 |
|---|---|---|
| State           | ✓ | 모든 클래스에 주입 |
| Toast           | ✓ | 다수 클래스에 주입 |
| Modal           | ✓ | TeamCode, Profile에 주입 |
| Router          | ✓ | AuthForm, Signup, Profile에 주입 |
| AuthForm        | ✓ | window.handleLogin/togglePw/switchFindTab |
| PhoneVerify     | ✓ | window.startPhoneVerify/confirmVerify |
| Signup          | ✓ | window.goSignup2/3/4/toggleAgreement/selectSport/codeNext/completeSignup |
| WatchSimulator  | ✓ | window.toggleWatch |
| Intensity       | ✓ | window.selectIntensity/resetIntensity/submitDaily + scheduleMidnightReset |
| Injury          | ✓ | window.toggleInjuryTag |
| TeamCode        | ✓ | window.showTeamCodeModal/changeTeam |
| Home            | ✓ | router.on('home') |
| Profile         | ✓ | router.on('profile') + window.handle*/copy*/showPolicy* |
| Clock           | ✓ | clock.start() |

→ **미사용 클래스 0건**.

## 3. 미사용 window 바인딩 (29개 함수)

### 정적 HTML(`src/index.html`) 호출 횟수

| 바인딩 | HTML 호출 | 동적 사용처 | 활성? |
|---|---|---|---|
| changeProfileName  | 1 | — | ✓ |
| changeTeam         | 0 | TeamCode.showModal 동적 onclick | ✓ |
| closeModal         | 0 | Profile/TeamCode 동적 onclick (3곳) | ✓ |
| codeNext           | 6 | — | ✓ |
| completeSignup     | 2 | — | ✓ |
| confirmLogout      | 0 | Profile.handleLogout 동적 onclick | ✓ |
| confirmVerify      | 1 | — | ✓ |
| copyAthleteCode    | 1 | — | ✓ |
| goScreen           | 15 | — | ✓ |
| goSignup2/3/4      | 1/1/1 | — | ✓ |
| handleLogin        | 1 | — | ✓ |
| handleLogout       | 1 | — | ✓ |
| handleProfilePhoto | 1 | — | ✓ |
| resetIntensity     | 1 | — | ✓ |
| selectIntensity    | 10 | — | ✓ |
| selectSport        | 5 | — | ✓ |
| showPolicyModal    | 5 | — | ✓ |
| showTeamCodeModal  | 1 | — | ✓ |
| showToast          | 6 | — | ✓ |
| startPhoneVerify   | 1 | — | ✓ |
| submitDaily        | 1 | — | ✓ |
| switchFindTab      | 2 | — | ✓ |
| toggleAgreement    | 5 | — | ✓ |
| toggleAllAgreements| 1 | — | ✓ |
| toggleInjuryTag    | 6 | — | ✓ |
| togglePw           | 3 | — | ✓ |
| toggleWatch        | 1 | — | ✓ |

→ **미사용 window 바인딩 0건** (changeTeam/closeModal/confirmLogout은 동적 모달 onclick에서 사용).

## 4. 미사용 인스턴스 메서드 (수동 검토)

- `Signup.updateAgreementUI()` — `toggleAgreement`/`toggleAllAgreements`에서 내부 호출 ✓
- `WatchSimulator.simulate()` — `toggle()`에서 내부 호출 ✓
- `Intensity.scheduleMidnightReset()` — `app.js` IIFE에서 호출 ✓
- `Clock.update()` — `start()`에서 호출 ✓
- `Router.on()` — `app.js`에서 home/profile 등록에 호출 ✓
- `Modal.open()` / `Modal.close()` — TeamCode/Profile에서 호출 ✓
- `Profile.init()` — `router.on('profile')` 콜백에서 호출 ✓
- `Home.init()` — `router.on('home')` 콜백에서 호출 ✓

→ **미사용 메서드 0건**.

## 5. 미사용 import/dependency

- 본 프로젝트는 npm dependency 없음 (`package.json` 부재).
- ES module import 없음 — 모든 클래스는 글로벌 namespace.
- → 미사용 dependency 항목 자체가 존재하지 않음.

## 6. 미사용 파일 (Dead File)

`src/`의 28 파일 모두 `src/index.html`에서 `<link>` 또는 `<script>`로 직접 참조됨.

| 카테고리 | 파일 수 | 참조 |
|---|---|---|
| CSS | 12 | `<link rel="stylesheet" href="css/...">` 12개 ✓ |
| JS  | 15 | `<script src="js/...">` 15개 ✓ |
| HTML | 1 | 진입점 ✓ |

→ **미사용 파일 0건**.

## 7. 결론

| 카테고리 | 발견 | 비고 |
|---|---|---|
| 미사용 클래스 | 0 | 14/14 인스턴스화 |
| 미사용 window 함수 | 0 | 29/29 정적/동적 호출 확인 |
| 미사용 메서드 | 0 | 내부 헬퍼 포함 전체 호출 확인 |
| 미사용 파일 | 0 | 28/28 참조 확인 |
| 미사용 dependency | N/A | package.json 없음 |

**Dead Code 0건. 리팩토링 대상 0건.**

## 8. CoVe 체크리스트

- [x] 검증 기준이 모두 통과되었는가? — knip 실패 후 수동 검증 완료
- [x] 예외 케이스가 누락되지 않았는가? — 동적 onclick 핸들러(changeTeam/closeModal/confirmLogout) 별도 검증
- [x] 검증 결과가 다음 Step에서 참조 가능한 형식으로 저장되었는가? — 본 청크 파일

## 9. Self-Calibration

- 이 검증 결과를 신뢰할 수 있는가? **Y**
- 근거: 자동 도구는 환경 제약으로 실패했으나, 프로젝트 규모(28 파일·15 JS 클래스)가 전수 수동 검증 가능한 수준이라 그래프 누락 가능성 낮음. 동적 모달 핸들러까지 별도 grep으로 교차 확인.
