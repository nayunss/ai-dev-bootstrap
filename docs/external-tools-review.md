# 외부 도구 도입 평가

상태: 제안
평가 기준일: 2026-07-11

## 평가 대상

| 로컬 경로 | 식별 정보 | 현재 상태 |
|---|---|---|
| `../tool/agent-skills` | `addyosmani/agent-skills`, 커밋 `4e8bd9fde4a38cd009053e649f4cdc7cd36b568b` | 원격 저장소의 로컬 clone |
| `../tool/github-speckit` | Spec Kit 0.12.11, 로컬 커밋 `7706c12be035c3ae7e9ed8e4bc4f0dfaf277b870` | `claude` 통합으로 초기화된 프로젝트 산출물, 원격 `origin` 없음 |

두 번째 폴더는 `github/spec-kit` 원본 저장소 clone으로 볼 수 없다. `.specify/` 템플릿과
스크립트, `.claude/skills/`가 설치된 프로젝트 스냅샷이다. 따라서 원본 라이선스·태그와의
연결을 별도 잠금 정보 없이 이 폴더만으로 증명할 수 없다.

## 요약 판정

| 질문 | Agent Skills | GitHub Spec Kit |
|---|---|---|
| 현재 공통 프로젝트에 통째로 가져오기 | 권장하지 않음 | 권장하지 않음 |
| 일부를 그대로 사용 | 가능. 개별 Markdown 스킬·체크리스트·검증기 | 가능. 공식 배포판의 템플릿·스크립트를 선택 프로필로 생성 |
| 설계 패턴만 차용 | 매우 적합 | 매우 적합 |
| 기본 하네스로 채택 | 후보지만 기존 도구와 중복 정리가 선행돼야 함 | 부적합. 기능 단위 SDD 도구에 가까움 |
| 작은 웹 앱·버그 수정 | 전체 팩은 다소 과함 | 대부분 과함 |
| 중대형 웹 기능 | 선택 스킬 구성이 적당함 | 요구사항이 복잡하면 적당함 |
| Codex·Claude Code 공통화 | 적합 | 공식 배포판은 적합하나 현재 로컬 사본은 Claude 전용 초기화 |
| 현재 보안 판정 | 부분 도입 후보 | 출처 고정 후 조건부 도입 후보 |

최종 권장은 **Agent Skills에서 하네스 품질 패턴과 일부 자산을 채택하고, Spec Kit은
`spec-driven` 선택 프로필로만 제공**하는 것이다.

## Agent Skills 평가

### 제공 범위

Agent Skills는 24개 스킬을 DEFINE, PLAN, BUILD, VERIFY, REVIEW, SHIP 단계로 구성한다.
여기에 8개 명령, 4개 전문 리뷰 에이전트, 체크리스트, 도구별 어댑터, 훅과 스킬 평가
프레임워크가 포함된다. Codex와 Claude Code를 포함한 여러 AI 도구를 지원한다.

로컬 복제본에서 다음 내장 검증을 실행했고 통과했다.

```text
node scripts/validate-skills.js   → 24 skills, 0 errors, 0 warnings
node scripts/validate-commands.js → 8 commands, parity and descriptions PASS
```

이는 구조적 일관성을 증명하지만 스킬 내용의 정확성이나 런타임 안전 전체를 보증하지는 않는다.

### 기존 선호 도구와의 중복

| Agent Skills 영역 | 겹치는 기존 항목 | 판단 |
|---|---|---|
| `using-agent-skills` 라우터 | Superpowers의 자동 스킬 선택 | 둘을 동시에 기본 라우터로 사용하지 않음 |
| `spec-driven-development`, `planning-and-task-breakdown` | Superpowers의 brainstorming·writing-plans, Brown의 `sharpen`·`productify` | 하나의 공통 발견·계획 흐름으로 병합 |
| `test-driven-development`, `debugging-and-error-recovery` | Superpowers의 TDD·systematic-debugging | 중복 설치 대신 한 구현을 선택 |
| `code-simplification` | Ponytail, Karpathy Guidelines | Ponytail을 구현 최소화에 사용하고 체크리스트만 보완 |
| `frontend-ui-engineering` | Hallmark, `frontend-design` | 디자인 방향보다 엔지니어링·접근성 체크리스트로 한정 |
| 리뷰 에이전트 4종 | 현재 `agents.md`의 reviewer 역할 | 역할 계약과 출력 형식의 참고 구현으로 활용 |
| 전체 SDLC 명령 | 현재 `sdlc.md` | 현재 문서를 단일 진실 원천으로 두고 명령 이름만 차용 가능 |

