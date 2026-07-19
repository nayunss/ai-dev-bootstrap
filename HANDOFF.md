# Handoff

갱신: 2026-07-19 Asia/Seoul
상태: v0.2.9-pilot prerelease 발행·게시 asset 재다운로드 검증 완료
Git 기준: 현재 작업 상태는 로컬 Git이 단일 진실 원천이며 `git status --short --branch`와 `git rev-parse HEAD`로 확인한다. 원격 동기화 상태는 `git fetch` 후 remote-tracking reference와 대조한다.
완료 작업: release:v0.2.3-pilot, release:v0.2.4-pilot, release:v0.2.5-pilot, release:v0.2.6-pilot, release:v0.2.7-pilot, release:v0.2.8-pilot, release:v0.2.9-pilot, handoff-currentness, handoff-review, workspace-main-sync, REQ-043-review, REQ-043-archive-preview, REQ-043-runtime-design, REQ-043-synthetic-pilot, REQ-043-project-pilot, REQ-043-ci-conditional, REQ-043-required-checks, REQ-042-adapter-manager, REQ-041-bounded-patch-pilot, REQ-040-production-evidence-gate, pilot-result-aggregation, REQ-042-core-materializer, REQ-042-github-copilot-adapter, REQ-041-offline-trial-gate, project-decision-onboarding, design-baseline-audit, REQ-042-yaml-lock-schema, downstream-security-installer, stack-dependency-bootstrap, release-upgrade-rollback-automation, requirement-traceability-automation, requirements-doc-reference-audit, REQ-025-capability-suite, REQ-009-014-stack-quality-adapters, REQ-037-039-multi-tool-eval, REQ-044-fastapi-contract-adapter, REQ-045-fullstack-materializer, requirement-handoff-task-reconciliation, handoff-workflow-rule-sync, full-requirement-traceability, downstream-feedback-triage-automation, REQ-020-021-project-profile-materializer, REQ-033-035-provider-profile-adapters, REQ-048-development-profile-schema, REQ-049-policy-evidence-validator, REQ-050-repository-state-invariants, REQ-051-delivery-evidence-states, REQ-052-fullstack-locale-contract, REQ-026-045-stack-profile-fixtures, REQ-005-008-skill-distribution, REQ-047-one-click-adoption, REQ-047-web-adoption-actions-p0, REQ-047-web-adoption-p0-pilot, REQ-047-github-app-web-portal, REQ-024-026-047-ai-tool-adoption-prompt, REQ-047-portal-only-surface, REQ-024-047-048-documentation-consolidation
다음 작업: REQ-047-github-app-web-portal-production-pilot, REQ-040-owner-evidence, REQ-046, REQ-041-live-trial-release, REQ-042-release-core-adoption, UF-001-013-downstream-revalidation

## 목표

Codex, Claude Code 등 서로 다른 AI 도구에서 재사용할 수 있는 안전한 AI 개발환경 공통 하네스를
설계하고 downstream pilot으로 검증한다. REQ-001–REQ-046 설계 명세는
`DESIGN-BASELINE-2026-07-17` 감사로 완료됐고 실제 공통 환경 구현 단계로 전환한다. 구현·검증 상태는
`docs/requirements.md`의 추적 표를 기준으로 하며 설계 완료를 실제 지원 완료로 해석하지 않는다.
REQ-047–REQ-052는 baseline 이후 승인된 추가 요구사항이며 별도 구현·검증 상태로 추적한다.

## 완료

- 공통 engineering·security·Human-in-the-loop 정책, AI adapter, bootstrap·downstream validator와
  CodeSight·HANDOFF·dependency·security gate를 구현했다.
- Next.js frontend pilot과 Spring Boot·PostgreSQL·Next.js full-stack pilot에서 quality·security·CI,
  Preview·Production 격리, rollback과 API contract를 검증했다. 지원 완료 범위는 이 두 pilot 조합에
  한정하며 다른 stack을 검증 완료로 해석하지 않는다.
- REQ-040의 BOLA, 단일-instance rate limit, log redaction·correlation, 격리 logical restore와
  readiness onboarding·기존 project retrofit을 검증했다. 다중-instance limiter, Production provider
  restore와 실제 법률·retention 결정은 계속 차단한다.
- REQ-044의 Spring MVC operation→OpenAPI 누락 탐지와 Next.js BFF method·path contract fixture를
  검증했다. Spring Boot + Next.js 외 stack adapter는 미검증이다.
- REQ-045의 재귀 application inventory·preview·drift 검사를 구현하고 `../env-be` remediation과 공통
  gate를 완료했다. 기존 downstream은 자동 수정하지 않고 명시적 preview·승인 후 적용한다.
- `v0.2.3-pilot`을 merge commit `74dd20b8be4e67b6153f6d05651fd1569711e1d3`에 발행했다. archive
  SHA-256 `430138a58a2dc47b2c7b615b4c4511e8c0c161c4af30cc017e5d5bf6ae382083`과 게시 asset
  재다운로드를 검증했다. 이전 validator lint 수정도 이 release 범위에 포함됐다.
- release 증적 PR #2와 HANDOFF 현행화 gate PR #3이 원격 `main`에 병합됐다. PR #3 merge commit은
  `eee77499c85a2085bc7f70f37b2d5080513250ad`다.
- 실제 프로젝트 경로를 원격 `main`으로 fast-forward해 PR #1~#3 변경을 동기화했다. 사용자 JPEG는
  untracked 상태로 보존했다.
- 오래된 branch·working tree·다음 release 표현과 완료된 REQ-045 remediation 모순을 제거하고,
  HANDOFF를 현재 재개에 필요한 상태 중심으로 정리했다. 세부 이력은 requirements·release note와
  Git 기록을 기준으로 한다.
- REQ-043의 ORT·ScanCode·SCANOSS·FOSSLight 후보를 공식 자료로 1차 심사했다. local ScanCode를 license
  detector 우선 후보로 정하고 SCANOSS는 외부 fingerprint 전송·비공개 production 비용 때문에 기본
  후보에서 제외했다. 만료 가능한 exact finding suppression schema와 fail-closed 비용·outage 계약을
  문서화했다.
- ScanCode `32.5.0` Linux Python 3.12 release archive의 공식 SHA-256을 검증하고 117개 bundled artifact와
  `.ABOUT`, archive path·link·permission과 configure network fallback·clean 경로를 정적으로 심사했다.
  Apple Silicon에서는 실행하지 않고 Linux x86_64 disposable runner의 network-none synthetic
  cold/warm fixture, 자원 상한·중단·rollback 계약을 작성했다. 설치·configure·scan은 승인 대기다.
- ScanCode CLI가 기본적으로 PyPI version endpoint를 조회하고 cache를 기록함을 정적 source 검사로
  확인해 `--no-check-version`을 필수 hard gate로 추가했다. SCANOSS는 기본 후보에서 제외했다.
- Docker 대신 설치된 Podman `5.8.x`를 격리 runner로 설계했다. Linux amd64 Python
  `3.12.11-slim-bookworm` manifest digest를 고정하고 network-none·read-only·capability 제거 조건을
  작성했으나 image pull과 container 실행은 별도 승인 전 수행하지 않았다.
- 승인 후 고정 digest image를 pull하고 network-none Podman synthetic pilot을 실행했다. archive와
  bundled Python dependency configure는 완료했지만 ScanCode CLI가 base image에 없는 `libgomp.so.1`을
  요구해 종료됐다. OS package나 다른 image를 임의 도입하지 않고 `BLOCKED`로 판정했다.
- package 설치 없는 보완 후보로 공식 Python `3.12.11-bookworm` Linux amd64 manifest digest를
  preview했다. pull과 `libgomp.so.1` probe·pilot 재실행은 별도 승인 대기다.
- 승인된 bookworm digest에서 `libgomp.so.1`을 확인하고 새 volume로 synthetic pilot을 재실행했다.
  cold 146초, warm 각 34초, Apache-2.0·MIT 탐지, error·warning·version cache 0과 정규화 결과 동일을
  확인했다. 실제 project source는 제공하지 않았고 synthetic 보안 pilot 판정은 PASS다.
- Git tracked 111-file clean archive만 별도 volume에 제공해 read-only project pilot을 완료했다. exit 0,
  232초, error·warning·version cache 0이었다. 5개 정책·metadata 파일의 license 표현식은 source snippet
  match가 아니므로 자동 suppress하지 않고 `MANUAL_REVIEW`로 남겼다.
