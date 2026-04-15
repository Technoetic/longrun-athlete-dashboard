# LongRun Android 앱 제품화 체크리스트

**목적**: Phase 1-5에서 만든 MVP를 Play Store / 내부 배포 상태로 가져가기 전 반드시 확인할 항목. 2026-04-15 시점 현재 상태 기준.

---

## 🔴 블로커 (배포 전 필수)

### B1. 서명 키스토어 ⚠️ 사용자 작업 대기

**상태**: `build.gradle.kts`에 signingConfig 블록 추가됨 (커밋 `__pending__`).
`keystore.properties` 파일이 있으면 서명, 없으면 unsigned로 fallback.
**키스토어 파일 자체는 사용자가 직접 생성**해야 함 (비밀번호가 영구 자산).

**가이드**: [android/KEYSTORE_SETUP.md](../../android/KEYSTORE_SETUP.md)

**사용자가 할 일**:
1. `cd android && keytool -genkey ...` 실행
2. `android/keystore.properties` 작성
3. 비밀번호를 비밀번호 관리자 + 물리 백업 2곳에 저장
4. (권장) Play App Signing 활성화

### B2. 개인정보 처리방침 ⚠️ 초안만 — 검토 필요

**상태**: `pages/privacy.html` 템플릿 작성됨 (커밋 `__pending__`).
배너로 "초안" 명시. 다음 항목이 **사용자 결정 대기**:

- 보관 기간 (예: 24개월?)
- 계정 삭제 처리 일수 (예: 7영업일?)
- 데이터센터 리전 확정
- 미성년자 연령 제한
- 개인정보 보호 책임자 이름
- 법무 검토 (선택, 권장)

**Play Store 등록 시 URL**: `https://longrun-coach-dashboard-production.up.railway.app/pages/privacy.html`

### B3. Health Connect rationale ✅

**상태**: `pages/health-rationale.html` 작성 + WebActivity가
`ACTION_SHOW_PERMISSIONS_RATIONALE` intent로 진입하면 이 페이지로 자동
라우팅 (커밋 `__pending__`).

각 권한별 한국어 설명 포함 (심박수, 안정심박, HRV, SpO2, 활동, 수면,
백그라운드 접근). 사용자가 문구 일부 수정 원할 수 있음.

### B4. targetSdk / BLE 런타임 권한 ✅ (부분)

**상태**:
- `targetSdk=34` (Android 14) 유지. Google Play 2026 정책 확정 시 35로
  업그레이드 검토 (커밋 `__pending__` RELEASE_CHECKLIST 메모).
- BLUETOOTH_SCAN/CONNECT 런타임 권한 요청 추가 (앱 시작 시 자동, Android
  12+). Health Connect 권한과 별개로 처리.
- `BLUETOOTH_SCAN`은 `neverForLocation` flag 정확히 적용 확인됨.

### B5. R21 MAC 하드코딩 제거 ✅

**상태**: 완료 (커밋 `69111bd`). `IdoBleClient.findR21()` (bonded 우선
+ scan fallback). WebActivity JS bridge `scanR21()` / `savedIdoMac()` /
`clearIdoMac()`. 실기 검증 완료.

## 🟡 중요 (배포 직후 반드시)

### M1. Phase 2-B HRV / SpO2

- cmd=0x03 sub=0x44 설정 명령 역추적
- af2 notify push 파서 구현
- R21이 실제 측정 이력 있어야 값 나오므로 배포 후 사용자가 수일 착용 후 확인

### M2. 여러 R21 / 여러 사용자 지원

- 현재 DB 스키마는 `user_id`로 분리돼 있지만 Android 앱은 단일 MAC 가정
- 여러 선수가 한 폰을 공유하는 시나리오는 드물지만 ("코치가 모든 선수 디바이스 관리"), 필요 시 MAC ↔ user 매핑 테이블

### M3. Error recovery

