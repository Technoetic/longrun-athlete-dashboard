# Phase 0 Report — NURUN R21 / IDOsmart 내재화 프로토콜 조사

**작성일**: 2026-04-15
**목표**: LongRun이 VoiceCaddie Runner / VeryFit 없이 R21과 직접 통신하기 위한 BLE 프로토콜 해독
**결과**: Phase 0 핵심 목표 달성. Phase 1 (PoC 코딩) 착수 가능.

---

## 1. 디바이스 제원

| 항목 | 값 |
|---|---|
| 제품명 | NURUN R21 (VoiceCaddie 러닝 워치) |
| 시리얼 | VCR210BK25000179 |
| 펌웨어 | v1.00.36 |
| MAC | 1F:0F:C7:77:05:66 |
| BT 모드 | DUAL (BR/EDR + BLE) |
| BR/EDR 프로파일 | SPP, AudioSource, Avrcp, Handsfree, Handsfree_AG, HID |
| SoC 추정 | Sifli (VeryFit 앱 JNI에 `mkSifliDial`, `getSifliDialSize` 존재) |
| 플랫폼 | IDOsmart v3 (Shenzhen IDO Technology) |

## 2. GATT 프로파일 (확정)

로그 출처: `logcat bt_bta_gattc bta_gattc_display_explore_record`, `BluetoothGatt setCharacteristicNotification`

```
Service: 00000af0-0000-1000-8000-00805f9b34fb (IDO v1 custom)
├── Characteristic 00000af6 value_handle=0x0010 prop=0x0e (WRITE/WRITE_NO_RSP/NOTIFY)
│     └─ 역할: Write Normal channel (제어/설정 명령)
├── Characteristic 00000af1 value_handle=0x0015 prop=0x0e (WRITE/WRITE_NO_RSP/NOTIFY)
│     └─ 역할: Write Health channel (HR/활동 데이터 동기화)
├── Characteristic 00000af7 (NOTIFY + CCCD)
│     └─ 역할: Notify Normal (제어 응답, evt 수신)
└── Characteristic 00000af2 (NOTIFY + CCCD)
      └─ 역할: Notify Health (HR 샘플, 활동 히스토리)
```

- CCCD(`00002902-0000-1000-8000-00805f9b34fb`)에 `0x0100` (notify) 또는 `0x0200` (indicate) write로 활성화
- 이 UUID는 **Gadgetbridge ID115 드라이버의 UUID와 동일**하지만, R21은 v3 프로토콜 계열이므로 프레이밍은 다름

## 3. 프로토콜 레이어 구조

IDOsmart SDK는 **v1/v2 legacy + v3 magic-wrapped** 이중 프로토콜을 사용한다.

### 3.1 Legacy v1/v2 (raw body, 기본 제어)

**BLE characteristic에 쓰이는 바이트 = `protocol.c:protocol_write_data` TX 로그 바이트 그대로**. CRC 없음, magic 없음, length prefix 없음. BLE write 자체가 length를 제공한다.

로그에서 1:1 확인:
```
TX : 02 01                                           → onWriteCharacteristic length=2
TX : 07 40 38 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  → length=18
TX : 03 63 55 01 55 55 78 32 00 00 17 3B 08 07 00 00  → length=16
```

**패킷 포맷** (legacy):
```
[cmd_id : 1B] [sub_cmd : 1B] [payload : N]
```

**관측된 legacy 명령**:
- `02 01` — keepalive ping (60초 주기). 응답 `02 01 6A 1F 01 01 00 5A 01 00 01 00 63 01 02 03 06 01 00 03` (len=20). 디바이스 상태 캡슐?
- `07 40 XX 00 ...` — 공통 ack/confirm (len=18 또는 20). TX/RX 양방향에서 사용
- `03 63 XX 01 55 55 78 32 00 00 17 3B 08 07 00 00` — smart HR 모드 설정 (len=16)
  - offset 2 = `0x55` (ON) / `0xAA` (OFF) — 2-bit-per-field 인코딩
  - offset 6-7 = `78 32` = HR High 120, Low 50 (한계값)
  - offset 10-11 = `17 3B` = 23:59 (알림 시간 끝)
  - offset 12-13 = `08 07` = 알림 시간 시작 추정

