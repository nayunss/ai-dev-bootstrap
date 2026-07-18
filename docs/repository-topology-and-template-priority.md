# 저장소 구조와 프로젝트 Template 제공 우선순위

상태: P0 reference fixture 구현

## 결론

기준일은 **2026-07-17**이다. 현재 공개된 최신 대규모 JavaScript 조사인 State of JS 2025에는
monorepo 도구 사용 응답이 있지만, `monorepo`와 `project template`을 서로 배타적인 제공 형태로
비교한 통계는 없다. 둘은 다음처럼 서로 다른 축이다.

- **저장소 구조**: 단일 application repository 또는 workspace monorepo
- **생성·도입 방식**: 신규 project template 또는 기존 repository retrofit

따라서 공통 배포판은 하나의 대형 monorepo template을 기본값으로 제공하지 않는다. 가장 넓게
적용할 수 있는 **단일 project starter와 기존 project retrofit을 P0**로 제공하고, 여러 application이나
package를 실제로 함께 관리해야 할 때만 **workspace monorepo profile을 P1**로 선택한다.

## 근거의 범위

State of JS 2025 `Monorepo Tools` 문항의 10,251명 응답에서는 pnpm 3,940, `None` 3,050,
npm Workspaces 2,129, Turborepo 1,718, Nx 1,682, Yarn Workspaces 1,341 순이었다. 이 결과는
JavaScript·TypeScript monorepo 도구의 상대적 우선순위를 정하는 근거로 사용할 수 있지만, 전체
software project의 저장소 구조 점유율이나 신규 project template 사용률을 뜻하지 않는다.

GitHub가 공개한 자체 monorepo 사례도 대규모 단일 저장소가 atomic change에 유용한 동시에 merge
queue와 배포 조정 같은 별도 운영 복잡성을 요구함을 보여준다. 이는 monorepo를 모든 project의
기본값으로 강제하지 않는 근거다.

2026년 연간 조사가 아직 완료되지 않은 시점이므로 이 문서의 “2026년 기준”은 **2026-07-17 현재
공개된 최신 자료를 검토했다**는 의미다. 차기 공식 조사에서 순위나 전제가 달라지면 기준일과 근거를
함께 갱신한다.

## 제공 우선순위

| 우선순위 | 제공 형태 | 적용 대상 | 기본 동작 |
|---|---|---|---|
| P0 | 단일 project starter | 하나의 frontend, backend, worker 또는 library로 시작하는 신규 project | 선택 stack의 최소 파일만 생성하고 저장소·CI·배포 provider는 질문한다 |
| P0 | 기존 project retrofit | 이미 source와 설정이 있는 모든 저장소 | inventory와 diff를 먼저 제시하고 기존 파일을 template으로 덮어쓰지 않는다 |
| P1 | native workspace monorepo starter | 둘 이상의 application/package가 shared code·contract와 atomic change를 실제로 공유 | application root·owner·dependency·CI·deploy 경계를 명시한다 |
| P2 | 전문 monorepo orchestrator profile | affected graph, remote cache, 병렬 task와 대규모 build 최적화가 필요한 workspace | 도구의 공급망·cache data·telemetry·비용을 별도 승인한다 |
| P2 | 조직 전용 golden template | 같은 stack과 정책을 반복하는 조직 | 조직 owner가 version·보안 정책·upgrade 책임을 소유할 때만 제공한다 |
| P3 | 범용 대형 full-stack monorepo template | 사전에 승인된 특정 reference/Eval | 공통 기본값으로 배포하지 않고 profile별 reference로만 유지한다 |

P0가 둘인 이유는 신규 project와 기존 project가 서로 다른 안전 경로를 필요로 하기 때문이다. 신규
project는 starter를 사용할 수 있지만 기존 project에는 항상 retrofit을 사용한다. Template은 단일
repository와 monorepo 양쪽을 생성할 수 있으므로 `template 또는 monorepo`라는 선택 질문은 사용하지
않는다.

