# PASS — Step 086 스크린샷 기반 상세 E2E

## 산출물 (9 시점)

`step_archive/screenshots/e2e/`:
1. 01-onboarding1
2. 02-onboarding2
3. 03-onboarding3
4. 04-login
5. 05-home (test 닉네임, 워치 disconnected, 강도 1~10, 부상 태그)
6. 06-watch-connected
7. 07-intensity-7 (심박 90 BPM, SpO2 96%, 체온 36.4°C, 강도 7 주황색)
8. 08-profile
9. 09-logout-modal (취소/빨간 로그아웃 버튼)

## 직접 확인한 시점

- 05-home: 홈 헤더, 워치 카드, 강도 그리드, 부상 입력, 소속 팀, 홈 네비 — 모두 정상
- 07-intensity-7: 워치 연결 + 강도 결과 통합 뷰 — 모든 메트릭 + 시간 표시 완벽
- 09-logout-modal: 동적 모달 + 동적 onclick 핸들러 정상

## Self-Calibration

- 모든 핵심 화면 캡처 + 시각 검증: Y
- 엣지 케이스 (동적 모달, 통합 뷰): Y
