# 서비스 구조와 무료 운영 판단

확인일: 2026-10-09 (한국 시간). 공식 문서의 무료 할당량 기준이며 사용자의 Cloudflare 계정 플랜·기존 사용량은 아직 확인하지 않았습니다.

## 서비스 목표

처음 방문에는 사진과 색 비교, 반복 방문에는 날씨·목적·보유 의류에 맞는 코디 추천을 제공합니다. 카메라 기반 신원 확인은 수행하지 않습니다.

## 현재 구조

```text
브라우저
  촬영/업로드 -> 얼굴 검출 -> 얼굴 밝기 확인 -> 팔레트 직접 비교
  날씨 조건/목적/옷장 -> 규칙 추천 -> 선택과 피드백 기록
  사진: 메모리 / 옷장·기록: localStorage
Cloudflare Static Assets: 화면·JS·CSS·얼굴 모델·WASM
Cloudflare Worker: 상태 확인 / 선택적 캐시 날씨 API
```

카메라를 촬영/취소/백그라운드 전환/화면 이탈 시 중지합니다. MediaPipe 초기 로드는 WASM 수 MB 이상이므로 느린 모바일에서는 시간이 걸릴 수 있습니다. 단일 사진에서만 검출하여 연속 추론 비용을 줄입니다. 원본 피부 픽셀을 보정하거나 계절 유형을 자동 판정하지 않습니다.

## Cloudflare 무료 할당

| 구성 | 확인된 무료 할당 | 현재 사용 |
| --- | --- | --- |
| Static Assets | 정적 요청 무료·무제한, 자산 저장 추가 비용 없음 | 사용 |
| Workers | 일 100,000 요청, 요청당 CPU 10ms | 경량 API만 사용 |
| D1 | 일 500만 행 읽기·10만 행 쓰기, 총 5GB | 다음 단계 |
| R2 Standard | 월 10GB-month, A 작업 100만·B 작업 1,000만 | 미사용 |
| Workers AI | 일 10,000 Neurons 무료 할당; 모델별 소비량 상이 | 미사용 |

할당량은 사용자 수가 아니라 요청/행/작업 단위입니다. 예: 사용자 1,000명이 하루 5회 API를 호출하면 5,000 요청/일. 같은 계정의 다른 서비스 사용량도 고려해야 합니다. 무료 Workers 한도 초과는 요청 실패로 이어질 수 있습니다. 이 예시는 수용 능력 보장이나 부하 테스트 결과가 아닙니다.

무거운 이미지 처리를 요청당 10ms의 무료 Worker에서 수행하지 않습니다. 브라우저 계산을 활용하면 Cloudflare 서버 추론 비용 없이 초기 서비스를 만들 수 있으나 사용자 기기 성능 영향을 받습니다. 기존 Python/OpenCV 코드를 그대로 실행하는 설계를 채택하지 않습니다.

R2는 별도 구독 등록이 필요하고 무료 할당을 초과하면 과금될 수 있어 초기에는 연결하지 않습니다. Workers AI 무료 할당은 특정 퍼스널컬러 모델의 제공 또는 정확도를 의미하지 않습니다. 일부 AI 모델은 결제 수단이 필요합니다.

## 다음 구현

1. 실제 PC 웹캠·iOS Safari·Android Chrome의 촬영/권한 거부/복귀 흐름 검증.
2. 색 평가의 기준 수립: 촬영 조건, 사용자의 팔레트 비교 만족도, 전문가 평가와의 일치도. 피부색 임계값만으로 진단 정확도를 주장하지 않음.
3. 계정 인증과 D1 동기화: 사용자, 컬러 선택, 의류, 추천 기록, 피드백. 행별 소유자 검사·삭제·세션 만료를 먼저 설계.
4. 필요할 때만 R2 의류 사진 저장. 얼굴 사진과 분리하고 파일 한도·보관 기간·동의 정책 적용.
5. 상업 이용 가능한 날씨 공급자, 지표(촬영 완료율·추천 저장률·재방문·추천 만족도), 사용량 모니터링.
6. PWA와 필요 시 네이티브 앱·스마트미러, 검증된 컬러 모델, AR 순서로 확장.

## 기존 GitHub 정리 계획

기존 MagicMirror는 졸업 프로젝트 기록으로 유지하고 새 서비스는 onbit 저장소로 관리합니다. API 키와 비공개 캘린더 링크를 새 프로젝트로 복사하지 않습니다. 기존 키 재발급은 파일 삭제와 별개이며 Git 이력에 남은 비밀도 고려해야 합니다. 이전 Python 파일은 legacy/analysis와 legacy/experiments로 이동하고 설정을 legacy/config/config.example.js로 정리합니다. 설정의 키·비공개 캘린더 주소는 예시값으로 교체하고 이전 Git 이력은 보존합니다.

## 공식 근거

- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://open-meteo.com/en/pricing
- https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js
