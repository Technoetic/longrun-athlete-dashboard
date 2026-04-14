# Step 58 - 리팩토링 검증: semgrep 경고

## 실행 내용

리팩토링 전후 `semgrep --config auto --json src/` 경고 수를 비교한다. 경고 증가 시 리팩토링 실패로 간주한다.

**검증 결과는 청크 단위로 저장한다:**

```text
step058_semgrep검증_chunk1.md (500줄 이하)
step058_semgrep검증_chunk2.md (500줄 이하)
...
```text

**작성 규칙**:
- 각 청크는 500줄 이하로 작성 (성능 최적화)
- `.claude/hooks/research-validator.ps1`에서 각 청크 검증 (BOM/CRLF/줄수/파일크기)
- 청크 그대로 유지 (병합 안 함)

서브에이전트는 항상 haiku를 사용한다.

## CoVe (Chain-of-Verification)

검증 완료 후 체크리스트:
- [ ] 검증 기준이 모두 통과되었는가?
- [ ] 예외 케이스가 누락되지 않았는가?
- [ ] 검증 결과가 다음 Step에서 참조 가능한 형식으로 저장되었는가?

## Self-Calibration

- 이 검증 결과를 신뢰할 수 있는가? (Y/N)
- N이면 검증을 재실행한다.

---

이 지침을 완료한 즉시 자동으로 step059.md를 읽고 수행한다. 사용자 확인을 기다리지 않는다.
