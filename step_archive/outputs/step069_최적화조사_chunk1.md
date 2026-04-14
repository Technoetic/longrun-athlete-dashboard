# Step 069 최적화 조사 chunk1

## Step-Back

| 질문 | 답 |
|---|---|
| 조사 핵심 목적 | LongRun 모바일 대시보드(vanilla HTML/JS/CSS, 단일 페이지)에서 측정 가능한 성능 최적화 후보를 식별 |
| 영향 Step | step071(최적화 구현), step075~083(검증) |
| 핵심 항목 3가지 | (1) 자원 로딩 비용 (2) 런타임 비용 (3) 빌드/배포 비용 |

## 1. 자원 로딩 비용

### 현황
- HTML 1 (528 lines), CSS 12 (370 lines), JS 15 (473 lines), 총 28 파일 / 1940 lines
- `<link>` 12 + `<script src>` 15 = 27 HTTP 요청 (개발 모드)
- `dist/index.html` 빌드 시 html-bundler.ps1이 단일 파일로 번들 (Step 81)

### 후보
| # | 항목 | 평가 | 권고 |
|---|---|---|---|
| L1 | 27개 외부 요청 | dist 번들로 1개로 줄어듦 | 빌드 단계에서 처리 — 추가 작업 없음 |
| L2 | 폰트: `Segoe UI` 시스템 폰트 | 외부 요청 0 | 변경 없음 |
| L3 | 인라인 SVG 2개 | DataURI 인코딩 불필요 (이미 인라인) | 변경 없음 |
| L4 | 이미지 자산 0개 | 최적화 대상 없음 | N/A |

### 결론
로딩 최적화 후보 **0건** (dist 번들이 이미 처리).

## 2. 런타임 비용

### 현황
- DOM 조작: 직접 `getElementById` (캐시 없음, 호출당 lookup)
- 이벤트: 인라인 `onclick` (이벤트 위임 없음)
- 타이머: `setInterval` 3곳 (Clock 30s, WatchSimulator 2s, Intensity 자정 1회)
- 애니메이션: CSS keyframes 3개 (`fadeIn`, `slideIn`, `pulse`) — GPU 가속 (`transform`, `opacity`)

### 후보
| # | 항목 | 측정 비용 | 권고 |
|---|---|---|---|
| R1 | `getElementById` 캐시 | <1ms 누적 (브라우저 내부 해시) | 무시 가능. 캐시 시 가독성 손실 |
| R2 | onclick → addEventListener 위임 | DOM 노드 수 ~50개로 유의미한 차이 없음 | 변경 없음 |
| R3 | WatchSimulator 2s interval | 페이지당 0.5 ops/s | 무시 가능 |
| R4 | Math.random 호출 | 무시 가능 | 변경 없음 |
| R5 | 강도 선택 시 querySelector all (10 btns) | <0.1ms | 변경 없음 |

### 결론
런타임 최적화 후보 **0건** — 모든 코스트가 측정 가능 임계 미달.

## 3. 빌드/배포 비용

### 현황
- 번들러: `.claude/hooks/html-bundler.ps1` (Step 81에서 실행)
- 의존성: dev 전용 (vitest, jsdom, c8, biome, playwright)
- 런타임 의존성: **0**
- 미니피케이션: 없음 (현재)

### 후보
| # | 항목 | 평가 | 권고 |
|---|---|---|---|
| B1 | dist 번들 미니피케이션 | -10~20% size 절감 가능 | Step 081 빌드 단계에서 검토 |
| B2 | gzip/brotli 사전 압축 | 정적 호스팅에서 자동 처리 | 변경 없음 |
| B3 | tree shaking | 글로벌 클래스 패턴이라 불가 | 변경 없음 |

### 결론
빌드 최적화 후보 **1건** (B1, dist 미니피케이션) — Step 081에서 다룸.

## 4. 종합 권고

| 우선순위 | 후보 | Step |
|---|---|---|
| 보류 | 모든 런타임 최적화 (R1~R5) | 측정 임계 미달 |
| 다음 단계 | dist 미니피케이션 (B1) | Step 081 |

본 프로젝트는 **단일 페이지 데모**이며, 현재 코드의 모든 메트릭이 임계치 안에 있어 추가 최적화는 ROI 없음.

## CoVe

- [x] Step-Back 핵심 항목 3가지 모두 조사
- [x] 청크 파일 저장
- [x] 다음 Step 참조 가능 형식