- 조건부 승인에 따라 고정 ScanCode archive·Python image와 Ubuntu 24.04 기본 Podman 4.9.3을 사용하는
  독립 CI job을 구현했다. review-only allowlist 밖 finding, scanner warning·empty result·version drift는
  fail-closed하고 raw license-text 대신 sanitized summary만 14일 보존한다.
- 커밋 예정 114-file CI preview에서 evaluator fixture의 실제 license 문자열이 source finding으로
  차단되는 negative를 재현했다. suppression 없이 중립 fixture로 수정한 뒤 전체 재검사에서
  113 non-empty file, 233초, review-only 5·source finding 0으로 PASS했다.
- PR #4 hosted Security run `29552220688`에서 `security`와 `license-provenance`가 PASS했다. hosted
  scanner는 113 files·error 0·review-only 5·source 0이었고 sanitized artifact ID `8396167730`은
  `summary.json`만 포함해 2026-07-31까지 정확히 14일 보존된다.
- PR #4 병합 후 main run `29552778527`도 두 job이 PASS했다. 사람 검토 후 `main` branch protection에
  `security`와 `license-provenance`를 strict required checks로 지정하고 관리자에게도 적용했다.
- REQ-042 Codex·Claude Code 선택형 adapter manager를 구현했다. 기본 preview, 선택 adapter만 적용,
  `--approve` 승인 경계, generator/source/target SHA-256 lock, downstream drift 차단과 생성 전 존재한
  파일·사용자가 변경한 파일을 보존하는 uninstall 계약을 임시 fixture에서 검증했다.
- REQ-041 synthetic review skill에 단일 `add` patch를 적용하는 reference pilot을 구현했다. 고정 hash,
  edit·token budget, selection strict improvement, 비상쇄 hard gate, locked test·candidate-bound 승인
  순서와 tie·injection·grader tamper·test leakage 거절을 외부 model·network 없이 검증했다.
- REQ-040 readiness schema v2를 구현했다. 법률·retention reviewer evidence, 2개 이상 instance의 분산
  rate-limit bypass PASS, provider backup의 별도 장애 경계 restore RPO/RTO·무결성 PASS와 별도 사람
  Production 승인 증적이 모두 없으면 `--expect-ready`를 fail-closed한다.
- REQ-046 준비 범위로 campaign/result JSON schema, 독립성·증거 validator와 전원 PASS aggregator를
  구현했다. synthetic tester 2명의 결과는 `SYNTHETIC_COMPLETE`로 재현했지만 실제 지원 결정 자격은
  false로 유지한다.
- REQ-042 release manifest 기반 공통 core reference materializer와 GitHub Copilot 선택 adapter를
  구현했다. preview·명시 승인, manifest/source/target hash drift, 기존 파일 충돌의 atomic 차단과
  변경된 adapter 보존 uninstall을 OS 임시 fixture에서 검증했다.
- REQ-041 실제 호출 전 offline trial-plan gate를 구현했다. exact model·harness·adapter, 반복 seed,
  token·비용·timeout, network·credential·고객 데이터 차단과 held-out test 비노출을 검증하며 실제
  model 호출이나 release 승인은 수행하지 않았다.
- REQ-040·041·042의 프로젝트별 값을 공통 하네스에 고정하지 않고 초기 설정과 기존 project retrofit에서
  질문하는 onboarding materializer를 구현했다. 세 blocked template 중 기존 파일은 보존하고 누락된
  파일만 생성하며 `TBD`·`pending`은 어떤 실행 승인도 뜻하지 않는다.
- REQ-001–REQ-046의 requirement·architecture·workflow·project profile·HITL·Eval 경계를 감사해
  `DESIGN-BASELINE-2026-07-17` 설계 명세 완료로 판정했다. 실제 구현·지원·실제 환경 검증은 별도
  상태로 유지하고 첫 구현 increment를 canonical YAML lock으로 확정했다.
- REQ-042 실제 구현 첫 increment로 canonical YAML upstream lock schema·결정론적 parser/serializer·
  target validator, 기존 JSON reference migration과 명시적 inventory 기반 release manifest generator를
  구현했다. core materializer와 downstream validator는 YAML lock과 target hash drift를 fail-closed한다.
- REQ-026·033 actual implementation으로 Gitleaks·Opengrep 승인 artifact의 downstream project-local
  offline installer를 구현했다. preview는 exact URL/version/checksum을 공개하고 apply/uninstall은
  `--approve`, checksum·collision·lock drift와 생성 소유권을 fail-closed한다.
- REQ-026·033 stack별 dependency bootstrap 계약을 npm·pnpm root 제한에서 application별
  npm·pnpm·Yarn·Maven·Gradle·Python으로 확장했다. exact adapter version·manifest·lockfile, 고정 argv,
  offline/network 승인 분리, output 충돌·ownership drift와 변경 output 보존 uninstall을 synthetic
  clean fixture로 검증했다.
- downstream security installer는 PR #11, stack별 dependency bootstrap은 PR #12로 required
  `security`·`license-provenance` checks를 통과해 `main`에 병합됐다.
- REQ-042 release upgrade reference automation을 구현했다. 이전·다음 manifest union diff, 승인 apply,
  transaction failure 원복, rollback record 무결성·소유권 보존 복구와 명시 finalize를 실제 downstream
  write 없이 OS 임시 fixture에서 검증했다.
- `v0.2.4-pilot`을 merge commit `d6141ea6ccd7d9ac7a7a40df1bdc2b9d8a1c424d`에 prerelease로
  발행했다. tracked archive SHA-256
  `fa9b369444f4408eb04944a20ed25d12c79edbb68def5025c98da0ce72cba723`과 게시 asset 재다운로드를
  검증했다.
- REQ-019–REQ-024의 normative source·구현·검증·token-profile 영향과 외부 gate를 machine-readable
  manifest로 연결했다. requirements 변경에 manifest 동기화가 없거나 evidence 경로·ID·token 영향이
  drift하면 staged·PR gate가 실패한다.
- `docs/`의 설계·운영 문서 36개를 요구사항 묶음에 역참조하고 schema 3개·template 5개를 문서
  index에 추가했다. 요구사항 상태는 구현과 검증을 분리해 synthetic·reference·pilot PASS가 실제
  downstream 검증으로 오해되지 않게 현행화했다.
- REQ-025 공통 deterministic capability task schema·trial별 임시 fixture runner와
  비용·latency·tool-call·diff aggregator를 구현했다. 저장소 내부 Node grader만 허용하고
  network·token·비용은 0으로 고정했으며 실제 model trial은 수행하지 않았다.
- REQ-009–REQ-014 JavaScript·Java·Python formatter·linter·typecheck와 web accessibility adapter 계약을
  구현했다. project-local exact tool/version·application cwd·check-only source 보존을 강제하고,
  외부 sandbox의 network-none 증거가 없으면 실행을 차단한다.
- REQ-037–REQ-039 세 AI adapter의 공통 policy·role·permission parity manifest와 validator를 구현했다.
  Codex·Claude Code hook outcome과 GitHub Copilot fallback을 구분하고 source·materialized target에서
  동일한 공통 계약과 권한 비확대를 검증한다.
- REQ-044 FastAPI/OpenAPI syntax·breaking component/operation/response/required-parameter drift,
  implementation route inventory와 Production docs exposure synthetic adapter를 구현했다.
- REQ-045 최초 frontend·backend·shared·paired migration artifact 일괄 materializer와 transaction
  부분 실패 원복·보존 rollback을 구현했다. DB SQL은 실행하지 않고 `NOT-RUN`으로 유지한다.
- 위 공통 구현 묶음의 요구사항 추적 표·설계 감사·운영 및 Eval 문서를 구현 증거와 일치하도록
  현행화했다. reference·synthetic PASS와 실제 downstream·model·DB 검증 상태는 계속 분리한다.
- 위 변경을 `v0.2.5-pilot` 후보로 묶고 package·lock root version `0.2.5`, 만료가 있는 lock metadata
  승인과 migration·rollback release note를 준비했다. 준비 단계에서는 tag·archive checksum·게시
  재검증 전 상태를 `발행 완료`로 해석하지 않았다.
