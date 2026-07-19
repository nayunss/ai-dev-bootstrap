# AI Dev Bootstrap

Codex·Claude Code·GitHub Copilot 등 서로 다른 AI 도구를 사용하더라도 같은 프로젝트 규칙,
보안 경계, 승인된 도구 버전과 검증 절차로 개발을 시작할 수 있게 돕는 프로젝트 로컬
부트스트랩입니다. 신규 프로젝트와 운영 중인 기존 프로젝트를 모두 지원하며 개인 전역 설정을
강제로 덮어쓰지 않습니다.

> 최신 검증 기준: [`v0.2.9-pilot`](docs/releases/v0.2.9-pilot.md)
>
> 처음 사용하는 경우: [처음부터 끝까지 사용 가이드](docs/bootstrap-user-guide.md)

## 제공 기능

### AI 도구가 달라도 같은 규칙으로 작업합니다

프로젝트의 공통 개발 규칙, 보안 수칙과 다음 작업 기록은 `.ai/` 폴더를 기준으로 관리합니다.
Codex, Claude Code 또는 GitHub Copilot 중 어떤 도구를 선택해도 각 도구가 서로 다른 규칙을
임의로 만들지 않고 같은 원본을 읽도록 연결합니다. 작업을 다른 사람이나 다음 AI 세션에 넘길 때는
`HANDOFF.md`에서 완료된 일, 남은 일, 실제 검증 결과를 확인할 수 있습니다.

### 필요한 AI 도구만 프로젝트 안에 연결합니다

사용자는 Codex·Claude Code·GitHub Copilot 중 필요한 도구만 선택할 수 있습니다. 연결 파일은
사용자의 컴퓨터 전체 설정을 바꾸지 않고 현재 프로젝트 안에만 만들어집니다. 원본 규칙이나 생성된
연결 파일이 나중에 몰래 달라지면 source/target hash 검사가 차이를 찾아내므로, 오래된 규칙으로
작업하는 문제를 확인할 수 있습니다.

### 새 프로젝트와 기존 프로젝트를 다르게 시작합니다

빈 프로젝트를 시작할 때는 사용할 언어, framework, database, Git 저장 위치와 승인 담당자처럼
결과에 영향을 주는 질문을 먼저 확인합니다. 이미 운영 중인 프로젝트에서는 기존 설정을 읽기 전용으로
조사하고, 새 기준과 다른 부분을 보여준 뒤에만 보완합니다. 답하지 않은 항목은 임의로 추정하지 않고
`TBD`로 남기며, 필요한 결정이 없으면 위험한 적용을 진행하지 않습니다.

### 프로젝트 구조와 database starter를 안전하게 검토합니다

하나의 application으로 된 저장소와 여러 application이 함께 있는 workspace monorepo를 구분해
starter reference를 제공합니다. 새 파일을 만들기 전 기존 파일과 충돌하는지 확인하고, database
migration 파일은 생성할 수 있어도 SQL을 자동 실행하지 않습니다. 적용 도중 실패하면 이번 작업이
관리한 변경만 원복하며 사용자가 원래 갖고 있던 파일은 삭제하지 않습니다.

### Dependency 설치와 internet 사용 승인을 분리합니다

npm·pnpm·Yarn, Maven·Gradle과 Python 환경에서 필요한 dependency를 어떤 version과 명령으로
설치할지 먼저 계획으로 보여줍니다. 계획을 확인하는 단계에서는 network를 사용하거나 package의
설치 script를 실행하지 않습니다. 실제 다운로드가 필요할 때는 exact version, lockfile과 실행
범위를 확인한 뒤 별도 승인을 받아야 합니다.

### 코드 형식과 기본 품질 검사를 프로젝트 언어에 맞춥니다

JavaScript·Java·Python 프로젝트에서 formatter, linter와 typecheck를 어떤 명령으로 실행해야 하는지
project profile에 기록합니다. 웹 화면이 있는 경우 keyboard 사용, 의미에 맞는 HTML과 오류 표시 등
기본 접근성 계약도 함께 확인합니다. 예시 기술 스택을 모든 프로젝트에 강제로 설치하지 않고 실제
source와 manifest에서 확인된 언어에 맞는 검사만 선택합니다.

