# Common Project

각 사용자가 이 저장소를 clone한 뒤, 서로 다른 Codex·Claude Code 등의 개인 환경을 동일한
프로젝트 규칙, 승인된 도구 버전, 스킬, hook과 검증 절차로 맞춘 다음 개발을 시작하도록 돕는
AI 개발 환경 표준화 프로젝트입니다.

## 목표

- Codex, Claude Code 등 특정 AI 도구에 종속되지 않는 공통 규칙을 정의합니다.
- 개발자마다 다른 스킬과 플러그인 구성을 재현 가능한 형태로 관리합니다.
- 프로젝트 폴더 구조와 AI 관련 설정의 기준을 제공합니다.
- 새로운 프로젝트와 기존 프로젝트에 적용할 수 있는 설치·검증 절차를 만듭니다.
- 개인 전역 설정을 강제로 덮어쓰지 않고 프로젝트 로컬 환경을 우선합니다.

## clone 후 목표 흐름

```text
git clone
   ↓
읽기 전용 환경 진단
   ↓
승인된 버전·해시로 프로젝트 로컬 bootstrap
   ↓
Codex·Claude Code 등 도구별 얇은 어댑터 연결
   ↓
validate + 필수 security/Eval gate
   ↓
프로젝트 개발 시작
```

공통 진입점은 기본적으로 preview만 출력한다.

```sh
scripts/bootstrap preview
scripts/validate /absolute/path/to/downstream
```

dependency 설치는 정확한 package manager와 lockfile, project-local runtime을 확인하고
`--ignore-scripts`·strict peer mode를 사용한다. network가 필요하므로 preview 후 명시적으로
`--allow-network`를 전달해야 한다. Playwright browser와 Husky는 이 단계에서 자동 설치하지 않는다.

## 두 가지 사용 방식

- 공통 환경 유지보수: maintainer와 contributor가 skill, plugin, adapter, 보안과 Eval을 개선해
  versioned upstream release를 만든다.
- 프로젝트 도입: 회사·팀·개인이 검증된 release를 고정하고 조직 정책과 기술 스택을 확장해
  구성원들이 같은 AI 환경에서 제품을 개발하게 한다.

Husky 같은 기술 스택별 hook manager는 clone 직후 설치하지 않습니다. downstream의 개발환경과
실제 format·lint·test 명령이 승인된 뒤 해당 프로파일에서 적용합니다.

회사·프로젝트의 비밀과 전용 규칙은 public upstream과 분리한다. 자세한 책임과 업데이트 흐름은
[`docs/adoption-and-maintenance-model.md`](docs/adoption-and-maintenance-model.md)를 따른다.

## 현재 상태

Pilot 자동화와 보안 baseline을 제공하는 pre-release 단계입니다.

### 검증 범위

요구사항과 아키텍처의 목표는 언어·framework·AI 도구에 종속되지 않는 공통 환경이다. 그러나 현재
실제 downstream 적용과 배포까지 완료한 pilot은 **프론트엔드 환경 한 건**이다.

| 범위 | 현재 검증 수준 |
|---|---|
| 프론트엔드 | Next.js·TypeScript·pnpm·Zustand·SCSS Modules·Vitest·Playwright·GitHub Actions·Vercel로 bootstrap, 보안·품질·E2E, Preview와 Production 검증 완료 |
| 백엔드 | 언어 중립 보안·품질·HITL 질문 항목만 존재. Node.js·NestJS·Python·Spring Boot 등 어떤 스택도 기본값이 아니며 실제 backend bootstrap·DB·migration·CI·배포 Eval은 미검증 |
| 풀스택 | frontend·backend 분리, secret·BaaS·배포 경계의 설계 요구사항만 존재. 실제 통합 저장소의 workspace·계약 테스트·통합 E2E·다중 배포 Eval은 미검증 |

따라서 “upstream 요구사항 전체가 프론트엔드 기준으로 작성됐다”는 표현은 정확하지 않다. 요구사항은
대부분 공통·언어 중립으로 작성됐지만, 현재 자동화와 운영 검증의 실증 근거가 프론트엔드 pilot에
편중되어 있다는 것이 정확하다. 프론트엔드 pilot의 발견 사항은 `REQ-033`~`REQ-036`과 관련 문서·
validator에 환류한다. backend와 fullstack을 지원 완료로 표시하려면 각각 독립 downstream pilot과
positive·negative Eval을 통과해야 한다.

Frontend·backend·fullstack 스펙은 프로젝트마다 사용자가 정의한다. 기본 질문에 없는 언어,
framework, database, infrastructure와 품질 도구도 개발환경 프로파일에 추가할 수 있으며, upstream은
감지·질문·공급망 심사·설치 승인·검증 adapter를 통해 적용한다. 문서의 특정 기술 조합은 검증 사례나
예시일 뿐 자동 설치 기본값이 아니다.

설계 문서와 요구사항은 [`docs/`](docs/README.md)에서 관리합니다.

## 문서 원칙

- 특정 AI 제품에 종속되지 않는 규칙을 먼저 정의합니다.
- `AGENTS.md`, `CLAUDE.md` 같은 도구별 파일은 공통 규칙을 연결하는 어댑터로 취급합니다.
- 제안과 확정된 요구사항을 구분하고, 중요한 결정은 근거와 함께 기록합니다.
