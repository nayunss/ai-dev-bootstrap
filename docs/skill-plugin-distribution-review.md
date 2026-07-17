# Skill·Plugin 배포 방식 검토

상태: 설계 승인
확정일: 2026-07-17
관련 요구사항: REQ-005–REQ-008, REQ-026–REQ-028, `REQ-032`, REQ-037–REQ-043, `REQ-047`

## 결론

Skill과 plugin을 하나의 marketplace 또는 일괄 설치 단위로 배포하지 않는다. 공통 하네스는
검증된 최소 skill을 release core에 포함하고, 선택 skill은 독립 pack으로, tool별 발견 경로는
generated adapter로 배포한다. Plugin은 실행 주체이므로 source·version·권한 심사 후 해당 도구의
project-local 설치 방식으로만 활성화한다.

배포 우선순위는 다음과 같다.

```text
감사된 Markdown skill
  → 감사된 project-local script를 포함한 skill
  → tool adapter
  → hook·plugin runtime
  → MCP server
```

뒤로 갈수록 filesystem·network·credential·code execution 권한이 커지므로 같은 “설치” 버튼이나
동일 승인으로 묶지 않는다.

## 배포 계층

| 계층 | 대상 | 배포 단위 | 기본 상태 | 설치 위치 |
|---|---|---|---|---|
| Core skill | requirements, implementation, testing, review, documentation, security, release 등 모든 프로젝트의 최소 계약 | upstream release core와 `core-skills.manifest.json` | release 선택 시 포함 | downstream `.ai/skills/<name>/` |
| Optional portable skill | frontend, backend, database-change, e2e, deployment와 project 특화 skill | skill별 독립 archive 또는 선택 skill pack | 미선택 | downstream `.ai/skills/<name>/` |
| Tool adapter | Codex·Claude Code·Copilot 등이 canonical skill을 발견하기 위한 entrypoint·mapping | generator version과 adapter manifest | 선택한 AI 도구만 | tool의 project-local discovery 경로 |
| Organization/private skill | 사내 정책·workflow·proprietary reference | public upstream과 분리된 private organization bundle | 조직 선택 | downstream organization override |
| Personal skill | 개인 생산성 향상이며 팀 결과의 전제 조건이 아닌 skill | 개인 도구의 local 관리 방식 | 개인 선택 | 사용자 local 영역; project가 강제하지 않음 |
| Plugin·hook | executable, local server, lifecycle hook, tool extension | plugin별 approval record와 native project-local installer | 기본 차단 | 승인된 project-local plugin 경로 |
| MCP server | 외부 process·API·tool provider | `.ai/manifests/approved-mcp.json`의 server별 승인 | 기본 차단·비활성 | sandboxed project MCP 설정 |

MCP를 plugin pack의 편의 기능으로 숨기지 않는다. Plugin이 MCP server를 함께 실행하면 두 위험 등급을
모두 적용하고 server·tool·host·credential scope를 별도로 승인한다.

## Skill package 계약

Portable skill은 self-contained `<skill-name>/` 디렉터리로 배포한다.

```text
<skill-name>/
├── SKILL.md
├── scripts/       # 필요한 경우에만
├── references/    # 필요한 경우에만
└── assets/        # 필요한 경우에만
```

각 skill manifest에는 다음을 기록한다.

- stable skill ID와 semantic version
- source repository·commit·publisher
- package SHA-256과 모든 파일 SHA-256
- license와 third-party notices
- 지원 AI 도구·adapter version
- 입력·산출물·필요 권한
- filesystem read/write, command, network·telemetry
- required core version과 다른 skill dependency
- install·validate·uninstall·rollback 계약
- review 날짜·승인자·만료 또는 재심사 조건

Skill dependency는 명시적 DAG로 관리하며 순환 dependency와 floating version을 거부한다. Markdown
skill이 실행 script를 추가하면 package 전체를 executable skill 위험 등급으로 올린다.

## Core와 선택 Skill 기준

다음 조건을 모두 만족할 때만 core skill로 포함한다.

- 대부분의 project와 AI 도구에서 항상 필요한 결과 계약이다.
- plugin·network·credential 없이 기본 기능이 동작한다.
- 작은 context로 progressive disclosure가 가능하다.
- 전체 regression과 supported adapter parity를 release마다 통과한다.
- 제거하면 공통 engineering·security·verification 계약이 깨진다.

특정 stack, provider, 디자인 방식, 배포 플랫폼 또는 비용 API에만 필요한 skill은 optional이다.
“인기가 높다”는 이유만으로 core에 넣지 않는다. Optional skill이 선택되지 않아도 공통 보안·검증
gate는 유지돼야 한다.

