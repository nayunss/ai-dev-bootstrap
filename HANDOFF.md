# Handoff

갱신: 2026-07-14 Asia/Seoul
상태: 진행 중
Git 기준: 현재 작업 상태는 로컬 Git이 단일 진실 원천이며 `git status --short --branch`와 `git rev-parse HEAD`로 확인한다. 원격 동기화 상태는 `git fetch` 후 remote-tracking reference와 대조한다.
완료 작업: release:v0.2.3-pilot, handoff-currentness
다음 작업: REQ-043, REQ-042, REQ-041

## 목표

Codex, Claude Code 등 서로 다른 AI 도구에서 재사용할 수 있는 안전한 AI 개발환경 공통
하네스를 설계하고 downstream pilot으로 검증한다. 현재까지 REQ-001부터 REQ-046까지 수집했다.
현재는 최종 실제 환경 구현 단계가 아니며, 설계·핵심 검증 종료 후 `docs/requirements.md`와 `docs/`를
구현 입력 계약으로 삼아 실제 공통 환경을 구현한다.

## 완료

- 다른 노트북에서 작성한 downstream 시작·검증, upstream/downstream 아키텍처와 feedback 계약 문서를
  검토·보완했다. 목표 아키텍처와 현재 부분 구현을 분리하고, target이 있는 preview·Node 한정 dependency·
  upstream-local security tool 경계를 명시했다. 단독·blind tester, AI provenance, 전원 PASS, synthetic
  negative fixture와 확장된 finding evidence schema를 REQ-046 계약에 맞췄다.
- 여러 참여자가 upstream commit을 고정하고 frontend·backend·full-stack 독립 downstream을 생성해
  검증하는 가이드를 추가했다. 역할·matrix·AI 입력·공통/유형별 gate·증거 schema·환류·중단 조건과
  설계 검증 완료 판정을 REQ-046으로 연결했다.
- 단독 tester도 별도 clean self-review로 참여할 수 있게 했고, 모든 trial에
  provider·tool/surface·tool version·model 표시명/ID·mode·adapter·권한·확인 수준의 AI provenance를
  요구한다. 현재 이 작업의 AI 정보는 사용자 진술 기준 `Codex`, model 표시명 `5.6 sol`이며 정확한
  provider model ID와 tool version은 노출 증거가 없어 `not-exposed`, evidence는 `tester-declared`다.
- 설계 완료는 참여 maintainer를 포함해 등록된 모든 tester의 배정 필수 항목이 전부 PASS인 경우로
  고정했다. FAIL·BLOCKED·NOT-RUN·증거 누락·미검증이 하나라도 있으면 진행 중이며 다수결로 대체하지 않는다.
- 독립 Git 저장소와 문서 구조를 만들었다.
- 아키텍처, 스킬, 에이전트, SDLC와 최소 하네스를 설계했다.
- 선호 플러그인과 Agent Skills·GitHub Spec Kit을 비교 평가했다.
- 언어 중립 코드 품질, 시멘틱 HTML과 프론트엔드 훅 정책을 작성했다.
- AI prompt injection, 파괴적 작업, DB·파일 삭제와 공급망 위험을 조사했다.
- `.ai/`에 보안 정책, 위협 모델, 보안 리뷰, reviewer와 도구 manifest 골격을 만들었다.
- 세션 handoff 정책과 워크플로를 추가했다.
- 프로젝트별 기술 스택을 자동 감지하고 필요한 값만 질문해 확정하는 개발환경 정의 절차를
  추가했다.
- 토큰 절약형(`token-aware`)과 충분한 분석형(`full`) 실행 프로파일을 추가했다. 두 방식은
  탐색·설명 범위만 다르며 보안과 필수 품질 게이트는 동일하다.
- 요구사항이 달라질 때 두 토큰 프로파일과 관련 워크플로를 함께 검토·갱신하는 동기화 규칙을
  추가했다.
- 하네스·루프가 대체하지 못하는 제품 의도, 변경·버그, 설계·UI 판단과 고위험 승인용 최소
  프롬프트 템플릿 및 사용 가이드를 추가했다.
- 모델·하네스·루프·프롬프트·스킬 변경을 outcome과 regression·capability suite로 평가하는
  Eval 전략, 워크플로와 실제 개발용 디렉터리 계약을 추가했다.
- clone 후 사용자별 AI 환경을 읽기 전용 진단하고 승인된 프로젝트 로컬 환경으로 맞춘 뒤
  개발을 시작한다는 저장소의 배포 목적을 명시했다.
