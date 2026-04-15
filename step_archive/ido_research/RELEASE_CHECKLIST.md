# LongRun Android 앱 제품화 체크리스트

**목적**: Phase 1-5에서 만든 MVP를 Play Store / 내부 배포 상태로 가져가기 전 반드시 확인할 항목. 2026-04-15 시점 현재 상태 기준.

---

## 🔴 블로커 (배포 전 필수)

### B1. 서명 키스토어

**현재 상태**: `app-release-unsigned.apk` 14.9MB 빌드는 되지만 서명 없음.

**해야 할 것**:
```bash
keytool -genkey -v \
  -keystore longrun-release.jks \
  -alias longrun \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

- 비밀번호는 **영구 자산** — 분실 시 Play Store 앱 업데이트 영영 불가능 (Play App Signing 사용하지 않는 한)
- `android/app/build.gradle.kts`에 `signingConfigs { release { ... } }` 블록 추가 필요
- 키스토어 파일은 **git 제외** + 안전한 백업 (비밀번호 관리자 + 물리 백업 2곳 이상)
- Play App Signing에 등록하면 업로드 키만 관리하면 돼서 안전하지만 초기 등록 시 신중 결정

**권장 시점**: 실제 Play Store 업로드 결정 직전. 지금은 아님.

### B2. 개인정보 처리방침 페이지

**현재 상태**: 미작성 추정.

**해야 할 것**: Play Store 필수 요구사항. URL이 필요하고 앱 내 링크도 필요.

**수집 데이터 목록** (현재 시점):
- 이메일 주소 (로그인 계정)
- 심박수 (실시간 + 일일 통계 + 120 포인트 sparkline 배열)
- 걸음수, 거리, 칼로리, 운동 시간
- 디바이스 MAC 주소 (R21 식별용, 현재 하드코딩 `1F:0F:C7:77:05:66` → 사용자별 저장 필요)
- Health Connect 권한으로 읽는 데이터 (폰 헬스 데이터)

**작성 포인트**:
- 개인 건강 정보 보관 위치 (Railway MySQL, 리전)
- 보관 기간 정책
- 사용자 계정 삭제 요청 처리 프로세스
- 제3자 공유 없음 (있다면 명시)
- 연락처 (technoetic@hotmail.com)

**권장 위치**: `https://longrun-coach-dashboard-production.up.railway.app/pages/privacy.html` 신설.

### B3. Health Connect 권한 rationale

**현재 상태**: `AndroidManifest.xml`에 `ACTION_SHOW_PERMISSIONS_RATIONALE` intent filter만 선언됨. 실제 rationale 페이지는 미구현.

**해야 할 것**: 사용자가 Health Connect 권한 요청을 받을 때 "왜 이 앱이 이 권한이 필요한지" 설명 화면을 보여야 함. 현재는 `WebActivity`가 해당 intent를 받지만 전용 설명 UI는 없음.

**작성 포인트**:
- READ_HEART_RATE / READ_RESTING_HEART_RATE / READ_HRV / ... 각 권한별 용도
- READ_HEALTH_DATA_IN_BACKGROUND (Android 14+): 15분 주기 자동 동기화를 위해 필요

### B4. targetSdk / 권한 리뷰

**현재 상태**: `compileSdk=34, targetSdk=34` (Android 14).

**확인할 것**:
- Play Store 2026년 최신 요구사항이 Android 15/16일 수 있음 (Google 매년 targetSdk 상향 요구)
- `BLUETOOTH_SCAN` + `android:usesPermissionFlags="neverForLocation"` 플래그가 Android 12+에서 정확한지 재확인
- `BLUETOOTH_CONNECT` 런타임 권한 요청 UI 있는가? (IdoBleClient가 체크만 하고 실제 요청은 안 함) → Phase 6 추가 필요

### B5. 디버그 IDO MAC 하드코딩 제거

**현재 상태**: `HealthBridge.kt` 와 `IdoDebugReceiver.kt` 에 `DEFAULT_R21_MAC = "1F:0F:C7:77:05:66"`.

**해야 할 것**:
- BLE scan으로 R21 디바이스 발견 → 사용자가 리스트에서 선택 → SharedPreferences에 저장 (`ido_mac` 키)
- WebActivity 또는 온보딩 단계에서 "기기 연결" 버튼 + 스캔 UI
- Default fallback 하드코딩은 debug build에만 남기고 release는 완전 제거

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

## 현재 세션의 결론

**현재 상태로 배포 가능한가**: ❌ 아니오. 최소 B1~B5 + M5 필요.

**오늘까지 한 것으로 가능한가**: ✅ 네, **본인 단일 사용자용으로는 이미 작동**. 개인 앱으로 써도 문제없는 수준. Play Store 배포만 블로커.

**다음 우선순위**:
1. B5 (MAC 하드코딩 제거) — 코드 변경 작음, 가치 큼
2. M5 (대시보드 정적 섹션 연결) — 시각적 완성도
3. M1 (HRV/SpO2) — 데이터 축적 후
4. B1-B4 (서명/개인정보/rationale/SDK) — 배포 결정 시점에 일괄

---

작성: 2026-04-15 Phase 5 완료 시점
관련 문서: `SESSION_2026-04-15.md`, `PHASE_0_REPORT.md`
