# Step 108 - 수정 루프 가드레일

수정 Phase(Step 108~114) 진입 전, 무한 반복을 방지하는 가드레일을 설정한다.

## 실행 내용

### 1. 수정 루프 규칙 정의

수정 Phase는 다음 루프를 따른다:
Step 109(조사) -> 110(기획) -> 111(설계) -> 112(구현) -> 113(검증) -> 114(회귀 테스트)

### 2. 무한 반복 방지 규칙

| 규칙 | 내용 |
|:---|:---|
| 최대 반복 횟수 | 전체 루프(108->113) 최대 3회 반복 |
| 동일 테스트 실패 | 같은 테스트가 3회 연속 실패하면 스킵 처리 + 사유 기록 |
| 회귀 실패 시 복귀 범위 | Step 114 회귀 실패 시 Step 112(구현)만 재실행. Step 109로 돌아가지 않음 |
| 스킵 기록 | 스킵된 항목은 step_archive/skip_log.md에 누적 기록 |
| 사용자 개입 조건 | 3회 루프 후에도 미해결 항목이 있으면 사용자 개입 요청 |

### 3. 가드레일 파일 생성

step_archive/fix_guard.json을 생성한다:

- max_loops: 3
- current_loop: 0
- max_same_test_failures: 3
- regression_fallback_step: 111
- skipped_items: []
- loop_history: []

### 4. 이전 수정 이력 확인

step_archive/progress.json에서 이전 수정 시도 이력을 확인:
- 이전에 같은 문제로 수정을 시도했는지 확인
- 같은 문제가 반복되면 접근 방식 변경을 권고

### 5. 완료 기준

- step_archive/fix_guard.json 파일 생성
- progress.json에 수정 Phase 진입 기록

서브에이전트는 항상 haiku를 사용한다.

## Self-Calibration

가드레일 발동 시:
- 현재 루프가 진짜 무한루프인가, 아니면 정상적인 재시도인가?
- max_loops 초과 전에 사용자 개입이 필요한 시점을 스스로 판단한다

---

이 지침을 완료한 즉시 자동으로 step109.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