- PR #16 required checks를 통과한 merge commit `d0a3a6d31c4cbf883708335ff0f9bab121c5f2f0`에
  `v0.2.5-pilot` prerelease를 발행했다. tracked archive와 게시 asset 재다운로드 SHA-256
  `84d27ae9607f1fdc7fd6b662382f3ba50b9c73482cc191c10a9695c78f2a9757`이 일치한다.
- REQ-047로 terminal 비숙련자를 위한 one-button 적용 UX와 web·CLI 공통 headless adoption core,
  checksum·preview·transaction rollback과 release별 bundle 자동 갱신 계약을 검토했다. 이후 공통
  headless core와 deterministic release fixture를 구현했고 GitHub 저장소의 기본 비개발자 경로를
  GitHub App Web Portal로 확정했다.
- 2026-07-17 현재 최신 공식 공개본인 GitHub의 2026년 2월 Octoverse 2025 분석, Stack Overflow
  Developer Survey 2025와 State of JavaScript 2025를 근거로 frontend·backend·full-stack adapter
  P0~P3 순서를 확정했다. P0는 React+Vite, Node+Express, Next.js와 분리 React+Node full-stack이며
  실제 project stack을 자동 교체하는 기본값으로 사용하지 않는다.
- backend 우선순위를 framework만이 아니라 primary DB·driver/ORM·migration·test isolation·restore
  계약까지 포함하도록 보완했다. PostgreSQL은 P0, MySQL·SQLite·SQL Server는 P1, MongoDB는 P2이며
  Redis는 primary DB가 아닌 cache·rate-limit·queue 보조 profile로 분리한다.
- 개인·팀·프로젝트 설정 경계를 표로 확정했다. 결과·보안·CI·배포·재현성에 영향을 주는 설정은
  팀/project 필수, IDE·UI와 AI 도구 선택은 개인 선택으로 분리하고 plugin·MCP·실행형 자산은 개인
  선택이어도 사전 심사를 요구한다. 사용자 전역 설정 강제 변경과 개인 override의 gate 약화는 금지한다.
- Skill·plugin 배포를 core·optional·organization/private·personal skill, generated tool adapter,
  plugin·hook과 MCP 계층으로 분리했다. Core는 최소 Markdown 계약, optional은 선택 archive로
  project-local materialize하고 plugin catalog 등재와 실제 설치 승인, MCP 승인을 각각 분리한다.
- GitHub organization·repository 이름을 공통값으로 정하지 않고 GitHub 개인·조직·Enterprise,
  GitLab.com·self-managed와 기타 host를 provider-neutral hosting profile로 질문하도록 확정했다.
  `origin`은 local alias, remote-tracking reference는 마지막 fetch 결과이며 PR/MR·policy·pipeline·
  release는 provider adapter별 독립 검증과 외부 변경 승인을 요구한다.
- Branch 전략과 review 승인 인원도 project별 질문 값으로 확정했다. 개인 project의 일반 변경
  self-review를 허용할 수 있지만 검토 생략으로 취급하지 않으며 dependency·security·release·
  Production·DB·파괴적 변경은 독립 reviewer/역할과 별도 고위험 승인을 우선한다.
- CI provider, artifact 저장소와 배포 대상도 Git host와 분리된 project별 profile로 확정했다.
  GitHub remote가 GitHub Actions·Vercel 선택을 뜻하지 않으며 GitLab CI·Azure Pipelines·Jenkins·
  self-hosted와 cloud/Kubernetes 또는 deployment `none`을 표현하고 provider별 fixture로 검증한다.
- `monorepo` 저장소 구조와 `project template` 생성·도입 방식을 분리했다. 단일 project starter와
  기존 repository retrofit은 P0, native workspace monorepo는 P1, 전문 orchestrator와 조직 golden
  template은 P2로 확정했다. JavaScript·TypeScript monorepo adapter 순서는 2026-07-17 현재 최신
  State of JS 2025 응답을 근거로 pnpm workspace, npm Workspaces, Turborepo, Nx, Yarn Workspaces
  순이며 project 조건 없이 monorepo나 JavaScript 도구를 강제하지 않는다.
- REQ-048로 canonical YAML 개발환경 profile, JSON Schema 구조 검증과 의미·repository drift·단계별
  readiness validator의 구현 범위를 확정했다. 최근 stack·설정·Skill·Git hosting·branch/review·
  CI/deployment·저장소 구조·원클릭 도입 검토 상세는 주제별 문서로 분리하고 requirements에는
  승인된 불변 조건과 링크만 유지한다. Schema·validator·migration·fixture 구현은 아직 NOT-RUN이다.
- 오늘 승인한 9개 횡단 검토를 관련 REQ의 기존 구현과 다시 대조했다. 기존 adapter·GitHub pilot·
  full-stack materializer의 PASS를 새 provider-neutral profile·starter matrix·배포 bundle 검증으로
  확대하지 않고 주제별 구현·검증 상태와 공통 구현 task 6개로 분리했다.
- `env-be/docs/upstream-feedback.md`의 UF-001–UF-013을 project·stack 고유 세부와 분리해 공통 원인
  4개로 중복 제거했다. UF-001–UF-006·UF-011은 REQ-049, UF-007–UF-008은 REQ-050,
  UF-009–UF-010은 REQ-051, UF-012는 REQ-052, UF-013은 기존 REQ-046 보강으로 primary mapping했다.
  이는 설계 승인과 task 분류이며 validator·fixture와 새 release 기준 실제 downstream 재검증은
  모두 NOT-RUN이다.
- 다음 세션을 위해 requirements–HANDOFF task 교차 검증, 전체 REQ 추적성, downstream feedback
  triage 자동화와 HANDOFF workflow 규칙 보강 필요성을 확인했다. 이는 개선 후보를 식별한 것이며
  규칙·schema·validator·fixture와 실제 skill은 아직 구현하지 않았다.
- 남은 작업을 보안·정합성·선행 의존성과 실제 환경 대기 조건 순으로 재정렬하고, 위 feedback
  baseline을 package·lock root version `0.2.7`과 `v0.2.7-pilot` migration·rollback release note로
  묶었다. Release 게시가 REQ-049–REQ-052 구현이나 UF 해결을 의미하지 않는다.
- PR #20 required checks를 통과한 merge commit `bc601e9d0d564d84d7719934d01655dd642ce245`에
  `v0.2.7-pilot` prerelease를 발행했다. Tracked archive, GitHub asset digest와 재다운로드 SHA-256
  `090d70f54bb7e5b19fdfee8833bd5a7b68c199065e6aeaea99e3f839f50db9fa`가 일치한다.
- 위 설계·상태 추적 변경을 `v0.2.6-pilot` 후보로 묶고 package·lock root version `0.2.6`,
  migration·rollback release note를 준비했다. Profile schema·provider adapter·starter fixture는
  구현되지 않았으므로 tag·release 게시 후에도 `NOT-RUN` 상태를 유지한다.
- PR #18 required checks를 통과한 merge commit `1096dc6894978bd998a70ea65182ae08ced5083c`에
  `v0.2.6-pilot` prerelease를 발행했다. tracked archive와 GitHub asset digest·재다운로드 SHA-256
  `f731f6b97ff66fc0b0aa7d089319e8a9866bc2145cf7c2fe92e6f83fb7bbdcc9`이 일치한다.

## 현재 상태

- 이 파일과 모든 프로젝트 변경은 현재 repository root에서 관리한다. 개인 컴퓨터의 절대 경로는
  tracked 문서·manifest·cache에 기록하지 않는다.
- 로컬 branch·HEAD는 상단 명령으로 확인한다. 원격 상태가 필요한 작업만 fetch 후 remote-tracking
  reference와 대조하며 fetch 전 `origin/*`을 최신 원격 상태로 간주하지 않는다.
- remote: `git@github.com:nayunss/ai-dev-bootstrap.git`
- 최신 발행 baseline은 `v0.2.9-pilot`이며 발행·checksum 증적은
  `docs/releases/v0.2.9-pilot.md`에 기록돼 있다.
- `KakaoTalk_Photo_2026-07-12-11-38-40.jpeg`는 사용자가 Git에 올리지 않는 로컬 파일이다. 수정·이동·
  삭제·stage하지 않고 untracked 상태로 보존한다.
