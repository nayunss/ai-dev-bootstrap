# Git Hosting·Namespace·Remote 계약 검토

상태: reference 구현
확정일: 2026-07-17
관련 요구사항: `REQ-001`, `REQ-003`, REQ-019–REQ-024, REQ-033–REQ-038, `REQ-042`, `REQ-046`, `REQ-047`

## 결론

공통 하네스는 GitHub organization, repository 이름, `origin` URL과 SaaS host를 기본값으로 고정하지
않는다. 개인 계정, 회사 조직, enterprise tenant, self-hosted Git과 GitLab 등 provider 차이를
project별 `Git hosting profile`로 질문하고 기록한다.

```text
GitHub organization/repository
                    ┐
GitHub personal      │
GitHub Enterprise    │
GitLab group/project ├─→ provider-neutral Git hosting profile
GitLab self-managed  │
Bitbucket workspace  │
Azure DevOps project │
기타 self-hosted Git ┘
```

Git 자체의 remote tracking과 provider의 PR/MR, branch protection, CI, release·artifact API를
분리한다. `git fetch`, commit, tag와 remote-tracking reference를 지원한다고 해서 provider별 API
자동화도 지원되는 것으로 해석하지 않는다.

## 용어

| 공통 용어 | GitHub | GitLab | Bitbucket | Azure DevOps |
|---|---|---|---|---|
| provider | GitHub / GitHub Enterprise | GitLab.com / self-managed GitLab | Bitbucket Cloud/Data Center | Azure Repos |
| namespace | user 또는 organization | user, group 또는 subgroup | workspace 또는 project | organization/project |
| repository | repository | project | repository | repository |
| change request | pull request | merge request | pull request | pull request |
| protected policy | ruleset·branch protection | protected branch·approval rule | branch restriction | branch policy |
| pipeline | GitHub Actions 또는 외부 CI | GitLab CI/CD 또는 외부 CI | Pipelines 또는 외부 CI | Azure Pipelines 또는 외부 CI |

UI와 문서의 공통 표현은 `namespace`, `repository`, `change request`, `protected policy`, `pipeline`을
사용한다. Provider adapter에서만 실제 제품 용어와 API field로 변환한다.

## Project별 입력

다음 값은 공통 저장소에 고정하지 않고 새 project 초기 설정과 기존 project retrofit에서 감지하거나
질문한다.

| 필드 | 의미 |
|---|---|
| `provider` | `github`, `github-enterprise`, `gitlab`, `gitlab-self-managed`, `bitbucket`, `azure-repos`, `generic-git` 등 |
| `host` | `github.com`, `gitlab.com` 또는 승인된 enterprise/self-hosted hostname |
| `namespace` | 개인 user, organization, group/subgroup, workspace 또는 organization/project |
| `repository` | 실제 repository 이름; project 폴더명에서 추정하지 않음 |
| `canonicalRemote` | upstream 변경을 push·fetch하는 논리적 remote ID |
| `fetchUrl` / `pushUrl` | redacted 가능한 Git URL; embedded credential 금지 |
| `defaultBranch` | `main`, `master`, trunk 또는 project가 정한 값 |
| `visibility` | public, private, internal 또는 provider가 지원하는 실제 등급 |
| `changeRequestMode` | PR, MR 또는 provider automation 없음 |
| `pipelineProvider` | Git host 내장 CI 또는 별도 CI provider |
| `releaseProvider` | tag만 사용, host release, package registry 또는 별도 artifact store |
| `requiredChecks` | project에서 요구하는 check 이름과 strict 정책 |
| `approvalOwners` | code owner, security, release와 Production 승인 책임 |
| `mirrorPolicy` | 단일 canonical remote, read-only mirror 또는 승인된 multi-remote |
| `branchStrategy` | trunk-based, short-lived feature branch, release branch, Git Flow 또는 project 정의 방식 |
| `mergeMethod` | merge commit, squash, rebase 또는 provider가 허용한 조합 |
| `reviewPolicy` | 변경 위험 등급별 최소 승인 인원·필수 역할·self-review 허용 여부 |
| `exceptionPolicy` | emergency 변경의 승인자·만료·사후 review와 audit 절차 |

미응답 값은 `TBD`로 유지한다. `TBD` 상태에서 remote 생성, push, PR/MR, branch policy, release와
webhook 변경을 수행하지 않는다.

## Branch 전략과 Review 승인

Branch 전략과 reviewer 수는 provider나 팀 규모에서 추정하지 않고 project profile로 질문한다.
변경 위험 등급별 필수 역할, self-review, required check, emergency 예외와 검증 기준은
[Branch 전략과 Review 승인 계약](branch-and-review-strategy.md)을 따른다.

## Git remote와 실제 원격 상태

- `origin`, `upstream`, `company`는 local alias이므로 provider나 최신 원격 상태를 증명하지 않는다.
- 실제 fetch/push URL은 `git remote get-url --all <name>`으로 확인하되 URL에 credential이 포함될 수
  있으므로 저장·로그·HANDOFF에서 redaction한다.
- remote-tracking reference는 마지막 fetch 결과다. 최신 server 상태가 필요하면 승인된 network
  범위에서 fetch한 뒤 비교한다.
- 여러 remote가 있으면 어느 remote가 canonical write target인지 profile로 명시한다. 첫 번째 remote나
  `origin`을 임의 선택하지 않는다.
- fork workflow는 source upstream과 contributor fork를 분리하고 PR/MR 대상 base namespace를
  명시한다.
- mirror는 read-only, bidirectional 또는 release-only인지 정한다. 자동 양방향 mirror는 conflict와
  secret·private code 유출 위험 때문에 기본 비활성화한다.