### API·전체 서비스·다국어 변경의 어긋남을 찾습니다

FastAPI와 OpenAPI 문서에서 endpoint, 요청값 또는 응답 계약이 서로 달라졌는지 검사할 수 있습니다.
Frontend·backend·공유 코드가 함께 바뀌는 작업은 필요한 파일을 한 묶음으로 계획하고, 일부 파일만
적용된 채 성공으로 표시하지 않습니다. 언어·지역별 메시지 계약과 database rollback artifact도
실제 실행과 분리해 검토할 수 있도록 남깁니다.

### 공통 skill과 선택 skill을 구분해 관리합니다

모든 프로젝트에 필요한 core skill과 특정 작업에만 필요한 optional skill을 구분합니다. Plugin과
실행 가능한 확장은 catalog에 보인다는 이유만으로 설치하거나 실행하지 않고, 공급망·권한·network
검토를 통과한 항목만 별도 승인할 수 있습니다. Upgrade와 uninstall 때도 lock이 소유권과 hash를
확인해 사용자가 수정한 파일이나 원래 있던 동일 파일을 보존합니다.

### Git 저장소와 CI·배포 환경을 프로젝트별로 선택합니다

GitHub, GitLab, 일반 Git remote 또는 원격 저장소를 아직 사용하지 않는 경우를 모두 profile에
표현할 수 있습니다. Branch와 Pull Request review 규칙, CI, artifact 보관소와 deployment provider를
서로 다른 결정으로 다루므로 “GitHub를 쓴다”는 답만으로 배포 서비스까지 자동 선택하지 않습니다.
Remote 생성, push, 권한 변경과 배포는 각각 preview와 사람 승인이 있어야 합니다.

### Production 준비가 부족하면 명확히 멈춥니다

서비스를 실제 운영 환경에 배포하기 전 법률·개인정보 책임자, 보관 기간(retention), 여러 server에서
동작하는 rate limiter 증거와 provider 장애 복구 연습 결과를 확인합니다. 문서에 `approved`라고
적혀 있어도 실제 증거가 없거나 만료됐으면 준비 완료로 판정하지 않습니다. 이 hard gate는 일반
개발 완료와 Production 운영 승인을 분리해 실수로 배포되는 일을 막습니다.

### 변경·검증·요구사항의 증거가 서로 맞는지 확인합니다

Commit에 포함할 staged 파일이 생성 원본과 일치하는지, push·CI·배포·상태 확인이 실제로 어느
단계까지 끝났는지를 구분해 기록합니다. Downstream 사용자가 발견한 문제는 feedback triage를 거쳐
관련 요구사항과 연결하고, `REQ-001`부터 `REQ-052`까지 문서·구현 작업·HANDOFF가 함께 갱신됐는지
CI에서 검사합니다. 하나라도 누락되면 완료로 표시하지 않습니다.

### 비밀과 license 문제를 hosted security gate에서 검사합니다

Gitleaks와 Opengrep로 실수로 포함된 secret과 위험한 코드 pattern을 찾습니다. ScanCode는 검사
대상의 source를 외부로 보내지 않는 network-none 환경에서 license와 출처 정보를 수집하고, 허용
기준을 벗어나거나 판단 근거가 없으면 review를 요구합니다. 이 검사는 GitHub의 hosted workflow에도
연결돼 Pull Request를 merge하기 전에 결과를 확인합니다.

### 적용 전 미리보고 실패하면 이번 변경만 원복합니다

Release adoption 공통 core는 `preview → apply → validate → upgrade → rollback` 순서를 사용합니다.
먼저 생성·변경·보존·차단될 파일과 plan SHA-256을 보여주고, 사용자가 같은 계획을 승인했을 때만
적용합니다. 두 번째 파일을 쓰는 중 오류가 나는 것처럼 일부 작업만 성공한 경우 전체 transaction을
실패로 처리하고 이번 작업이 변경한 범위만 원복합니다. 이 core는 CLI와 web surface가 함께
사용하므로 진입 경로가 달라도 같은 계획과 결과를 만들어야 합니다.

