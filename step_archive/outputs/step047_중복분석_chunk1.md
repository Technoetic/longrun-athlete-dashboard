# Step 047 코드 중복 분석 chunk1

## 1. 도구 및 범위

- 도구: `npx jscpd src/ --threshold 5 --reporters json,console`
- 대상: 28 파일 (JS 15, CSS 12, HTML 1) / 17,896 tokens / 1,343 lines

## 2. 전체 요약

| Format     | Files | Total lines | Clones | Duplicated lines | % |
|------------|-------|-------------|--------|------------------|---|
| JavaScript | 15    | 458         | 0      | 0                | 0.00% |
| CSS        | 12    | 358         | 0      | 0                | 0.00% |
| HTML       | 1     | 527         | 2      | 17               | 3.23% |
| **Total**  | 28    | 1343        | 2      | 17               | **1.27%** |

전체 중복률 1.27% — threshold 5% 미달.

## 3. 발견된 클론 (2개, HTML만)

### Clone #1: `src/index.html` 153:4–165:22 ↔ 133:2–145:26 (12 lines, 166 tokens)

- 위치: 회원가입 Find Account 화면의 "전화번호 + 인증번호" 폼 블록
- 원인: 아이디 찾기 탭(findTab0)과 비밀번호 찾기 탭(findTab1)이 동일한 인증 폼을 갖고 있음
- 분류: **의도된 반복** — 두 탭은 독립 폼 인스턴스가 필요함
- 리팩토링 가능성: 빌드 단계에서 HTML 템플릿/include로 추출 가능. 단, 현재 정적 HTML 환경에서는 보류

### Clone #2: `src/index.html` 189:4–194:7 ↔ 95:2–100:8 (5 lines, 63 tokens)

- 위치: 비밀번호 입력 + 토글 버튼 input-wrapper 패턴
- 원인: 로그인 화면과 회원가입 STEP1의 비밀번호 필드 마크업 중복
- 분류: **의도된 반복** — 각 폼은 독립 ID(`loginPw`, `signPw`, `signPw2`)가 필요함
- 리팩토링 가능성: 컴포넌트 시스템 도입 시 파셜로 추출 가능. 현재 보류

## 4. 리팩토링 대상

threshold 5% 기준 → **리팩토링 대상 0건**.

HTML 3.23%는 step 4 회원가입 플로우의 구조적 특성에서 비롯되며, 동일 마크업을 강제 추출하면 ID 충돌·접근성 회귀 위험이 더 큼.

## 5. 자바스크립트 클래스 중복 (수동 검토)

jscpd가 0건 보고했으나, 클래스 메서드 시그니처 차원에서도 점검:

- `Toast.show(msg, isError)` vs 다른 알림 메서드 — 단일
- `Modal.open()` vs `Modal.close()` — 단일
- `Signup.goSignup2/3/4()` — 각 단계 검증 로직이 다름. 추출 시 가독성 손실
- `Profile.handleLogout` / `Profile.confirmLogout` — 모달 표시 vs 확정 처리, 책임 분리됨

→ JS 클래스 차원에서도 중복 없음.

## 6. CoVe 체크리스트

- [x] 검증 기준이 모두 통과되었는가? — jscpd 실행 성공, 전 파일 측정
- [x] 예외 케이스가 누락되지 않았는가? — JS·CSS·HTML 모두 + 수동 클래스 메서드 검토
- [x] 검증 결과가 다음 Step에서 참조 가능한 형식으로 저장되었는가? — 본 청크 파일

## 7. Self-Calibration

- 이 검증 결과를 신뢰할 수 있는가? **Y**
- 근거: 자동 도구 중복률 1.27% (threshold 미달) + 수동 검토 일치