- 공통 환경을 개발·운영하는 upstream maintainer/contributor와 이를 회사·프로젝트에 적용하는
  downstream adopter/developer의 책임, 확장 계층과 업데이트 흐름을 분리했다.
- Husky 선행 설치를 제거하고 프로젝트 개발환경과 실제 format·lint·test 명령이 승인된 뒤
  기술 스택 프로파일로 적용하도록 변경했다.
- Supabase·Firebase의 client/server key, RLS·Security Rules, App Check, environment와 배포
  가드레일을 추가했다.
- upstream이 질문 조건을 정의하고 downstream 사용자가 선택·승인·거절로 답하는
  Human-in-the-loop 계약과 Eval 기준을 추가했다.
- 첫 downstream 검증 대상 `../env-downstream`에서 pilot pin, 공급망 심사, Todo 구현, 공통 보안,
  CodeSight와 Husky 적용을 완료했다.
- downstream에서 format·lint·typecheck·unit 3건·production build·브라우저 E2E 5건과 full
  secret/SAST scan을 통과했다.
- pilot 피드백으로 TypeScript 7·ESLint 10 peer 충돌, PostCSS 전이 취약점, pnpm 11 override 위치,
  생성물 secret-scan 오탐과 Corepack 재다운로드 위험을 기록했다.
- REQ-031로 AI의 민감정보 비접근과 모든 `.env*` 파일 읽기·검색·색인 차단을 추가하고 Codex·
  Claude Code 공통 pre-tool 훅 및 회귀 테스트에 연결했다.
- REQ-032와 MCP 보안 조사 문서를 추가했다. 승인 manifest는 빈 allowlist·default-deny이며
  미승인 server·tool 호출과 CLI 설정 변경을 pre-tool 훅에서 차단한다.
- REQ-009에 언어·레이어별 코드 스타일 일관성, 저장소 formatter·linter 우선과 스타일 변경의
  명시적 migration 원칙을 추가했다. 두 토큰 프로파일 모두 같은 필수 품질 기준이라 분기하지 않는다.
- REQ-012에 project-local `.editorconfig` 적용과 formatter·linter 충돌 방지 요구사항을 추가하고
  upstream 자체에도 UTF-8·LF·끝 개행·공백 정리·2칸 들여쓰기 기준 파일을 적용했다.
- HANDOFF 갱신을 문서 규칙에서 자동 gate로 강화했다. staged task 변경과 PR base 범위에서
  `HANDOFF.md`가 빠지면 validator가 실패하며 공통 security-check와 CI가 이를 호출한다.
- Pilot 피드백을 `scripts/bootstrap`과 `scripts/validate`로 자동화했다. preview 기본값, exact
  version·lockfile·strict peer·scripts-off·pnpm 11 override·Next telemetry·Corepack 금지·온라인
  audit 분리와 Playwright/Husky 별도 승인을 검사한다.
- `v0.2.0-pilot` release note와 package version을 준비했다. clean clone 검증 결과, migration,
  rollback과 별도 checksum artifact 발행 계약을 기록했다.
- `v0.2.0-pilot` tag commit `a373c48`과 GitHub prerelease를 발행했다. archive SHA-256은
  `454a3d4a2d9781ce529f9e41408d1f3f59bff941c3a3e94e67ae099df07a4584`이며 게시 후 재다운로드
  검증을 통과했다.
- Downstream 적용 중 `v0.2.0-pilot` validator가 telemetry evidence 후보로 `.env.example`을
  읽는 REQ-031 위반을 발견해 적용·lock 갱신을 중단했다. 참조를 제거하고 source regression을
  추가한 `v0.2.1-pilot` hotfix를 준비한다.
- `v0.2.1-pilot` tag commit `ee4b352`과 GitHub prerelease를 발행했다. archive SHA-256은
  `a283c4688d141e67c519cc129bdeec3d9518fa90e0decbbe49ad37ff2df8fcbd`이며 clean clone과 게시
  asset 재다운로드 검증을 통과했다.
- Downstream ESLint가 validator의 미사용 `execFileSync` import warning을 발견해 동작 변화 없는
  safe lint 수정으로 upstream main과 downstream local override에 반영했다. 다음 release에 포함한다.
- REQ-034와 dependency upgrade workflow를 추가했다. 설치된 package의 update·downgrade·override·
  lockfile-only 변경은 영향 preview와 정확한 version 승인을 받기 전에는 실행하지 않는다.
