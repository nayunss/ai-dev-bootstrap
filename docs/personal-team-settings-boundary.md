# 개인·팀·프로젝트 설정 경계

상태: reference 구현
확정일: 2026-07-17
관련 요구사항: `REQ-003`, `REQ-007`, REQ-019–REQ-024, `REQ-031`, REQ-037–REQ-042, `REQ-047`

## 목적

개인의 작업 편의, 팀 공통 재현성과 프로젝트 운영 결정을 분리한다. 저장소가 개인 환경을 불필요하게
통제하거나, 반대로 필수 품질·보안 설정이 개인 선택으로 약화되는 것을 방지한다.

핵심 판정 기준은 다음과 같다.

> 설정 차이가 source 결과, 보안, CI, 배포, 운영 또는 다른 구성원의 재현성에 영향을 주면 팀 또는
> 프로젝트 설정이다. 영향을 주지 않으면 개인 설정이다.

## 확정 경계

| 구분 | 대표 항목 | 저장 위치 | 변경·승인 | 적용 방식 |
|---|---|---|---|---|
| 팀 필수 | `.ai/` engineering·security 정책, formatter·linter·typecheck 규칙, 공통 테스트·보안 gate, HANDOFF, CodeSight, CI baseline | upstream 또는 팀 baseline repository | maintainer review와 required checks | 모든 구성원이 동일하게 적용하며 개인 설정으로 약화할 수 없음 |
| 프로젝트 필수 | application inventory, 언어·framework, runtime·package manager·dependency exact version, lockfile, DB·migration, API contract, 배포·rollback, retention·법률 책임자 | downstream project repository | project owner와 필요한 분야 책임자 승인 | 초기 설정 또는 retrofit 질문 후 project-local로 materialize |
| 개인 선택 | IDE/editor 제품, theme, font, keybinding, UI 언어, 사용 AI 도구, 비실행형 개인 메모·workflow 편의 | 사용자 로컬 설정 | 개인 결정 | repository가 전역 설정을 덮어쓰거나 동기화를 강제하지 않음 |
| 개인 선택 adapter | Codex·Claude Code·GitHub Copilot 등 선택 도구의 project entrypoint | downstream의 선택 adapter 경로와 lock | 사용자 선택 + 팀 정책 parity 검증 | 선택한 adapter만 project-local로 적용; 공통 정책보다 권한 확대 금지 |
| 개인 선택이지만 사전 심사 필수 | plugin, MCP server, executable skill, hook, local binary, telemetry·외부 code 전송 도구 | 승인 manifest와 project-local 설치 경로 | 공급망·권한·network·license 검토와 사람 승인 | 미승인 상태는 설치·호출하지 않으며 다른 구성원에게 자동 전파하지 않음 |
| 개인 비밀 | API token, cloud credential, signing key, 개인 식별정보 | OS credential store 또는 승인된 secret manager | credential owner·보안 정책 | repository·prompt·HANDOFF·`.env*` 예시에 값을 기록하지 않음 |
| 금지 | 사용자 전역 AI·Git·shell 설정 강제 변경, 승인되지 않은 plugin/network 자동 설치, 보안 gate 개인 해제, 비밀 공유 | 저장하지 않음 | 승인으로 허용 범위를 넓힐 수 없는 기본 금지 또는 별도 고위험 계약 | bootstrap·Portal·CLI 모두 fail-closed |

## 충돌 판정

같은 설정이 여러 구분에 걸치면 다음 순서로 판정한다.

1. 보안·법률·Production 통제는 개인 편의보다 우선한다.
2. build·test·format 결과가 달라지면 project 또는 팀 필수로 둔다.
3. exact version이 재현성에 영향을 주면 repository lock에 기록한다.
4. 도구 제품 선택은 개인 선택으로 둘 수 있지만 생성 결과와 권한은 공통 policy·Eval을 통과해야 한다.
5. 조직 전체에 공통이어야 하는 값과 한 project에만 필요한 값을 분리한다.
6. 개인 선택을 지원하기 위한 adapter는 canonical source를 복제하지 않고 참조·materialize hash를
   기록한다.

예를 들어 VS Code 사용 여부는 개인 선택이지만 `.editorconfig`, formatter 결과와 CI lint는 팀
필수다. Claude Code 사용 여부는 개인 선택이지만 해당 adapter가 `.ai/standards/security.md`보다
권한을 확대하지 않는지는 팀 필수 검증이다.

## 초기 설정과 기존 프로젝트 Retrofit

- 초기 설정은 팀 필수 baseline을 먼저 적용하고 project stack·DB·provider·owner 값을 질문한다.
- 개인 AI 도구는 복수 선택할 수 있으며 선택하지 않은 adapter를 생성하지 않는다.
- 기존 프로젝트에서는 현재 formatter, runtime, CI와 tool entrypoint를 읽기 전용 preview하고 기존
  파일을 자동 덮어쓰지 않는다.
- 팀 필수와 기존 project 설정이 충돌하면 diff·migration·rollback을 제시하고 owner 승인 전
  적용하지 않는다.
- 개인 전역 설정을 project-local 설정으로 복사하거나 project 설정을 사용자 홈에 쓰지 않는다.

## Portal·CLI 표시

REQ-047 Portal과 CLI는 적용 항목을 다음처럼 구분해 표시한다.

- **팀 필수**: 적용 이유와 변경 불가한 보안·재현성 근거
- **프로젝트에서 결정**: stack·DB·provider·owner 질문
- **내 선택**: 사용할 AI 도구와 개인 편의 adapter
- **추가 승인 필요**: dependency network, plugin, MCP, telemetry, DB·Production 작업

“권장 설정 모두 설치” 같은 단일 체크박스로 네 범주를 합치지 않는다. 원클릭 도입은 승인된
project-local 파일 적용을 단순화할 뿐 개인 전역 설정이나 고위험 작업까지 포괄 승인하지 않는다.

## 검증 기준

- 서로 다른 개인 IDE·AI 도구 선택에서도 formatter·test·security 결과가 동일해야 한다.
- 선택하지 않은 adapter, plugin과 MCP가 생성·설치·호출되지 않아야 한다.
- 사용자 전역 설정과 project 밖 파일의 before/after hash가 같아야 한다.
- 팀 필수 gate를 제거·완화한 개인 override는 validator가 차단해야 한다.
- 기존 project 파일 충돌은 쓰기 전에 전체 적용을 차단하고 rollback 가능한 diff를 제공해야 한다.
- Portal과 CLI가 같은 분류·plan·lock 결과를 생성해야 한다.

이 문서의 표는 경계의 단일 기준이다. 개별 도구 문서는 구체적인 mapping만 추가하며 개인·팀 경계를
다르게 재정의하지 않는다.

2026-07-18부터 이 경계는 canonical profile의 `settings.teamRequired`, `projectRequired`,
`personalChoice`, `reviewRequired`, `prohibited`로 materialize된다. 동일 reference의 중복 분류,
필수 engineering·security·test gate 누락과 전역 Git·AI 설정 쓰기 또는 보안 gate 해제 금지 누락은
validator가 차단한다. `scripts/bootstrap profile TARGET PROFILE.json [--approve]`은 preview를
기본값으로 하며 기존 profile을 자동 병합하거나 덮어쓰지 않는다.
