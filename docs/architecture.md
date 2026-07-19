# 권장 아키텍처

상태: 현재 upstream 구조 적용·Portal-only surface 반영
갱신일: 2026-07-19

## 결론

권장 구조는 **도구 중립 코어 + 도구별 어댑터 + 자동 검증**이다. 팀의 지식과 정책을
공통 코어에 한 번만 작성하고, Codex·Claude Code·GitHub Copilot은 이를 읽는 얇은 진입점만 가진다.

이 구조 전체를 이 프로젝트에서는 **AI 개발 하네스**라고 부른다. 하네스는 특정 제품이나
플러그인의 이름이 아니라 AI가 프로젝트에서 안전하고 일관되게 일하도록 만드는 실행 환경이다.
자세한 구성 원칙은 [하네스 구성](harness.md)을 따른다.

```text
개발자와 AI 도구
      │
      ▼
도구별 어댑터 (AGENTS.md, CLAUDE.md, copilot-instructions.md)
      │
      ▼
공통 AI 코어 (.ai/)
  ├─ standards     정책과 품질 기준
  ├─ skills        재사용 작업 절차
  ├─ workflows     SDLC 단계별 실행 절차
  ├─ agents        역할과 권한 계약
  └─ manifests     버전과 도구 호환성
      │
      ▼
프로젝트 코드 · 테스트 · 문서 · CI
```

## 현재 upstream 저장소 구조

다음은 2026-07-19 현재 tracked source 기준 구조다. 모든 하위 파일을 나열하는 대신 각 디렉터리의
실제 책임과 canonical 위치를 표시한다. Downstream에 materialize되는 구조와 추가 도구 후보 비교는
[다중 AI 폴더 구조 검토](multi-ai-project-structure-review.md)에 정리한다.

```text
common-project/
├── README.md
├── HANDOFF.md               # 완료·남은 작업과 실제 검증 증거
├── AGENTS.md                 # Codex용 얇은 진입점
├── CLAUDE.md                 # Claude Code용 얇은 진입점
├── .ai/
│   ├── README.md
│   ├── standards/
│   │   ├── engineering.md    # 공통 개발·검증 규칙
│   │   └── security.md       # 권한·비밀·외부 변경 정책
│   ├── agents/               # 역할·권한 계약
│   ├── workflows/<workflow>.md
│   ├── prompts/              # 사람 입력이 필요한 최소 prompt
│   ├── manifests/            # 추적성·adapter·보안 도구의 기계 판독 원본
│   └── approvals/            # dependency 등 명시 승인 기록
├── adapters/
│   ├── codex/                # AGENTS.md·hook 생성 원본
│   ├── claude-code/          # CLAUDE.md·settings 생성 원본
│   └── github-copilot/       # copilot-instructions 생성 원본
├── .codex/                   # 이 upstream clone에서 사용하는 Codex hook
├── .claude/                  # 이 upstream clone에서 사용하는 Claude 설정
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── schemas/              # JSON Schema 계약
│   ├── templates/            # downstream 입력·workflow template
│   └── releases/             # tag별 migration·rollback·checksum 증거
├── evals/
│   ├── fixtures/             # positive·negative reference 입력
│   ├── tasks/
│   ├── graders/
│   ├── baselines/
│   └── results/
├── scripts/
│   ├── bootstrap             # preview·승인 apply의 공통 진입점
│   ├── validate              # downstream 상태 검증
│   └── test-*.mjs            # reference 회귀 fixture
├── web-portal/               # local no-network Portal 화면
├── security/                 # SAST rule
└── .github/
    ├── actions/              # web adoption composite action
    └── workflows/security.yml
```

Desktop application source와 packaging job은 현재 구조에 없다. 비개발자 surface는 `web-portal/`의
local no-network reference이고, 실제 프로젝트 파일 적용은 `scripts/`의 CLI·web 공통 core가
담당한다. `adapters/`도 실제로 구현·검증한 세 도구만 tracked하며 빈 후보 디렉터리를 만들지 않는다.

## 계층별 책임

### 공통 코어

- 팀 전체에 적용되는 규칙과 워크플로의 단일 진실 원천이다.
- 특정 제품의 명령어나 설치 경로를 핵심 정책과 섞지 않는다.
- 각 규칙은 적용 범위, 필수 여부, 검증 방법을 포함한다.

### 도구별 어댑터