**응답 플로우** (HR 저장 예시):
```
[T+0]    TX → 03 63 55 01 55 55 78 32 00 00 17 3B 08 07 00 00    (set HR mode)
[T+451]  RX ← 07 40 02 00 ... (len=20)                          (intermediate ack)
[T+451]  TX → 07 40 02 00 ... (len=18)                          (ack reply)
[T+453]  RX ← 03 63 00 00 ... (len=20)                          (final response, success)
         → jni_notice_app_evt type=182 (Java 쪽 UI 이벤트)
```

### 3.2 v3 magic-wrapped (대용량/JSON 전용)

```
[magic : 5B 33 DA AD DA AD] [ver : 1B 01] [len : 2B LE] [cmd_id : 1B] [nseq : 2B LE] [... header tail] [payload : len B] [crc16 : 2B]
```

- 용도: JSON 데이터 전송, 워치페이스 업로드, 음악 동기화, 연락처 동기화 등
- HR 토글 / 기본 제어에는 사용하지 않음 → **Phase 1 PoC는 v3 없이 시작 가능**
- CRC16 알고리즘은 미해독 (표준 CCITT/XMODEM/MODBUS/SUM16 모두 불일치). v3 구현 필요 시점에 역분석 필요.

## 4. 명령 opcode 카탈로그

libVeryFitMulti.so strings에서 **205개 VBUS_EVT opcode** 발견. 주요 그룹:

### 4.1 앱 → 디바이스 setter (`VBUS_EVT_APP_SET_*`)
```
SET_ALARM, SET_LONG_SIT, SET_LOST_FIND, SET_FIND_PHONE, SET_TIME,
SET_SPORT_GOAL, SET_SLEEP_GOAL, SET_USER_INFO, SET_UINT, SET_HAND,
SET_APP_OS, SET_NOTICE, SET_HEART_RATE_INTERVAL, SET_HEART_RATE_MODE,
SET_DEFAULT_CONFIG, SET_ENCRYPTED_AUTH, ...
```

### 4.2 바인딩 (`VBUS_EVT_APP_BIND_*`)
```
BIND_START, BIND_REMOVE, APP_GET_MAC, GET_DEVICE_INFO,
GET_FUNC_TABLE, GET_FUNC_TABLE_EX, GET_FUNC_TABLE_USER
```

### 4.3 OTA (`VBUS_EVT_APP_OTA_*`)
```
OTA_START, OTA_AUTH, ...
```

### 4.4 기능 플래그
- `V3_support_set_smart_heart_rate` — smart HR 설정 지원
- `support_set_v3_heart_interval` — HR interval 설정 지원
- `heart_rate_off_by_default` — **R21이 출고 시 상시 HR 측정 OFF** (제조사 의도 입증)
- `level5_hr_interval` — HR interval 5단계
- `silent_heart_rate` — 조용한 HR (LED 없이)
- `support_heart_rate_zones_hr_max_set` — HR zone 설정

## 5. JNI API 표면 (121개)

`libVeryFitMulti.so` 심볼 `Java_com_veryfit_multi_nativeprotocol_Protocol_*`:

**초기화/설정**:
`initParameter`, `initType`, `SetMode`, `SetMegSendBufLen`, `setMtu`, `setFilePath`, `EnableLog`, `ProtocolSetLogEnable`, `callBackEnable`

**BLE 데이터 경로**:
`ReceiveDatafromBle` (BLE notify 원시 바이트 주입),
`ReceiveDatafromSPP` (classic SPP 경로),
`WriteJsonData` (v3 JSON 명령 래퍼),
`SysEvtSet` (대부분 VBUS_EVT 진입점 추정)

**동기화**:
`StartSyncHealthData`, `StopSyncHealthData`, `StartSyncConfigInfo`, `StopSyncConfigInfo`,
`startSyncActivityData`, `stopSyncActivityData`, `startSyncGpsData`, `stopSyncGpsData`,
`AppControlAllConfigSync`, `getSyncActivityDataStatus`, `getSyncGpsDataStatus`

**대용량 전송**:
`tranDataStart`, `tranDataStartWithTryTime`, `tranDataContinue`, `tranDataStop`,
`tranDataManualStop`, `tranDataSendComplete`, `tranDataSetBuff`, `tranDataSetPRN`,
`tranDatasppContinue`, `Device2APPDataTranRequestReply`

**워치페이스/바이너리 빌더**:
`mkSifliDial`, `getSifliDialSize`, `mkIsfFile`, `mkIwfFile`, `mkPhoto`, `mkGpsSimulationData`

