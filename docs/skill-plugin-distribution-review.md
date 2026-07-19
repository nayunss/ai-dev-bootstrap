# Skill·Plugin 배포 방식 검토

상태: portable skill reference 구현·deterministic PASS, native marketplace 확장 설계 승인
확정일: 2026-07-17
최근 검토: 2026-07-19
관련 요구사항: REQ-005–REQ-008, REQ-026–REQ-028, `REQ-032`, REQ-037–REQ-043, `REQ-047`,
`REQ-053`

## 결론

공통 release core와 실행형 plugin·MCP를 하나의 무확인 설치·승인 단위로 배포하지 않는다. 공통
하네스는 검증된 최소 skill을 release core에 포함하고, 선택 skill은 독립 pack으로, tool별 발견
경로는 generated adapter로 배포한다.

Codex·Claude Code의 native marketplace에서 사용하는 “plugin”은 skills-only package도 의미하므로
실행형 plugin과 구분한다. REQ-053 P0는 canonical release에서 생성한 skills-only wrapper만
제공한다. Hook·MCP·background service·credential을 추가한 package는 source·version·권한을 다시
심사하고 별도 승인해야 한다.

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
| Skills-only marketplace plugin | canonical skill·prompt·project-local script의 native discovery package | source release와 hash에 묶인 도구별 manifest·catalog | 사용자 선택 | native plugin cache; 설치만으로 project apply 안 함 |
| Executable plugin·hook | executable, local server, lifecycle hook, tool extension | plugin별 approval record와 native project-local installer | 기본 차단 | 승인된 project-local plugin 경로 |
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

## 실행형 Plugin 배포 계약

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

## Codex·Claude Code Native Marketplace P0

### 목적과 범위

GitHub App Web Portal은 GitHub repository를 선택해 PR을 만드는 비개발자용 web surface다.
Native marketplace는 Codex·Claude Code 사용자가 하네스 저장소를 먼저 clone하거나 ZIP으로 풀지
않고 도입 workflow를 발견·설치하는 별도 선택 경로다. 두 경로는 동일한 release adoption core와
승인 경계를 사용하며 서로의 지원 완료를 대신하지 않는다.

P0는 자체 GitHub repository marketplace까지만 구현한다. OpenAI·Anthropic이 운영하는 공식
directory 등재는 native 설치 pilot을 통과한 뒤 별도 외부 제출 task로 진행한다.

### 예상 Repository 구조

```text
.agents/plugins/marketplace.json
.claude-plugin/marketplace.json
plugins/
├── ai-dev-harness-codex/
│   ├── .codex-plugin/plugin.json
│   └── skills/
└── ai-dev-harness-claude/
    ├── .claude-plugin/plugin.json
    └── skills/
```

두 package의 `skills/`는 수동 복사본이 아니라 같은 `.ai/` source와 release manifest에서 생성한다.
Generator는 source release·commit·archive checksum, generator version, package·file SHA-256을
기록한다. Codex와 Claude Code가 우연히 같은 manifest를 읽을 수 있더라도 하나의 도구에서만
검증하고 공용 package라고 선언하지 않는다.

P0 package가 포함할 수 있는 것은 다음뿐이다.

- 설치 후 사용자가 명시적으로 호출하는 시작 skill
- source 무결성·upstream/downstream 모드·대상 경로를 확인하는 read-only 진단
- 공통 `preview → approve → apply → validate → rollback` workflow를 호출하는 project-local script
- 사용자용 시작 prompt, 지원 범위, uninstall·rollback 안내

다음 항목은 P0에서 제외한다.

- MCP server, remote app, lifecycle hook와 background process
- ambient credential·`.env*`·사용자 home·다른 repository 접근
- 설치 시점의 project write, dependency 설치, Git write와 provider API 호출
- telemetry, update check와 외부 asset 자동 요청
- floating marketplace·plugin source와 사용자 동의 없는 auto-update

### 설치와 첫 실행 계약

자체 marketplace가 실제 발행되기 전에는 문서에 설치 명령을 “현재 사용 가능”으로 표시하지 않는다.
발행 후 사용자 흐름은 도구마다 다음 순서를 지켜야 한다.

1. 공식 release와 marketplace source·publisher·version·checksum을 확인한다.
2. Marketplace를 추가하되 이 동작이 plugin 설치나 project apply가 아님을 표시한다.
3. 선택한 plugin만 설치하고 설치된 manifest·permission·component를 다시 보여준다.
4. 새 session에서 시작 skill을 명시적으로 호출한다.
5. 첫 turn은 read-only 진단과 변경 0건의 exact plan으로 종료한다.
6. 사용자가 plan을 승인한 뒤에만 기존 adoption core를 통해 project-local apply를 수행한다.
7. Validate 실패 시 transaction rollback하고 실패 상태와 보존 파일을 보고한다.

