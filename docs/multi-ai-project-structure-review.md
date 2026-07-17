# 다중 AI 개발환경 폴더 구조 검토

상태: 검토 완료 — 도구 중립 코어 + 선택형 어댑터 권장
조사 기준일: 2026-07-12

## 목적

Claude Code, Codex, GitHub Copilot, Cursor, Gemini Code Assist와 Cline처럼 서로 다른 AI 개발
도구를 사용하는 팀이 한 저장소에서 정책·skill·workflow를 중복 없이 공유할 수 있는 폴더 구조를
정한다. 이 문서는 애플리케이션의 `src/`, `app/`, `server/` 같은 기술 스택 구조를 고정하지 않고 AI
개발 하네스의 배치만 다룬다.

## 제공 이미지 검토

`KakaoTalk_Photo_2026-07-12-11-38-40.jpeg`에는 다음 Claude Code 중심 구조가 보인다.

```text
.claude/
├── CLAUDE.md
├── settings.json
├── hooks/{pre-tool-use.sh,post-tool-use.sh,stop.sh}
├── agents/verifier.md
├── skills/<domain>/...
└── .mcp.json
MEMORY.md
run.sh
install.sh
README.md
```

장점은 권한, hook, agent와 skill의 위치가 한눈에 들어오고 Claude Code가 네이티브하게 발견할 수
있다는 점이다. 작은 개인용 Claude 전용 저장소라면 이해하기 쉬운 구조다.

공통 upstream의 기준으로 그대로 쓰기 어려운 이유는 다음과 같다.

- 정책과 skill이 `.claude/` 아래에 갇혀 Codex 등 다른 도구의 네이티브 발견 경로와 다르다.
- 도구별 폴더에 같은 규칙을 복제하면 drift, 충돌과 불필요한 context 주입이 발생한다.
- `MEMORY.md`는 결정·요구사항·현재 세션 상태를 한 파일에 섞을 가능성이 있다. 이 프로젝트는
  `HANDOFF.md`, requirements, ADR와 유지관리 기록을 책임별로 분리한다.
- `pre/post/stop` hook은 편리하지만 모든 AI 도구에서 동일하게 실행된다고 가정할 수 없고 실제
  sandbox, IAM, Git hook과 CI를 대신하지 못한다.
- `.mcp.json`의 존재만으로 server가 안전해지지 않는다. 프로젝트별 승인 manifest, 최소 권한,
  무결성·만료와 secret 비포함 검사가 우선이다.
- 루트 `install.sh`와 `run.sh`, 특히 원격 `curl | sh` bootstrap은 clone 직후 실행을 유도하는
  공급망 공격 표면이다. preview, exact version·checksum과 사용자 승인이 필요하다.
- “33 skills” 같은 대량 상시 설치는 발견 충돌, token 증가와 감사 범위 확대를 만들 수 있다.
  필요한 skill만 progressive disclosure와 lockfile로 활성화해야 한다.

이미지는 설계 아이디어를 보여주는 참고자료이며 출처·버전·실제 파일 내용을 검증한 공개
저장소가 아니므로 보안 신뢰 근거로 사용하지 않는다.

## 공식 규약과 오픈소스 사례 비교