- `/private/tmp` 등 별도 격리 저장소에서 프로젝트 변경을 만들거나 그 상태를 실제 작업 경로의
  상태로 보고하지 않는다.
- `../env-downstream`과 `../env-be`는 독립 Git 저장소다. upstream 변경은 자동 반영되지 않으며
  release·commit·checksum 고정, diff·호환성·보안 검토와 사람 승인 후 명시적으로 upgrade한다.
- upstream local Git hook은 dependency·환경 승인이 끝나지 않아 `pending-environment-definition`이다.
  GitHub Actions와 명시적 security-check가 현재 적용된 gate다.

## 주요 결정

- `.ai/`가 공통 정책의 단일 진실 원천이고 도구별 파일은 얇은 adapter다.
- 실제 source와 Git 상태가 HANDOFF보다 우선한다. HANDOFF는 세션 요약이며 requirements·ADR·release
  note·Git 기록을 복제하거나 대체하지 않는다.
- token-aware와 full profile 모두 보안, 사용자 승인, 관련 테스트와 handoff를 생략하지 않는다.
- production credential, destructive action, dependency·provider 변경과 외부 write는 정확한 대상과
  rollback에 대한 사람 승인을 요구한다.
- downstream은 upstream을 symlink·submodule·실시간 참조하지 않고 승인된 release를 고정 적용한다.
- pilot PASS는 해당 stack·환경의 증거이며 모든 stack이나 Production readiness 완료를 뜻하지 않는다.
- 실제 프로젝트의 기존 사용자 파일과 변경을 보존하며 Git stage는 대상 파일을 명시해서 수행한다.
- 선택 adapter 적용 증적은 `.ai/manifests/adapters.lock.json`이며 release-level canonical
  `.ai/manifests/upstream.lock.yaml`을 대신하지 않는다. 기존 JSON reference lock은 승인된 release
  manifest와 모든 고정 값이 일치할 때만 YAML로 migration한다.
- 현재 공통 저장소에는 실제 서비스의 법률·retention·provider restore 증적이 없다. synthetic gate
  PASS를 실제 Production 승인으로 해석하지 않으며 downstream profile은 owner가 직접 작성한다.

## 변경 파일

- `HANDOFF.md`: 실제 프로젝트 동기화, 작업 위치·JPEG 보존과 REQ-043 심사 결과 현행화
- `docs/ai-generated-code-license-provenance.md`: scanner 후보 공급망·전송·비용 심사와 suppression 계약
- `docs/requirements.md`: REQ-043을 부분 검증으로 갱신
- `.github/workflows/security.yml`, `scripts/scancode-license-gate`: 고정 artifact·image와 Podman을 사용하는
  network-none 조건부 ScanCode CI job
- `scripts/evaluate-scancode-report.mjs`, `scripts/test-scancode-report-evaluator.mjs`, `package.json`:
  review-only allowlist와 source·unclassified fail-closed evaluator·regression
- `scripts/validate-dependency-upgrades.mjs`, `scripts/test-dependency-upgrade-validator.mjs`: 만료된 역사
  승인은 보존하되 새 dependency 변경 승인에는 재사용하지 않는 회귀 보정
- `.codesight/CODESIGHT.md`, `.codesight/cicd.md`: 새 CI job을 반영한 generated context
- `.ai/workflows/handoff.md`, `docs/requirements.md`, `scripts/validate-handoff.mjs`,
  `scripts/test-handoff-validator.mjs`: 원격 PR #3에서 병합된 HANDOFF 현행화 계약
- `docs/README.md`, `docs/releases/v0.2.3-pilot.md`: 원격 PR #2에서 병합된 release 증적
- `adapters/codex/`, `adapters/claude-code/`: 선택적으로 materialize할 Codex·Claude Code 파일 source
- `scripts/manage-adapters.mjs`, `scripts/test-adapter-manager.mjs`: preview·승인 apply, hash drift,
  기존·변경 파일 보존 uninstall과 결정론적 Eval
- `scripts/bootstrap`, `scripts/validate-downstream.mjs`, `scripts/test-downstream-validator.mjs`:
  adapter 명령 진입점과 lock 존재 시 downstream drift gate
- `.github/workflows/security.yml`, `package.json`: adapter Eval의 hosted security job 실행
- `docs/upstream-downstream-architecture.md`, `docs/requirements.md`: 구현 범위와 REQ-042 상태 현행화
- `evals/{tasks,fixtures,graders,baselines}/skill-evolution*`: REQ-041 synthetic task, 보호
  fixture, 고정 selection record와 sanitized 결과·거절 buffer
- `scripts/evaluate-skill-evolution.mjs`, `scripts/test-skill-evolution.mjs`: bounded atomic patch,
  hash·budget·split·hard gate·승인 순서 evaluator와 positive/negative regression
- `docs/evaluation-strategy.md`, `evals/README.md`, `docs/requirements.md`: REQ-041 pilot 범위·한계 현행화
- `docs/templates/production-readiness.json`, `scripts/validate-production-readiness.mjs`: schema v2
  법률·retention·multi-instance limiter·provider restore·사람 승인 hard gate
- `scripts/test-production-readiness.mjs`, `scripts/test-readiness-materialization.mjs`,
  `scripts/test-downstream-validator.mjs`: ready/blocked·위조·RPO/RTO·retrofit·구버전 negative regression
- `.ai/workflows/production-readiness.md`, `docs/web-service-production-readiness.md`,
  `docs/requirements.md`, `scripts/bootstrap`: Production evidence·migration·실행 계약 현행화
- `docs/schemas/distributed-pilot-result.schema.json`,
  `docs/templates/distributed-pilot-campaign.json`: REQ-046 machine-readable 제출·모집단 계약
- `scripts/pilot-results.mjs`, `scripts/validate-pilot-result.mjs`,
  `scripts/aggregate-pilot-results.mjs`, `scripts/test-pilot-results.mjs`: 결과 검증·취합과 synthetic regression
- `evals/fixtures/distributed-pilot/`, `evals/baselines/distributed-pilot-synthetic-aggregate.json`:
  2-tester synthetic 입력과 고정 `SYNTHETIC_COMPLETE` 증적
- `scripts/materialize-core.mjs`, `scripts/test-core-materializer.mjs`: release manifest·file hash 기반
  core preview·승인 apply·lock·collision/source/target drift reference Eval
- `adapters/github-copilot/`, `scripts/manage-adapters.mjs`, `scripts/test-adapter-manager.mjs`:
  GitHub Copilot 선택 adapter와 preview·hash·보존 uninstall Eval 확장
- `evals/fixtures/skill-evolution/trial-plan.offline.json`,
  `scripts/validate-skill-evolution-trial.mjs`, `scripts/test-skill-evolution-trial.mjs`: 실제 호출 전
  non-network trial plan과 live release 승인 차단 Eval
- `docs/templates/skill-evolution-trial.json`, `docs/templates/upstream-adoption.json`,
  `scripts/materialize-project-onboarding.mjs`, `scripts/test-project-onboarding.mjs`: project별
  REQ-040·041·042 질문 template과 초기/retrofit 보존 Eval
- `docs/design-completion-audit.md`, `README.md`, `docs/README.md`, `docs/requirements.md`: 설계 명세
  baseline 완료, 실제 구현·지원 검증 분리와 감사 finding
- `docs/schemas/upstream-lock.schema.json`, `scripts/upstream-lock.mjs`,
  `scripts/{generate-release-manifest,migrate-upstream-lock,validate-upstream-lock}.mjs`: canonical YAML
  lock·migration·manifest 생성·target 검증
- `scripts/materialize-core.mjs`, `scripts/test-upstream-lock.mjs`,
  `scripts/test-core-materializer.mjs`, `scripts/validate-downstream.mjs`: YAML lock materialization과
  deterministic·unsafe inventory·manifest mismatch·target drift regression
- `.ai/manifests/security-tool-assets.json`, `scripts/manage-security-tools.mjs`,
  `scripts/test-security-tool-manager.mjs`: reviewed catalog 연결, offline artifact install·lock·보존 제거
- `docs/schemas/dependency-bootstrap.schema.json`, `docs/templates/dependency-bootstrap.json`,
  `scripts/manage-dependencies.mjs`, `scripts/test-dependency-bootstrap.mjs`: application별 6종 dependency
  adapter 계약, exact version·고정 argv·clean install·lock drift·보존 uninstall