- `v0.2.2-pilot` package version과 release note를 준비했다. v0.2.1 이후 validator lint 수정과
  REQ-034 dependency version 승인 계약만 묶고 application dependency는 변경하지 않는다.
- `v0.2.2-pilot` tag commit `bfe3ef0`과 GitHub prerelease를 발행했다. archive SHA-256은
  `880f9c6e127606bf746bf06ee7ba34285ac960b3187e06294348ce8e9c5972ca`이며 clean clone과 게시
  asset 재다운로드 검증을 통과했다.
- Dependency 승인 자동 gate를 추가했다. staged·PR range의 direct version과 lockfile-only SHA-256
  diff를 구조화된 승인 record와 대조하고 positive·negative fixture를 CI에서 실행한다.
- CI·배포 3단계 자동 감지 결과 downstream에는 workflow·배포 설정·remote가 없고 Todo는
  localStorage-only 정적 Next.js 앱이다. GitHub Actions CI를 추천할 수 있으나 배포 provider·공개
  범위·production 승인은 사용자 확인 대기 상태다.
- REQ-035와 CI·배포 workflow를 추가했다. GitHub Actions 선택 시 pinned action·최소 권한·exact
  runtime·security·quality·E2E 기본 CI를, Vercel 선택 시 zero-config Git integration과 Preview·
  Production·URL 공개·secret·rollback 승인 계약을 적용한다.
- frontend downstream pilot에서 GitHub Actions와 Vercel Preview·Production까지 검증했다. pnpm 11의
  미승인 build script 차단, verified commit author, 중복 Vercel project와 실제 deployment URL 확인
  경험을 REQ-036·보안·HITL·CI 배포 workflow에 환류했다.
- downstream validator가 pnpm 11의 `dangerouslyAllowAllBuilds`, 비활성화된 `strictDepBuilds`, version
  없는 `allowBuilds` matcher와 미결정 placeholder를 차단하도록 positive·negative Eval을 추가했다.
- README에 공통 요구사항은 언어 중립이며, 실제 실증은 Next.js frontend pilot과 Spring Boot + Next.js
  full-stack pilot의 두 조합에 한정됨을 명시했다. pilot 성공과 공통 bootstrap·validator의 지원 완료를
  구분한다.
- REQ-037을 추가해 frontend·backend·fullstack의 언어·framework·database·도구를 고정하지 않고,
  기본 질문에 없는 사용자 정의 스펙도 확장 field·공급망 심사·설치 승인·project-local adapter와
  검증으로 적용하도록 했다. 문서의 특정 기술 조합은 예시 또는 pilot 기록일 뿐 기본값이 아니다.
- Backend·fullstack pilot은 프론트엔드 Todo 사례처럼 하네스 경로를 빠르게 확인하는 최소 기능만
  구현하며 제품 수준의 기능 확장을 pilot 범위에 포함하지 않는다는 참고 메모를 남겼다.
- 외부 저장소의 Claude 작업 지침에서 source-first, 가정 명시, 단순성·외과적 변경, TDD·Tidy First,
  목표·검증, Git 명시 승인, 중복 없는 응답과 hallucination guard를 선별해 REQ-038과 공통
  `.ai/standards/engineering.md`로 이식했다.
- 루트 `CLAUDE.md`와 `AGENTS.md`는 공통 engineering·security·HANDOFF를 참조하는 얇은 adapter로
  만들고, 다른 AI 도구는 `.ai/README.md`를 진입점으로 사용한다. 개인 경로와 강제 bilingual 출력은
  공통 규칙에서 제외했다.
- 재발 가능한 패턴은 프로젝트가 운영하는 경우 `docs/project-maintenance.md`에 기록한다. 빈 문서
  생성을 강제하지 않으며 validator는 공통 지침·adapter의 존재와 필수 reference만 검사한다.
- 최신 공식 prompt 가이드를 검토하고 전역 성격형 persona를 기본값으로 두지 않는 REQ-039와
  `docs/persona-and-role-guidelines.md`를 추가했다. 공통 행동·보안 계약을 우선하고 별도 관점·권한·
  산출물이 필요한 경우에만 Eval된 작업 역할을 사용한다.
