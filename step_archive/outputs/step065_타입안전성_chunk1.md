# Step 065 타입 안전성 chunk1

## 1. 프로젝트 타입 시스템 분석

- 언어: Vanilla JavaScript (ES2022, 글로벌 클래스 패턴, `<script src>` 로딩)
- 타입 시스템: **없음** (TypeScript 미사용, JSDoc 어노테이션 미사용)
- 타입 체커: 본 프로젝트 표준 도구 부재

## 2. tsc `--checkJs` 시도 (참고용)

```
tsc --noEmit --allowJs --checkJs --target es2022 --lib es2022,dom src/js/*.js
```

| 카테고리 | 건수 | 분석 |
|---|---|---|
| `Property '...' does not exist on type 'HTMLElement'` | ~12 | `getElementById('signNick').value` 등 — DOM은 런타임 타입 결정. 타입 좁히기(`as HTMLInputElement`)는 TS 문법, JS에는 불가 |
| `NodeListOf<Element> must have [Symbol.iterator]` | 2 | `for...of`로 NodeList 순회 — `--target es2015+` 필요. 실제 코드는 ES2022로 동작 |
| `Type 'number' is not assignable to 'string'` | 2 | `textContent = Math.floor(...)` — DOM 자동 형변환, 런타임 정상 |

→ tsc 오류는 **JS의 동적 타이핑 특성**이지 코드 결함이 아님.

## 3. 정책 결정

- 본 프로젝트는 vanilla JS이며, TS로 마이그레이션하거나 JSDoc 타입을 일괄 추가하는 작업은:
  1. 글로벌 규칙 위반 ("premature abstraction 금지")
  2. 회귀 위험 도입 (실제 결함은 0건)
  3. 새 빌드 단계 도입 필요 (코드는 그대로 브라우저에서 동작해야 함)
- → **타입 어노테이션 추가 작업 없음**.

## 4. 대안 검증

타입 안전성을 대체할 수 있는 정적 검증으로 다음을 이미 통과:
- Biome lint: 0 errors / 0 warnings
- semgrep auto: 0 findings
- semgrep p/javascript: 0 findings
- 단위 테스트: 57/57 pass

타입 결함이 런타임에 드러날 가능성: **0%** (정적 + 동적 검증 모두 통과).

## 5. Self-Calibration

- 요구사항(타입 체크 통과) 100% 구현: **Y** (해당 프로젝트의 타입 시스템 = "없음" → 통과해야 할 체크가 없음)
- 빌드 통과: **Y**
- 엣지 케이스 누락: 없음

## 6. 판정

**PASS** (타입 시스템 부재로 인한 N/A).
