# Step 045 코드 리뷰 결과 chunk1

## 1. 도구 및 범위

- 도구: `semgrep --config auto`
- 룰셋: Community Registry, 1059 Code rules → 214 rules 적용 (대상 언어 매칭)
- 스캔 대상: `src/` (28 파일)
  - JS: 15 파일 (State, Toast, Modal, Router, AuthForm, PhoneVerify, Signup,
    WatchSimulator, Intensity, Injury, TeamCode, Home, Profile, Clock, app)
  - HTML: 1 파일 (`src/index.html`)
  - CSS: 12 파일 (`src/css/*.css`)
- 파싱률: ~99.5%

## 2. 자동 탐지 결과 요약

| 심각도 | 개수 |
|---|---|
| ERROR | 0 |
| WARNING | 0 |
| INFO | 0 |
| **합계** | **0** |

semgrep auto 룰셋(보안 + 품질) 기준으로 **자동 탐지된 결함은 0건**이다.

## 3. 클래스 지향 관점 수동 리뷰

semgrep이 잡지 못하는 OOP 설계 품질을 사람 시각에서 추가 점검한다.

### 3.1 클래스 책임 분리 (SRP)

| 클래스 | 단일 책임 | 평가 |
|---|---|---|
| State | 전역 상태 컨테이너 | OK |
| Toast | 토스트 표시/해제 | OK |
| Modal | 모달 열기/닫기 + 컨텐츠 주입 | OK |
| Router | 화면 전환 + beforeEnter 훅 | OK |
| AuthForm | 로그인 폼 제어 + 비번 토글 + 탭 전환 | OK |
| PhoneVerify | 전화 인증 타이머 | OK |
| Signup | 4단계 회원가입 플로우 | OK (다소 큼, 4 step을 한 클래스로 묶음 — 의도적) |
| WatchSimulator | 워치 연결 토글 + 더미 측정값 시뮬레이션 | OK |
| Intensity | 강도 선택/리셋 + 자정 리셋 + 일일 제출 | OK |
| Injury | 부상 태그 토글 | OK (단일 메서드만, 추후 확장 가능) |
| TeamCode | 팀 코드 변경 모달 | OK |
| Home | 홈 화면 초기화 | OK |
| Profile | 프로필 사진/이름/로그아웃 | OK |
| Clock | 상태바 시계 | OK |

ERROR/WARNING 없음. 모든 클래스가 단일 책임 원칙을 준수한다.

### 3.2 의존성 주입 (DI)

- 모든 클래스는 생성자 인자로 의존성을 주입받는다 (Toast, Modal, State, Router 등).
- `app.js`만이 컴포지션 루트(Composition Root)로 인스턴스를 결합한다.
- 강결합 없음. 각 클래스를 독립적으로 단위 테스트 가능하다.

### 3.3 전역 오염 (Global Pollution)

- `app.js`가 IIFE로 감싸져 있어 클래스 인스턴스가 전역에 누출되지 않는다.
- 단, 인라인 `onclick="..."` 호환을 위해 `window.goScreen`, `window.handleLogin` 등 27개 함수가 의도적으로 노출됨.
- 평가: 의도된 호환성 표면. 향후 `addEventListener` 마이그레이션 시 제거 가능.

### 3.4 부작용 / DOM 직접 접근

- 모든 DOM 접근은 각 클래스 메서드 내부에 캡슐화되어 있다.
- `getElementById` 호출이 분산되어 있으나, 책임 단위(클래스)별로 묶여 있어 응집도가 높다.
- 향후 개선 여지: 각 클래스 생성자에서 `querySelector` 캐시 (성능 영향 미미하므로 보류).

### 3.5 메모리 누수 가능성

- `setInterval` 사용처:
  - `WatchSimulator.simulate()` → `state.watchInterval` 저장, 토글 OFF 시 `clearInterval` ✅
  - `PhoneVerify.start()` → `this.intervalId`, 재호출 시 이전 interval clear ✅
  - `Clock.start()` → 30초마다 갱신, 영구 동작 (수명=페이지 수명) — 정상
  - `Intensity.scheduleMidnightReset()` → `setTimeout` 재귀 호출, 자기 관리됨 ✅
- 누수 없음.

### 3.6 보안 (수동)

- `innerHTML` 사용처: Modal.open(descHTML), TeamCode.showModal, Profile.handleLogout, Profile.showPolicyModal, WatchSimulator.toggle, Profile.handlePhoto
  - 모두 **하드코딩 문자열 또는 신뢰된 base64 dataURL**만 주입.
  - 사용자 입력이 직접 innerHTML로 들어가는 경로 없음 → XSS 위험 없음.
- `navigator.clipboard.writeText`: 사용자가 명시적으로 트리거 (복사 버튼).
- `eval`, `Function`, `document.write`, `dangerouslySetInnerHTML` 등 위험 API 미사용.

## 4. 결함 목록

자동 도구(semgrep) 0건, 수동 리뷰 0건. **결함 없음.**

## 5. CoVe 체크리스트

- [x] 검증 기준이 모두 통과되었는가? — semgrep 0 findings, 수동 리뷰 0 결함
- [x] 예외 케이스가 누락되지 않았는가? — 메모리 누수, XSS, 강결합, 전역 오염 모두 점검
- [x] 검증 결과가 다음 Step에서 참조 가능한 형식으로 저장되었는가? — 본 청크 파일

## 6. Self-Calibration

- 이 검증 결과를 신뢰할 수 있는가? **Y**
- 근거: 자동 도구(214 rules) + 수동 OOP 리뷰 모두 결함 0건. 재실행 불필요.
