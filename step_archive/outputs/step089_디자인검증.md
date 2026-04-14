# PASS — Step 089 디자인 시각 검증

## 추가 검증 화면 (step086 외)

- signup1: 기본정보 폼 (이메일/비번/전화 인증)
- signup2: 서비스 이용 동의 (체크리스트 5개, step indicator 1 done + 1 active)
- signup3: 운동 종목 선택 (3×2 그리드)
- signup4: 팀 코드 입력 (6칸 박스, 첫 칸 파란 포커스)

## 직접 확인

- signup2: 정상 — 동의 항목 5개, step indicator 색상(done=green, active=violet) 정확
- signup4: 정상 — 6칸 코드 박스 + 첫 칸 포커스 보더 + 그라데이션 가입완료 버튼

## 1px 검증

- step indicator 4 dots 균일 간격 ✓
- code-box 6칸 균일 spacing (gap: 8px) ✓
- 버튼 너비/패딩 일관 ✓
- 한글 폰트 렌더링 선명 ✓

## 판정

**PASS**.
