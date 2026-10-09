# 서비스별 도메인 연결

현재 온빛 Worker 이름은 `onbit`, 기존 퀴즈 Worker 이름은 `life-quiz`다.
계정 공통 주소는 `life-quiz.workers.dev`이며 공통 주소 변경은 모든 Worker에 영향을 준다.
2026-10-09 조회 시 이 계정에 연결된 도메인(zone)은 없다.

보유 도메인을 확인한 후 다음과 같이 서비스별 호스트를 연결한다. 아래 주소는 예시이며 실제 연결된 주소가 아니다.

| 서비스 | 예시 주소 | Worker |
| --- | --- | --- |
| 온빛 | onbit.example.com | onbit |
| 기존 퀴즈 | quiz.example.com | life-quiz |

1. 도메인 소유자와 등록 업체를 확인하고 현재 DNS 레코드를 보존한다.
2. Cloudflare에 도메인을 등록하고 DNS 레코드 이전 내용을 검토한다. 등록 업체의 네임서버 변경은 해당 업체 접근이 필요하다.
3. 활성화된 zone에 서비스별 Custom Domain을 연결한다. `onbit`의 실제 호스트는 `wrangler.jsonc`의 `routes`에 `custom_domain: true`로 기록한다.
4. HTTPS, 홈페이지, 같은 출처 `/api/weather`, 카메라 정책과 사진 모델 로딩을 새 주소에서 검증한다.
5. README와 저장소 웹사이트 주소를 수정한다. 기존 workers.dev 주소는 전환 검증 동안 유지한다.

옷장·기록·팔레트 선택은 브라우저의 출처별 localStorage에 저장된다. 새로운 도메인으로 자동 이전되지 않으므로 주소 전환 전에 데이터 이전 방식을 마련해야 한다.

Cloudflare 공식 안내: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