Marketplace source와 plugin source는 별도로 고정한다. 가능한 경우 plugin source는 exact commit
SHA를 사용하고, marketplace catalog ref 변경과 plugin version 변경을 같은 승인으로 묶지 않는다.
Native cache는 설치된 복사본이므로 source update가 cache·활성 version·project lock을 실제로 어떻게
바꿨는지 독립적으로 검증한다.

### P0 검증 Matrix

| 검증 | Codex | Claude Code | 공통 판정 |
|---|---|---|---|
| Marketplace schema·native validate | 실제 명령 PASS 필요 | 실제 명령 PASS 필요 | 한 도구 결과 대체 금지 |
| GitHub marketplace add·list | clean user profile PASS 필요 | clean user profile PASS 필요 | source/ref 기록 |
| Plugin install·discovery | 새 session에서 PASS 필요 | 새 session에서 PASS 필요 | canonical workflow ID·version 일치 |
| 첫 실행 | 변경 0건 read-only preview | 변경 0건 read-only preview | plan·권한 경계 parity |
| 승인 apply·validate | 격리 fixture PASS 필요 | 격리 fixture PASS 필요 | 같은 release·lock·result 계약 |
| Update·rollback | version/hash drift 포함 | version/hash drift 포함 | 자동 apply 금지 |
| Uninstall | cache·소유 adapter만 제거 | cache·소유 adapter만 제거 | 기존·사용자 변경 파일 보존 |
| Network·credential negative | P0 외 접근 차단 | P0 외 접근 차단 | `.env*`·ambient credential 미노출 |

개발 repository의 기존 Codex·Claude 설정에서 동작한 결과는 clean-profile 설치 증거가 아니다.
Native CLI 또는 app의 실제 marketplace·plugin discovery를 사용해야 하며 synthetic manifest
parser만 통과한 상태는 `NOT-RUN`으로 유지한다.

### 공식 Directory 제출 Gate

자체 marketplace 공개와 공식 directory 공개는 별도 delivery evidence다.

- Codex/OpenAI 제출 전 최신 공식 문서에서 publisher identity, 제출 권한, listing·support·privacy·
  terms, skill bundle, starter prompt와 positive·negative test 요구를 다시 확인한다.
- Claude Code/Anthropic 제출 전 최신 공식 문서에서 official marketplace 제출 계정, listing,
  package·version과 보안 심사 요구를 다시 확인한다.
- 제출 자료에는 실제 permission·network·data handling과 skills-only 범위를 정확히 표시한다.
- 제출은 외부 상태 변경이므로 exact package version·checksum·공개 범위·rollback을 preview하고
  별도 승인을 받는다.
- `draft`, `submitted`, `in-review`, `approved`, `published`를 구분한다. 심사 제출 또는 승인만으로
  공개 설치 가능, 실제 설치 PASS나 하네스 지원 완료로 표시하지 않는다.

Publisher identity·공개 website·support·privacy·terms, provider 계정 권한이나 심사 요구가
준비되지 않으면 자체 marketplace P0에서 중단하고 공식 제출 상태는 `BLOCKED` 또는 `NOT-RUN`으로
유지한다.

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

## Portal·CLI 표시

REQ-047 Portal은 다음 범주를 별도 화면으로 표시한다.

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
- Portal·CLI plan과 lock 결과 parity

문서·catalog만 작성한 상태는 구현 완료가 아니다. Manifest schema, materializer, lock,
clean install·upgrade·uninstall fixture와 실제 supported adapter pilot을 통과해야 배포 구현 완료로
표시한다.

2026-07-18 reference 구현은 `requirements` core와 `frontend` optional portable skill package,
Codex·Claude Code·GitHub Copilot tool adapter manifest, 실행 승인이 아닌 synthetic reviewed plugin
catalog를 포함한다. Package·file·adapter checksum, dependency DAG·exact version, 선택 materialization,
transaction 원복, upgrade·rollback과 preexisting identical·사용자 변경 파일 보존 uninstall fixture는
PASS했다. 실제 plugin 설치·호출, native AI tool discovery pilot, private organization bundle과 Portal
사용성 검증은 `NOT-RUN`이며 이 reference PASS로 승인된 것으로 해석하지 않는다.

2026-07-19 REQ-053 검토는 Codex·Claude Code skills-only wrapper, 자체 GitHub marketplace와 공식
directory 제출 분리, clean-profile native 검증 matrix를 설계로 승인했다. 현재 repository에는
`.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`,
`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`이 없으며 실제 plugin 설치·발견·
제거와 공식 제출은 모두 `NOT-RUN`이다.

## 공식 문서

- [OpenAI: Build plugins](https://learn.chatgpt.com/docs/build-plugins)
- [OpenAI: Submit plugins](https://learn.chatgpt.com/docs/submit-plugins)
- [Anthropic: Create and distribute a plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
- [Anthropic: Discover and install plugins](https://code.claude.com/docs/en/discover-plugins)
