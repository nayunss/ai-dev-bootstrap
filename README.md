# AI Dev Bootstrap

Codex·Claude Code·GitHub Copilot 등 서로 다른 AI 도구를 사용하더라도 같은 프로젝트 규칙,
보안 경계, 승인된 도구 버전과 검증 절차로 개발을 시작할 수 있게 돕는 프로젝트 로컬
부트스트랩입니다. 신규 프로젝트와 운영 중인 기존 프로젝트를 모두 지원하며 개인 전역 설정을
강제로 덮어쓰지 않습니다.

> 최신 검증 기준: [`v0.2.8-pilot`](docs/releases/v0.2.8-pilot.md)
>
> 처음 사용하는 경우: [처음부터 끝까지 사용 가이드](docs/bootstrap-user-guide.md)

## 제공 기능

- `.ai/`를 단일 진실 원천으로 사용하는 AI 도구 중립 engineering·security·handoff 규칙
- Codex·Claude Code·GitHub Copilot 선택형 project-local adapter와 source/target hash drift 검증
- 신규 프로젝트 초기 질문과 기존 프로젝트 retrofit을 위한 onboarding·개발환경 profile
- 단일 프로젝트와 workspace monorepo의 stack·DB starter reference 및 충돌·rollback 검사
- npm·pnpm·Yarn·Maven·Gradle·Python dependency bootstrap 계약과 network 승인 분리
- JavaScript·Java·Python formatter·linter·typecheck 및 웹 접근성 adapter 계약
- FastAPI/OpenAPI contract drift, full-stack materialization·locale·DB rollback artifact 계약
- core·optional skill bundle, reviewed plugin catalog와 설치·upgrade·보존 uninstall 검증
- GitHub·GitLab·generic/none hosting, branch/review, CI·artifact·deployment provider profile
- 법률·retention·다중-instance limiter·provider restore를 포함한 Production readiness hard gate
- staged tree invariant, delivery evidence 상태, feedback triage와 REQ-001–REQ-052 추적성 CI gate
- Gitleaks·Opengrep와 network-none ScanCode license-provenance hosted security gate
- release adoption preview·apply·validate·upgrade·rollback 공통 core와 부분 실패 transaction 원복

Reference·synthetic PASS는 실제 dependency 설치, DB write, provider 변경, Production 배포 또는
모든 기술 스택의 지원 완료를 의미하지 않습니다. 현재 지원·검증 경계는
[요구사항 상태표](docs/requirements.md)와 [최신 release note](docs/releases/v0.2.8-pilot.md)를
기준으로 확인합니다.

## 빠른 시작

```text
검증된 release 고정
   ↓
읽기 전용 환경 진단
   ↓
프로젝트별 질문·profile 확정
   ↓
preview 확인 후 선택 adapter 적용
   ↓
validate + project별 quality/security gate
   ↓
프로젝트 개발 시작
```

```sh
git clone https://github.com/nayunss/ai-dev-bootstrap.git
cd ai-dev-bootstrap
git checkout v0.2.8-pilot
scripts/bootstrap preview
scripts/bootstrap preview /absolute/path/to/downstream
scripts/validate /absolute/path/to/downstream
```

위 명령은 시작점입니다. 신규·기존 프로젝트 적용, adapter 선택, 검증, update와 rollback까지의
전체 절차는 [부트스트랩 사용 가이드](docs/bootstrap-user-guide.md)를 따르세요.

## GUI 설치

현재 `v0.2.8-pilot`은 GUI·CLI 공통 adoption core와 synthetic GUI surface 검증을 포함하지만,
서명·notarization된 데스크톱 GUI 설치 파일은 아직 발행하지 않았습니다. 따라서 지금 설치 가능한
GUI 링크는 없으며, release page의 source archive를 GUI 앱으로 오해하면 안 됩니다.