- 웹서비스 보안·운영·대한민국 법률 주장을 공식 법령·감독기관·OWASP 자료로 팩트체크하고 REQ-040과
  `docs/web-service-production-readiness.md`를 추가했다. 정수 PK 자체, 일률적 soft delete, 모든 시간의
  UTC 저장, 고정 제재 금액과 모든 AI 사용의 표시 의무 같은 과도한 일반화를 정정했다.
- authorization·secret·rate limit·paid API·DB exposure·password·backup restore·retention·log·시간·
  금액 통제와 개인정보·아동·국외이전·위탁·위치·광고·전자상거래·subscription·사용자 제공 AI의
  applicability를 SDLC·보안 정책·개발환경 질문과 Production gate에 연결했다.
- SkillOpt 사전논문의 방법·비용·한계를 검토하고 REQ-041을 추가했다. 구현체는 도입하지 않고
  bounded atomic patch, 고정된 model·harness, 격리된 train/selection/test, strict improvement와
  보안 hard gate, rejected-edit 기록, Human-in-the-loop와 versioned release 원칙만 차용했다.
- 제공된 Claude Code vault 이미지를 실제 확인하고 Codex·Copilot·Cursor·Gemini·Cline 공식 규약과
  `openai/agents.md`, `openai/codex`, `anthropics/skills`, `github/awesome-copilot` 공개 저장소 구조를
  비교해 REQ-042와 검토 문서를 추가했다. `.ai/`를 canonical source로 유지하고 선택한 도구의 얇은
  adapter만 downstream에 materialize하며 drift·권한·제거 가능성을 검증하는 구조를 채택했다.
- Copilot code referencing, dependency license와 source snippet scanning의 범위·한계를 검토해
  REQ-043과 `docs/ai-generated-code-license-provenance.md`를 추가했다. Tim Davis sparse-matrix 사례는
  축자 재현 위험의 complaint evidence이지 GPL 침해 확정 판결로 표현하지 않는다. scanner는 아직
  설치하지 않았으며 ORT·ScanCode·SCANOSS·FOSSLight 후보의 공급망·code 전송·비용 심사가 남았다.
- FastAPI는 Python framework이고 OpenAPI·Swagger는 contract·tooling이라는 경계를 확인해 REQ-044와
  `docs/api-contract-documentation.md`를 추가했다. backend onboarding에서 framework, protocol contract,
  docs UI·SDK와 production exposure를 분리해 질문하고 generator output도 license gate를 적용한다.
- REQ-044의 남은 env-be pilot 회귀로 실제 Spring MVC REST operation의 OpenAPI 누락 탐지와 Next.js
  BFF 6개 route의 backend method·path 매핑 positive·negative fixture를 구현하고 통과시켰다.
- REQ-040의 수동 Railway Preview login limit 결과를 동일 synthetic subject의 제한 전 응답→429 BFF
  순차 fixture로 CI에 고정했다. operational header는 보존하고 Authorization·Set-Cookie·내부 topology
  header는 차단하며, 다중 instance·Production provider restore와 법률·retention TBD는 계속 차단한다.
- REQ-040 초기 onboarding에 법률·개인정보 검토 책임자, retention·파기 정책 책임자와 다중 인스턴스
  rate-limit 방식·책임자·결정 기한 질문을 연결했다. blocked JSON template, validator와 ready·false
  approval·missing owner·missing strategy fixture를 CI에 추가했다.
- 운영 중인 기존 project도 preview에서 readiness profile 누락을 확인하고 `scripts/bootstrap readiness
  <target>`으로 blocked template을 최초 생성할 수 있게 했다. 기존 profile overwrite 거부와 생성 직후
  BLOCKED 판정을 regression으로 고정했다.
- `v0.2.3-pilot` package version, release note·migration·rollback과 문서 색인을 준비했다. REQ-036·038·
  040·044·045의 검증 범위만 완료 변경으로 묶고 REQ-041~043·046과 Production 미검증 범위는 제외했다.
- root package release metadata `0.2.2 → 0.2.3`은 dependency graph·resolved·integrity 불변을 확인하고,
  사용자의 release 요청에 묶인 lockfile SHA 승인 record로 staged gate를 통과시킨다.
- `v0.2.3-pilot` 준비 commit `23762f2`를 원격 clean clone해 scripts-off install, 전체 fixture, validate,
  security tool checksum bootstrap, CodeSight stale와 full Gitleaks·Opengrep을 통과했다. PR #1 CI도 PASS했다.
