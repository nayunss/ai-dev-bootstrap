# CI Provider·배포 대상 선택 계약

상태: reference 구현
확정일: 2026-07-17
관련 요구사항: REQ-019–REQ-024, REQ-033–REQ-036, `REQ-040`, REQ-044–REQ-047

## 결론

CI provider와 배포 대상은 공통 기본값으로 강제하지 않고 project별로 감지·질문한다. Git hosting,
CI 실행, artifact 저장, Preview와 Production 배포는 서로 다른 provider일 수 있다.

```text
Git host        CI provider        Artifact store       Deployment target
GitHub          GitHub Actions     GitHub artifact      Vercel
GitLab          GitLab CI          GitLab registry      Kubernetes
Bitbucket       Jenkins            S3/GCS/registry      AWS/GCP/Azure
Azure Repos     Azure Pipelines    Azure Artifacts      App Service
Self-hosted     CircleCI           Private registry     Self-hosted
Local only      Local validation   None                 None
```

GitHub remote가 있다는 이유로 GitHub Actions 또는 Vercel 설정을 생성하지 않는다. 배포하지 않는
library, CLI, local tool과 prototype은 deployment target을 `none`으로 둘 수 있다.

## Project별 입력

| 영역 | 필드 | 의미 |
|---|---|---|
| CI | `provider` | GitHub Actions, GitLab CI, Azure Pipelines, Bitbucket Pipelines, Jenkins, CircleCI, Buildkite, self-hosted, none 등 |
| CI | `configPath` | 실제 pipeline source 위치 |
| CI | `runner` | hosted/self-hosted, OS·architecture·image/digest |
| CI | `triggers` | PR/MR, push, tag, schedule, manual |
| CI | `requiredJobs` | merge를 차단하는 job 이름과 적용 branch |
| CI | `permissions` | repository, token, OIDC와 artifact별 최소 권한 |
| CI | `network` | 허용 host·method, private network와 egress 정책 |
| CI | `retention` | log·artifact·security evidence 보존 기간과 책임자 |
| Artifact | `provider` | host artifact, package/container registry, object storage 또는 none |
| Artifact | `integrity` | checksum, digest, signature·provenance 방식 |
| Deployment | `targets` | Preview, staging, Production 또는 project 정의 environment 목록 |
| Deployment | `provider` | Vercel, Netlify, Cloudflare, AWS, GCP, Azure, Railway, Render, Fly.io, Kubernetes, self-hosted, none 등 |
| Deployment | `applicationRoot` | monorepo application별 build·deploy root |
| Deployment | `promotion` | 자동 Preview, staging·Production 사람 승인과 rollback |
| Deployment | `dataBoundary` | environment별 secret·DB·storage·queue·domain 격리 |
| Deployment | `owners` | CI, infrastructure, release, security와 Production 승인 책임 |

이 값은 project folder나 Git remote만으로 확정하지 않는다. 기존 config가 있으면 read-only로 감지해
후보로 보여주고 owner가 실제 운영 상태를 확인한다.

## 지원 계층

| 계층 | 공통 하네스 책임 |
|---|---|
| Provider-neutral contract | job 단계, required outcome, artifact, environment, permission, evidence와 rollback을 공통 schema로 표현 |
| CI adapter | 공통 job을 provider syntax·permission·cache·artifact 방식으로 materialize |
| Deployment adapter | application build output, environment, healthcheck, promotion과 rollback을 provider API/config로 연결 |
| Project override | runner size, region, domain, account/project ID, cost·retention과 조직 정책 |

Provider adapter는 공통 outcome을 보장해야 하지만 YAML syntax를 억지로 같게 만들지 않는다. GitHub
Actions adapter PASS를 GitLab CI, Jenkins 또는 self-hosted runner 지원 근거로 사용하지 않는다.

## 공통 필수 CI Outcome

Project가 CI를 사용하면 provider와 관계없이 적용 가능한 항목을 실행한다.

- immutable source checkout과 예상 commit 검증
- exact runtime·package manager·lockfile
- dependency lifecycle과 network 승인
- format·lint·typecheck·compile
- unit·integration·contract·E2E 중 project profile의 필수 suite
- secret scan·SAST·dependency·license/provenance gate
- HANDOFF·requirement traceability·CodeSight stale
- build artifact checksum·digest와 sanitized evidence
- job failure·timeout·cancellation을 성공으로 처리하지 않는 fail-closed 결과

해당 project에 적용되지 않는 항목은 근거 있는 `N/A`로 선언한다. Job 자체를 만들지 않은 것을 PASS로
간주하지 않는다.

## CI Provider 경계

- action, orb, plugin, image와 shared library는 exact commit·version·digest를 고정하고 공급망 심사를
  통과해야 한다.
- hosted runner와 self-hosted runner를 구분한다. Self-hosted는 workspace cleanup, job 간 secret·
  container 격리, egress와 persistence를 별도 검증한다.
- fork PR/MR와 untrusted contribution에는 write token·secret·Production environment를 제공하지 않는다.
- cache는 artifact integrity나 dependency lock을 대신하지 않으며 poison·cross-branch 경계를 검증한다.
- CI provider가 Git host와 다르면 webhook·app permission·commit status API와 outage 동작을 별도로
  검토한다.
