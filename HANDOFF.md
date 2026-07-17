# Handoff

갱신: 2026-07-17 Asia/Seoul
상태: 설계 baseline 완료·공통 구현 진행 중
Git 기준: 현재 작업 상태는 로컬 Git이 단일 진실 원천이며 `git status --short --branch`와 `git rev-parse HEAD`로 확인한다. 원격 동기화 상태는 `git fetch` 후 remote-tracking reference와 대조한다.
완료 작업: release:v0.2.3-pilot, release:v0.2.4-pilot, handoff-currentness, handoff-review, workspace-main-sync, REQ-043-review, REQ-043-archive-preview, REQ-043-runtime-design, REQ-043-synthetic-pilot, REQ-043-project-pilot, REQ-043-ci-conditional, REQ-043-required-checks, REQ-042-adapter-manager, REQ-041-bounded-patch-pilot, REQ-040-production-evidence-gate, pilot-result-aggregation, REQ-042-core-materializer, REQ-042-github-copilot-adapter, REQ-041-offline-trial-gate, project-decision-onboarding, design-baseline-audit, REQ-042-yaml-lock-schema, downstream-security-installer, stack-dependency-bootstrap, release-upgrade-rollback-automation
다음 작업: REQ-046, REQ-040-owner-evidence, REQ-041-live-trial-release, REQ-042-release-core-adoption

## 목표

Codex, Claude Code 등 서로 다른 AI 도구에서 재사용할 수 있는 안전한 AI 개발환경 공통 하네스를
설계하고 downstream pilot으로 검증한다. REQ-001~046 설계 명세는
`DESIGN-BASELINE-2026-07-17` 감사로 완료됐고 실제 공통 환경 구현 단계로 전환한다. 구현·검증 상태는
`docs/requirements.md`의 추적 표를 기준으로 하며 설계 완료를 실제 지원 완료로 해석하지 않는다.

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
- REQ-001~046의 requirement·architecture·workflow·project profile·HITL·Eval 경계를 감사해
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

## 현재 상태

- 이 파일과 모든 프로젝트 변경은 실제 경로
  `/Users/nayunss/Documents/vibe-coding/common-project`에서 관리한다.
- 로컬 branch·HEAD는 상단 명령으로 확인한다. 원격 상태가 필요한 작업만 fetch 후 remote-tracking
  reference와 대조하며 fetch 전 `origin/*`을 최신 원격 상태로 간주하지 않는다.
- remote: `git@github.com:nayunss/ai-dev-bootstrap.git`
- 최신 발행 baseline은 `v0.2.4-pilot`이며 발행·checksum 증적은
  `docs/releases/v0.2.4-pilot.md`에 기록돼 있다.
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
- `.ai/workflows/handoff.md`, `scripts/validate-handoff.mjs`, `scripts/test-handoff-validator.mjs`: 상단
  다음 작업과 하단 남은 작업의 안정적 ID 일치 및 완료 작업 잔존 차단

## 검증

- 실제 프로젝트 `4be950e → eee7749` 원격 main fast-forward: PASS
- 사용자 JPEG untracked 보존: PASS
- `v0.2.3-pilot` 원격 release·archive checksum·재다운로드 검증: PASS
- HANDOFF 필수 구조·staged 동반 변경·PR range·semantic-change regression: PASS
- HANDOFF stale 날짜·branch/commit snapshot·완료/다음 작업 ID 중복 negative fixture: PASS
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
- REQ-001~046 설계 source·상태·경계·남은 gate coverage audit: PASS
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
- 기존 `REL-LOCK-2026-07-14-001`은 만료 상태로 역사 증적을 보존한다. validator는 만료 승인을 새
  dependency 변경에 사용할 수 없게 유지하면서 관련 없는 변경을 막지 않도록 회귀 보정했다.
- Markdown 시각 렌더링 검사: 미구현

## 남은 작업

### 공통 저장소에서 진행 가능

현재 추가 project·사람·release 입력 없이 확정된 공통 구현 작업은 없다.

### 외부 입력·실제 환경 대기

1. [작업:REQ-046] [사람 참여 대기] 독립 tester 최소 2명과 분리된 repository·workspace·resource에서 실제
   결과가 제출되면 취합한다. synthetic 결과만으로 완료하지 않는다.
2. [작업:REQ-040-owner-evidence] [프로젝트 입력·실제 환경 대기] downstream owner의 법률·retention evidence, 실제
   multi-instance bypass test와 provider restore rehearsal이 제공될 때만 schema v2를 READY로 승인한다.
3. [작업:REQ-041-live-trial-release] [프로젝트 입력·외부 변경 승인 대기] project별 exact model·harness·비용·network·reviewer와
   candidate가 정해지고 호출 승인을 받은 뒤 비결정 trial·사람 승인 held-out test·release를 수행한다.
4. [작업:REQ-042-release-core-adoption] [외부 변경 승인·실제 환경 대기] release version과 manifest 발행 승인, 실제 downstream
   대상이 정해진 뒤 upgrade·rollback을 수행한다.

## 위험·주의

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
4. 다음 요청이 외부 대기 작업 중 하나라면 해당 작업 ID의 필요한 project·사람·release 입력과 승인
   범위를 먼저 확인한다. 새 공통 작업은 요구사항·설계와 실제 구현 상태를 대조한 뒤 안정적 작업 ID로
   HANDOFF에 추가한다.