- `v0.2.3-pilot` tag를 merge commit `74dd20b8be4e67b6153f6d05651fd1569711e1d3`에 발행했다. archive
  SHA-256은 `430138a58a2dc47b2c7b615b4c4511e8c0c161c4af30cc017e5d5bf6ae382083`이며 최종 main clean clone과
  게시 asset 재다운로드 checksum을 모두 검증했다.
- upstream 자체 요구사항 준수 감사를 수행해 문서와 gate의 불일치를 정리했다. REQ-001~045의 승인
  상태와 구현·검증 상태를 분리한 추적 표를 추가하고, release 색인의 v0.2.0~0.2.2 발행 상태와 누락된
  v0.2.1 항목을 현행화했다.
- HANDOFF validator가 날짜 metadata 변경만으로 통과하지 못하도록 완료·현재 상태·검증·남은 작업·
  다음 시작점의 semantic change를 staged·range에서 요구하고 negative regression을 추가했다.
- HANDOFF 작업 종료 계약을 강화해 Asia/Seoul 당일 갱신, Git 실상태 authority, 완료·다음 작업 ID
  분리와 stale branch·commit snapshot 금지를 staged·PR validator와 회귀 테스트에 적용했다.
- Git authority 문구를 로컬 작업 상태와 원격 동기화 상태로 분리했다. fetch 전 remote-tracking
  reference를 최신 원격 상태로 표현하지 않도록 workflow·요구사항·validator fixture를 동기화했다.
- CodeSight index를 AGENTS·Claude·기타 AI의 공통 세션 시작 순서에 연결하고, index가 있는 저장소의
  adapter reference를 downstream validator가 검사하도록 했다. AI security hook과 HANDOFF validator
  regression도 GitHub Actions 필수 단계에 추가했다.
- REQ-045의 token-aware·full 영향과 필수 drift gate를 토큰 프로파일·workflow에 동기화했다. upstream
  Git hook은 dependency·환경 승인이 끝나지 않아 `pending-environment-definition`이며 CI와 명시적
  security-check만 현재 적용된 gate임을 기록했다.
- REQ-045 우선순위 1의 첫 자동화를 구현했다. root·하위 `package.json`·Maven·Gradle·Python manifest를
  재귀 발견하고, 다중 application이면 개발환경 문서의 JSON inventory와 application별 root·manifest·
  quality·CI·deploy·hook, 공통 CodeSight·EditorConfig를 대조한다. 하위 Node application도 exact
  package manager·lockfile·dependency·telemetry·pnpm build policy를 독립 검증한다.
- `scripts/bootstrap preview <target>`이 manifest와 선언 drift를 읽기 전용으로 출력하도록 했고,
  backend-only → full-stack fixture에서 inventory·hook·EditorConfig·nested dependency의 positive·negative
  regression을 추가했다. 실제 `../env-be`에서 최초 preview가 `pom.xml`·`frontend/package.json`과 누락
  inventory·공통 asset을 탐지했고, 이후 증분 remediation과 전체 gate를 통과했다.
- REQ-040 잔여 pilot Eval을 `../env-be`에 구현했다. 기존 BOLA integration은 회귀로 유지하고,
  가입·로그인 rate limit 429·`Retry-After`, correlation ID 기반 보안 event log와 email·password·token
  redaction, 격리 PostgreSQL logical dump·restore 정합성·pilot RPO/RTO를 검증했다.
- readiness profile과 결정론적 grader를 추가해 synthetic ready positive, invalid applicability·missing
  disposal·false approval negative fixture를 통과했다. 실제 profile의 아동·국외이전·위탁 applicability,
  retention·파기·log 책임자와 Production backup provider·RPO/RTO는 TBD라 승인을 계속 차단한다.
- pilot 경계를 upstream에 환류했다. 인메모리 limiter는 다중 instance 방어가 아니며 같은 ephemeral
  container의 별도 DB logical restore는 provider backup·계정/region 장애 복구 완료로 승격하지 않는다.
- Railway Preview 점검에서 backend `Retry-After`·correlation ID를 Next.js BFF가 버리는 실제 누락을
  발견했다. 두 header만 allowlist로 전달하고 Authorization은 차단하는 Vitest를 추가해 재배포했다.
  synthetic login은 1~5회 401, 6회 429·`Retry-After: 44`·UUID correlation ID를 반환했다.
