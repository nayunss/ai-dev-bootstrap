# 권장 아키텍처

상태: 제안

## 결론

권장 구조는 **도구 중립 코어 + 도구별 어댑터 + 자동 검증**이다. 팀의 지식과 정책을
공통 코어에 한 번만 작성하고, Codex와 Claude Code는 이를 읽는 얇은 진입점만 가진다.

이 구조 전체를 이 프로젝트에서는 **AI 개발 하네스**라고 부른다. 하네스는 특정 제품이나
플러그인의 이름이 아니라 AI가 프로젝트에서 안전하고 일관되게 일하도록 만드는 실행 환경이다.
자세한 구성 원칙은 [하네스 구성](harness.md)을 따른다.

```text
개발자와 AI 도구
      │
      ▼
도구별 어댑터 (AGENTS.md, CLAUDE.md)
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

## 권장 저장소 구조

제공된 Claude Code vault 이미지와 Codex·Copilot·Cursor·Gemini·Cline의 공식 규약 및 공개
저장소 비교는 [다중 AI 폴더 구조 검토](multi-ai-project-structure-review.md)에 정리한다.

```text
common-project/
├── README.md
├── AGENTS.md                 # Codex용 얇은 진입점
├── CLAUDE.md                 # Claude Code용 얇은 진입점
├── .ai/
│   ├── README.md
│   ├── standards/
│   │   ├── engineering.md
│   │   ├── testing.md
│   │   ├── security.md        # AI 도구와 제품 코드의 보안 정책
│   │   └── documentation.md
│   ├── skills/<skill-name>/SKILL.md
│   ├── agents/<role>.md
│   ├── workflows/<workflow>.md
│   └── manifests/
│       ├── tools.yaml
│       └── skills.lock.yaml
├── adapters/                 # 실제 지원하는 도구의 생성 mapping만 선택적으로 추가
│   └── <tool>/
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── skills.md
│   ├── agents.md
│   ├── sdlc.md
│   └── decisions/
├── scripts/
│   ├── bootstrap
│   └── validate
├── templates/                # 새 웹 프로젝트에 복사·생성할 파일
├── tests/                    # 하네스와 템플릿 자체의 검증
└── .github/workflows/
    └── validate.yml
```

초기에는 문서로 계약을 확정하고, `.ai/`, 스크립트, 템플릿은 실제 요구사항이 정해지는
순서대로 구현한다. `adapters/`도 실제 도구별 materialization이 필요할 때만 만들며 빈 디렉터리를
미리 대량 생성하지 않는다.

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

- `tools.yaml`은 지원 도구, 최소 버전, 선택 여부와 설치 방법을 선언한다.
- `skills.lock.yaml`은 스킬의 출처, 버전 또는 커밋 해시와 무결성 정보를 고정한다.
- 개인 전역 환경에 의존하지 않고 프로젝트에서 필요한 상태를 확인할 수 있게 한다.

### 자동화

- `bootstrap`은 필요한 파일과 도구를 설치하거나 설치 방법을 안내한다.
- `validate`는 필수 파일, 버전, 링크, 중복된 규칙과 품질 게이트를 검사한다.
- CI는 로컬 `validate`와 동일한 검사를 실행한다.
- 하네스 생성 플러그인은 이 파일들을 만드는 보조 도구일 뿐 런타임 필수 요소가 아니다.
- 보안 훅은 정책의 빠른 집행 계층이며 샌드박스, IAM과 CI를 대체하지 않는다.
- Git hook manager는 공통 코어의 선행 의존성이 아니다. downstream 개발환경과 실제 품질
  명령이 승인된 뒤 기술 스택 adapter가 Husky 또는 적절한 대안을 선택한다.

## 배포 모델

초기 권장은 **템플릿 저장소 + 동기화 도구**의 조합이다.

- 새 프로젝트: 템플릿으로 생성한다.
- 기존 프로젝트: 선택한 구성만 설치하는 스크립트를 제공한다.
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

## 단계적 구현

1. 요구사항과 용어를 합의한다.
2. Codex와 Claude Code 어댑터의 최소 기준을 구현한다.
3. 공통 스킬 계약과 잠금 형식을 만든다.
4. 하나의 기준 웹 스택으로 템플릿을 검증한다.
5. 로컬 검증과 CI를 동일하게 만든다.
6. 실제 프로젝트 적용 결과를 반영해 버전 `1.0`을 확정한다.
