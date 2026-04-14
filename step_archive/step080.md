# Step 80 - EVAL: 최적화 검증 사이클 루브릭 평가

# EVAL
평가자 실행: 최적화 전체 사이클 Step 060~079 완료 후 루브릭 평가 수행
- 평가 대상: 최적화된 전체 구현물 (src/)
- 참조 조사결과: step_archive/step06*_chunk*.md, step_archive/step07*_chunk*.md, step_archive/step079_성능검증_chunk*.md
- 이전 라운드 결과: step_archive/outputs/eval_r1.md (있으면)
- 결과 저장: step_archive/outputs/eval_r2.md

## CoVe (Chain-of-Verification)

검증 완료 후 체크리스트:
- [ ] 검증 기준이 모두 통과되었는가?
- [ ] 예외 케이스가 누락되지 않았는가?
- [ ] 검증 결과가 다음 Step에서 참조 가능한 형식으로 저장되었는가?

## Self-Calibration

- 이 검증 결과를 신뢰할 수 있는가? (Y/N)
- N이면 검증을 재실행한다.

이 지침을 완료한 즉시 자동으로 step081.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
