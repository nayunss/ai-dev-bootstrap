# GitHub 기반 Web Adoption Delivery

상태: GitHub Actions P0 reference 구현·deterministic PASS, 실제 downstream pilot `NOT-RUN`
검토일: 2026-07-19
관련 요구사항: `REQ-047`
관련 작업: `REQ-047-web-adoption-actions-p0`, `REQ-047-web-adoption-p0-pilot`,
`REQ-047-github-app-web-portal`

## 결정

Apple Developer Program과 Developer ID credential이 없는 현재 조건에서는 macOS desktop
installer를 지원 자산으로 발행할 수 없다. Desktop `GUI-05-signing-notarization`은 `BLOCKED`로
유지하고, OS installer와 별개인 GitHub 기반 web adoption 경로를 추가한다.

P0는 downstream 저장소에 설치된 `workflow_dispatch` 화면에서 reviewed release와
`preview | apply`를 선택한다. Preview는 read-only job에서 공통 headless adoption core의 plan과
plan SHA-256을 artifact로 제공한다. Apply는 exact plan SHA-256과 보호된
`web-adoption-apply` environment의 사람 승인을 요구하고, default branch가 아닌 새 branch와 pull
request만 생성한다.

이 경로는 desktop installer 발행이 아니다. Desktop 지원 OS, signing, notarization과 사람
VoiceOver Eval 상태를 변경하지 않는다.

## P0 흐름

```text
GitHub Actions / Run workflow
        │
        ├─ preview (contents: read)
        │    └─ shared core plan + SHA-256 artifact, repository 무변경
        │
        └─ apply (protected environment 승인)
             ├─ current target inventory와 plan SHA-256 재검증
             ├─ shared core transaction
             ├─ 허용된 변경만 stage
             └─ 새 branch push + PR 생성, 자동 merge 없음
```

배포 template은 [GitHub Actions Web Adoption P0](templates/github-actions-web-adoption-p0.yml),
공통 composite action은
[`release-adoption/action.yml`](../.github/actions/release-adoption/action.yml)을 사용한다.
Template의 `REPLACE_WITH_EXACT_UPSTREAM_COMMIT`은 검증된 upstream commit 40자리 SHA로 교체해야
하며 moving branch나 tag를 action ref로 사용하지 않는다.

현재 allowlist의 `reference-v1`, `reference-v2`는 deterministic fixture다. 실제 사용자
프로젝트에 적용할 production release bundle로 해석하거나 배포하지 않는다.

## 권한·보안 경계

| 영역 | P0 계약 |
|---|---|
| Preview | `contents: read`, checkout credential 미보존, repository write 0 |
| Apply | default branch dispatch만 허용, protected environment 승인, `contents: write`와 `pull-requests: write` |
| Core | GUI·CLI와 같은 release pin·checksum·plan·lock·transaction·rollback 구현 |
| 변경 범위 | Core plan entry와 release adoption lock·rollback record만 stage |
| Git | 고정 bot identity, run별 새 branch, force push·default branch push·자동 merge 금지 |
| Secret | 사용자 secret·`.env*`·ambient credential 읽기 금지; GitHub가 job에 발급한 token만 PR 생성 단계에서 사용 |
| 실행 제외 | dependency install, lifecycle script, DB migration, model call, Production deploy, telemetry |
| 증거 | result JSON artifact 7일 보존, plan SHA-256, PR과 hosted check |

Apply job의 `providerWrite`는 공통 core 밖 delivery adapter에서 branch push와 PR 생성으로 제한한다.
Core 결과의 `execution.providerWrite: NOT_RUN`은 core 자체가 provider API를 호출하지 않았다는
의미이며 PR 생성 완료를 뜻하지 않는다.

## P0 완료와 중단 조건

Reference 구현 완료 조건:

- Web·GUI·CLI의 plan entry와 plan SHA-256 parity
- Clean checkout preview 무변경
- 누락·stale plan SHA-256, dirty checkout, unreviewed release 차단
- Apply가 expected file만 stage하고 commit·push·PR·merge하지 않는 adapter fixture
- Workflow preview/apply 권한 분리, protected environment와 default branch binding
- `pull_request_target`, broad permission, secret context, default branch push와 auto merge 부재

현재 reference fixture는 위 조건을 deterministic PASS했다. 실제 downstream repository에서의
workflow 설치, hosted preview artifact, environment 승인, branch push, PR checks와 merge 전
review는 `REQ-047-web-adoption-p0-pilot`까지 `NOT-RUN`이다.

다음이면 P0 pilot과 Portal 승격을 중단한다.

- Workflow가 exact upstream commit 대신 moving ref를 사용한다.
- Preview job에 write 권한이나 checkout credential persistence가 생긴다.
- Apply가 default branch를 직접 수정하거나 자동 merge한다.
- Plan hash 재검증 없이 write하거나 core plan 밖 파일을 stage한다.
- `.env*`, repository secret, 다른 repository 또는 Production resource에 접근한다.
- 실패·취소 뒤 owner file 보존 또는 transaction rollback이 일치하지 않는다.

## GitHub App Web Portal 승격 조건

`REQ-047-web-adoption-p0-pilot`이 실제 분리된 downstream에서 PASS한 뒤에만
`REQ-047-github-app-web-portal`을 시작한다. Portal은 다음을 별도 설계·검증해야 한다.

- 선택한 repository만 접근하는 GitHub App installation
- Metadata read, Contents와 Pull Requests의 필요한 최소 권한
- 짧은 수명의 installation token, 저장 금지와 log redaction
- repository·organization authorization과 webhook replay·중복 요청 차단
- ephemeral checkout 격리, egress allowlist, retention·삭제와 운영 책임자
- 모바일·desktop browser에서 비개발자 preview·승인·오류 이해·PR review Eval
- app suspension·uninstall, incident revoke와 생성 PR의 rollback

Portal 배포·GitHub App 등록·권한 변경·Production 운영은 별도 사람 승인 전 `NOT-RUN`이다.