전체 플러그인을 Superpowers와 함께 활성화하면 두 라우터가 같은 요청에 서로 다른 필수
워크플로를 요구할 수 있다. 컨텍스트 사용량도 커지고 작은 변경에 과한 절차가 적용된다.

### 그대로 가져와 쓸 수 있는 부분

MIT 라이선스와 저작권 고지를 보존하고 정확한 커밋을 기록한다는 전제에서 다음은 직접
도입 후보가 될 수 있다.

1. `scripts/validate-skills.js`
   - 스킬 디렉터리, frontmatter, 트리거 문구, 필수 섹션과 교차 참조를 검사한다.
   - 경로와 필수 섹션을 이 프로젝트의 스킬 계약에 맞게 소폭 수정해야 한다.
2. `scripts/validate-commands.js`
   - 여러 도구의 명령 이름과 설명이 드리프트하는지 검사하는 패턴을 사용할 수 있다.
3. `evals/` 구조
   - 트리거, 라우팅, 실제 행동을 분리해 평가하는 방식이 공통 스킬 검증에 적합하다.
   - 모델 호출이 필요한 평가와 결정론적 CI 평가를 분리해야 한다.
4. `references/definition-of-done.md`
   - 작업별 인수 조건과 프로젝트 공통 완료 조건을 구분하는 패턴을 차용한다.
5. 보안·테스트·성능·접근성 체크리스트
   - 현재 표준과 충돌 여부를 검토해 필요한 항목만 병합한다.
6. `docs/skill-anatomy.md`
   - Overview, When to Use, Process, Rationalizations, Red Flags, Verification 구조를
     공통 스킬 작성 규약의 참고로 사용한다.

개별 스킬을 거의 그대로 사용할 후보는 다음과 같다.

- `documentation-and-adrs`
- `api-and-interface-design`
- `deprecation-and-migration`
- `security-and-hardening`
- `performance-optimization`
- `accessibility-checklist.md`

이들은 현재 선호 플러그인과 직접 충돌이 비교적 적다. 다만 프로젝트 기술 스택과 보안
정책에 맞게 내용 검토를 거친 뒤 선택 설치해야 한다.

### 가져오지 않고 차용할 부분

- DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP의 공통 언어
- 사람의 단계별 승인과 `/build auto`의 명시적 자율 실행 구분
- Skill, Persona, Command를 각각 how, who, when으로 나누는 모델
- 여러 독립 리뷰를 fan-out하고 하나의 go/no-go로 병합하는 패턴
- 합리화 방지 표와 Red Flags를 스킬에 포함하는 방식
- 스킬 자체를 CI로 검사하고 평가하는 운영 모델

### 가져오지 않을 부분

- 24개 스킬 전체의 무조건 설치
- `using-agent-skills`의 “1% 가능성에도 항상 스킬 사용” 정책
- Superpowers와 동시에 동작하는 두 번째 기본 라우터
- 모든 변경을 동일한 무게의 프로세스로 처리하는 규칙
- 도구별 명령 파일의 수동 복제
- 네트워크 동작을 포함하는 SDD 캐시 훅

### 보안 검토

로컬 정적 검색에서 일반 스킬 문서는 Markdown 중심이며 명시적인 분석 SDK는 발견하지
못했다. 그러나 다음 실행 표면이 있다.

- `hooks/session-start.sh`: 세션마다 meta-skill을 주입하며 `jq`를 실행한다.
- `hooks/sdd-cache-pre.sh`, `sdd-cache-post.sh`: `curl`로 대상 URL에 HEAD 요청을 보내고
  가져온 내용을 `.claude/sdd-cache`에 저장한다.
