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

AI 도구의 공통 작업 지침은 `.ai/standards/engineering.md`에 한 번만 둔다. Claude Code는
`CLAUDE.md`, Codex와 AGENTS 규약 지원 도구는 `AGENTS.md`, 그 밖의 도구는 `.ai/README.md`를 얇은
진입점으로 사용한다. 프로젝트별 기술 스택과 반복되는 함정은 공통 지침에 복제하지 않고 각각
`docs/development-environment.md`와 `docs/project-maintenance.md`에 기록한다.

공통 진입점은 기본적으로 preview만 출력한다.

```sh
scripts/bootstrap preview
scripts/bootstrap preview /absolute/path/to/downstream
scripts/validate /absolute/path/to/downstream
```

대상 경로를 함께 주면 root와 하위 manifest를 재귀적으로 찾아 단일 application인지, 선언되지 않은
application이 있는지 읽기 전용으로 표시한다. 다중 application 저장소는
`docs/development-environment.md`의 JSON inventory에 application별 quality·CI·deploy·hook과 공통
CodeSight 상태를 선언해야 validate를 통과한다.

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

현재는 공통 환경의 **설계와 downstream pilot 검증 단계**다. 이 저장소에 있는 일부 script·validator·
fixture는 설계의 실행 가능성과 누락을 검증하기 위한 reference automation이며, 최종 실제 환경 구현이
완료됐다는 뜻이 아니다.

요구사항과 핵심 경로의 설계·검증이 끝나면 [`docs/`](docs/README.md)와
[`docs/requirements.md`](docs/requirements.md)를 구현 입력 계약으로 삼아 실제 공통 환경을 구현한다.
그전에는 pilot에서 발견된 실패를 요구사항·설계 문서·Eval에 환류하고, 검증하지 않은 범위를 완료나
지원으로 표시하지 않는다. 특정 pilot 기술 조합도 실제 환경의 공통 기본값으로 확정하지 않는다.
한 명 또는 여러 사람이 검증에 참여할 때는
[Downstream Pilot 검증 가이드](docs/distributed-pilot-testing-guide.md)에 따라 upstream SHA, 독립 downstream,
격리 자원, AI provider·tool·model·mode provenance와 공통 결과 형식을 사용한다.
설계 완료는 참여 maintainer를 포함한 모든 tester의 배정 필수 항목이 전부 PASS일 때만 판정한다.

### 검증 범위

요구사항과 아키텍처의 목표는 언어·framework·AI 도구에 종속되지 않는 공통 환경이다. 현재 실제
downstream 적용과 배포까지 완료한 pilot은 **Next.js frontend 한 건**과 **Spring Boot + Next.js
full-stack 한 건**이다. full-stack pilot은 backend-only로 시작한 뒤 frontend를 추가하는 증분 전환도
포함한다.

| 범위 | 현재 검증 수준 |
|---|---|
| 프론트엔드 | Next.js·TypeScript·pnpm·Zustand·SCSS Modules·Vitest·Playwright·GitHub Actions·Vercel로 bootstrap, 보안·품질·E2E, Preview와 Production 검증 완료 |
| 백엔드 | Spring Boot 4.1.0·Java 21·Maven·PostgreSQL·Flyway·JWT·Testcontainers·SpringDoc 3·GitHub Actions·Railway 조합에서 compile, unit·integration, BOLA 회귀, 단일-instance rate limit, 보안 log redaction·correlation, 격리 logical restore, readiness fixture와 OpenAPI contract·breaking fixture·production docs 404를 검증. 실제 retention·법률 검토·Production provider restore와 다른 backend stack adapter는 미검증 |
| 풀스택 | Spring Boot backend에 Next.js frontend와 BFF를 증분 추가해 application별 CI, 3-browser·mobile E2E, Railway private network, 같은 PR environment의 frontend·backend·PostgreSQL 격리 CRUD, BFF rate-limit·correlation header 계약과 application revert rollback을 검증. 최초 full-stack 일괄 materialize, 다중-instance rate limit과 DB migration/provider restore rollback은 미완료 |

요구사항은 대부분 공통·언어 중립으로 작성됐지만 검증 근거는 위 두 조합에 한정된다. frontend
pilot의 발견 사항은 `REQ-033`~`REQ-036`에, backend→full-stack pilot의 발견 사항은 `REQ-045`와 관련
문서에 환류했다. pilot 성공은 공통 bootstrap·validator가 모든 stack과 전환 경로를 지원한다는 뜻이
아니다. 지원 완료로 표시하려면 최초 full-stack 일괄 구성, 재귀 application inventory,
CodeSight·hook·CI drift의 positive·negative Eval과 추가 stack 호환성 검증이 필요하다.

Frontend·backend·fullstack 스펙은 프로젝트마다 사용자가 정의한다. 기본 질문에 없는 언어,
framework, database, infrastructure와 품질 도구도 개발환경 프로파일에 추가할 수 있으며, upstream은
감지·질문·공급망 심사·설치 승인·검증 adapter를 통해 적용한다. 문서의 특정 기술 조합은 검증 사례나
예시일 뿐 자동 설치 기본값이 아니다.

설계 문서와 요구사항은 [`docs/`](docs/README.md)에서 관리합니다.

## 문서 원칙

- 특정 AI 제품에 종속되지 않는 규칙을 먼저 정의합니다.
- `AGENTS.md`, `CLAUDE.md` 같은 도구별 파일은 공통 규칙을 연결하는 어댑터로 취급합니다.
- 제안과 확정된 요구사항을 구분하고, 중요한 결정은 근거와 함께 기록합니다.