| 대상 | 대표 프로젝트 경로 | 관찰 | 공통화 판단 |
|---|---|---|---|
| AGENTS.md | root 또는 하위 `AGENTS.md` | OpenAI의 `agents.md` 공개 규약과 Codex 저장소가 사용하며 여러 도구가 인식 | 가장 넓은 공통 진입점. 짧은 pointer와 범위 규칙만 둔다. |
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/{rules,agents,skills}` | Claude 고유 권한·hook·agent 지원 | 공통 정책 저장소가 아니라 Claude adapter로 제한한다. |
| Agent Skills | `.agents/skills/<name>/SKILL.md` 등 | Anthropic `skills`, GitHub `awesome-copilot` 모두 self-contained `SKILL.md` 구조 사용 | 이식 가능한 skill 배포 형식으로 채택하되 canonical source와 generated adapter를 구분한다. |
| GitHub Copilot·VS Code | `.github/copilot-instructions.md`, `.github/instructions`, `.github/agents`, `.github/skills` | instructions·agents·skills·hooks를 분리하며 glob 범위를 지원 | Copilot을 선택한 downstream에서만 materialize한다. |
| Cursor | `.cursor/rules/*.mdc`, `.cursor/commands`, root `AGENTS.md` | scoped rule과 명령을 지원하고 legacy `.cursorrules`는 deprecated | 단순 프로젝트는 AGENTS.md, 필요한 scoped rule만 adapter로 생성한다. |
| Gemini | root·상위·하위 `GEMINI.md` | 디렉터리 범위별 context 상속 | Gemini 선택 시 공통 규칙을 참조하는 얇은 adapter로 둔다. |
| Cline | `.clinerules/*.md`, root `AGENTS.md` | workspace rule과 AGENTS.md를 함께 지원 | AGENTS.md 우선, Cline 전용 activation이 필요할 때만 adapter를 둔다. |

오픈소스 `github/awesome-copilot`은 source를 `agents/`, `instructions/`, `skills/`, `hooks/`,
`workflows/`, `plugins/`로 책임별 분리하고 CI로 배포물을 materialize한다. `anthropics/skills`는
각 skill을 `SKILL.md`와 선택적 scripts·references·assets를 가진 self-contained 폴더로 둔다.
`openai/codex`와 `openai/agents.md`는 root `AGENTS.md`를 사람이 읽을 수 있는 공통 지침 표면으로
사용한다. 이 사례들은 하나의 거대한 도구 전용 vault보다 canonical source와 adapter·generated
artifact를 구분하는 근거가 된다.

## 권장 구조

### Upstream 저장소

```text
common-project/
├── README.md
├── AGENTS.md                         # 공통 발견용 얇은 진입점
├── CLAUDE.md                         # Claude용 얇은 진입점
├── HANDOFF.md                        # 현재 세션 재개 상태
├── .ai/                              # canonical source of truth
│   ├── README.md
│   ├── standards/                    # engineering, security, testing 등
│   ├── skills/<skill-name>/
│   │   ├── SKILL.md
│   │   ├── scripts/                  # 필요한 경우에만
│   │   ├── references/               # 필요한 경우에만
│   │   └── assets/                   # 필요한 경우에만
│   ├── agents/<role>.md              # 역할·권한 계약
│   ├── workflows/<workflow>.md       # SDLC·HITL·Eval 절차
│   ├── prompts/                      # 사람 의도 입력이 필요한 최소 template
│   ├── manifests/                    # tool·skill·MCP 승인 및 lock
│   └── approvals/                    # 구조화된 명시 승인 기록
├── adapters/                         # 선택 도구별 생성 원본·mapping
│   ├── claude/
│   ├── codex/
│   ├── copilot/
│   ├── cursor/
│   ├── gemini/
│   └── cline/
├── docs/                             # 요구사항·아키텍처·ADR·운영 문서
├── evals/                            # task·fixture·grader·baseline
├── scripts/                          # preview 가능한 bootstrap·validate·security
├── templates/                        # downstream 생성 template
├── security/                         # scanner rule·보안 fixture
└── .github/workflows/                # upstream 자체 CI
```

`adapters/`는 지원 도구가 늘어날 때 추가하는 권장 논리 구조다. 빈 폴더를 미리 만들지 않고 실제
지원·검증된 도구만 생성한다. 도구가 root `AGENTS.md`와 canonical `SKILL.md`를 직접 읽을 수 있으면
별도 adapter를 만들지 않는다.

### Downstream에 materialize되는 구조

```text
project/
├── AGENTS.md                         # 공통 계약과 프로젝트 profile 참조
├── CLAUDE.md                         # Claude를 선택했을 때만
├── GEMINI.md                         # Gemini를 선택했을 때만
├── HANDOFF.md
├── .ai/
│   ├── standards/                    # 승인 release에서 가져온 공통 정책
│   ├── workflows/
│   ├── skills/                       # 선택한 최소 skill만
│   ├── manifests/
│   │   └── upstream.lock.yaml        # release, commit, checksum, adapter version
│   └── project/                      # 기술 스택·명령·조직 override
├── .claude/                          # Claude 고유 설정이 필요할 때만
├── .github/                          # Copilot·Actions를 선택했을 때만
├── .cursor/                          # Cursor scoped rule이 필요할 때만
├── .clinerules/                      # Cline 고유 activation이 필요할 때만
├── evals/
├── scripts/
└── <application source>
```

downstream은 모든 adapter를 받는 것이 아니라 onboarding에서 선택한 AI 도구만 생성한다. upstream
변경은 자동 반영하지 않고 release·checksum 고정, diff preview와 Human-in-the-loop 승인 후
upgrade한다.

## 배치 규칙

### 항상 존재하는 것

- `AGENTS.md`: tool-neutral entrypoint와 canonical 파일 읽기 순서
- `.ai/`: 정책·workflow·skill·manifest의 단일 진실 원천
- `HANDOFF.md`: 현재 진행 상태와 다음 시작점
- `docs/`: 요구사항, 결정과 근거
- `scripts/validate`, 공통 security gate: AI가 아닌 사람·CI도 실행 가능

### 조건부로 존재하는 것

- `CLAUDE.md`, `.claude/`: Claude Code가 선택되고 네이티브 permission·hook이 필요한 경우
- `.github/copilot-instructions.md`, `.github/agents`, `.github/skills`: Copilot을 선택한 경우
- `.cursor/rules`: AGENTS.md로 표현할 수 없는 scoped Cursor rule이 있는 경우
- `GEMINI.md`, `.clinerules/`: 해당 도구를 선택하고 공통 진입점만으로 부족한 경우
- MCP 설정: 승인된 server가 실제로 필요하고 project-local manifest gate를 통과한 경우

### 두지 않는 것

- 같은 정책의 수작업 복사본
- 검증되지 않은 `MEMORY.md` 자동 축적과 conversation transcript
- 모든 프로젝트에 강제되는 전체 skill library·agent collection
- secret 또는 `.env*`를 참조·포함하는 AI 설정
- clone 직후 원격 코드를 실행하는 `curl | sh`, unpinned `npx -y`와 auto-run installer
- Git에 포함된 runtime log, model output, private memory와 Eval 결과 원문

## Monorepo와 범위 규칙

root `AGENTS.md`와 `.ai/`가 공통 baseline이다. frontend·backend처럼 규칙이 실제로 다를 때만
하위 `AGENTS.md` 또는 도구의 glob-scoped rule을 둔다. 하위 문서는 parent baseline을 대체하지
않고 추가 제약만 제공한다는 점을 명시한다. 도구별 상속·우선순위가 다르므로 validator는 동일
fixture로 실제 로딩 결과를 확인해야 한다.

애플리케이션 폴더 이름은 framework에 따라 달라질 수 있으므로 upstream이 `frontend/`, `backend/`,
`src/`를 강제하지 않는다. 프로젝트 환경 정의 과정에서 사용자가 선택한 구조 위에 AI adapter만
materialize한다.

## 보안·유지보수 Gate

1. adapter 생성은 preview에서 생성·변경·삭제 파일과 permission을 보여준다.
2. canonical source hash와 generated adapter source hash를 기록하고 CI에서 drift를 검사한다.
3. tool config·hook·MCP·script는 Markdown instruction보다 높은 공급망 위험 등급으로 심사한다.
4. hook failure가 fail-open인지 fail-closed인지 명시하고 보안 필수 검사는 CI에서도 다시 실행한다.
5. tool-specific config가 `.env*`, home secret, production credential을 읽지 않는지 negative Eval한다.
6. AI tool update 후 discovery path, instruction precedence, nested scope와 hook event를 재검증한다.
7. 제거 시 adapter만 삭제하고 `.ai/`, application code와 다른 도구 설정은 보존한다.

## 결론

이미지의 `.claude/` vault는 Claude 전용 개인 환경에는 적합하지만 다중 도구 공통 저장소의 최상위
구조로는 부적합하다. 이 프로젝트의 기존 **`.ai/` canonical core + 얇은 `AGENTS.md`·`CLAUDE.md`
adapter** 방향이 공개 규약과 여러 도구의 현재 구조에 가장 잘 부합한다. 보완할 부분은 지원 도구별
materialization mapping을 `adapters/`라는 명시적 계층으로 관리하고, 선택한 adapter만 downstream에
생성하며 drift·권한·제거 가능성을 자동 검증하는 것이다.

## 출처

- [AGENTS.md 공개 규약](https://github.com/openai/agents.md)
- [OpenAI Codex 공개 저장소](https://github.com/openai/codex)
- [Anthropic Agent Skills 공개 저장소](https://github.com/anthropics/skills)
- [GitHub Awesome Copilot 공개 저장소](https://github.com/github/awesome-copilot)
- [GitHub Copilot customization reference](https://docs.github.com/en/copilot/reference/customization-cheat-sheet)
- [VS Code custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
- [Cursor project rules](https://docs.cursor.com/context/rules-for-ai)
- [Gemini Code Assist agent context](https://docs.cloud.google.com/gemini/docs/codeassist/use-agentic-chat-pair-programmer)
- [Cline workspace rules](https://docs.cline.bot/customization/cline-rules)

## 추적성

- 요구사항: REQ-002, REQ-003, REQ-026–REQ-028, REQ-031–REQ-032, REQ-038, REQ-042
- 관련 문서: [권장 아키텍처](architecture.md), [스킬 체계](skills.md),
  [도구 호환성](tool-compatibility.md), [공급망 보안](supply-chain-security.md)
