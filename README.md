# 온빛 / ONBIT

졸업 프로젝트의 컬러·날씨 추천을 기기 내 사진 비교와 일상 코디 추천으로 재구성한 초기 웹 프로토타입입니다. 서비스명은 임시 이름입니다.

**공개 서비스: https://onbit.life-quiz.workers.dev**

카메라는 공개 주소를 일반 Chrome·Edge·Safari에서 직접 열어 사용하세요. 채팅 앱의 내장 미리보기에서는 카메라가 제한될 수 있습니다.

## 실행

```powershell
npm ci
npm run build
npm run dev
```

PC에서 http://localhost:8787 접속. 스마트폰 카메라는 HTTPS 환경에서 확인해야 합니다. 같은 네트워크의 HTTP IP 주소로 접속하면 카메라 권한이 동작하지 않을 수 있습니다.

```powershell
npm run types
npm run check
npm test
npm run test:e2e
npm run preview:deploy
```

배포된 서비스 검증: PowerShell에서 `$env:ONBIT_BASE_URL='https://onbit.life-quiz.workers.dev'` 설정 후 `npm run test:e2e`. 테스트는 합성 카메라를 사용하며 실제 웹캠이나 얼굴 사진을 수집하지 않습니다.

## 현재 구현

- 사용자의 버튼 조작 후 전면 카메라 권한 요청; 음성 권한 요청 없음.
- 촬영/사진 업로드, MediaPipe 얼굴 검출, 한 얼굴·크기·밝기 확인.
- 원본 얼굴 픽셀을 바꾸지 않는 사진 주변 팔레트 비교와 사용자 직접 선택.
- 기온·강수·목적·팔레트·보유 의류 조건으로 세 가지 코디 제안.
- 옷 등록/삭제, 추천 저장, 피드백 기록, 전체 데이터 삭제.
- 옷장과 선택 기록만 localStorage 저장. 얼굴 사진은 메모리에만 유지하고 서버 전송·영구 저장 없음.
- 모델과 WASM 파일은 직접 호스팅. 런타임 제3자 CDN 요청 없음.
- Cloudflare Workers Static Assets와 날씨 어댑터 API.

## 현재 제한

자동 계절 진단·피부색 분류·화이트밸런스 보정·흐림/가림 검증은 구현하지 않았습니다. 얼굴 검출과 밝기 통과는 컬러 분석의 정확도를 보장하지 않습니다. 사용자가 직접 선택한 팔레트를 추천에 반영합니다.

옷장 매칭은 종류·두께·대표 색상 일치 기반이며 스타일 적합도를 학습하지 않습니다. 카드 이미지는 색 조합의 도식입니다. 피드백은 기록만 하고 추천 학습에 사용하지 않습니다.

로그인·다른 기기 동기화·D1·R2·Workers AI·AR 착장은 아직 연결하지 않았습니다. 브라우저 데이터를 지우면 기록도 사라집니다. 실제 스마트폰 카메라 검증은 배포 후 필요합니다.

## 날씨 연동

기본값 `WEATHER_PROVIDER=open-meteo`: 비상업용 Open-Meteo 날씨 API를 활성화했습니다. 지역 4개(서울·시흥·부산·제주)로 제한하고 10분 캐시·5초 타임아웃을 적용합니다. 장애 시 기온과 강수 조건을 직접 입력할 수 있습니다. 표시 값은 지역 좌표의 현재 기온과 현재 강수량이며 하루 전체 예보가 아닙니다. Open-Meteo 무료 API는 비상업적 이용 조건이므로 상업 서비스로 바뀌면 적합한 제공자 또는 상업용 플랜을 연결해야 합니다.

## 카메라 문제 확인

`NotAllowedError`는 사용자 거절뿐 아니라 브라우저·OS 차단·내장 미리보기 제한에서도 발생할 수 있습니다. 화면의 ‘카메라 권한·연결 확인’에서 보안 연결, 카메라 API, 프레임 여부, 페이지 정책, 브라우저 권한, 오류 이름을 확인할 수 있습니다. 오류를 서버에 전송하지 않습니다.

공개 HTTPS 주소를 일반 Chrome·Edge·Safari에서 직접 열고 사이트 카메라 권한을 허용하세요. Windows 카메라 개인정보 설정과 다른 앱의 카메라 점유도 확인하세요. 휴대폰은 ‘스마트폰으로 촬영’으로 파일 입력의 `capture=user` 경로를 사용할 수 있으며 브라우저에 따라 일반 파일 선택으로 동작할 수 있습니다.

## Cloudflare 배포

```powershell
npx wrangler login
npm run deploy
```

소스 저장소: https://github.com/JinHyunjun/onbit . 기존 MagicMirror는 졸업 프로젝트 기록으로 별도 보존합니다. 기존 저장소의 키·캘린더 링크를 새 프로젝트로 가져오지 않았습니다.

구조와 비용 판단은 [docs/architecture.md](docs/architecture.md), 공개 데이터/모델 정보는 [THIRD_PARTY.md](THIRD_PARTY.md)를 참고하세요.