- BLE 연결 실패 시 exponential backoff
- GATT disconnect 감지 후 자동 재연결
- 15분 주기 sync 실패가 누적되면 사용자 알림 (이미 `fail_streak == 3` 시 알림 있지만 R21 경로에 맞게 조정)
- R21이 폰 BT 범위 밖일 때의 graceful handling

### M4. WorkManager Doze drift

- Samsung One UI의 "절전 모드" 영향 평가
- `setRequiresBatteryNotLow(false)` 등 제약 검토
- 필요 시 Foreground Service로 승격 (사용자 알림 + 배터리 우려)

### M5. 대시보드 정적 placeholder 제거 또는 연결

- `pages/dashboard.html` 라인 188-192 정적 dp-list 섹션은 JS 바인딩 없음
- 현재는 DetailPanel 오버레이에만 데이터 뜨고 메인 화면 placeholder는 영원히 `—`
- 제품 관점에서 **메인 대시보드에도 요약 정보**가 떠야 함. 별도 JS 추가 또는 해당 섹션 제거.

## 🟢 개선 (언제든 가능)

### I1. 분단위 HR 트렌드 차트 확장

- 현재 sparkline은 220×32 (시각 축 없음)
- Y축 라벨 (min/max bpm), X축 시간대, 심박 존 색상 (회복/유산소/임계/무산소) 구간 표시
- click 시 전체 화면 모달

### I2. 수면 파서 (cat=0x02)

- 57B 응답 구조 미해독
- 여러 날 데이터 수집 후 차분 분석

### I3. 알림 메시지 한국어화

- `SyncWorker.notifyFailure`의 알림 문구
- 에러 메시지 전반

### I4. ProGuard / R8 축소

- Release 빌드에서 코드 난독화/축소 활성화
- `build.gradle.kts` release block에 `isMinifyEnabled = true` + keeprules 작성
- BLE 콜백, Kotlin coroutines, native JNI 충돌 주의

### I5. Baseline Profile

- 앱 시작 속도 개선
- `app/build.gradle.kts` + `baseline-profiles` 모듈

### I6. 크래시 리포팅

- Firebase Crashlytics 또는 Sentry
- 실사용자 이슈 파악

### I7. 한글 경로 이슈 해소

- 이전 커밋 `07e7485`의 `overridePathCheck for Korean path`
- 빌드 환경 자체가 한글 경로(`워치`)에 있는 것 자체가 문제 → 장기적으로 영문 경로로 이동

## 📋 배포 결정 플로우

1. **내부 테스트 배포**: Play Console → 내부 테스트 트랙 → 제한된 이메일 10개 정도
2. **비공개 베타**: 선수/코치 5~20명
3. **공개 출시**: 위 B1-B5 모두 완료 후

## 현재 세션의 결론 (2026-04-15 23:30 갱신)

**현재 상태로 배포 가능한가**:
- 본인 단일 사용자: ✅ 완벽 작동 (15분마다 R21 → 대시보드)
- 가족/베타 (5~10명): 🟡 거의 가능 — B1 키스토어만 사용자가 만들면 됨
- Play Store 공개: 🟡 거의 가능 — B1 키스토어 + B2 개인정보 처리방침 본문 확정 + 법무 검토

**오늘 (2026-04-15) 처리한 블로커**:
- ✅ B3 rationale HTML + 라우팅
- ✅ B4 BLE 런타임 권한 (앱 시작 자동 요청)
- ✅ B5 MAC 하드코딩 제거 (커밋 69111bd)
- ⚠️ B2 처리방침 템플릿만 (본문 확정 사용자 대기)
- ⚠️ B1 빌드 인프라만 (키스토어 자체는 사용자 직접 생성)

**남은 사용자 작업**:
1. `android/KEYSTORE_SETUP.md` 따라 키스토어 생성 (1회, 30분)
2. `pages/privacy.html` 템플릿의 `(확정 필요)` 항목 채우기
3. (선택) 법무 검토
4. Play Console 등록 + Play App Signing
5. 첫 internal track 업로드

---

작성: 2026-04-15 Phase 5 완료 시점
관련 문서: `SESSION_2026-04-15.md`, `PHASE_0_REPORT.md`