- `scripts/run-evals.js`: 자식 프로세스를 실행한다.
- 일부 스킬은 MCP와 외부 공식 문서 접근을 지시한다.

SDD 캐시는 제품 텔레메트리로 보이지 않지만 자동 네트워크 요청이므로 이 프로젝트의
`networkDefault: deny` 정책에는 맞지 않는다. 기본 배포에서 제외한다. 세션 훅도 필수가
아니며, 개별 스킬을 필요할 때 불러오는 방식을 우선한다.

## GitHub Spec Kit 평가

### 제공 범위

현재 로컬 산출물은 다음 흐름을 제공한다.

```text
constitution → specify → clarify → plan → tasks → analyze → implement
```

명세, 계획, 작업 목록, 체크리스트 템플릿과 기능 디렉터리 생성용 Bash 스크립트가 있으며,
workflow 파일은 specify와 plan 이후 사람의 승인 게이트를 둔다. 로컬 설정은 다음과 같다.

```text
speckit_version: 0.12.11
integration: claude
script: sh
ai_skills: true
feature_numbering: sequential
```

공식 Spec Kit은 초기화 시 AI 통합을 선택해 프로젝트 파일을 생성하는 방식이지만, 현재
로컬 사본에는 Claude 통합만 설치돼 있다. 이 사본을 복사하면 공통화가 아니라 Claude 설정을
다른 프로젝트에 복제하게 된다.

### 현재 프로젝트에 과한가

Spec Kit의 적합성은 저장소 크기보다 변경의 불확실성과 위험도로 판단한다.

| 작업 | 판단 | 이유 |
|---|---|---|
| 문구·스타일 수정 | 과함 | 명세·계획·작업 문서 비용이 변경보다 큼 |
| 명확한 작은 버그 | 대체로 과함 | 회귀 테스트와 짧은 계획이면 충분 |
| 작은 CRUD·프로토타입 | 선택 | 학습 목적이면 유용하지만 속도를 저하시킬 수 있음 |
| 여러 화면·API·DB가 연결된 기능 | 적당함 | 계약과 작업 순서를 명시할 가치가 있음 |
| 인증·결제·개인정보·마이그레이션 | 권장 | 명세, 위험, 승인과 롤백 추적이 중요함 |
| 장기 협업 제품 | 권장 | 세션과 AI 도구가 바뀌어도 기능 문맥을 유지함 |

따라서 모든 요청에 Spec Kit을 강제하지 않고 `web-application`의 복잡 기능과
`high-risk-web` 프로필에서 활성화하는 것이 적당하다.

### 그대로 가져와 쓸 수 있는가

두 가지 의미를 구분해야 한다.

1. **현재 `tool/github-speckit` 폴더 전체 복사:** 사용할 수는 있지만 권장하지 않는다.
   constitution이 자리표시자 상태이고, Claude 통합만 설치됐으며, 원본 remote와 라이선스
   연결이 없다.
2. **공식 Spec Kit의 고정 버전으로 프로젝트 초기화:** 선택 프로필에서는 사용할 수 있다.
   설치 전에 CLI와 생성 산출물을 보안 심사하고, `--integration`을 각 AI 도구에 맞게
   명시하며, 기존 파일 병합 diff를 검토해야 한다.

직접 재사용 후보는 다음과 같다.

- `spec-template.md`, `plan-template.md`, `tasks-template.md`
- `checklist-template.md`
- `constitution-template.md`
- specify → plan → tasks 사이의 사람 승인 게이트
- 기능별 `spec.md`, `plan.md`, `tasks.md` 추적 구조

스크립트는 현재 Bash 구현 전체를 바로 복사하기보다 공식 버전을 고정해 사용하거나 필요한
최소 기능만 테스트와 함께 재구현한다. 경로 탐색, 기능 번호, Git 브랜치와 템플릿 병합까지
포함해 초기 공통 환경에는 과한 부분이 많기 때문이다.

### 가져오지 않고 차용할 부분

