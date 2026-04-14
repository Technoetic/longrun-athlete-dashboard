# PASS — Step 091 테스트 안정성

## Step-Back

- 핵심: 테스트 결과가 매 실행마다 일관되는가
- 실패 시: 원인 (timing/race/state) 파악 후 fix
- 엣지: (1) 비결정적 random (2) 비동기 timing

## 결과

- 단위 테스트(57개): vitest 다회 실행 모두 PASS
- E2E(13개): playwright 다회 실행 모두 PASS
- Math.random은 mock으로 제어, setInterval은 fake timer로 제어 → 결정적
- waitForSelector + waitForTimeout으로 race 회피

## 판정

**PASS** — 안정성 확보 완료.
