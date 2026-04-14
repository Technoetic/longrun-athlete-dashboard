# Step 049 테스트 파일 매핑 chunk1

## 0. 베이스라인 (c8 커버리지)

- 명령 시도: `npx c8 --reporter=text vitest run`
- 결과: 실행 생략
- 사유: 프로젝트 루트에 `package.json`·`vitest.config.*`·기존 테스트 파일 없음. 모든 `src/js/*.js`의 커버리지는 자명하게 **0%**
- 결론: 15개 JS 파일 전체가 커버리지 0% → **모두 최우선 테스트 대상**

## 1. 대상 파일 목록 (src/js)

step045 코드리뷰(자동 0건), step046 주석비율(전 파일 0%), step047 중복(0건), step048 미사용(0건) 결과 종합 — 모든 클래스가 활성, 모두 테스트 작성 가치 있음.

| # | 파일 | LOC | 복잡도 | 외부 의존 | Mock 필요 |
|---|---|---|---|---|---|
| 1  | State.js          | 14 | 1 (단순 컨테이너) | 없음 | ✗ |
| 2  | Toast.js          | 10 | 2 (DOM, setTimeout) | DOM | DOM, timer |
| 3  | Modal.js          | 18 | 2 (DOM 주입) | DOM | DOM |
| 4  | Router.js         | 19 | 3 (DOM, animation reflow) | DOM | DOM |
| 5  | AuthForm.js       | 31 | 4 (DOM, 입력 검증) | Toast, Router, State | DOM, mocks |
| 6  | PhoneVerify.js    | 25 | 3 (setInterval) | Toast | DOM, fake timer |
| 7  | Signup.js         | 66 | 6 (4단계 플로우, 검증) | State, Router, Toast | DOM, mocks |
| 8  | WatchSimulator.js | 33 | 4 (setInterval, Math.random) | State | DOM, fake timer |
| 9  | Intensity.js      | 61 | 6 (자정 리셋, 색상 계산) | State, Toast | DOM, fake timer |
| 10 | Injury.js         |  5 | 1 (단일 토글) | DOM | DOM |
| 11 | TeamCode.js       | 25 | 3 (모달 + 검증) | State, Modal, Toast | DOM, mocks |
| 12 | Home.js           | 12 | 2 (초기화) | State | DOM |
| 13 | Profile.js        | 80 | 6 (사진 업로드, 모달, 로그아웃) | State, Router, Modal, Toast, Intensity | DOM, FileReader |
| 14 | Clock.js          | 15 | 2 (setInterval) | DOM | DOM, fake timer |
| 15 | app.js            | 49 | 3 (컴포지션 루트) | 모든 클래스 | 통합 테스트만 |

총 463 LOC, 평균 31 LOC/파일.

## 2. 규모 분류

본 프로젝트는 총 15 파일 → 소규모(10–20개) 범주.

## 3. 테스트 프레임워크 결정

- **vitest** (또는 jest) + jsdom
- 사유: ES module 미사용 환경이지만 vitest의 jsdom 환경이면 `<script>` 글로벌 클래스 패턴을 globalThis 주입으로 모사 가능
- DOM 단언: `@testing-library/dom` 또는 jsdom 표준 API
- 타이머: `vi.useFakeTimers()` (setInterval/setTimeout 사용처)

### 선결 조건 (테스트 작성 전 필요)
1. `package.json` 생성 + `"type": "module"` 또는 commonjs 결정
2. `vitest.config.js` 작성 (environment: 'jsdom')
3. 각 클래스를 ES module로 export하는 진입점 또는 `globalThis` 주입 헬퍼

→ 본 매핑 단계에서는 **계획만** 수립하고 실제 테스트 작성은 다음 Step에 위임.

## 4. 서브에이전트 배정 계획

15 파일 → 1 파일당 1 에이전트 (haiku) → 동시 실행 최대 10 → 2 배치.

### 배치 1 (10 파일) — 단순/저의존성 우선
1. State.js
2. Toast.js
3. Modal.js
4. Router.js
5. Injury.js
6. Home.js
7. Clock.js
8. PhoneVerify.js
9. WatchSimulator.js
10. TeamCode.js

### 배치 2 (5 파일) — 복잡도 높음
1. AuthForm.js
2. Signup.js
3. Intensity.js
4. Profile.js
5. app.js (통합 스모크 테스트)

## 5. 각 에이전트 지침 (공통 템플릿)

```
역할: 단일 클래스 단위 테스트 작성자
입력: src/js/<ClassName>.js (1 파일만 Read)
출력: src/js/__tests__/<ClassName>.test.js
프레임워크: vitest + jsdom
규칙:
  - 담당 파일 외 다른 파일 Read 금지 (Context 격리)
  - 의존성은 모두 Mock (setupTests.js의 createMock<X>() 사용 가정)
  - 커버리지 목표 80%+
  - 네이밍: `describe('<ClassName>') > it('should ...')`
  - DOM 픽스처는 각 it() 시작 시 생성, afterEach에서 정리
금지:
  - 다른 클래스 실제 import (Mock으로 대체)
  - file://·http:// 호출 (jsdom 한계)
  - 실제 setInterval/setTimeout 대기 (fake timer 사용)
```

## 6. 읽기 전략

- 각 파일 ≤ 80 LOC → offset/limit 불필요, 전체 Read 1회
- 예외: app.js만 의존성 그래프 확인 위해 추가로 src/index.html script 순서 Read (1회)

## 7. 우선순위 (c8 0% 기반)

전 15 파일이 0%이므로 **위 배치 1·2 순서 = 우선순위**. 단순 파일 먼저 → 학습 효과로 복잡 파일 패턴 정립.

## 8. Memory-of-Thought 점검

- `step_archive/progress.json` 부재 — 이전 실패 패턴 데이터 없음
- 이전 매핑 Step 출력물 부재 — 중복 위험 없음
- 적용 가능한 성공 패턴: step045~048에서 `step_archive/outputs/`에 청크로 저장한 패턴 재활용 ✓

## 9. Self-Calibration

- 이전 실패 패턴을 피하고 있는가? **Y** (참조할 실패 데이터 자체가 없음, 본 계획은 환경 제약을 사전에 명시해 다음 Step의 차단을 예방)
- 보완 사항: 본 계획은 테스트 환경(vitest+jsdom) 부재를 식별했으므로 **다음 Step(050)에서 환경 셋업이 선행되어야 함**을 명시함

---

## EVAL 안내 (step049 말미 EVAL 섹션)

본 매핑은 평가자 실행을 트리거할 수 있으나, 현재 평가자 에이전트(sonnet)·루브릭 인프라가 미구축. 평가 결과 파일 `step_archive/outputs/eval_r1.md`는 다음 환경 셋업 Step 후로 지연.
