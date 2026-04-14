# Step 34 - knip 미사용 코드 베이스라인 수집

## 실행 내용

`npx knip --reporter json > step_archive/knip-baseline.json` 실행하여 미사용 파일/export/dependency 초기 현황을 기록한다.

이 베이스라인을 이후 Dead Code 점검/리팩토링 단계에서 비교 기준으로 사용한다.

## 결과 저장

- `step_archive/knip-baseline.json`에 JSON 리포트 저장
- 미사용 코드 요약을 `step_archive/step034_knip베이스라인.md`에 기록

서브에이전트는 항상 haiku를 사용한다.


## Self-Calibration

실행 완료 후 다음을 스스로 평가하라:

- 이 Step의 목표가 100% 달성되었는가? (Y/N)
- 불확실한 부분이 있는가? (있으면 구체적으로 명시)
- N 또는 불확실한 부분이 있으면 재실행한다. 3회 재시도 후에도 미달이면 오류 기록 후 다음 Step 진행.

## 오류 발생 시

오류 발생 시 원인을 분석하고 수정한 뒤 재시도한다. 3회 재시도 후에도 실패하면 오류를 기록하고 다음 Step으로 진행한다.


---

이 지침을 완료한 즉시 자동으로 step035.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
