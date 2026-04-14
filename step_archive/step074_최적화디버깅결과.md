# Step 074 최적화 디버깅 결과

## Step-Back

| 질문 | 답 |
|---|---|
| 핵심 목적 | step072 dist 빌드에서 발견된 오류 수정 |
| 오류 재현 안 됨 시 | step072로 복귀 또는 종료 |
| 엣지 케이스 2가지 | (1) 인라인화 시 `</script>` 텍스트 충돌 (2) CSS 압축 시 셀렉터 손상 |

## 발견된 오류

**0건**.

- step072 빌드: ✓ (50,951 bytes, 14.85% 감소)
- step073 시각 검증: ✓ 3 viewport
- Playwright pageerror: 0건

## 엣지 케이스 검토

| 케이스 | 결과 |
|---|---|
| `</script>` 충돌 | src JS에 `</script>` 문자열 없음 (grep 0) |
| CSS 셀렉터 손상 | `nav.css`, `home.css` 등 12파일 시각 정상 |
| innerHTML 문자열의 줄바꿈 | JS 압축이 줄바꿈만 제거하므로 문자열 내부 보존 |
| onclick 핸들러 (window 바인딩) | dist 로딩 후 정상 동작 (page error 0) |

## Self-Calibration

- 발견된 오류 모두 수정: **Y** (발견 0건)
- 엣지 케이스 커버: **Y**
