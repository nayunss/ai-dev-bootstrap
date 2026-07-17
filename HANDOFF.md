# Handoff

갱신: 2026-07-17 Asia/Seoul
상태: 진행 중
Git 기준: 현재 작업 상태는 로컬 Git이 단일 진실 원천이며 `git status --short --branch`와 `git rev-parse HEAD`로 확인한다. 원격 동기화 상태는 `git fetch` 후 remote-tracking reference와 대조한다.
완료 작업: release:v0.2.3-pilot, handoff-currentness, handoff-review, workspace-main-sync, REQ-043-review, REQ-043-archive-preview, REQ-043-runtime-design, REQ-043-synthetic-pilot, REQ-043-project-pilot, REQ-043-ci-conditional
다음 작업: REQ-043-required-check-decision, REQ-042, REQ-041

## 목표

Codex, Claude Code 등 서로 다른 AI 도구에서 재사용할 수 있는 안전한 AI 개발환경 공통 하네스를
설계하고 downstream pilot으로 검증한다. 현재까지 승인된 REQ-001~046의 구현·검증 상태는
`docs/requirements.md`의 추적 표를 기준으로 한다. 현재는 최종 제품 환경 구현이 아니라 공통 설계와
pilot 검증 단계다.

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

## 현재 상태

- 이 파일과 모든 프로젝트 변경은 실제 경로
  `/Users/nayunss/Documents/vibe-coding/common-project`에서 관리한다.
- 로컬 branch·HEAD는 상단 명령으로 확인한다. 원격 상태가 필요한 작업만 fetch 후 remote-tracking
  reference와 대조하며 fetch 전 `origin/*`을 최신 원격 상태로 간주하지 않는다.
- remote: `git@github.com:nayunss/ai-dev-bootstrap.git`
- 최신 발행 baseline은 `v0.2.3-pilot`이며 발행·checksum 증적은
  `docs/releases/v0.2.3-pilot.md`에 기록돼 있다.
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
- 기존 `REL-LOCK-2026-07-14-001`은 만료 상태로 역사 증적을 보존한다. validator는 만료 승인을 새
  dependency 변경에 사용할 수 없게 유지하면서 관련 없는 변경을 막지 않도록 회귀 보정했다.
- Markdown 시각 렌더링 검사: 미구현

## 남은 작업

1. hosted 결과를 사람이 검토한 뒤 branch protection의 required check 지정 여부를 별도 결정한다.
2. REQ-042 Codex·Claude Code 선택형 adapter의 preview·source hash·drift·uninstall 보존 Eval을 구현한다.
3. 필수 gate가 안정된 뒤 REQ-041 bounded-patch pilot을 수행한다.
4. REQ-040 다중-instance limiter·Production provider restore와 법률·retention 책임자 evidence가
   준비될 때까지 Production 승인을 차단한다.
5. REQ-046의 독립 tester 다중 참여와 결과 취합을 실제로 재현한다.

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
4. `docs/ai-generated-code-license-provenance.md`의 조건부 CI 계약과 hosted PASS를 읽고 required check
   지정 여부가 승인됐는지 확인한다. branch protection 변경은 별도 승인 전 수행하지 않는다.