- 해당 도구가 공통 코어를 발견하고 읽도록 안내한다.
- 도구 고유 기능과 공통 기능 사이의 대응 관계만 정의한다.
- 공통 정책을 복제하지 않는다. 도구 제한 때문에 중복이 불가피하면 생성 스크립트로 관리한다.
- `CLAUDE.md`와 `AGENTS.md`는 `.ai/standards/engineering.md`, 보안 정책, HANDOFF와 관련 workflow의
  읽기 순서만 제공한다. 다른 AI 도구는 `.ai/README.md`를 공통 진입점으로 사용한다.

### 매니페스트와 잠금 파일

- `.ai/manifests/adapter-parity.json`은 지원 AI adapter의 공통 policy·role·permission 계약을 고정한다.
- `.ai/manifests/requirement-traceability.json`은 요구사항 상태와 구현·외부 대기 task를 연결한다.
- `.ai/manifests/security-tools.yaml`과 `security-tool-assets.json`은 보안 도구 version·artifact
  checksum을 고정한다.
- Downstream 적용 뒤 생성되는 `upstream.lock.yaml`, adapter·skill·dependency lock은 source·target
  hash와 생성 소유권을 기록한다. 이 파일은 upstream clone에 미리 가짜 상태로 두지 않는다.

### 자동화

- `bootstrap`은 먼저 변경 없는 preview를 제공하고, 쓰기 작업은 exact plan과 명시 승인을 요구한다.
- `validate`는 필수 파일, 버전, 링크, 중복된 규칙과 품질 게이트를 검사한다.
- CI는 로컬 `validate`와 동일한 검사를 실행한다.
- 하네스 생성 플러그인은 이 파일들을 만드는 보조 도구일 뿐 런타임 필수 요소가 아니다.
- 보안 훅은 정책의 빠른 집행 계층이며 샌드박스, IAM과 CI를 대체하지 않는다.
- Git hook manager는 공통 코어의 선행 의존성이 아니다. downstream 개발환경과 실제 품질
  명령이 승인된 뒤 기술 스택 adapter가 Husky 또는 적절한 대안을 선택한다.

## 배포 모델

현재 권장은 **versioned upstream + project-local materialization + 명시적 upgrade** 조합이다.

- 새 프로젝트: onboarding 질문과 선택한 starter reference를 preview한 뒤 생성한다.
- 기존 프로젝트: inventory와 충돌을 먼저 확인하고 선택한 구성만 retrofit한다.
- 공통 규칙 업데이트: 버전 태그를 발행하고 각 프로젝트가 명시적으로 업그레이드한다.
- 각 애플리케이션의 고유 규칙: 해당 저장소에서 공통 규칙을 확장하되 덮어쓰는 이유를 기록한다.

Git submodule은 사용 복잡도가 높고, 공통 파일의 무조건 복사는 드리프트가 생기므로 기본
배포 방식으로 권장하지 않는다.

배포에는 [유지보수와 도입 모델](adoption-and-maintenance-model.md)의 두 경로를 적용한다.
upstream은 versioned 공통 환경을 개발·검증해 발행하고, downstream 회사·프로젝트는 이를
고정해 조직 policy와 프로젝트 profile을 별도 계층으로 확장한다.

## 설계 원칙

1. 정책은 한 번만 작성한다.
2. 사람과 AI가 같은 품질 게이트를 통과한다.
3. 자동화할 수 없는 규칙은 검토 체크리스트로 명시한다.
4. 개인 취향은 팀 필수 설정과 분리한다.
5. 도구 고유 기능이 없어도 핵심 SDLC는 수행할 수 있어야 한다.
6. 파괴적 작업, 배포, 비밀 접근에는 명시적인 승인 경계를 둔다.
7. 공통 정책과 프로젝트별 기술 스택 프로파일을 분리한다.

프로젝트별 프레임워크, 런타임, 데이터베이스와 지원 환경은
[프로젝트 개발환경 정의](project-environment-definition.md)의 감지·질문 절차로 확정한다.

## 현재 구현과 남은 경계

- `.ai/` 공통 정책, 세 AI 도구 adapter, profile·starter·skill·dependency reference와 deterministic
  fixture는 구현돼 있다.
- GitHub Actions P0 delivery mechanics는 분리된 downstream pilot에서 PASS했다.
- GitHub App Web Portal은 local no-network reference까지만 PASS했다.
- 실제 GitHub App 등록·provider API·Production hosting과 비개발자 사용성 Eval은 `NOT-RUN`이다.
- 실제 dependency 설치·DB write·provider 변경·Production 배포는 project별 별도 승인과 증거 없이는
  완료로 표시하지 않는다.
