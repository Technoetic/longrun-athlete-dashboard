# VoiceCaddie 고객지원 문의 초안

**제목**: R21 상시 심박수 측정 활성화 방법 문의 (VoiceCaddie Runner v1.00.36 펌웨어)

---

안녕하세요.

NURUN R21 (시리얼 VCR210BK25000179, 펌웨어 v1.00.36)을 사용 중입니다. Samsung Health Connect와 연동해 상시 심박수 데이터를 받으려고 하는데, 현재 심박수가 90분 이상 업데이트되지 않는 문제가 있습니다.

VoiceCaddie Runner 앱의 기기 관리 메뉴를 전부 확인해봤으나, 심박수 측정 주기 또는 상시 측정을 켜는 옵션을 찾을 수 없었습니다:

- 워치 페이스 관리 / 운동 설정 / 알림 설정 / 음악 설정
- 사용자 프로필 → 심박수 (심박 존 설정만 있음, 측정 주기 아님)
- 건강 추적 (수면/스트레스/SpO2/호흡수 4개 토글만 있고 심박수는 없음)
- 자동 운동 인식

반면 VoiceCaddie Runner 앱의 내부 프로토콜에는 `setHeartRateInterval`, `setHeartRateMode` 같은 명령이 구현돼있고, 펌웨어 쪽에도 `support_set_v3_heart_interval`, `V3_support_set_smart_heart_rate` 같은 지원 플래그가 존재합니다. 즉 하드웨어/펌웨어는 지원하는데, 앱 UI에 토글만 노출되지 않은 것으로 보입니다.

문의드립니다:

1. R21에서 상시(백그라운드) 심박수 측정을 활성화하는 방법이 현재 있습니까? 워치 본체에서 설정하는 방법이 있다면 알려주세요.
2. VoiceCaddie Runner 앱에 해당 토글을 추가할 계획이 있습니까?
3. R21의 기본 심박수 측정 주기는 어떻게 되나요? 운동 세션 중에만 측정하는 구조입니까?

참고용 기기 정보:
- 워치 모델: NURUN R21
- 기기 ID: 1F:0F:C7:77:05:66
- 시리얼: VCR210BK25000179
- 펌웨어 버전: v1.00.36
- 앱: VoiceCaddie Runner (최신)
- 폰: Samsung Galaxy (Android 14+)

빠른 답변 부탁드립니다. 감사합니다.