- `scripts/bootstrap`, `scripts/validate-downstream.mjs`, `scripts/test-downstream-validator.mjs`: project
  security tool preview/apply/validate/uninstall 진입점과 lock drift gate
- `scripts/upgrade-core.mjs`, `scripts/validate-core-upgrade-record.mjs`,
  `scripts/test-core-upgrade.mjs`: manifest union migration, atomic transaction restore, rollback/finalize와
  downstream record drift 검증
- `.ai/approvals/dependency-upgrades.json`, `package.json`, `package-lock.json`,
  `docs/releases/v0.2.4-pilot.md`: 0.2.4 release metadata lock 승인과 migration·rollback·artifact 증적 준비
- `.ai/manifests/requirement-traceability.json`, `scripts/validate-requirement-traceability.mjs`,
  `scripts/test-requirement-traceability.mjs`: REQ-001–REQ-052 구현·검증 상태, 공통 구현·외부 task와
  UF-001–UF-013 primary mapping 추적 및 requirements·triage·HANDOFF staged·PR 동기화 gate
- `docs/requirements.md`, `docs/README.md`, `docs/ai-generated-code-license-provenance.md`: 요구사항별
  문서·산출물 역참조, 구현/검증 상태 분리, 누락 schema·template와 REQ-043 문서 상태 현행화
- `docs/schemas/capability-task.schema.json`, `scripts/capability-suite.mjs`,
  `scripts/{run-capability-task,aggregate-capability-results,test-capability-suite}.mjs`: REQ-025
  deterministic task 검증·격리 실행·효율 집계와 regression
- `evals/tasks/deterministic-capability-smoke.json`, `evals/fixtures/capability-suite/`,
  `evals/graders/check-capability-outcome.mjs`: 고정 task·fixture·grader
- `docs/evaluation-strategy.md`, `evals/README.md`, `docs/design-completion-audit.md`,
  `docs/requirements.md`, `docs/README.md`, `package.json`, `.github/workflows/security.yml`:
  실행 계약·상태·CI 연결
- `docs/schemas/stack-quality-adapters.schema.json`, `docs/templates/stack-quality-adapters.json`,
  `scripts/{stack-quality-adapters,run-stack-quality,test-stack-quality-adapters}.mjs`: REQ-009–REQ-014
  품질 adapter profile·preview·승인 실행·regression
- `evals/fixtures/stack-quality/`: JavaScript·Java·Python source와 linter failure 기대 결과
- `.ai/manifests/adapter-parity.json`, `docs/schemas/adapter-parity.schema.json`,
  `scripts/{adapter-parity,validate-adapter-parity,test-adapter-parity}.mjs`: REQ-037–REQ-039 공통
  policy·role·permission과 source/materialized parity Eval
- `adapters/{codex,claude-code,github-copilot}/`, `AGENTS.md`, `CLAUDE.md`: 공통 role·persona·permission
  reference와 native 권한 비확대 명시
- `docs/schemas/fastapi-contract-adapter.schema.json`,
  `scripts/{fastapi-contract-adapter,evaluate-fastapi-contract,test-fastapi-contract-adapter}.mjs`,
  `evals/fixtures/fastapi-contract/`: REQ-044 OpenAPI·route·Production docs reference Eval
- `docs/schemas/fullstack-materializer.schema.json`,
  `scripts/{fullstack-materializer,materialize-fullstack,test-fullstack-materializer}.mjs`,
  `evals/fixtures/fullstack-materializer/`, `scripts/bootstrap`: REQ-045 최초 full-stack transaction·rollback
- `.ai/workflows/handoff.md`, `scripts/validate-handoff.mjs`, `scripts/test-handoff-validator.mjs`: 상단
  다음 작업과 하단 남은 작업의 안정적 ID 일치 및 완료 작업 잔존 차단
- `scripts/validate-requirement-handoff-tasks.mjs`,
  `scripts/test-requirement-handoff-tasks.mjs`: requirements 후속 task와 feedback primary REQ·UF mapping을
  HANDOFF 남은 작업·완료 metadata와 교차 검증하고 staged·PR 동기화를 강제
- `.ai/workflows/downstream-feedback-triage.md`,
  `docs/schemas/downstream-feedback-triage.schema.json`,
  `.ai/manifests/downstream-feedback-triage.json`: project 고유 입력을 복제하지 않는 일반화·중복·
  primary REQ·구현/재검증 task와 고정 release baseline 계약
- `scripts/validate-downstream-feedback-triage.mjs`,
  `scripts/test-downstream-feedback-triage.mjs`: sanitized field·duplicate·task 분리·release hash·
  traceability 및 staged·PR 동기화 positive/negative fixture
- `docs/schemas/policy-evidence.schema.json`, `scripts/validate-policy-evidence.mjs`,
  `scripts/test-policy-evidence.mjs`, `evals/fixtures/policy-evidence/`: REQ-049 claim·owner scope·실제
  service/region/data flow·server enforcement·반증 가능한 evidence와 disposal 차단 reference Eval
- `.ai/workflows/repository-state-invariants.md`,
  `docs/schemas/repository-state-invariants.schema.json`, `scripts/validate-repository-state.mjs`,
  `scripts/test-repository-state-invariants.mjs`: REQ-050 staged blob provenance·partial commit과
  check-only tracked source mutation 실제 Git fixture
- `.ai/workflows/delivery-evidence-states.md`,
  `docs/schemas/delivery-evidence-states.schema.json`, `scripts/validate-delivery-evidence.mjs`,
  `scripts/test-delivery-evidence.mjs`, `evals/fixtures/delivery-evidence/`: REQ-051 provider-neutral
  8단계 상태·evidence·behavior·사람 승인 분리 reference Eval
- `.ai/workflows/fullstack-locale-contract.md`,
  `docs/schemas/fullstack-locale-contract.schema.json`, `scripts/validate-fullstack-locale.mjs`,
  `scripts/test-fullstack-locale.mjs`, `evals/fixtures/fullstack-locale/`: REQ-052 project profile 기반
  frontend·BFF·backend locale·message code·formatting·접근성 adapter matrix
- `docs/schemas/development-environment-profile.schema.json`, `scripts/development-profile.mjs`,
  `scripts/validate-development-environment-profile.mjs`, `evals/fixtures/development-profile/`: REQ-048
  canonical profile 구조·의미·repository·readiness reference validator
- `scripts/materialize-development-profile.mjs`, `scripts/test-development-profile-materializer.mjs`,
  `scripts/bootstrap`, `.ai/workflows/project-environment.md`: REQ-020·021 settings 경계 질문·preview·승인
  initial/retrofit materialization과 기존 profile 충돌 차단
- `docs/schemas/provider-profile-adapters.schema.json`, `scripts/provider-profile-adapters.mjs`,
  `scripts/validate-provider-profile.mjs`, `scripts/test-provider-profile-adapters.mjs`,
  `evals/fixtures/provider-profiles/`: REQ-033·035 provider-neutral Git·review·CI·artifact·deployment
  contract와 GitHub·GitLab·generic/none synthetic adapter

## 검증

- 실제 프로젝트 `4be950e → eee7749` 원격 main fast-forward: PASS
- 사용자 JPEG untracked 보존: PASS
- `v0.2.3-pilot` 원격 release·archive checksum·재다운로드 검증: PASS
- HANDOFF 필수 구조·staged 동반 변경·PR range·semantic-change regression: PASS
- HANDOFF stale 날짜·branch/commit snapshot·완료/다음 작업 ID 중복 negative fixture: PASS
- requirements 후속 task·feedback triage 구현 순서의 HANDOFF 누락, 완료 task 잔존, REQ·UF 범위
  누락·초과 negative fixture: PASS
- 공통 구현 task의 공통 섹션 및 실제 downstream 재검증 task의 외부 대기 섹션 분리 negative
  fixture: PASS
- downstream feedback project/source 누출, duplicate chain·scope drift, task collapse, moving
  release·checksum 누락·false resolution·traceability drift negative fixture: PASS
- feedback triage source만 변경한 staged 상태 차단과 manifest 동반 staged·PR range: PASS
- REQ-049 valid claim graph와 client-only, owner 누락, service/region drift, missing reference·evidence,
  vague/failed evidence, disposal assertion·revocation bound 누락, 만료 승인 negative fixture: PASS