- env-be 후속 CI에서 Playwright `install --with-deps`가 Azure apt mirror의 181 package·114MB 다운로드 중
  20분 timeout됨을 확인했다. package와 같은 `v1.61.1-noble` 공식 image를 MCR manifest digest로 고정하고
  runtime alignment gate를 추가했다. 보완 run은 frontend 3-browser E2E 1분 42초, 최종 문서 run은
  1분 50초에 PASS했으며 backend·security도 모두 PASS했다.

## 현재 상태

- 로컬 branch·HEAD는 이 문서에 snapshot으로 복제하지 않고 상단의 read-only 명령으로 확인한다.
  원격 상태가 필요한 작업만 fetch 후 remote-tracking reference와 대조한다.
- remote: `git@github.com:nayunss/ai-dev-bootstrap.git`
- 최근 보안·품질 변경:
  - `7514549`: AI의 `.env*` 접근 차단
  - `2140c25`: 미승인 MCP default-deny
  - `f134ea1`: 코드 스타일 일관성
  - `6eb6e64`: project-local EditorConfig
  - `6b20f02`: HANDOFF staged·PR 자동 gate
- Semgrep은 거부하고 Opengrep `1.22.0`을 조건부 승인해 공통 security-check를 구현했다.
- 첫 downstream pilot `../env-downstream`은 독립 Git 저장소이며 upstream `v0.1.0-pilot`을
  시작점으로 사용했고 이후 승인된 pilot release를 명시적으로 적용했다. GitHub Actions·Vercel
  Preview·Production 검증을 완료했으며 upstream 변경은 자동 반영되지 않는다.
- backend→full-stack downstream pilot `../env-be`는 Spring Boot·PostgreSQL·JWT backend와 Next.js BFF
  frontend의 unit·integration·BOLA·3-browser E2E, GitHub Actions, Railway Preview·Production을
  검증했다. 같은 PR Environment의 frontend·backend·PostgreSQL 격리, API contract·production docs,
  application revert rollback, REQ-045 증분 stack 자동화와 REQ-040 격리 rate-limit·log·logical restore·
  applicability Eval도 검증했다. Production provider restore·migration rollback과 실제 운영 정책은 남았다.
- 문서와 정책은 대부분 `제안` 또는 `작성 중` 상태다.
- `v0.2.3-pilot` 발행과 증적 PR #2 병합이 완료됐다. HANDOFF 현행화 강화 변경은 현재 작업 diff다.

## 주요 결정

- 현재 script·validator·fixture는 설계 검증용 reference automation이다. pilot PASS를 최종 환경 구현
  완료나 모든 stack 지원으로 해석하지 않으며, 실제 구현 전까지 미검증 범위를 명시적으로 유지한다.
- 실제 환경 구현은 요구사항·설계·Eval의 핵심 gate를 닫은 뒤 별도 단계로 시작하고, 그 시점의
  `docs/requirements.md`와 `docs/`를 source of truth로 사용한다.
- 공통 정책은 `.ai/`에 두고 도구별 파일은 얇은 어댑터로 만든다.
- plugin은 선택 자동화이며 하네스의 필수 runtime이 아니다.
- security policy는 `.ai/standards/security.md`가 단일 진실 원천이다.
- hooks는 sandbox, IAM, CI와 복구 통제를 대체하지 않는다.
- production credential과 destructive action은 AI에게 기본 허용하지 않는다.
- `HANDOFF.md`는 세션 요약이며 요구사항·ADR·Git을 대체하지 않는다.
- 공통 하네스 정책과 프로젝트별 기술 스택을 분리하며 `latest`는 정확한 버전으로 해석해
  문서·lockfile·CI에 고정한다.
- 토큰 예산이 달라도 필수 보안 검사, 사용자 승인, 관련 테스트와 handoff는 생략하지 않는다.
- 요구사항 변경 시 토큰 프로파일에 차이가 없더라도 영향 없음의 이유를 handoff에 남긴다.
- 프롬프트는 반복 규칙이나 검증의 저장소가 아니며, 확정 내용은 요구사항·ADR·설정으로 옮긴다.
- Eval은 agent 자기 보고보다 실제 outcome과 결정론적 grader를 우선한다.
- 개인 전역 AI 설정은 자동으로 덮어쓰지 않고 프로젝트 로컬 bootstrap과 validate를 우선한다.
- 회사·프로젝트의 private policy와 skill은 public upstream에서 분리하고 upstream release를
  명시적으로 고정·검증·업그레이드한다.
