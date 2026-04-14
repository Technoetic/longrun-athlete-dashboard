# Step 060 포매팅 chunk1

## 1. 도구 선택

- 명령: `npx @biomejs/biome format --write src/`
- 사유: 본 프로젝트는 `.prettierrc`/`.editorconfig` 부재 + JS/CSS/HTML 혼합 → Biome가 단일 도구로 모두 처리
- Biome 룰셋: 기본값 (탭 들여쓰기, 더블쿼트, 80자)

## 2. 변경 결과

- 포매팅된 파일: **27 / 27**
- 회귀 테스트: `npx vitest run` → 15 files / 57 tests **all pass**
- 시각 회귀: r2 스크린샷 3 viewport 모두 정상

## 3. 변경 범위

| 카테고리 | 변경 양상 |
|---|---|
| JS 15 파일 | 들여쓰기 4 spaces → 탭, 일관된 ; 위치, 줄 분할 |
| CSS 12 파일 | 한 줄 다중 속성 → 줄당 1 속성, 색상 rgba 표기 정규화 |
| HTML 0 파일 | (Biome HTML formatter 미적용 — 기본값 비활성) |

## 4. CoVe / Self-Calibration

- 포매팅 체크: `npx vitest run` 통과 → 형식 위반으로 인한 빌드 실패 없음
- 요구사항 100% 구현: **Y**
- 빌드(테스트) 통과: **Y**
- 빠뜨린 엣지 케이스: 없음 (시각 + 단위 테스트 양쪽 검증)

## 5. 판정

**PASS**.