- REQ-049 validator의 `legalConclusion=NOT_EVALUATED`,
  `productionApprovalGranted=false`: PASS
- REQ-050 staged source/artifact hash 일치와 check-only 무변경: PASS
- REQ-050 working-tree source/artifact를 staged provenance로 위조한 partial commit, tracked source
  mutation, unsafe·missing path negative fixture: PASS
- REQ-051 created부터 behavior까지 evidence와 별도 사람 Production approval record: PASS,
  validator decision은 `EVIDENCE_VALID_ONLY`
- REQ-051 push→CI, health→behavior 확대, 선행 단계 누락, ref·시간 drift, behavior negative path와
  human attestation 누락 negative fixture: PASS
- REQ-052 2개 locale의 frontend·BFF·backend code·문서·HTML·formatting·접근성 matrix: PASS,
  `humanLocaleReviewRequired=true`
- REQ-052 frontend-only, BFF locale 누락, backend raw diagnostic, code·HTML·timezone drift와 접근성
  label 누락 negative fixture: PASS
- REQ-048 canonical YAML round-trip, Draft 2020-12 구조 계약과 single frontend·backend·full-stack·
  workspace monorepo의 semantic·repository·local/CI readiness: PASS, read-only source hash 유지
- REQ-048 missing application, unsafe·`.env*`·symlink escape, shell command, exact version, secret field,
  false·expired approval와 Production 별도 gate negative fixture: PASS
- REQ-020·021 settings 5분류, 신규·기존 project 질문과 preview 무변경·승인 생성·동일 profile 보존:
  PASS
- REQ-020·021 기존 profile 충돌 atomic 차단, 팀 security gate 약화·경계 중복 negative fixture: PASS
- REQ-033·035 GitHub·GitLab·generic Git·none hosting/review/CI/artifact/deployment profile: PASS,
  `SYNTHETIC_CONTRACT_ONLY`
- REQ-033·035 adapter/provider mismatch, embedded credential, broad CI permission, required outcome·
  고위험 role·emergency·artifact·Production promotion·none integration negative fixture: PASS
- downstream validator와 production readiness·retrofit fixture: PASS
- CodeSight generate 후 generated diff: 없음
- 변경 파일 Gitleaks·Opengrep: PASS, finding 0
- REQ-043 후보 공식 source·release·network·license·비용 공개 여부 검토: PASS
- 외부 code fingerprint 전송·SCANOSS 호출: NOT-RUN, 기본 후보에서 제외
- ScanCode release archive SHA-256·117 artifact sidecar·path/link/setuid 정적 검사: PASS
- ScanCode 기본 PyPI version check와 `--no-check-version` 차단 조건 정적 검사: PASS
- Podman 가용성·VM architecture와 Linux amd64 base image manifest digest preview: PASS
- 고정 image digest·archive checksum·network-none configure: PASS
- slim image 1차 ScanCode CLI: BLOCKED, base image `libgomp.so.1` 부재
- bookworm 보완 synthetic cold/warm scan·license detection: PASS
- 정규화 warm output equivalence·version-check cache 부재: PASS
- read-only tracked-project pilot confinement·execution: PASS
- project license findings: MANUAL_REVIEW, review-only 5·source finding 0
- ScanCode report evaluator clean·review/source/error/empty regression: PASS
- 기존 project report에 대한 CI evaluator preview: PASS
- local Podman 5.8.2 version drift의 download 전 fail-closed: PASS
- 커밋 예정 114-file network-none CI preview: PASS, source·unclassified finding 0
- 만료 dependency approval의 unrelated-change 허용·matching-change 거부 regression: PASS
- 최종 downstream validation·full security check: PASS
- hosted `license-provenance` job: PASS, run `29552220688`, 1분 23초
- hosted archive checksum·image digest·Podman 4.9.3 gate·network-none scan: PASS
- sanitized artifact raw license text 부재·14일 만료 metadata: PASS
- main branch protection strict required checks `security`·`license-provenance`: PASS
- protection 관리자 적용·force push 차단·branch 삭제 차단: PASS
- Codex·Claude Code adapter source와 현재 root adapter의 byte equality: PASS
- adapter preview 무변경·선택 적용·generator/source/target hash lock Eval: PASS
- 미승인 apply/uninstall 차단·기존 파일 충돌 atomic 차단 Eval: PASS
- 생성 전 동일 파일·적용 후 drift 파일 보존과 관리 파일 제거 uninstall Eval: PASS
- adapter lock을 통한 downstream target drift negative fixture: PASS
- REQ-041 single-add patch exact reproduction·hash·edit/token budget: PASS
- selection 3회 minimum improvement·4개 hard gate와 sanitized selected result: PASS
- tie·security gate·prompt injection·grader tamper·test 조기 노출·test 재학습 negative: PASS
- candidate-bound synthetic approval 뒤 locked-test runner positive: PASS, 실제 release 승인 아님
- readiness schema v2 blocked template·synthetic complete evidence positive: PASS
- 법률 owner/evidence·retention category evidence 누락과 사람 승인 누락 negative: PASS
- single/1-instance limiter·분산 bypass 실패 negative: PASS
- 동일 restore target·무결성 실패·RPO/RTO 초과·schema v1 false approval negative: PASS
- 기존 profile 무덮어쓰기 retrofit과 downstream BLOCKED note·schema consistency gate: PASS
- REQ-046 synthetic tester 2명·독립 workspace/repository/resource·전원 PASS 집계: SYNTHETIC_COMPLETE
- synthetic 결과의 실제 supportDecisionEligible 승격 차단: PASS
- missing·FAIL·NOT-RUN·false PASS·증거 누락·grader tamper·이전 결과 접근 negative: PASS
- duplicate pilot·upstream drift·workspace/resource 재사용 invalid aggregation: PASS
- REQ-040 blocked template의 기계 판독 blocker JSON report: PASS, 실제 owner evidence 없음
- release core preview 무변경·승인 apply·manifest/source/target hash와 기존 파일 충돌 차단: PASS
- GitHub Copilot adapter preview·apply·drift 파일 보존 uninstall: PASS
- REQ-041 offline 3-seed·비용 0·network/credential/customer-data deny·held-out 잠금: PASS
- live trial plan·candidate-bound 사람 승인 없는 release gate: BLOCKED
- 초기 project의 세 blocked decision profile 생성·질문 출력: PASS
- 기존 project의 일부 profile·owner 파일 보존과 누락 profile만 retrofit: PASS
- REQ-001–REQ-046 설계 source·상태·경계·남은 gate coverage audit: PASS
- 설계 명세 완료와 REQ-046 설계 검증 완료 용어 분리: PASS
- canonical YAML round-trip·canonical form·schema/content/file SHA-256: PASS
- JSON reference lock→YAML migration positive와 manifest 불일치·overwrite negative: PASS
- 명시 inventory release manifest 결정론·정렬과 `.env*`·unsafe path 차단: PASS
- core apply YAML lock 생성·target drift 및 downstream enforcement: PASS
- security tool preview 무변경·network deny·exact version/URL/checksum 공개: PASS
- offline apply checksum·기존 binary atomic 충돌·미승인 apply/uninstall negative: PASS
- installed/catalog/platform drift·변경 binary 보존 uninstall·downstream enforcement: PASS
- npm·pnpm·Yarn·Maven·Gradle·Python application별 exact version·고정 cwd/argv clean install: PASS
- dependency profile·lock·ownership drift, 미승인 apply와 기존·변경 output 보존 uninstall: PASS
- PR #11·#12 hosted `security`·`license-provenance` required checks와 main 병합: PASS
- core upgrade create·update·delete·unchanged·preexisting-identical union diff와 미승인 apply: PASS
- apply·rollback·finalize, transaction write failure 원복과 rollback record 변조 차단: PASS
- current target/source drift·새 경로 collision·기존 동일 파일 rollback 보존: PASS
- PR #13과 main Security run `29560757023`의 `security`·`license-provenance`: PASS
- `v0.2.4-pilot` tag 대상 commit·GitHub asset digest·재다운로드 archive SHA-256 일치: PASS
- REQ-019–REQ-024 complete/sorted ID, evidence path, unsafe `.env*`, token impact와 requirements 동기화
  positive·negative fixture: PASS