## Provider adapter 경계

### 공통 Git core

다음은 provider-neutral하게 구현한다.

- repository와 worktree 상태
- commit·branch·tag·remote-tracking reference
- fetch/push 대상 preview
- fast-forward·divergence 판정
- archive 생성과 checksum
- local diff·test·security gate

### Provider별 adapter

다음은 provider API·권한 모델이 다르므로 독립 adapter로 구현한다.

- PR/MR 생성·review·merge
- required check와 protected branch/ruleset
- release·asset·package registry
- pipeline run·artifact·retention
- code owner·review approval
- webhook·deploy key·app integration

GitHub adapter의 성공을 GitLab, Bitbucket, Azure DevOps 또는 enterprise host 지원 근거로 사용하지
않는다. 각 provider·지원 version에서 preview, permission, failure, rollback과 clean integration
fixture를 통과해야 지원으로 표시한다.

## Enterprise·Self-hosted

- public SaaS URL, API version, action runner와 marketplace를 그대로 사용할 수 있다고 가정하지 않는다.
- enterprise host의 CA, proxy, SSO, network allowlist, API base URL과 supported feature/version을
  project owner가 제공한다.
- TLS 검증을 끄거나 credential helper를 우회해 연결하지 않는다.
- runner가 self-hosted이면 workspace cleanup, secret isolation, egress와 artifact retention을 별도
  검증한다.
- SaaS와 self-hosted 간 source·artifact mirror는 data classification과 residency 승인을 요구한다.
- provider admin token, organization owner credential과 signing key를 AI session에 제공하지 않는다.

## 인증과 비밀

- SSH key, PAT, OAuth token, app private key와 deploy key 값을 repository, profile, prompt,
  HANDOFF와 `.env*` 예시에 기록하지 않는다.
- Profile에는 credential 값 대신 인증 방식, owner, 최소 scope, secret reference ID와 만료 정책만
  기록한다.
- read, push, PR/MR, branch policy, release와 admin 권한을 분리한다.
- 일반 code push 승인은 branch protection·release·webhook 변경 권한으로 확대되지 않는다.
- GUI·CLI는 OS credential store나 승인된 provider login을 사용할 수 있지만 token 값을 읽어
  표시하거나 log에 남기지 않는다.

## 이름과 생성 규칙

- organization/group/workspace와 repository 이름은 사용자 또는 owner가 확정한다.
- project folder, package name, product display name에서 remote 이름을 자동 생성하지 않는다.
- provider naming rule과 namespace collision을 생성 전 read-only로 검사한다.
- repository 생성은 visibility, owner, default branch, deletion/transfer protection과 rollback을
  preview한 뒤 별도 승인한다.
- 기존 remote URL 변경, repository rename·transfer와 visibility 변경은 migration·redirect·CI·
  deploy·package 영향이 있으므로 일반 설정 변경으로 처리하지 않는다.

## GUI·CLI 질문

REQ-047 GUI는 다음 순서로 표시한다.

1. 이미 연결된 Git remote가 있으면 credential을 제외한 host·namespace·repository 후보를 보여준다.
2. `회사/팀 저장소`, `개인 저장소`, `직접 입력`, `아직 연결하지 않음`을 선택할 수 있게 한다.
3. Provider를 선택하면 해당 provider adapter가 지원되는 기능과 미지원 기능을 구분한다.
4. **프로젝트에 적용**은 local 파일만 처리하고 remote 생성·push·PR/MR·release는 자동 실행하지 않는다.
5. 외부 변경은 정확한 provider, namespace, repository, branch와 작업을 다시 preview하고 승인받는다.

Terminal 사용자는 같은 profile과 provider adapter를 사용한다. GUI가 URL을 추정하고 CLI가
`origin`을 기본값으로 사용하는 식으로 결과가 달라지면 안 된다.

## 검증 기준

- GitHub personal·organization, GitHub Enterprise custom host
- GitLab.com group/subgroup, self-managed GitLab custom host
- provider 미지정·generic Git remote
- `origin`이 없거나 canonical remote 이름이 다른 저장소
- fork의 upstream/fork remote와 multi-remote
- fetch URL과 push URL이 다른 경우
- detached HEAD, default branch 이름 차이와 remote divergence
- URL credential redaction과 `.env*` 비접근
- provider adapter 미지원 기능의 fail-closed
- remote 생성·push·PR/MR·policy·release 미승인 차단
- 개인·팀·고위험 profile별 branch strategy·승인 역할·self-review·emergency rule 검증
- 승인 인원은 충족하지만 필수 security/release owner가 빠진 false approval 차단
- GUI·CLI profile과 preview 결과 parity

Bitbucket과 Azure DevOps는 schema에서 표현할 수 있어야 하지만 실제 provider API fixture와 pilot 전에는
지원 완료로 표시하지 않는다.

## 완료 판정

Provider-neutral profile schema·validator, Git core와 최소 GitHub·GitLab adapter fixture를 구현하고
각 provider의 personal/organization 또는 group·enterprise/self-hosted 경계, 권한 차단과 rollback을
검증해야 공통 구현 완료로 표시한다. 문서에서 provider 이름을 열거한 것만으로 해당 provider 지원을
주장하지 않는다.

2026-07-18 provider-neutral hosting·branch/review·CI·artifact·deployment schema와 GitHub·GitLab·
generic Git·none synthetic adapter fixture를 구현했다. 이는 field mapping과 fail-closed 권한 경계를
검증한 `SYNTHETIC_CONTRACT_ONLY` 결과이며 실제 provider API, credential, push·PR/MR·policy·release
변경 지원을 뜻하지 않는다.
