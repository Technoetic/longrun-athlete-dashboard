# 릴리즈 서명 키스토어 설정 가이드

## 왜 필요한가

Google Play Store에 APK/AAB를 업로드하려면 **암호로 서명**돼 있어야 합니다.
한 번 서명하는 데 사용한 키는 **그 앱의 영구 정체성**이며, 키를 잃어버리면
같은 패키지 이름으로 업데이트를 영영 못 합니다 (Play App Signing 사용 안 한
경우). 따라서 **비밀번호를 안전하게 보관하는 것이 핵심**입니다.

## 1. 키스토어 생성 (사용자가 직접 1회만)

터미널에서 `android/` 디렉토리로 이동한 뒤:

```bash
keytool -genkey -v \
  -keystore longrun-release.jks \
  -alias longrun \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

(`validity 10000`은 약 27년 — Google Play Store 권장)

진행 중 묻는 항목:
- **keystore password**: 키스토어 파일 자체 비밀번호. 반드시 강력하게.
- **key password**: 알리아스(longrun)별 비밀번호. 보통 keystore와 같게.
- 이름/조직/도시/국가: 인증서 메타데이터. 가짜 정보 OK 단 일관성.

생성된 `longrun-release.jks` 파일은 `android/` 디렉토리에 위치합니다.
**.gitignore에 의해 자동으로 git에서 제외됩니다.**

## 2. keystore.properties 파일 작성

`android/keystore.properties` (gitignore 처리됨) 신설:

```properties
storeFile=longrun-release.jks
storePassword=여기에_keystore_password
keyAlias=longrun
keyPassword=여기에_key_password
```

이 파일도 .gitignore에 등록돼 있습니다. **절대 커밋되지 않습니다.**

## 3. 비밀번호 백업 (필수)

비밀번호를 잃으면 끝이므로 **최소 2곳에 백업**:

1. **비밀번호 관리자** (1Password, Bitwarden, KeePass 등)
2. **물리 백업** — 종이에 적어 안전한 곳 (집 금고 등)
3. (선택) USB 드라이브 + 암호화

키스토어 파일(`longrun-release.jks`) 자체도 백업 권장:
- 폰 외부 저장소 (USB)
- 클라우드 (단, **암호화된 zip**으로 — Dropbox/Google Drive 등에 raw로 올리지 마세요)

## 4. Play App Signing (권장)

Google Play Console에서 "Play App Signing" 활성화 시:
- 본인이 만든 키는 **업로드 키**가 됨
- 실제 서명 키는 Google이 보관 (분실 위험 0)
- 업로드 키 분실 시 Google 지원으로 재발급 가능

**권장**: 첫 업로드 시 Play App Signing 활성화. 본인 키스토어는 업로드용으로만.

## 5. 빌드 결과

`keystore.properties`가 존재하면 `./gradlew :app:assembleRelease`가 자동으로
서명된 APK를 생성합니다:

```
android/app/build/outputs/apk/release/app-release.apk
```

(`unsigned` 가 빠짐)

키스토어 properties 파일이 없으면 `app-release-unsigned.apk` 로 떨어지고
이건 Play Store 업로드 불가.

## 6. AAB(Android App Bundle) 생성 — Play Store 업로드용

Play Store는 APK가 아니라 AAB를 선호합니다:

```bash
./gradlew :app:bundleRelease
```

결과: `android/app/build/outputs/bundle/release/app-release.aab`

## 7. 체크리스트

- [ ] keystore 파일 생성
- [ ] 비밀번호를 비밀번호 관리자에 저장
- [ ] 비밀번호를 물리 백업에 저장
- [ ] keystore.properties 작성
- [ ] `./gradlew :app:assembleRelease` 성공 확인
- [ ] 서명된 APK 설치 가능 확인 (`adb install`)
- [ ] (선택) AAB 빌드 성공 확인
- [ ] Play Console 등록 + Play App Signing 활성화

## 절대 하지 말 것

- ❌ `git add longrun-release.jks` 또는 `git add keystore.properties`
- ❌ 비밀번호를 README/code/이메일에 평문으로 적기
- ❌ 키스토어를 Dropbox/Google Drive에 unencrypted 업로드
- ❌ "기억할 수 있는 쉬운 비밀번호" 사용 (분실 시 복구 불가능)
- ❌ 처음 서명 후 다른 키스토어로 다시 서명 시도 (Play Store가 거부함)