- downstream은 upstream 파일을 symlink·submodule·실시간 참조하지 않는다. release/commit과
  checksum을 고정하고 diff·보안·호환성 검토와 Human-in-the-loop 승인 후에만 명시적으로
  upgrade한다.
- 검증되지 않은 MCP와 `.env*` 접근은 기본 차단하며 hook만이 아니라 sandbox·OS 권한·egress·
  IAM을 실제 보안 경계로 사용한다.
- EditorConfig는 에디터 기본 표현을, formatter는 코드 포맷을, linter는 정확성·유지보수 규칙을
  담당하며 서로 충돌하지 않게 한다.

## 변경 파일

- `docs/`: 요구사항과 설계 문서
- `.ai/`: 도구 중립 보안 정책·프로젝트 환경 워크플로·역할·manifest
- `HANDOFF.md`: 현재 세션 재개 정보
- `README.md`, `.gitignore`: 저장소 기본 파일
- `scripts/`: 공통 security, MCP manifest, HANDOFF와 CodeSight validator
- `.github/workflows/security.yml`: clean CI 보안 검사와 PR HANDOFF gate
- `.editorconfig`: upstream 표현 형식 기준

## 검증

- Agent Skills 내장 스킬 검증: PASS
- Agent Skills 명령 parity 검증: PASS
- 문서 trailing whitespace 검사: PASS
- 상대 Markdown 링크 대상 검사: PASS
- `security-tools.yaml` YAML 파싱: PASS
- Gitleaks 전체 저장소 secret scan: PASS
- CodeSight generate·read: PASS
- Semgrep `1.168.0`: FAIL·거부 — metrics off에서도 OpenTelemetry/X509 runtime crash
- Opengrep `1.22.0` source·license·release checksum: PASS, version check·metrics 강제 차단 조건
- Opengrep local-rule 전체 SAST: PASS
- SAST positive fixture 탐지·negative fixture 비탐지: PASS
- AI hook destructive Git 명령 차단: PASS
- AI hook `.env*` Read·Glob·Grep·Bash·MCP 차단과 일반 소스 Read 허용: PASS
- MCP manifest schema·만료·integrity 검증과 미승인 MCP 호출·설정 변경 차단: PASS
- HANDOFF 필수 구조·staged 동반 변경·PR range validator: PASS
- Bootstrap preview·downstream validator positive/negative fixture: PASS
- pnpm build-script allowlist positive·global allow·strict-disable·unpinned·placeholder negative fixture: PASS
- AI adapter 필수 reference positive·negative fixture: PASS
- Dependency direct version·lockfile-only 승인 positive/negative fixture: PASS
- 원격 clean clone bootstrap·npm audit·security full scan: PASS
- 원격 clean clone CodeSight stale check: 최초 FAIL 후 timestamp 정규화 적용, 최종 PASS
- 최신 clean clone `npm ci --ignore-scripts`·npm audit·checksum bootstrap·full security: PASS
- Markdown 시각 렌더링 검사: 미구현
- 요구사항 상태·release 색인·CodeSight adapter·token profile 문서 `git diff --check`: PASS
- HANDOFF semantic-change positive·metadata-only negative regression: PASS
- CodeSight adapter reference가 포함된 downstream validator regression: PASS
- CodeSight `1.18.0` context 재생성·변경 source 반영: PASS
- AI sensitive-file hook·dependency approval·MCP manifest regression 재실행: PASS
- 변경 파일 Gitleaks·Opengrep 검사: PASS, finding 0
- REQ-045 application discovery·inventory preview positive·missing inventory negative fixture: PASS
- 하위 Node application exact dependency·hook·EditorConfig·CI·deploy·CodeSight drift fixture: PASS
- 실제 `../env-be` 증분 remediation: application inventory·공통 asset·hook·CodeSight·security gate PASS
- PR #4 동일 Railway environment의 frontend·backend·PostgreSQL 복제, Preview CRUD와 Production DB 격리: PASS
- frontend healthcheck intentional failure 후 Git revert application rollback, Preview·Production health: PASS
- Spring Boot 4/SpringDoc 3 OpenAPI syntax·필수 contract·path 제거 breaking fixture·production docs 404: PASS
- Spring MVC actual operation→OpenAPI undocumented endpoint positive·negative 4건: PASS
- Next.js BFF backend method·path mapping positive·stale negative Vitest 7건, Prettier·ESLint: PASS
- REQ-040 env-be BOLA 회귀·rate limit 429/Retry-After·security log redaction/correlation integration: PASS
- 격리 PostgreSQL logical dump·restore record 정합성·pilot RPO 0/RTO 30초 이내: PASS
- readiness ready positive·invalid applicability·missing disposal·false approval negative fixture: PASS
- 실제 env-be applicability·retention·logging·Production restore profile: 의도된 `BLOCKED`, Production 미승인
- Railway PR Preview BFF rate-limit 회귀: 401 5회 후 429, Retry-After·correlation ID 전달 PASS
- 결정론적 BFF rate-limit 순차·header allowlist fixture 포함 frontend 11건: PASS
- Production readiness onboarding template `BLOCKED`, synthetic ready·false approval·missing owner·missing
  strategy positive·negative fixture: PASS