- REQ-001–REQ-052 상태 정확한 단일 coverage, requirements 상태 drift, 구현·외부 task 분리·범위와
  UF-001–UF-013 primary mapping drift negative fixture: PASS
- docs Markdown 43개 local link와 요구사항에서 설계·운영 문서 36개 역참조 completeness: PASS
- REQ-025 task schema, fixture hash·격리 복제·grader allowlist와 2-trial deterministic runner: PASS
- 비용 0·token 0, latency·tool-call·diff 집계와 failed hard gate 비상쇄: PASS
- unsafe path·`.env*`·network allow·model budget·임의 command·fixture drift negative: PASS
- REQ-009–REQ-014 3개 언어 formatter·linter·typecheck와 web accessibility·backend N/A 계약: PASS
- exact tool version·project-local executable·application cwd·check-only source 보존: PASS
- linter non-zero fail-fast·version drift·source mutation·network-none 미증명 실행 차단: PASS
- 세 adapter 공통 engineering·security·role·persona·HANDOFF·CodeSight·change-mode reference: PASS
- Codex·Claude hook outcome과 Copilot validation/security fallback parity: PASS
- 세 adapter 동시 materialization과 role·permission·hook·persona·target drift negative: PASS
- FastAPI/OpenAPI compatible change·syntax·route inventory·Production-disabled docs profile: PASS
- operation·response·component 삭제, required parameter·undocumented/stale route negative: PASS
- Production docs 노출·Try it out·external asset·internal metadata negative: PASS
- 최초 frontend·backend·shared·up/down migration artifact preview/apply/validate/rollback: PASS
- 기존 파일 충돌 atomic 차단·preexisting identical 보존·부분 write 실패 transaction restore: PASS
- DB execution: NOT-RUN, paired rollback artifact만 검증
- P0 React+Vite, Node+Express+PostgreSQL, Next.js+PostgreSQL 단일 project와
  React+Vite/Node+Express+PostgreSQL workspace profile schema·artifact 계약: PASS
- 네 P0 profile의 clean preview·승인 apply·validate·생성 파일 rollback과 기존 동일 파일·owner 파일
  보존 retrofit: PASS
- 기존 파일 충돌 atomic 차단, migration pair 누락·execution 경계 확대·workspace/target drift
  negative fixture: PASS
- P0 dependency install·DB migration·provider write·Production deploy와 실제 downstream pilot: NOT-RUN
- core `requirements`·optional `frontend` package와 Codex·Claude Code·GitHub Copilot adapter
  manifest checksum·dependency DAG·exact version validation: PASS
- project-local 검증 가상환경의 PyYAML `6.0.3`으로 v1/v2 core·optional 네 package를
  `skill-creator` quick validator로 검사: PASS
- core-only·optional+3 adapter clean apply, existing collision·두 번째 write failure atomic 차단과
  preexisting identical·사용자 변경 파일 보존 uninstall: PASS
- v1→v2 skill upgrade·rollback binding과 target/package/adapter hash, dependency cycle·version
  incompatibility·plugin catalog 실행 승인 negative fixture: PASS
- 실제 plugin 설치·호출, native AI tool discovery와 private organization bundle: NOT-RUN
- Web·CLI surface의 동일 release union plan·plan SHA-256·lock 결과 parity: PASS
- P0 profile+skill bundle clean install·기존 동일 파일 retrofit·v1→v2 upgrade와 initial/upgrade
  rollback: PASS
- release manifest·archive binding·component checksum 변조, 기존 파일 충돌·target drift와 두 번째
  write 실패 전체 transaction 원복 negative fixture: PASS
- `v0.2.8-pilot` package version·migration·rollback·검증 경계, hosted PR checks, PR #22 merge,
  tag와 게시 archive 재다운로드 evidence: PASS
- PR #22 hosted `security`: PASS. `license-provenance` 1차 run은 skill distribution release
  `manifest.json`의 license metadata, 2차 run은 evaluator regression source의 synthetic
  `manifest.json` 문자열을 각각 source finding으로 오분류해 FAIL했다. Exact fixture manifest만
  review-only로 제한하고 test path는 runtime에 조립하도록 보정했다. 3차 run `29635598581`에서
  `security`와 `license-provenance`가 모두 PASS했다.
- PR #22 merge commit `1cc6406831a8ac7592f6ec3a765c0746f773195e`에 `v0.2.8-pilot` prerelease를
  발행했다. Tracked archive, GitHub asset digest와 재다운로드 SHA-256
  `3963402cf8d28c88858055a90e4be3c9c4170ea99f483f8360bd8749c22db4f8`이 일치한다.
- 루트 README와 `docs/bootstrap-user-guide.md`를 release 선택부터 onboarding·adapter·검증·
  update·rollback 및 Portal local reference 흐름에 맞춰 현행화했다.
- REQ-047 GitHub Actions Web Adoption P0는 downstream의 `workflow_dispatch`에서 read-only
  preview와 protected environment 승인 apply를 분리했다. Web·CLI가 같은 plan SHA-256을
  생성하고, apply adapter는 exact plan·clean checkout·reviewed release allowlist를 재검증한 뒤
  core 허용 파일만 stage한다. Reference workflow는 default branch 직접 write·force push·자동
  merge를 하지 않고 run별 branch와 PR만 생성하며, `pull_request_target`, broad permission과 secret
  context를 사용하지 않는다. Deterministic fixture와 hosted security workflow 연결은 PASS다.
  분리된 `nayunss/web-adoption-p0-pilot`에서 exact upstream commit
  `d10afe781d03d662114a1ca6b38e469ed8f72dbb`, read-only preview run `29675164760`, plan
  `sha256:fc4790ebc11f9b603480189e16f27d96bdad80898956825d353fc32eae858835`,
  protected apply run `29675351632`, review branch·PR #1, read-only hosted validation run
  `29675770560`과 OWNER approval을 검증했다. Main에 adoption 변경이나 자동 merge는 없고
  `owner.txt`는 보존됐다. 실제 delivery mechanics pilot은 PASS다.
- Pilot 1차 apply는 repository의 Actions PR 생성 설정이 꺼져 있어 branch push 뒤 PR 생성에
  실패했다. Pilot 저장소에 한해 기본 workflow 권한 `read`를 유지하고 PR 생성 허용을 승인했으며,
  재실행은 PASS했다. 실패가 남긴 run-scoped branch를 정확히 삭제했고, 공통 template에는 PR 생성
  실패 시 방금 만든 branch만 삭제하는 rollback과 read-only PR plan·path·hash validator를 추가했다.
  Private repository의 environment required reviewer는 현재 billing plan에서 HTTP 422로 거부되어
  비밀 없는 격리 fixture를 승인 후 public으로 전환했다. Portal 설계는 plan별 기능 차이를 사전
  검사해야 한다.
- 2026-07-19 범위 결정으로 REQ-047의 비개발자 surface를 GitHub App Web Portal로 단일화했다.
  데스크톱 코드·패키징·CI·Electron 의존성과 설치 문서를 제거하고 공통 adoption surface를
  CLI·web으로 축소했다. `docs/github-app-web-portal-local-guide.md`에 loopback no-network 실행,
  확인 순서와 Production으로 확대하면 안 되는 경계를 기록했다.
- README의 기능 목록을 비개발자가 각 기능의 목적, 별도 승인이 필요한 작업과 자동 실행하지 않는
  범위를 이해할 수 있도록 항목별 완전한 설명으로 확장했다.
- 현재 Portal-only tracked source를 기준으로 `docs/architecture.md`, 하네스·개발환경 profile·
  upstream/downstream 문서와 문서 index를 현행화했다. 중복된 one-click 검토는 Web Adoption
  설계·Delivery 문서로, downstream 시작 절차는 처음부터 끝까지 사용 가이드로 통합하고 모든
  역참조를 canonical 문서로 바꿨다.
- REQ-047 GitHub App Web Portal local reference를 구현했다. Selected repository·installation
  account·사용자 push 권한을 preview와 apply에서 다시 확인하고, Metadata read·Contents/Pull
  Requests write 밖의 권한을 차단한다. OAuth state는 256-bit·10분·one-time·local return path로
  제한하고 webhook raw body HMAC-SHA256·event allowlist·delivery replay를 검증한다. Installation
  token은 ephemeral checkout callback, user access token은 PR delivery callback 안에서만 사용하고
  token 형식·길이 가정과 log·result 노출을 차단한다.