- [GUI 설치 자산 및 최신 릴리즈 확인](https://github.com/nayunss/ai-dev-bootstrap/releases/latest)
- [현재 GUI 설치 자산·구현·보안·배포 상태](docs/gui-installation-distribution-review.md)
- [CLI로 현재 제공 기능 사용하기](docs/bootstrap-user-guide.md#빠른-시작-변경-없이-확인)

Desktop installer 발행은 현재 `DEFERRED / OUT-OF-SCOPE`입니다. GitHub 저장소의 비개발자 기본
경로인 GitHub App Web Portal은 local no-network reference까지 구현됐고, 그 전 단계인 Actions P0
delivery mechanics pilot도 PASS했습니다. 실제 App 등록·배포와 사람 browser Eval은
`NOT-RUN`입니다. `curl | sh`,
unsigned 실행 파일이나 비공식 mirror는 지원 설치 경로가 아닙니다.

Apple 계정이나 로컬 installer 없이 검증할 수 있는 별도 경로로 GitHub Actions Web Adoption P0
reference를 구현했습니다. 이 경로는 Actions의 **Run workflow**에서 read-only preview를 실행하고,
사람이 승인한 exact plan만 새 branch와 PR로 제안합니다. 분리된 public downstream delivery pilot은
PASS했지만 현재 allowlist는 synthetic release뿐이므로 production 지원 경로로 표시하지 않습니다.

- [GitHub Actions P0의 사용 범위·권한·중단 조건](docs/web-adoption-delivery-review.md)
- [Downstream에 복사할 workflow template](docs/templates/github-actions-web-adoption-p0.yml)
- [GitHub App Portal local reference 실행·보안·Production pilot 조건](docs/github-app-web-portal-reference.md)

## 적용 방식

- 공통 환경 유지보수: maintainer와 contributor가 skill, adapter, 보안과 Eval을 개선해 versioned
  upstream release를 만듭니다.
- 프로젝트 도입: 회사·팀·개인이 검증된 release·commit·checksum을 고정하고 project profile과
  조직 정책을 추가합니다.

AI 공통 지침은 `.ai/standards/`에 한 번만 두고 `AGENTS.md`, `CLAUDE.md` 같은 도구별 파일은 얇은
진입점으로 유지합니다. 회사·프로젝트의 비밀과 전용 규칙은 public upstream과 분리하며,
[유지보수와 도입 모델](docs/adoption-and-maintenance-model.md)을 따릅니다.

## 현재 실제 검증 범위

실제 downstream 적용과 배포까지 완료한 pilot은 Next.js frontend와 Spring Boot + Next.js
full-stack 조합입니다. 다른 stack의 schema·adapter·fixture PASS를 실제 downstream 지원 완료로
확대하지 않습니다.

| 범위 | 현재 검증 수준 |
|---|---|
| 프론트엔드 | Next.js·TypeScript·pnpm·Zustand·SCSS Modules·Vitest·Playwright·GitHub Actions·Vercel로 bootstrap, 보안·품질·E2E, Preview와 Production 검증 완료 |
| 백엔드 | Spring Boot 4.1.0·Java 21·Maven·PostgreSQL·Flyway·JWT·Testcontainers·SpringDoc 3·GitHub Actions·Railway 조합에서 compile, unit·integration, BOLA 회귀, 단일-instance rate limit, 보안 log redaction·correlation, 격리 logical restore, readiness fixture와 OpenAPI contract·breaking fixture·production docs 404를 검증. 실제 retention·법률 검토·Production provider restore와 다른 backend stack adapter는 미검증 |
| 풀스택 | Spring Boot backend에 Next.js frontend와 BFF를 증분 추가해 application별 CI, 3-browser·mobile E2E, Railway private network, 같은 PR environment의 frontend·backend·PostgreSQL 격리 CRUD, BFF rate-limit·correlation header 계약과 application revert rollback을 검증. 최초 frontend·backend·shared 일괄 materialize와 부분 filesystem 실패 원복·paired DB rollback artifact 계약은 synthetic reference Eval을 통과했지만 실제 DB migration write·rollback, 다중-instance rate limit과 provider restore는 미검증 |

## 주요 문서

- [처음부터 끝까지 사용 가이드](docs/bootstrap-user-guide.md)
- [전체 문서 목록](docs/README.md)
- [요구사항과 구현·검증 상태](docs/requirements.md)
- [최신 v0.2.8-pilot release note](docs/releases/v0.2.8-pilot.md)
- [Upstream–Downstream 아키텍처](docs/upstream-downstream-architecture.md)
- [공급망 보안](docs/supply-chain-security.md)
- [Production readiness](docs/web-service-production-readiness.md)