위 항목에서 `reference PASS` 또는 `synthetic PASS`라고 표시된 기능은 정해진 예제와 자동 검사를
통과했다는 뜻입니다. 실제 사용자 프로젝트에서 dependency를 설치했거나 database를 변경했다는
뜻이 아니며, Git provider 설정 변경이나 Production 배포를 승인했다는 뜻도 아닙니다. 모든 언어와
기술 스택을 지원한다는 의미로 확대해서도 안 됩니다. 현재 지원·검증 경계는
[요구사항 상태표](docs/requirements.md)와 [최신 release note](docs/releases/v0.2.9-pilot.md)를
기준으로 확인합니다.

## AI 도구에 바로 물어보기

GitHub App Web Portal을 통하지 않아도 된다. 이 저장소를 clone하거나 공식 release ZIP을 내려받아
압축을 푼 뒤, 그 폴더를 Codex·Claude Code 등 AI 코딩 도구에서 열고 아래 프롬프트를 입력한다.
`<대상 프로젝트 절대 경로>`만 실제 적용할 프로젝트 경로로 바꾼다. 아직 대상이 없으면 `미정`으로
둔다.

```text
이 폴더는 AI Dev Bootstrap 저장소를 clone했거나 공식 release ZIP을 푼 루트입니다.
공통 AI 개발환경을 <대상 프로젝트 절대 경로>에 안전하게 도입할 준비를 해주세요.

먼저 루트 AGENTS.md 또는 현재 AI 도구의 진입 파일과 그 파일이 안내하는 공통 정책·HANDOFF·
CodeSight·사용 문서를 실제 파일에서 읽으세요. Git clone과 release archive 중 어느 방식인지,
확인 가능한 tag·commit·checksum, upstream-maintenance와 downstream-adoption 중 올바른 모드,
대상 경로를 먼저 확인하세요.

대상 경로가 `미정`이면 적용하지 말고 필요한 경로 한 가지만 질문하세요. 경로가 확정되면 기존 변경과
untracked 파일을 보존하고 scripts/bootstrap preview <대상 경로>와 scripts/validate <대상 경로>의
읽기 전용 진단만 수행하세요.

첫 응답은 source 버전·무결성, 모드·대상, 진단 결과, 변경 0건 여부, 다음 한 단계와 필요한 승인만
쉬운 말로 정리하세요. 이 단계에서는 파일 변경, .env* 읽기, dependency 설치, apply·--approve,
외부 업로드, credential 접근, Git write, DB·provider·배포 작업을 하지 마세요. 실제 변경은 preview와
정확한 명령을 보여준 뒤 제가 별도로 승인한 경우에만 진행하세요.
```

위 문구는 AI가 처음부터 설치를 추측하지 않도록 목표·context·첫 출력·승인 경계를 한 번에 전달하도록
최적화한 시작 프롬프트다. 전체 원문과 ZIP 무결성 중단 조건은
[Clone·ZIP 사용자용 프롬프트](.ai/prompts/adopt-cloned-bootstrap.md), 다음 단계별 안내는
[처음부터 끝까지 사용 가이드](docs/bootstrap-user-guide.md#ai-도구에-첫-프롬프트-입력하기)를
따른다.

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

## GitHub App Web Portal

GitHub 저장소의 비개발자 기본 경로인 GitHub App Web Portal은 **local no-network reference**까지
구현됐습니다. 로컬 브라우저에서 저장소 선택, 변경 미리보기, exact plan 승인과 PR-only 결과 흐름을
확인할 수 있지만 실제 GitHub 로그인·App 설치·repository write·branch·PR 생성은 수행하지 않습니다.

- [Local no-network 실행 가이드](docs/github-app-web-portal-local-guide.md)
- [구현·보안 계약과 Production pilot 중단 조건](docs/github-app-web-portal-reference.md)
- [CLI로 현재 제공 기능 사용하기](docs/bootstrap-user-guide.md#빠른-시작-변경-없이-확인)

별도 경로로 GitHub Actions Web Adoption P0 reference도 구현했습니다. 이 경로는 Actions의
**Run workflow**에서 read-only preview를 실행하고,
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
- [최신 v0.2.9-pilot release note](docs/releases/v0.2.9-pilot.md)
- [Upstream–Downstream 아키텍처](docs/upstream-downstream-architecture.md)
- [공급망 보안](docs/supply-chain-security.md)
- [Production readiness](docs/web-service-production-readiness.md)
