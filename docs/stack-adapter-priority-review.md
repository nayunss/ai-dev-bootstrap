# 2026년 기준 최초 검증 Stack과 Adapter 우선순위 검토

상태: 검토 완료
기준일: 2026-07-17
관련 요구사항: `REQ-009`~`REQ-014`, `REQ-026`~`REQ-028`, `REQ-033`~`REQ-036`, `REQ-044`, `REQ-045`

## 목적

frontend, backend와 full-stack project의 최초 공통 adapter 구현 순서를 현재 개발자 사용량에 근거해
정한다. 특정 stack을 모든 프로젝트의 기본값으로 자동 적용하는 목록이 아니라, 사용자가 stack을
선택했을 때 upstream이 먼저 제공·검증할 adapter backlog다.

이 문서의 “2026년 기준”은 2026년 수치만 사용한다는 뜻이 아니라 **2026-07-17 현재 공식적으로
공개된 최신 결과**를 사용한다는 뜻이다. 현재 최신 연례 결과는 Stack Overflow Developer Survey
2025, GitHub Octoverse 2025와 State of JavaScript 2025다. GitHub의 2026년 2월 최신 분석도
Octoverse 2025 데이터를 사용한다. 공개되지 않은 2026 Stack Overflow·Octoverse 결과를 추정하지
않는다.

인기만으로 보안, 유지보수성 또는 project 적합성을 보장할 수 없다. 우선순위는 다음 신호를 함께
사용한다.

1. 공개 개발·업무 사용량
2. 신규 repository에서의 언어 성장
3. frontend·backend·full-stack 역할별 대표성
4. exact version, quality·test·build·contract·deployment를 검증할 수 있는가
5. 기존 reference와의 중복이 아니라 새로운 호환성 경계를 검증하는가

## 근거