- `web-portal/`의 responsive Korean UI는 저장소 선택, 쉬운 변경 건수·위험 요약, exact plan 상세,
  명시 승인과 PR-only 결과를 keyboard semantic control로 제공한다. Loopback demo server는 CSP,
  no-store, same-origin과 16 KiB body limit를 적용하고 GitHub network·App registration·실제
  provider write를 `NOT_RUN`으로 표시한다. Authorization·suspension·replay·redaction·TTL·중복 apply
  negative와 browser/API contract fixture는 PASS다. 실제 GitHub App, hosting, persistent store,
  ephemeral compute·egress, revoke·rollback과 사람 browser Eval은 수행하지 않았다.
- 위 Portal local reference와 Actions P0 경계를 package·lock root version `0.2.9`,
  `v0.2.9-pilot` migration·rollback release note로 묶었다. PR #30 hosted run `29678215370`,
  merge commit `c08c38f52f434c5c29b882316f987e85db29620d`와 main run `29678269038`이 PASS했다.
  같은 commit의 tag·tracked prerelease archive를 게시했고 GitHub asset digest와 재다운로드
  SHA-256 `3ae9ef8dd024339c4765ddc56e77ecbb724d1d8a51920da02ef86d8ddaff5d69`이 일치한다.
- PR #29 첫 hosted security run은 requirement traceability의 release baseline 변경만으로 downstream
  feedback manifest 동기화를 요구해 차단됐다. Validator가 feedback primary mapping과 feedback을
  가진 implementation·external task projection의 실제 변경만 비교하도록 보정하고, release-only
  변경 허용과 feedback scope 변경 차단 fixture를 추가했다. 같은 원칙으로 HANDOFF는 완료 metadata와
  공통·외부 task scope가 바뀔 때만 traceability manifest 동기화를 요구하고, 일반 evidence 설명
  보강은 no-op manifest 변경 없이 허용하도록 회귀 fixture를 추가했다.
- GitHub App을 설치하지 않는 clone·공식 release ZIP 사용자가 AI 코딩 도구에서 곧바로 시작할 수
  있도록 `.ai/prompts/adopt-cloned-bootstrap.md`와 README의 복사용 프롬프트를 추가했다. 목표,
  source context, 첫 출력과 승인 boundary를 분리하고 source 무결성·upstream/downstream 모드·대상
  경로·read-only 진단·변경 0건을 첫 turn 완료 조건으로 고정했다. `apply`·설치·Git write·외부
  전송·credential·DB·provider·배포는 별도 승인 전 금지한다.
- `Conversation interrupted` 뒤에는 Git·외부 상태를 먼저 재확인하고 남은 단계만 재개하도록 사용자
  가이드를 보강했다. `/feedback`은 대화 재개가 아니라 선택적 session·log를 포함한 제품 feedback
  제출 용도이며, 비밀·개인정보를 첨부하지 않는 경계를 함께 안내한다.
- PR #25의 첫 hosted security run은 requirements 변경과 downstream feedback manifest 동기화 누락을
  fail-closed로 차단했다. 두 traceability manifest의 검토일을 2026-07-19로 동기화하고 동일 base
  range validator를 다시 적용한다.
- 기존 `REL-LOCK-2026-07-14-001`은 만료 상태로 역사 증적을 보존한다. validator는 만료 승인을 새
  dependency 변경에 사용할 수 없게 유지하면서 관련 없는 변경을 막지 않도록 회귀 보정했다.
- Markdown 시각 렌더링 검사: 미구현

## 남은 작업

### 공통 저장소에서 진행 가능

현재 즉시 진행할 공통 저장소 작업은 없다.

### 외부 입력·실제 환경 대기

1. [작업:REQ-047-github-app-web-portal-production-pilot] [외부 변경 승인·실제 환경·사람 참여 대기]
   App owner·operator·incident owner, installation account, hosting·persistent state·secret manager와
   retention 결정을 확정한다. 별도 test App 등록·exact 권한·callback·webhook·배포를 각각 승인한 뒤
   non-production repository에서 provider API·revoke·rollback과 모바일·PC browser 비개발자 2명 Eval을
   수행한다. Production 등록·배포는 이 pilot PASS 뒤에도 별도 승인한다.
2. [작업:REQ-040-owner-evidence] [프로젝트 입력·실제 환경 대기] downstream owner의 법률·retention evidence, 실제
   multi-instance bypass test와 provider restore rehearsal이 제공될 때만 schema v2를 READY로 승인한다.
3. [작업:REQ-046] [사람 참여 대기] 독립 tester 최소 2명과 분리된 repository·workspace·resource에서 실제
   결과가 제출되면 취합한다. synthetic 결과만으로 완료하지 않는다. Feedback campaign에는 UF-013
   보강 계약에 따라 upstream repository·release·commit·archive checksum과 downstream commit을 고정한다.
4. [작업:REQ-041-live-trial-release] [프로젝트 입력·외부 변경 승인 대기] project별 exact model·harness·비용·network·reviewer와
   candidate가 정해지고 호출 승인을 받은 뒤 비결정 trial·사람 승인 held-out test·release를 수행한다.
5. [작업:REQ-042-release-core-adoption] [외부 변경 승인·실제 환경 대기] release version과 manifest 발행 승인, 실제 downstream
   대상이 정해진 뒤 upgrade·rollback을 수행한다.
6. [작업:UF-001-013-downstream-revalidation] [release 발행·실제 downstream 대기] REQ-049–REQ-052와
   REQ-046 보강을 포함한 새 upstream release·commit·archive checksum을 고정하고 실제 `env-be`에
   적용한다. UF-001–UF-013을 각각 재현해 `PASS | FAIL | BLOCKED | NOT-RUN`과 evidence를 갱신하며,
   공통 synthetic PASS만으로 downstream finding을 해결 처리하지 않는다.

## 위험·주의

- 규칙·workflow·schema·validator·fixture·skill은 특정 AI 도구의 prompt나 전용 memory에만 두지 않는다.
  `.ai/`와 공개 형식의 공통 source를 단일 진실 원천으로 유지하고 Codex·Claude Code·GitHub Copilot
  등 모든 지원 adapter가 이를 참조하게 한다. 같은 fixture를 실행해 도구가 달라도 동일한 판정과
  필수 산출물을 내야 하며, 도구별 native 기능 차이는 권한 확대 없이 명시적 fallback으로 보완한다.
- 사용자 JPEG는 untracked 상태로 반드시 보존하며 광범위한 `git add .` 대상에 포함하지 않는다.
- Opengrep `1.22.0`은 opt-out 강제 조건부 승인이다. version·metrics 검증을 제거하지 않는다.
- `.env*`, production credential과 실제 고객 데이터는 AI context에서 제외한다.
- `../env-be`의 logical dump·restore는 격리 pilot 증거이며 provider backup·계정/region 장애 복구가 아니다.
- 인메모리 rate limiter는 다중 instance 방어가 아니다.
- readiness profile의 TBD 책임자·retention·복구 항목을 사람 근거 없이 READY로 승격하지 않는다.
- Husky·lint-staged는 정확한 version, lifecycle 영향과 제거 절차 승인 전 upstream에 추가하지 않는다.

## 다음 시작점

1. `.ai/standards/engineering.md`, `.ai/standards/security.md`, 이 문서와
   `.codesight/wiki/index.md`를 읽는다.
2. 실제 프로젝트 경로에서 `git status --short --branch`와 `git rev-parse HEAD`를 확인한다.
3. 사용자 JPEG가 untracked 상태로 보존되는지 확인하고, 원격 비교가 필요하면 `git fetch` 후
   remote-tracking reference와 대조한다.
4. `REQ-047-github-app-web-portal-production-pilot`을 재개하면
   `docs/github-app-web-portal-reference.md`의 8단계 입력·승인과 중단 조건부터 확인한다. 그 밖의
   외부 대기 작업이면 해당 작업 ID의 필요한 project·사람·release 입력과 승인
   범위를 먼저 확인한다. 새 공통 작업은 요구사항·설계와 실제 구현 상태를 대조한 뒤 안정적 작업 ID로
   HANDOFF에 추가한다.