- 프로젝트 헌법과 개별 기능 명세를 분리하는 개념
- 명세에 `[NEEDS CLARIFICATION]` 같은 미해결 상태를 노출하는 패턴
- 구현 전에 명세와 계획을 각각 사람이 승인하는 게이트
- 기능 단위로 연구, 데이터 모델, 계약, 빠른 시작 문서를 점진 생성하는 구조
- 명세·계획·작업 간 일관성을 구현 전에 분석하는 단계
- AI 통합을 생성 시점의 어댑터로 취급하는 구조

### 보안 검토

현재 `.specify` 산출물의 셸·JSON·YAML 정적 검색에서는 텔레메트리나 외부 HTTP 요청을
발견하지 못했다. 스크립트는 디렉터리·명세 파일을 만들고 Git 상태와 브랜치를 다루므로
쓰기 범위와 기존 파일 덮어쓰기 동작을 검증해야 한다.

이 결과는 Spec Kit CLI 설치 과정과 원본 패키지의 안전을 보증하지 않는다. 현재 폴더에는
원본 저장소와 연결된 잠금 정보가 없으므로 CLI 자체는 별도의 공급망 심사가 필요하다.

## 두 도구를 함께 적용하는 방법

두 도구를 모두 활성 라우터로 사용하지 않는다. 역할을 다음처럼 분리한다.

```text
공통 하네스
├── 기본 SDLC와 스킬 계약
├── Agent Skills에서 차용한 검증기·평가·체크리스트
└── 선택 프로필: Spec Kit 기반 기능 명세 산출물
```

- 평소 작업: 공통 SDLC와 필요한 개별 스킬만 사용
- 모호하거나 중대형인 기능: Spec Kit 프로필을 켜서 spec·plan·tasks 생성
- 구현·검증: 공통 테스트, 리뷰, 보안 게이트로 복귀
- 고위험 변경: Spec Kit 산출물과 독립 리뷰를 함께 요구

Spec Kit이 명세 산출물을 담당하고 Agent Skills에서 차용한 규칙이 구현 품질을 담당하도록
하면 라우팅 충돌을 줄일 수 있다.

## 도입 결정

### 지금 채택

- Agent Skills의 skill anatomy와 정적 검증기 설계
- 결정론적 평가와 모델 기반 행동 평가를 분리하는 eval 구조
- Definition of Done 및 보안·테스트·성능·접근성 체크리스트의 검토·병합
- Skill, Persona, Command의 책임 분리
- Spec Kit의 spec → plan → tasks와 단계별 승인 패턴
- 작은 작업에는 문서 절차를 축소하는 변경 규모별 경로

### 실험 후 채택

- Agent Skills의 충돌이 적은 개별 스킬 5~6개
- Agent Skills 리뷰 persona의 출력 계약
- 공식 Spec Kit 고정 버전을 사용하는 `spec-driven` 선택 프로필
- 기능별 `specs/<feature>/` 산출물 구조

### 채택하지 않음

- 두 저장소의 통째 복사
- Agent Skills 전체 팩과 Superpowers의 동시 기본 활성화
- Agent Skills 네트워크 캐시 훅의 기본 활성화
- 현재 Claude 전용 Spec Kit 스냅샷을 공통 템플릿으로 사용
- 버전·출처가 고정되지 않은 CLI 또는 `npx -y` 설치

## 후속 검증

1. `common-project`의 스킬 규약을 확정하고 Agent Skills 검증기를 이에 맞게 포팅한다.
2. 중복이 적은 개별 스킬을 후보별로 내용·외부 명령·라이선스 검토한다.
3. 작은 버그, 일반 기능, 고위험 기능 예제로 프로세스 비용과 결과를 비교한다.
4. 공식 Spec Kit 버전과 생성 파일 해시를 잠금 파일에 기록한다.
5. 네트워크 차단 샌드박스에서 두 후보의 선택 기능을 검증한다.
6. 실험 결과를 ADR로 남긴 뒤 기본·선택 프로필을 확정한다.

## 출처

- 로컬 `tool/agent-skills`와 Git 메타데이터
- 로컬 `tool/github-speckit/.specify` 및 `.claude/skills`
- <https://github.com/addyosmani/agent-skills>
- <https://github.com/github/spec-kit>
- <https://github.github.com/spec-kit/reference/core.html>