## 6. 결정적 디버그 로그 소스 파일 (VeryFit 내부)

```
protocol.c               — 최상위 입출력 (protocol_receive_data, protocol_write_data)
protocol_v3.c            — v3 프레이밍 파서 (protocol_v3_exec, process_tx_buff)
protocol_v3_queue.c      — v3 명령 큐 (cmd_reply_process, protocol_v3_rx_data_cb_handle)
protocol_write.c         — 재전송/타임아웃 (send_timer_handle)
jni_protocol.cpp         — Java-Native bridge (jni_notice_app_evt, jni_notice_app_tx_data)
```

VeryFit (com.watch.life 3.3.1) 릴리즈 빌드가 **디버그 로그를 모두 출력**한다. 이 덕분에 리버스 엔지니어링이 크게 단축됐다. 모든 TX/RX 바이트가 `I/DEBUG LOG`로 찍힌다.

## 7. 바인딩 핸드셰이크 (미해독, Phase 1로 이월)

- `VBUS_EVT_APP_BIND_START`, `VBUS_EVT_APP_SET_ENCRYPTED_AUTH` opcode 존재 확인
- `setBindAuth` 래퍼 함수 이름 확인
- 실제 핸드셰이크 바이트는 **미캡처** — R21이 이미 VeryFit에 paired된 상태라 force-stop/relaunch로는 재현 안 됨
- **Phase 1 전략**: 기존 bonding이 남아있는 R21에 LongRun이 연결 시도 → 응답 관찰 → 필요 시 unbind 후 캡처

## 8. 미해결 항목

| 항목 | 우선순위 | 비고 |
|---|---|---|
| 바인딩 핸드셰이크 바이트 | 🔴 High | Phase 1에서 unbind+rebind 캡처 |
| v3 CRC16 알고리즘 | 🟡 Med | v3 JSON 필요 시점까지 지연 |
| HR 샘플 수신 포맷 | 🟡 Med | Phase 2 (HR 연속 측정 수신) 때 캡처 |
| 바이너리 설정 payload 의미 (0x55/0xAA 필드의 4개 서브 플래그) | 🟢 Low | 우리 구현은 4비트 모두 동일 값 쓰면 됨 |
| SPP 경로 활용 여부 | 🟢 Low | BLE로 충분할 듯 |

## 9. 법적 메모 — 리버스 엔지니어링 정당성

### 9.1 국내법 근거

**저작권법 제101조의4 (프로그램코드 역분석)** — 2009년 신설, 2020년 개정:

> ① 정당한 권한에 의하여 프로그램을 이용하는 자 또는 그의 허락을 받은 자는 호환에 필요한 정보를 쉽게 얻을 수 없고 그 획득이 불가피한 경우에는 해당 프로그램의 호환에 필요한 부분에 한하여 프로그램코드 역분석을 할 수 있다.

**적용 체크리스트**:

| 요건 | 충족 여부 | 근거 |
|---|---|---|
| 정당 이용자 | ✅ | R21 하드웨어 정당 구매, VeryFit/VoiceCaddie Runner 정식 설치 |
| 호환 정보 획득 불가 | ✅ | VoiceCaddie 공식 API 없음, VeryFit SDK 비공개, Gadgetbridge에 R21 지원 드라이버 없음 |
| 획득 불가피성 | ✅ | 상시 HR을 LongRun 생태계로 연동하는 유일한 방법이 직접 구현 |
| 호환 필요 부분 한정 | ✅ | BLE 통신 레이어만 대상, UI/상표/독자 기능 모방 안 함 |

### 9.2 제102조의4 ③ 제한 — 사용 목적 제약

역분석 결과는:
- ✅ 호환 외 목적으로 사용 금지 → 우리 목적은 순전히 호환
- ✅ 제3자 유상 제공 금지 → 우리 구현체는 공개 배포 안 함
- ✅ 유사 프로그램 개발 금지 → VeryFit 대체 앱을 만드는 게 아니라 LongRun 내부 통합

### 9.3 Clean-room 프로세스

1. **facts만 추출**: UUID(숫자), opcode 바이트, 패킷 포맷 (저작권 보호 대상 아님)
2. **코드 복사 금지**: libVeryFitMulti.so / Gadgetbridge GPL 코드는 참조용으로만 열람, 이식 금지
3. **자체 구현**: Kotlin/Android BluetoothGatt 표준 API 기반으로 새로 작성
4. **문서화**: 본 리포트가 facts의 출처와 우리 구현이 clean-room임을 입증하는 기록

