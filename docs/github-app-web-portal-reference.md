# GitHub App Web Portal Reference

상태: 로컬 reference 구현·deterministic 검증 PASS, Production `NOT-RUN`
검토일: 2026-07-19
관련 요구사항: `REQ-047`
관련 작업: `REQ-047-github-app-web-portal`,
`REQ-047-github-app-web-portal-production-pilot`

## 지금 사용할 수 있는 범위

비개발자가 `저장소 선택 → 변경 미리보기 → exact plan 승인 → 새 Pull Request 검토` 흐름을 이해하고
검증할 수 있는 로컬 Portal reference를 구현했다. 다음 명령은 loopback 주소에만 데모를 열며 GitHub
로그인, GitHub API, 실제 저장소 checkout·write, branch·PR 생성과 telemetry를 수행하지 않는다.

```bash
npm run portal:demo
```

브라우저에서 `http://127.0.0.1:4173`을 연다. 화면 상단의 **로컬 검증 모드**와 실행하지 않는 범위를
확인하고, `fixture/example`의 미리보기와 승인 흐름을 실행한다. 표시되는 Pull Request는 외부 호출
결과가 아니라 delivery 경계 확인용 예시다.

구현 source는 다음과 같다.

- `web-portal/`: 반응형·keyboard 접근 가능한 비개발자 화면
- `scripts/github-app-portal.mjs`: 권한, auth state, webhook, token 수명, preview 승인과 PR-only 조정
- `scripts/github-app-portal-demo.mjs`: loopback 전용 no-network reference server
- `scripts/test-github-app-portal.mjs`: positive·negative security와 browser contract fixture

## 보안 계약

2026-07-19 현재 GitHub 공식 문서를 기준으로 고정한 계약이다.

| 경계 | Reference 계약 | 중단 조건 |
|---|---|---|
| App 설치 | `selected repositories`만 허용하고 선택한 repository ID와 installation account를 매 요청 재검증 | all repositories, 다른 account·repository |
| App 권한 | Metadata `read`, Contents `write`, Pull requests `write`만 허용 | Administration, Actions, Secrets 등 추가 권한 |
| 사용자 권한 | 선택 repository 접근과 현재 push 권한을 preview·apply 때 각각 확인 | 권한 철회, actor·repository 변경 |
| 인증 callback | 256-bit 무작위 state, 최대 10분, 한 번만 사용, local return path만 허용 | state 누락·재사용·만료, 외부 redirect |
| installation token | callback 안에서 ephemeral checkout에만 전달하고 결과·log·evidence에 저장하지 않음 | token persistence·serialization, token 길이·형식 가정 |
| user access token | 사용자 대신 PR을 만드는 delivery callback에만 전달하고 결과·log에 저장하지 않음 | ambient token, actor 교체, callback 밖 노출 |
| Webhook | raw body의 `X-Hub-Signature-256`을 constant-time 비교한 뒤 허용 event와 `X-GitHub-Delivery`를 한 번만 소비 | 서명 오류, delivery 중복, 미허용 event, replay store 포화 |
| Checkout | installation·repository별 ephemeral workspace, 작업 종료 후 폐기, egress는 GitHub 두 endpoint만 허용 | shared workspace, `.env*`·다른 repository, 임의 egress |
| 승인 | preview plan SHA-256, actor, repository와 최대 10분 session을 apply 때 재검증 | stale·다른 plan, 만료 session, duplicate write |
| Delivery | 새 branch와 Pull Request만 만들며 default branch push·force push·auto merge 금지 | plan 밖 파일, 직접 push·merge |
| 기록 | token·authorization·secret·code와 token-like 문자열 redaction, 결과 metadata 최대 7일, telemetry 기본 꺼짐 | source snapshot·credential 장기 보존, 무승인 telemetry |
| 중지 | suspension·uninstall·authorization revoke를 받으면 새 preview·apply를 차단하고 runtime token을 폐기 | inactive installation으로 계속 실행 |

GitHub는 설치 시 repository 권한을 요청하는 App에 대해 사용자가 `Only select repositories`를
고를 수 있다고 설명한다. Installation token은 발급 후 1시간에 만료되며 2026년부터 token 형식이
변경될 수 있으므로 고정 길이나 prefix에 의존하지 않는다. 사용자 대신 수행하는 작업은 App과
사용자의 권한 교집합인 user access token을 사용하라는 공식 권고에 따라, reference는 checkout과
PR delivery credential을 분리한다.

- [GitHub App 설치와 선택 repository](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)
- [Installation access token 생성과 1시간 만료](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app)
- [GitHub App token 선택과 권한 재검증 원칙](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app)
- [User access token과 App·사용자 권한 교집합](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [Webhook HMAC-SHA256 검증](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [GitHub App installation suspend](https://docs.github.com/en/apps/maintaining-github-apps/suspending-a-github-app-installation)
- [설치 App 검토·suspend·uninstall](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps)

## 검증 결과

`npm run test:github-app-portal`은 다음을 외부 network·credential 없이 검증한다.

- 최소 권한 positive와 all-repository·권한 확대 negative
- installation account·selected repository·사용자 push 권한과 suspension 차단
- auth state 한 번 사용·만료·open redirect 차단
- webhook signature, event allowlist와 duplicate delivery 차단
- GitHub token 형식 고정 없이 재귀 log redaction
- installation·user token의 callback confinement과 결과 미노출
- preview actor·repository·exact plan·TTL binding, 중복 apply idempotency
- PR 생성 결과에서 merge `NOT_RUN`
- loopback UI의 CSP·no-store, same-origin API, semantic HTML과 local simulation 표시

이는 로컬 reference와 deterministic fixture의 PASS다. 실제 GitHub authorization, provider API,
ephemeral compute·egress enforcement, persistent replay store, revoke 처리, 실제 branch·PR rollback과
사람 browser 사용성 PASS로 확대해서 해석하지 않는다.

## Production pilot 전 필수 입력·승인

다음은 `REQ-047-github-app-web-portal-production-pilot`에서 순서대로 진행한다. 하나라도 충족하지
못하면 등록·배포·권한 변경을 중단한다.

1. GitHub App owner·operator·incident owner와 개인 또는 organization 설치 대상을 확정한다.
2. App 이름·homepage·callback·setup·webhook URL, 개인정보·retention·삭제 정책과 hosting provider를
   검토한다.
3. exact App permissions와 webhook events를 사람이 승인한 뒤 별도 test App을 등록한다.
4. Private key·webhook secret·user token 암호화 저장소, rotation·revoke와 log redaction을 검증한다.
5. persistent one-time auth state·delivery replay store, ephemeral compute, egress allowlist와 7일 이내
   evidence 삭제를 실제 환경에서 검증한다.
6. 별도 non-production repository에서 preview·apply·PR validation, PR 실패 branch rollback,
   suspension·uninstall·authorization revoke와 incident kill switch를 검증한다.
7. 모바일·desktop browser에서 비개발자 최소 2명이 repository 선택, 변경 이해, 승인 취소·오류 복구,
   keyboard·screen reader와 PR review를 수행한다.
8. 보안·사용성 evidence가 모두 PASS한 뒤에만 Production 등록·배포를 별도 승인한다. 자동 merge와
   Production deploy는 계속 Portal adoption 범위 밖이다.