## Plugin 배포 계약

Plugin은 upstream release archive에 실행 상태로 포함하지 않는다. 공통 release에는 다음 정보만
포함할 수 있다.

- 검토된 plugin catalog entry
- exact plugin ID·version·source·integrity
- 지원 AI 도구와 native install target
- permissions·hook·command·network·telemetry summary
- 수동 대체 절차
- uninstall·rollback과 approval 만료

실제 설치는 project가 plugin 필요성을 확인한 뒤 별도 preview와 사람 승인을 받아 수행한다.
Marketplace 전체, publisher 전체와 future update를 포괄 승인하지 않는다. Native manager가
project-local 설치를 지원하지 않고 전역 설치만 허용하면 기본적으로 개인 선택으로 분류하고 팀 필수
기능의 전제 조건으로 사용하지 않는다.

다음 배포 방식은 금지한다.

- `latest`, branch HEAD, unpinned marketplace entry
- `curl | sh`, `npx -y` 등 검증 전 원격 code 실행
- plugin·hook·MCP를 core skill과 함께 자동 활성화
- 사용자 home·전역 AI 설정의 무확인 변경
- telemetry·update check·외부 asset 요청을 끌 수 없는 기본 설치
- uninstall ownership record가 없는 파일 복사

## Release asset

Skill·plugin 배포를 지원하는 release는 다음 canonical asset을 생성한다.

- `core-skills.manifest.json`
- `optional-skills.catalog.json`
- 선택 skill별 archive와 `SHA256SUMS`
- `tool-adapters.manifest.json`
- `reviewed-plugins.catalog.json` — 승인 정보이며 설치 승인이 아님
- migration·deprecated·removed skill과 rollback release note

Release manifest는 core와 optional inventory를 분리한다. Optional pack 하나가 변경됐다는 이유로
선택하지 않은 downstream에 파일을 추가하지 않는다. Public release에는 private organization skill,
credential, 내부 URL과 proprietary reference를 포함하지 않는다.

## 설치·업데이트·제거

1. project environment와 선택 AI 도구를 읽기 전용으로 진단한다.
2. core, 추천 optional, 미지원, 추가 승인 필요 항목을 분리해 preview한다.
3. manifest·archive·파일 hash와 compatibility를 검증한다.
4. 선택한 skill과 adapter만 transaction으로 materialize한다.
5. `.ai/manifests/skills.lock.json`에 version·hash·소유 파일·adapter를 기록한다.
6. target·adapter parity와 관련 Eval을 통과한 뒤 성공으로 표시한다.

Update는 skill별 diff와 migration을 보여주고 자동 적용하지 않는다. 사용자가 변경한 파일은 덮어쓰거나
uninstall하지 않는다. 제거는 lock상 이 installer가 생성했고 이후 변경되지 않은 파일만 삭제한다.
Core skill 제거는 해당 release 전체 upgrade·rollback으로 처리하며 개별 강제 삭제를 제공하지 않는다.

## GUI·CLI 표시

REQ-047 GUI는 다음 범주를 별도 화면으로 표시한다.

- **필수 기반**: release core에 포함된 skill
- **프로젝트에 추천**: stack/profile에 맞는 optional skill
- **내 AI 도구 연결**: 선택 adapter
- **추가 보안 검토 필요**: plugin·hook·MCP
- **개인 설정**: project에 설치하지 않는 personal skill

기본 **프로젝트에 적용** 버튼은 core와 사용자가 명시적으로 선택한 portable skill·adapter만 적용한다.
Plugin·MCP·network·credential은 같은 버튼으로 승인하지 않는다.

## 검증과 완료 기준

- core-only, optional 하나, 복수 skill dependency 조합의 clean install·validate·uninstall
- Codex·Claude Code·Copilot adapter가 같은 canonical skill ID·version·결과 계약을 참조하는 parity
- package·file·adapter hash drift와 dependency cycle·version incompatibility 차단
- 기존 파일 충돌과 두 번째 write 실패 transaction 원복
- 변경된 사용자 파일과 preexisting identical file 보존
- 미선택 skill·plugin·MCP 무설치
- plugin catalog가 실행 승인으로 오인되지 않는 default-deny fixture
- private skill과 내부 reference의 public release 유출 차단
- 이전 release에서 skill별 upgrade·deprecated·rollback
- GUI·CLI plan과 lock 결과 parity

문서·catalog만 작성한 상태는 구현 완료가 아니다. Manifest schema, materializer, lock,
clean install·upgrade·uninstall fixture와 실제 supported adapter pilot을 통과해야 배포 구현 완료로
표시한다.
