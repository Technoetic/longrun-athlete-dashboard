# Step 33 - jscpd 코드 중복 베이스라인 수집

## 실행 내용

`npx jscpd src/ --reporters json --output step_archive/jscpd-baseline/` 실행하여 현재 코드 중복률을 측정한다.

이 베이스라인을 이후 리팩토링/최적화 단계에서 비교 기준으로 사용한다.

## 결과 저장

- `step_archive/jscpd-baseline/` 디렉토리에 JSON 리포트 저장
- 중복률 요약을 `step_archive/step033_jscpd베이스라인.md`에 기록

서브에이전트는 항상 haiku를 사용한다.


## Self-Calibration

실행 완료 후 다음을 스스로 평가하라:

- 이 Step의 목표가 100% 달성되었는가? (Y/N)
- 불확실한 부분이 있는가? (있으면 구체적으로 명시)
- N 또는 불확실한 부분이 있으면 재실행한다. 3회 재시도 후에도 미달이면 오류 기록 후 다음 Step 진행.

## 오류 발생 시

오류 발생 시 원인을 분석하고 수정한 뒤 재시도한다. 3회 재시도 후에도 실패하면 오류를 기록하고 다음 Step으로 진행한다.


---

이 지침을 완료한 즉시 자동으로 step034.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