- GitHub가 2026년 2월 갱신한
  [최신 Octoverse 분석](https://github.blog/news-insights/octoverse/what-the-fastest-growing-tools-reveal-about-how-software-is-being-built/)과
  [Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)에서
  TypeScript가 2025년 8월 GitHub 사용 언어 1위가 됐고 100만 명 이상의 contributor가 증가했음을
  확인했다. Python도 약 85만 contributor, 48.8% 증가했다.
- [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/technology)는 Python
  사용이 전년 대비 7%p 증가했고, FastAPI가 web framework 영역에서 5%p 증가한 대표 성장 항목이라고
  설명한다. Node.js는 가장 널리 사용되는 web technology이며 ASP.NET Core·Express·FastAPI·Spring
  Boot가 주요 backend 후보군을 이룬다.
- [State of JavaScript 2025 frontend framework](https://2025.stateofjs.com/en-US/libraries/front-end-frameworks/)는
  React, Vue, Angular, Svelte 순의 사용 순위가 전년과 동일하게 유지됐다고 설명한다.
- [State of JavaScript 2025 library](https://2025.stateofjs.com/en-US/libraries/)의 사용 경험은
  Vite 84.4%, React 83.6%, Express 79.9%, Next.js 58.6%다.
- [State of JavaScript 2025 meta-framework](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)는
  Next.js가 사용량을 계속 늘리며 meta-framework 영역을 지배하지만 만족도는 하락하고 있다고
  설명한다. 따라서 P0 사용량 근거로 채택하되 complexity·lock-in·deployment negative fixture를
  강화한다.

설문 모집단과 GitHub repository count는 전체 시장 점유율과 동일하지 않다. full-stack 조합별 공개
사용량 자료는 제한적이므로 full-stack 순서는 위 언어·frontend·backend·database 신호를 조합한
**추론**이다. 이 문서에서 수치가 없는 조합을 정밀한 시장 점유율처럼 표현하지 않는다.

## 우선순위 정의

| 등급 | 의미 |
|---|---|
| P0 | 최초 지원 baseline. clean install·failure·uninstall/rollback과 실제 downstream pilot이 release 필수 |
| P1 | 다음 확대군. P0 공통 core가 안정된 뒤 adapter별 deterministic fixture와 독립 pilot 수행 |
| P2 | 수요가 크지만 P0·P1보다 사용량 또는 공통성 신호가 낮은 확대군 |
| P3 | 명시적 downstream 수요가 있을 때 검증하는 장기 후보. 지원 완료로 선표시하지 않음 |

## Frontend adapter

| 우선순위 | Stack | 선정 이유 | 필수 adapter 경계 |
|---|---|---|---|
| P0 | React + TypeScript + Vite | React의 업무 사용이 가장 높고 TypeScript가 GitHub 사용 1위, Vite 사용 경험도 높음 | npm·pnpm, format·linter·typecheck, Vitest, Testing Library, Playwright·axe, SPA build·preview |
| P1 | Vue + TypeScript + Vite | State of JS 업무 사용 2위 | Vue SFC, vue-tsc, ESLint·formatter, Vitest, Playwright·axe |
| P1 | Angular + TypeScript | 업무 사용이 Vue와 근접하고 enterprise project 경계를 별도로 검증할 가치가 큼 | Angular CLI, workspace/application root, compiler·lint·test·build, accessibility |
| P2 | Svelte + TypeScript + Vite | 상위 3개보다 사용량은 낮지만 업무 사용 4위이며 만족도·성장 신호가 있음 | Svelte compiler/check, Vitest, Playwright·axe |

React를 선택했다고 Next.js를 자동 설치하지 않는다. browser-only frontend는 React+Vite로 검증하고,
SSR·server component·route handler가 필요한 project만 full-stack의 Next.js adapter로 보낸다.

## Backend adapter

backend 지원은 language·framework만으로 완료하지 않는다. primary database, schema/migration tool,
transaction·test isolation, backup/restore 경계와 application rollback을 함께 profile로 검증한다.
database가 필요 없는 API·worker는 사용자가 `none`을 선택할 수 있지만 adapter가 임의로 DB를
생략했다고 추론하지 않는다.

| 우선순위 | Stack profile | 선정 이유 | 필수 adapter 경계 |
|---|---|---|---|
| P0 | Node.js + TypeScript + Express + PostgreSQL | Node.js가 가장 널리 쓰이는 web technology이고 JavaScript·TypeScript repository 기반이 가장 크며 PostgreSQL은 최신 Stack Overflow 조사에서 가장 널리 쓰이는 DB | npm·pnpm, ESLint·typecheck, unit·integration, OpenAPI, ORM/query 선택, migration up/down artifact, transaction·restore |
| P1 | C# + ASP.NET Core + PostgreSQL 또는 SQL Server | 2025 web technology 상위 backend 후보이며 C#은 GitHub 주요 신규 repository 언어군; SQL Server는 .NET 기존 project 호환에 필요 | dotnet SDK/NuGet lock, formatter·analyzer, test, OpenAPI, EF Core migration, provider별 restore |
| P1 | Python + FastAPI + PostgreSQL | Python의 높은 사용·성장과 FastAPI의 5%p 성장 | uv/pip 계열 exact lock adapter, Ruff·typecheck, pytest, OpenAPI·docs exposure, migration·transaction |
| P1 | Java + Spring Boot + PostgreSQL | Java는 GitHub 주요 언어이고 Spring Boot는 enterprise backend 대표 후보; 기존 pilot 증거 존재 | Maven·Gradle, formatter·lint, compile·unit·integration, SpringDoc, Flyway/Liquibase 선택, restore |
| P2 | Python + Django + PostgreSQL | Python 기반의 성숙한 server-rendered/API project 수요를 FastAPI와 다른 경계로 검증 | Django migration, settings split, static asset, transaction test, Django REST 선택 |
| P2 | PHP + Laravel + MySQL 또는 PostgreSQL | PHP가 GitHub 상위 언어군이며 기존 web application retrofit 수요를 대표 | Composer lock, Pint·PHPStan, PHPUnit/Pest, migration·transaction·queue |
| P3 | Go + 표준 HTTP/router profile + PostgreSQL | 상위 후보보다 web framework 설문 사용량은 낮지만 cloud/backend 수요가 존재 | Go module, gofmt·vet·test, router 선택 비강제, SQL migration, OpenAPI |

Node.js adapter는 Express를 최초 reference로 사용하지만 framework를 숨겨진 기본값으로 강제하지 않는다.
NestJS 등 구조화 framework는 별도 profile로 추가하고 Express 검증 결과를 그대로 승계하지 않는다.

## Database adapter

[Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/technology)의 database 사용
신호를 기준으로 PostgreSQL을 최초 relational baseline으로 둔다. 순위는 신규 project의 검증 순서이며
기존 project의 database를 인기 순위에 맞춰 migration하라는 의미가 아니다.

| 우선순위 | Database | 적용 범위와 필수 검증 |
|---|---|---|
| P0 | PostgreSQL | Node·FastAPI·Spring Boot와 full-stack 최초 baseline. exact server/client version, schema migration, transaction isolation, test container 또는 격리 instance, logical backup·restore artifact를 검증 |
| P1 | MySQL | 높은 기존·신규 web 사용량을 위한 relational variant. PostgreSQL SQL·driver·migration을 재사용하지 않고 charset·collation·transaction·dump/restore 차이를 검증 |
| P1 | SQLite | local·embedded·desktop·소규모 project variant. file locking, concurrent write, migration, backup copy 일관성을 검증하며 Production server DB 기본값으로 승격하지 않음 |
| P1 | Microsoft SQL Server | ASP.NET Core와 enterprise 기존 project variant. driver, EF Core migration, schema·identity, backup/restore provider 경계를 검증 |
| P2 | MongoDB | document model을 명시적으로 선택한 project variant. schema validation, index migration, transaction 지원 범위와 dump/restore를 relational DB와 별도 검증 |
| 보조 | Redis | primary system of record 기본값이 아님. cache·session·distributed rate-limit·queue 역할별 TTL, eviction, persistence와 장애 시 동작을 별도 profile로 검증 |

모든 backend profile은 다음 값을 project별로 질문하고 기록한다.

- primary DB 또는 `none`, 정확한 product·version과 deployment provider
- driver·ORM/query layer와 exact version
- schema source of truth와 forward/rollback migration 명령
- test DB 격리, fixture와 transaction cleanup
- data category별 retention·파기·legal hold 책임자
- backup 방식, 실제 restore rehearsal, RPO·RTO와 무결성 evidence

fixture에서 SQL migration 파일을 생성·검사하는 것과 실제 DB에 write하는 것은 별도 승인 경계다.
adapter deterministic PASS만으로 Production DB migration이나 restore를 실행하지 않는다.

## Full-stack adapter

full-stack은 frontend와 backend 이름만 나열하지 않고 application root, shared contract, database,
통합 test와 migration rollback 조합을 검증한다.

| 우선순위 | Stack profile | 선정 이유 | 필수 통합 경계 |
|---|---|---|---|
| P0 | Next.js + TypeScript + PostgreSQL | Next.js가 meta-framework 업무 사용에서 크게 앞서며 React·TypeScript와 PostgreSQL의 광범위한 사용 신호를 결합 | App Router/Pages 구분, server/client boundary, route handler, migration artifact, Playwright, Preview 격리 |
| P0 | React+Vite frontend + Node.js/Express TypeScript backend + PostgreSQL | 가장 넓은 JavaScript·TypeScript/Node 사용 기반을 분리 application 구조에서도 검증 | frontend/backend root, OpenAPI client contract, CORS/BFF 선택, 통합 test, independent deploy·rollback |
| P1 | React+Vite frontend + ASP.NET Core backend + PostgreSQL | React와 상위 enterprise backend 후보의 대표 이종 언어 조합 | npm+NuGet lock, OpenAPI generation, auth/BOLA, migration·rollback, dual CI |
| P1 | React+Vite frontend + Spring Boot backend + PostgreSQL | React·Java enterprise 조합이며 기존 Spring Boot+Next.js pilot을 더 일반적인 분리 frontend 경계로 확대 | npm+Maven/Gradle, SpringDoc contract, Flyway/Liquibase 선택, dual deploy |
| P1 | Nuxt + TypeScript + PostgreSQL | Vue 업무 사용 2위와 meta-framework Nuxt 업무 사용 2위 | Nitro/server route, Vue boundary, migration artifact, SSR/Preview |
| P2 | Angular frontend + ASP.NET Core 또는 Spring Boot backend + PostgreSQL | enterprise frontend·backend 조합을 대표하지만 조합 수가 커서 P1 결과 후 세부 profile을 선택 | generated client, auth, monorepo/separate root, migration, multi-job CI |
| P2 | SvelteKit + TypeScript + PostgreSQL | 사용량은 낮지만 성장·만족도 신호가 있는 end-to-end TypeScript 후보 | server/client boundary, form/action, migration, Playwright |

full-stack profile도 위 database adapter를 참조한다. database 선택은 사용자의 기존 project와 운영
요구를 덮어쓰지 않으며 frontend와 backend가 같은 임시 environment의 올바른 DB instance를 사용하는지
통합 검증한다.

## 구현 순서

1. P0 공통 profile schema에서 runtime, package manager, application root, quality, test, contract,
   database·migration, CI·deployment와 rollback 필드를 확정한다.
2. frontend React+Vite, backend Node+Express, full-stack Next.js와 분리 React+Node 조합을 clean fixture로
   구현한다.
3. 기존 Spring Boot·Next.js pilot과 새 P0 fixture가 같은 공통 계약을 통과하는지 확인한다.
4. P1은 언어별 dependency lifecycle과 toolchain이 다르므로 C#·Python·Java·Vue/Nuxt를 서로 독립된
   adapter로 구현한다.
5. 실제 downstream pilot이 없는 adapter는 deterministic PASS까지만 표시하고 지원 완료로 승격하지
   않는다.

## 재검토 규칙

- Stack Overflow 연례 Developer Survey, GitHub Octoverse와 State of JavaScript의 새 결과가 공개된
  뒤 연 1회 검토한다. 연도 표기보다 기준일 현재 실제 최신 공개본인지 먼저 확인한다.
- framework major version, package manager, official scaffold 또는 LTS 정책 변경 시 해당 adapter를
  재심사한다.
- P0/P1 이동은 한 자료의 일시적 상승만으로 결정하지 않고 최소 두 독립 신호 또는 실제 downstream
  수요를 요구한다.
- 우선순위 변경은 기존 downstream stack을 자동 교체하거나 지원 중단하지 않는다. release note,
  migration·rollback과 deprecation 기간을 별도로 제공한다.