## JavaScript·TypeScript monorepo adapter 순서

실제 monorepo 조건을 충족하고 JavaScript·TypeScript workspace를 선택한 경우, 최신 공개 사용 응답과
공통 기능 복잡도를 바탕으로 다음 순서로 adapter를 제공한다.

1. pnpm workspace
2. npm Workspaces
3. Turborepo
4. Nx
5. Yarn Workspaces
6. Bun workspace, Lerna, Rush 등 추가 adapter

pnpm과 npm Workspaces는 package manager의 native workspace 계층이다. Turborepo와 Nx는 이를
대체하는 단순 package manager가 아니라 task graph·cache·orchestration 계층이므로, 해당 기능이
필요하다는 project 응답 없이 자동 설치하지 않는다.

Java·Kotlin은 Maven multi-module 또는 Gradle multi-project, .NET은 solution/project reference처럼
선택 stack의 native 구조를 우선한다. 비 JavaScript project에 pnpm·Turborepo·Nx를 공통 기본값으로
강제하지 않는다.

## 초기 설정과 기존 project 질문

다음 질문의 답이 project profile과 lock에 기록되어야 한다.

| 질문 | 단일 repository 유지 | monorepo 검토 |
|---|---|---|
| 독립적으로 build·deploy하는 application/package 수 | 1개 | 2개 이상 |
| shared source·schema·contract 변경 | 없거나 versioned dependency로 충분 | 같은 commit의 atomic 변경 필요 |
| release cadence | 독립 | 대부분 함께 변경·검증 |
| CI 영향 범위 | 단일 root | application별 job과 affected graph 필요 |
| owner·권한 | 하나의 경계 | root와 application별 경계가 명시됨 |
| 언어·build system | 단일 stack | native multi-project 또는 교차 stack 조정 필요 |

개수가 둘 이상이라는 이유만으로 monorepo를 자동 선택하지 않는다. 독립 owner, 접근권한, release와
배포 수명주기가 분리돼 있으면 여러 repository가 더 적합할 수 있다. 반대로 shared contract를 항상
원자적으로 변경해야 한다면 monorepo를 우선 검토한다.

기존 project retrofit에서는 application root, manifest, lockfile, build file, workspace 선언,
shared package, CI root와 deploy root를 read-only로 탐색한다. 감지 결과와 사용자 응답이 다르면 쓰기
전에 차단하고 확인한다.

## 검증 계약

- 단일 starter와 기존 retrofit fixture를 각각 clean environment에서 검증한다.
- workspace fixture는 root와 application별 exact runtime·package manager·working directory를
  검증한다.
- undeclared application, 중첩 workspace, duplicate package name과 workspace 경계 밖 참조를
  negative fixture로 차단한다.
- orchestrator를 선택하면 affected graph, cache key, cache data 전송, telemetry, network와
  uninstall·rollback을 검증한다.
- application별 CI·artifact·deploy root를 분리하고 하나의 성공 job을 전체 성공으로 확대하지 않는다.
- template release와 canonical lock의 source·target hash가 일치해야 하며 기존 파일 충돌 시 전체
  transaction을 원복한다.
- 실제 조직 template, remote cache와 hosted CI 도입은 project owner 승인 전 `NOT-RUN`으로 유지한다.

2026-07-18 single-project starter와 native workspace monorepo의 clean·retrofit·collision·rollback
reference fixture를 구현했다. 전문 orchestrator, remote cache와 실제 조직 template은 포함하지 않는다.

## 공식 참고자료

- [State of JS 2025 — Other Tools: Monorepo Tools](https://2025.stateofjs.com/en-US/other-tools/)
- [GitHub Engineering — How GitHub uses merge queue to ship hundreds of changes every day](https://github.blog/engineering/engineering-principles/how-github-uses-merge-queue-to-ship-hundreds-of-changes-every-day/)