- 기존 project readiness missing preview·최초 materialize·기존 파일 보존·BLOCKED regression: PASS
- v0.2.3 원격 branch clean clone install·bootstrap·전체 fixture·validate·CodeSight·security: PASS
- Playwright fresh-runner apt timeout 재현과 digest-pinned 공식 runtime image 전환: 3-browser E2E PASS
- 전체 저장소 Gitleaks·Opengrep full scan: PASS, finding 0
- 신규 untracked inventory·preview 모듈 `--no-git-ignore` Opengrep 직접 scan: PASS, finding 0
- 신규 untracked BFF contract fixture `--no-git-ignore` Opengrep 직접 scan: PASS, finding 0
- 신규 untracked Production readiness onboarding validator·materializer·fixture `--no-git-ignore` Opengrep
  직접 scan: PASS, finding 0

## 남은 작업

### 우선순위 2: 독립 보안·호환성 확장

2. REQ-043의 dependency license·source snippet scanner 후보를 먼저 공급망 심사하고, 승인 후 exact·
   near match, scanner outage, suppression expiry와 GPL·unknown positive·negative fixture를 구현한다.
3. REQ-042의 Codex·Claude Code 선택형 adapter preview·source hash·drift·uninstall 보존 Eval을 구현한다.
   다른 도구는 실제 지원 요청이 있을 때 순차 검증한다.
4. 필수 bootstrap·security·deployment gate가 안정된 뒤 REQ-041의 수동 bounded-patch pilot을 수행하고,
   selection 재사용 편향·prompt injection·grader tampering negative Eval과 비용을 기록한다.

## 위험·주의

- Opengrep은 opt-out 강제 조건부 승인이므로 version check·metrics 환경변수 검증을 제거하면 안 된다.
- Husky는 downstream 개발환경과 품질 명령 승인 전까지 적용하지 않는다.
- env-be pilot에서 backend를 먼저 구성한 뒤 같은 저장소의 `frontend/`를 추가하자 root manifest만 보는
  validator가 CodeSight·Husky·lint-staged와 frontend profile drift를 놓쳤다. REQ-045로 최초 full-stack
  일괄 구성과 backend/frontend에서 full-stack으로 전환하는 증분 lifecycle, 재귀 application inventory,
  공통 계층 재계산과 application별 CI·배포 검증 요구사항을 추가했다.
- REQ-045 재귀 inventory·application drift 자동 검사는 구현됐지만 기존 downstream은 자동 수정하지
  않는다. `../env-be`가 새 gate를 통과하려면 inventory와 누락된 공통 asset·adapter·hook을 별도 preview·
  dependency 승인 후 remediation해야 한다.
- upstream local Git hook은 아직 활성화되지 않았다. `.husky/_`만으로 적용됐다고 판단하지 않으며,
  정확한 Husky·lint-staged version과 lifecycle·제거 절차를 별도 승인하기 전에는 dependency와 hook을
  추가하지 않는다.
- Superpowers의 원격 이미지 요청과 Agent Skills의 network cache hook은 기본 도입에서 제외했다.
- 현재 `tool/github-speckit`은 원본 clone이 아니라 Claude 통합 프로젝트 산출물이다.

## 다음 시작점

- 먼저 `docs/requirements.md`, `.ai/standards/security.md`와 현재 `git status`를 확인한다.
- 다음은 REQ-043 scanner 후보의 공급망·전송·비용 심사와 승인 경계를 정의한다.
- 이어서 REQ-042 선택형 adapter Eval과 REQ-041 bounded-patch pilot을 순서대로 수행한다.
- REQ-040의 다중 instance limiter·provider restore·법률·retention은 정확한 대상과 책임자 evidence가
  준비될 때까지 Production 차단 상태를 유지한다.