### 9.4 국제법 고려 (제품화 시)

- **미국 DMCA §1201(f)**: 상호운용성 예외 명시적 허용 — 본 케이스에 적합
- **EU Software Directive (2009/24/EC) Art. 6**: 상호운용성 위한 decompilation 허용
- **중국**: IDO/VeryFit은 중국 기업. 중국 저작권법 역분석 명시 조항 없으나 판례상 호환 목적 관대. 단 제품 중국 진출 시 별도 검토 필요.

### 9.5 리스크 평가

- 🟢 **Low**: 법적 근거 명확, facts 기반 clean-room. 민사 소송 성공 가능성 낮음.
- 🟡 **Med**: VoiceCaddie의 **상표/브랜드 침해** 주장 가능성 — 우리가 R21을 제품에 바인딩하면서 "VoiceCaddie 지원"으로 마케팅하면 위험. 대응: "IDO BLE 생태계 호환"으로 중립 마케팅.
- 🔴 **High (단일 지점)**: VoiceCaddie가 펌웨어 업데이트로 바인딩 토큰 교체 → 우리 드라이버 BreakChange. 대응: 자동 업데이트 비활성화 권고, 펌웨어 버전 fallback 매트릭스 유지.

## 10. Phase 1 착수 준비도 체크

| 항목 | 상태 |
|---|---|
| GATT service/characteristic UUID | ✅ 확정 |
| 기본 제어 패킷 포맷 | ✅ 확정 (legacy v1/v2, raw body) |
| HR 토글 명령 바이트 | ✅ 확정 (ON/OFF 1바이트 차이) |
| keepalive 패턴 | ✅ 확정 (02 01 ping, 60초 주기) |
| 응답/ack 플로우 | ✅ 확정 (07 40 ack 쌍방) |
| 법적 근거 | ✅ §101조의4 |
| 바인딩 핸드셰이크 | ⚠️ 미확정 (Phase 1 중간에 캡처) |
| HR 샘플 수신 포맷 | ⚠️ 미확정 (Phase 2) |
| v3 CRC16 | ⚠️ 미확정 (v3 필요 시점) |

**결론**: Phase 1 착수 즉시 가능. 마일스톤은:

1. **M1 (1주)**: Kotlin `IdoBleClient.kt`로 R21과 GATT 연결 → notify 구독 → 02 01 keepalive 1회 왕복 성공
2. **M2 (1~2주)**: HR 토글 ON/OFF 명령 전송 → R21이 상시 HR 측정 모드 진입 확인
3. **M3 (1~2주)**: notify `00000af2`에서 HR 샘플 수신 → 포맷 역추적 → 파싱
4. **M4 (2~4주)**: 바인딩 핸드셰이크 완성, 초기 페어링부터 LongRun만으로 완결
5. **M5 (2~4주)**: 에러/재연결/MTU 협상 등 제품화 안정성

**원래 예상 10~18주가 6~12주로 단축**될 가능성이 큼. 이유: VeryFit의 디버그 로그가 Ghidra 역분석을 대체함.

## 11. 아카이브 경로

- `step_archive/vf_apk/base.apk` — VeryFit 3.3.1 원본 APK (308MB)
- `step_archive/vf_apk/classes*.dex` — 15개 DEX
- `step_archive/vf_apk/lib/arm64-v8a/libVeryFitMulti.so` — 6MB 네이티브 프로토콜 구현
- `step_archive/vf_apk/libVeryFitMulti.strings.txt` — 24k 라인 strings dump
- `step_archive/ido_research/vbus_evt_full.txt` — 205개 opcode
- `step_archive/ido_research/heart_all.txt` — 121개 heart 심볼
- `step_archive/ido_research/func_table.txt` — 1330개 protocol 심볼
- `step_archive/ido_research/dex_uuids.txt` — 202개 UUID 후보
- `step_archive/ido_research/hr_save.log` — HR ON TX 캡처 raw logcat
- `step_archive/ido_research/hr_off.log` — HR OFF TX 캡처 raw logcat
- `step_archive/ido_research/gatt_discovery.log` — GATT 재발견 로그 + characteristic handle
- `step_archive/btsnoop.bin` — Samsung dumpsys 해독 btsnoop (95KB, advertising only)
