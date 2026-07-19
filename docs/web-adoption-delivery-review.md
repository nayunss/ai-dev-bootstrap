# GitHub 기반 Web Adoption Delivery

상태: Actions 실제 pilot·Portal local reference PASS, Production Portal `NOT-RUN`
검토일: 2026-07-19
관련 요구사항: `REQ-047`
관련 작업: `REQ-047-web-adoption-actions-p0`, `REQ-047-web-adoption-p0-pilot`,
`REQ-047-github-app-web-portal`

## 결정

GitHub 저장소를 대상으로 하는 비개발자 도입의 기본 surface는 GitHub App Web Portal로 결정한다.
P0는 Portal의 권한·승인·PR 흐름을 GitHub Actions로 먼저 검증한다.

P0는 downstream 저장소에 설치된 `workflow_dispatch` 화면에서 reviewed release와
`preview | apply`를 선택한다. Preview는 read-only job에서 공통 headless adoption core의 plan과
plan SHA-256을 artifact로 제공한다. Apply는 exact plan SHA-256과 보호된
`web-adoption-apply` environment의 사람 승인을 요구하고, default branch가 아닌 새 branch와 pull
request만 생성한다.

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
| PR validation | `contents: read`, approved plan·lock allowlist·managed SHA-256·execution 경계 재검증 |
| Core | Web·CLI가 공유하는 release pin·checksum·plan·lock·transaction·rollback 구현 |
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

- Web·CLI의 plan entry와 plan SHA-256 parity
- Clean checkout preview 무변경
- 누락·stale plan SHA-256, dirty checkout, unreviewed release 차단
- Apply가 expected file만 stage하고 commit·push·PR·merge하지 않는 adapter fixture
- Workflow preview/apply 권한 분리, protected environment와 default branch binding
- PR hosted check의 plan·path·hash 검증과 PR 생성 실패 branch rollback
- `pull_request_target`, broad permission, secret context, default branch push와 auto merge 부재

Reference fixture와 실제 downstream pilot이 위 조건을 PASS했다.

### 실제 pilot 증거

- 저장소: <https://github.com/nayunss/web-adoption-p0-pilot>
- Exact upstream action commit:
  `d10afe781d03d662114a1ca6b38e469ed8f72dbb`
- Read-only preview run:
  <https://github.com/nayunss/web-adoption-p0-pilot/actions/runs/29675164760>
- Plan:
  `sha256:fc4790ebc11f9b603480189e16f27d96bdad80898956825d353fc32eae858835`
- Protected apply run:
  <https://github.com/nayunss/web-adoption-p0-pilot/actions/runs/29675351632>
- Review PR:
  <https://github.com/nayunss/web-adoption-p0-pilot/pull/1>
- Read-only PR validation run:
  <https://github.com/nayunss/web-adoption-p0-pilot/actions/runs/29675770560>

Preview 전후 main commit은 같았고 apply는 run-scoped branch와 12-file PR만 생성했다. PR은 exact
plan, lock file allowlist와 managed SHA-256, execution `NOT_RUN` 경계, owner file 보존을 hosted
check로 검증하고 OWNER approval을 받았다. Adoption PR은 open 상태로 유지하고 자동 merge하지
않았다.

1차 apply는 repository의 Actions PR 생성 설정이 꺼져 있어 branch push 후 PR 생성이 실패했다.
Pilot repository에서만 기본 workflow 권한 `read`를 유지한 채 PR 생성 허용을 승인했고 attempt 2는
PASS했다. 실패가 남긴 정확한 run-scoped branch는 승인 후 삭제했다. Template은 PR 생성 실패 시
방금 만든 branch만 삭제하고 실패를 유지하며, 별도 read-only PR validator가 plan·path·hash를
검증하도록 보강했다.

Private repository에서는 현재 billing plan이 environment required reviewer 생성을 HTTP 422로
거부했다. 비밀 없는 격리 fixture를 승인 후 public으로 전환해 required reviewer를 검증했다. 이는
private downstream에서도 동일 기능이 지원된다는 증거가 아니며 Portal은 repository visibility와
billing plan별 capability를 사전 검사해야 한다.

다음이면 P0 pilot과 Portal 승격을 중단한다.

- Workflow가 exact upstream commit 대신 moving ref를 사용한다.
- Preview job에 write 권한이나 checkout credential persistence가 생긴다.
- Apply가 default branch를 직접 수정하거나 자동 merge한다.
- Plan hash 재검증 없이 write하거나 core plan 밖 파일을 stage한다.
- `.env*`, repository secret, 다른 repository 또는 Production resource에 접근한다.
- 실패·취소 뒤 owner file 보존 또는 transaction rollback이 일치하지 않는다.

## GitHub App Web Portal 구현 조건

`REQ-047-web-adoption-p0-pilot`은 실제 분리된 downstream에서 PASS했다.
`REQ-047-github-app-web-portal`의 local reference는 다음 계약을 구현하고 deterministic fixture를
PASS했다.

- 선택한 repository만 접근하는 GitHub App installation
- Metadata read, Contents와 Pull Requests의 필요한 최소 권한
- callback 범위의 installation·user access token, 저장 금지와 log redaction
- repository·organization authorization과 webhook replay·중복 요청 차단
- ephemeral checkout 격리, egress allowlist, retention·삭제와 운영 책임자
- app suspension·uninstall, incident revoke와 생성 PR의 rollback

구현·실행 방법, threat boundary와 Production pilot 순서는
[GitHub App Web Portal Reference](github-app-web-portal-reference.md)를 따른다. 현재 PASS는
no-network local reference와 synthetic browser contract에 한정한다. 실제 App registration,
provider API·persistent replay store·ephemeral compute·revoke와 모바일·PC browser 비개발자 Eval은
`REQ-047-github-app-web-portal-production-pilot`에서 별도 검증한다.

Portal 배포·GitHub App 등록·권한 변경·Production 운영은 별도 사람 승인 전 `NOT-RUN`이다.