- pipeline 변경 권한과 Production deployment 권한을 분리한다.

## 배포 대상 경계

- Preview, staging과 Production은 credential·DB·storage·queue·domain을 논리적 또는 물리적으로
  분리하고 교차 접근 negative test를 둔다.
- frontend, backend, worker와 migration은 application별 root·build·healthcheck·rollback을 기록한다.
- Preview 성공은 Production 승인이나 provider backup restore 증거가 아니다.
- Production promotion은 exact artifact digest, environment diff, migration·rollback과 사람 승인에
  묶는다.
- DB migration, DNS·domain, IAM, secret, infrastructure와 destructive change는 application deploy와
  별도 고위험 승인으로 분리한다.
- provider가 자동 rollback을 제공하더라도 DB·queue·external side effect가 함께 복구된다고
  추론하지 않는다.
- deployment target이 `none`이면 deploy config·credential·integration을 생성하지 않는다.

## 개인·팀·Enterprise 차이

| 상황 | 허용 구성 | 주의 |
|---|---|---|
| 개인 project | 무료 hosted CI, local validation, deployment `none` 또는 개인 provider | 비용 상한·public artifact·secret 범위를 확인 |
| 소규모 팀 | Git host 내장 CI 또는 별도 SaaS, Preview 중심 | account owner, billing, required check와 Production 승인 책임을 명시 |
| Enterprise | managed CI, self-hosted runner, private registry·cloud·Kubernetes | SSO·OIDC·network·data residency·runner isolation·admin 분리 |
| 규제 환경 | 승인된 private runner·artifact·deployment | audit·retention·two-person control·restore evidence |

공통 하네스는 개인 project에 enterprise 복잡도를 강제하거나 enterprise project에 개인 SaaS를
기본값으로 권장하지 않는다.

## 초기 설정·Retrofit 질문

1. CI가 필요한 project인가. 없다면 local required validation은 무엇인가.
2. Git host 내장 CI, 별도 SaaS 또는 self-hosted 중 실제 provider는 무엇인가.
3. Runner OS·architecture·image, network와 secret 접근 범위는 무엇인가.
4. 어떤 branch/event에서 어떤 job이 required인가.
5. artifact/package/container는 어디에 얼마 동안 보존하는가.
6. 배포 대상이 있는가. Preview·staging·Production environment와 provider는 각각 무엇인가.
7. application별 root, build output, healthcheck와 rollback은 무엇인가.
8. 비용·billing, CI·infra·release·security·Production owner는 누구인가.
9. provider 장애, rollback과 이전 artifact 재배포 절차는 무엇인가.

미응답 `TBD`는 pipeline·deployment 생성 승인이 아니다. 기존 CI·deploy config와 provider integration은
자동 교체하지 않고 diff·migration·rollback 승인 후 retrofit한다.

## GUI·CLI 표시

REQ-047 GUI는 Git hosting 선택과 CI·deployment 선택을 별도 단계로 제공한다.

- **코드 저장 위치**
- **자동 검증 방법**
- **빌드 결과 보관 위치**
- **배포하지 않음 / 배포 환경 선택**

사용자가 “GitHub”를 선택해도 GitHub Actions·Vercel을 자동 선택하지 않는다. 쉬운 설치 화면은
검증된 project profile 후보를 설명할 수 있지만 provider account 생성, billing, cloud resource,
Production deploy를 원클릭 적용에 포함하지 않는다.

## 검증 기준

- GitHub + GitHub Actions + Vercel
- GitHub + 외부 CI + AWS 또는 deployment `none`
- GitLab + GitLab CI + registry/Kubernetes
- Azure Repos + Azure Pipelines + Azure deployment
- generic Git + Jenkins/self-hosted runner
- monorepo의 frontend·backend application별 서로 다른 deployment target
- hosted/self-hosted runner와 fork contribution secret negative
- required job 누락·이름 drift·false PASS·timeout·artifact empty 차단
- Preview/Production credential·DB 교차 접근 negative
- 미승인 provider integration·billing·Production write 차단
- GUI·CLI profile·plan parity

실제 fixture를 통과하지 않은 provider는 schema에 표현할 수 있어도 지원 완료로 표시하지 않는다.

## 완료 판정

Provider-neutral CI·deployment schema와 validator, 최소 두 종류의 CI adapter와 deployment `none`을
포함한 두 종류의 target adapter fixture, permission·artifact·environment·rollback negative Eval을
통과해야 공통 구현 완료로 표시한다. Production 배포 성공은 provider별 별도 승인과 실제 환경
증거가 있어야 한다.

2026-07-18 GitHub Actions·GitLab CI·Jenkins 예시와 artifact integrity/retention, Vercel·Kubernetes 및
deployment `none`을 공통 schema로 검증하는 synthetic fixture를 구현했다. Required outcome 누락,
광범위 permission, Production 자동 promotion과 `none` integration drift를 차단한다. Provider write,
credential 사용과 실제 deployment는 모두 `NOT_RUN`이다.
