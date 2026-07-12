# 선호 도구 호환성

상태: 작성 중
조사 기준일: 2026-07-11

## 적용 원칙

선호 도구의 이름을 모든 AI 환경에 억지로 맞추지 않는다. 먼저 도구가 제공하는 결과를
정의한 뒤 다음 순서로 적용한다.

1. 동일 프로젝트의 공식 다중 도구 배포판
2. 감사된 도구 중립 `SKILL.md` 또는 규칙 파일
3. AI 도구의 네이티브 기능
4. 공통 코어에서 직접 관리하는 최소 스킬

`Claude 전용`은 기능이 Claude에만 가능하다는 뜻이 아니라 현재 배포 패키지나 연결 방식이
Claude Code에 종속된다는 뜻이다.

## 초기 판정

| 항목 | 현재 형태 | 도구 호환성 | 공통 환경의 권장 경로 | 보안 판정 |
|---|---|---|---|---|
| Ponytail | 스킬 + 훅 + 플러그인 | Codex, Claude Code 등 다중 도구 공식 지원 | 공통 스킬 6종을 버전 고정해 사용. 자동 모드가 필요할 때만 도구별 훅 허용 | 조건부 승인 |
| Superpowers | 스킬 + 훅 + 로컬 서버 | Codex, Claude Code 등 다중 도구 공식 지원 | 감사된 핵심 스킬만 선택 설치. 서브에이전트 전용 흐름은 각 도구 능력에 맞게 축소 | 보류/조건부 |
| `claude-code-lsps`의 `vtsls` | Claude Code LSP 어댑터 | Claude Code 전용 | 각 도구의 네이티브 LSP를 사용하고 공통 검증은 `tsc --noEmit`, ESLint, 테스트로 통일 | 어댑터만 조건부 승인 |
| Andrej Karpathy Skills | Markdown 지침 | Claude 플러그인 외에 Cursor 규칙과 범용 스킬 제공 | `karpathy-guidelines`를 도구 중립 스킬로 고정 | 조건부 승인 |
| `ideas-come-true` | `sharpen`, `productify` Markdown 스킬 | 패키징은 Claude 전용, 내용은 이식 가능 | 두 스킬의 결과 계약을 공통 `requirements`·`product-discovery` 스킬로 이식 | 조건부 승인 |
| Hallmark | Markdown 스킬과 참고 문서 | Claude Code, Cursor, Codex 지원 | 공식 도구 중립 스킬을 커밋 고정해 프로젝트 범위에 설치 | 조건부 승인 |
| `frontend-design` | Anthropic 공식 Claude 플러그인 | 패키징은 Claude 전용, 핵심은 지침 | 공통 `frontend-design` 계약으로 이식하거나 감사된 다중 도구 디자인 스킬 사용 | 조건부 승인 |
| Addy Osmani Agent Skills | 24개 스킬 + 에이전트 + 명령 + 훅 | Codex, Claude Code 등 다중 도구 지원 | 전체 설치보다 선택 스킬·검증기·체크리스트를 공통 코어에 도입 | 부분 도입 권장 |
| GitHub Spec Kit | CLI가 생성하는 SDD 템플릿·스크립트·통합 | 공식적으로 복수 AI 통합 지원 | 중대형 기능용 선택적 `spec-driven` 프로필로 제공 | 조건부 승인 |

`조건부 승인`은 안전을 보증한다는 의미가 아니다. 현재 로컬 사본의 정적 검토에서 즉시
차단할 근거를 찾지 못했으며, [설치 게이트](supply-chain-security.md)를 통과한 정확한 버전만
사용할 수 있다는 뜻이다.

두 외부 도구의 상세 비교와 직접 사용 가능한 자산은 [외부 도구 평가](external-tools-review.md)에
정리한다.

## 항목별 적용

### Ponytail

공식 저장소는 `.codex-plugin`, `.claude-plugin`, `.agents`, Cursor, Windsurf 등 여러 어댑터와
공통 `skills/`를 제공한다. 따라서 Claude 전용 대체품을 새로 만들 필요가 없다.

- 기본: 실행 코드가 적은 `skills/`만 프로젝트 범위에 설치한다.
- 선택: 모드 자동 활성화가 꼭 필요하면 Codex와 Claude Code의 공식 훅을 각각 심사한다.
- 제외: `benchmarks/`는 외부 모델 API 호출 코드를 포함하므로 배포 산출물에서 제외한다.
- 주의: 훅은 로컬 상태 파일과 도구 설정을 변경하므로 Markdown 스킬보다 높은 위험 등급이다.

### Superpowers

공식 저장소가 Codex와 Claude Code를 모두 지원하므로 별도 유사품보다 공식 공통 스킬을
우선한다. 다만 현재 확인한 6.1.1의 브레인스토밍 로컬 서버는 기본 상태에서 원격 브랜드
이미지를 요청하고 환경변수로 이를 끄는 구조다. 이 프로젝트의 무텔레메트리 원칙에는 기본
상태가 맞지 않는다.

- 우선 허용 후보: TDD, 체계적 디버깅, 계획, 완료 전 검증처럼 Markdown 중심인 스킬
- 기본 제외 후보: 브레인스토밍 로컬 웹 UI와 원격 자산, 자동 훅, 병렬 서브에이전트 전용 흐름
- 전체 플러그인을 쓸 경우: `SUPERPOWERS_DISABLE_TELEMETRY=true`를 강제하고 외부 요청이
  실제로 차단되는지 자동 검사해야 한다.
- 장기 권장: 필요한 방법론을 공통 SDLC 계약으로 흡수해 플러그인 부재 시에도 동일 게이트를 적용한다.

### Claude Code LSPs

`claude-code-lsps`는 언어 서버 자체가 아니라 Claude Code가 외부 언어 서버를 호출하도록
연결하는 매니페스트 모음이다. `vtsls` 매니페스트는 실제 `vtsls` 실행 파일에 의존한다.

- Claude Code: 심사한 매니페스트와 정확한 언어 서버 버전을 사용한다.
- 다른 AI 도구: 해당 도구의 네이티브 LSP 또는 IDE 통합을 사용한다.
- 모든 도구 공통: CI에서 컴파일러, 린터, 테스트를 실행한다. LSP 결과만 품질 게이트로 삼지 않는다.

### Andrej Karpathy Skills와 Ponytail의 중복

두 항목 모두 단순성, 작은 변경, 코딩 전 사고를 강조한다. 항상 둘을 중복 주입하면 컨텍스트만
늘어날 수 있으므로 다음처럼 나눈다.

- Ponytail: 구현과 리팩터링에서 YAGNI와 최소 해법 선택
- Karpathy Guidelines: 요구사항 명료화, 외과적 변경, 목표 기반 실행의 기본 행동 규칙
- 중복 규칙은 공통 `engineering.md`에 한 번만 작성하고 원본 출처를 기록한다.

공통 `engineering.md`에는 source-first, 가정 명시, 단순성, 외과적 변경과 검증 가능한 목표를
흡수한다. Kent Beck의 Red·Green·Refactor, Tidy First와 작은 논리 commit 원칙도 도구 중립 계약으로
관리한다. Claude 전용 응답 형식이나 개인 경로는 이식하지 않고 프로젝트 언어·공통 경로로 바꾼다.

### Brown Claude Marketplace

현재 선호 대상은 마켓플레이스 전체가 아니라 `ideas-come-true`의 `sharpen`과 `productify`다.
두 파일은 현재 로컬 사본 기준 Markdown 스킬이므로 Claude 슬래시 명령 이름을 공통 계약으로
바꾸어 이식할 수 있다.

- `sharpen` → 발견 단계의 `product-discovery`
- `productify` → 요구사항 이후의 `solution-shaping`
- 마켓플레이스 전체를 신뢰하거나 설치하지 않고 필요한 두 스킬만 심사한다.

### Hallmark와 frontend-design

Hallmark는 공식적으로 Claude Code, Cursor, Codex용 스킬을 제공하므로 공통 디자인 스킬의
우선 후보로 삼는다. `frontend-design`은 Anthropic의 Claude 플러그인 패키징이지만 핵심은
디자인 지침이므로 도구 중립 계약으로 이식 가능하다.

두 스킬은 적용 범위를 구분한다.

- Hallmark: 신규 화면, 감사, 리디자인, 디자인 DNA 추출
- `frontend-design`: 구현 시 시각적 의도, 타이포그래피, 레이아웃 품질의 기본 가드레일
- 외부 URL 분석, 이미지·폰트 다운로드는 스킬 설치와 별개로 매번 네트워크 승인을 받는다.

## 아직 승인하지 않은 것

- `latest`, 브랜치 HEAD 또는 버전이 고정되지 않은 설치
- `npx -y`로 원격 패키지를 즉시 실행하는 설치
- 마켓플레이스 전체에 대한 포괄 승인
- 원격 설치 스크립트를 파이프로 셸에 전달하는 방식
- 텔레메트리 옵트아웃을 문서로만 요구하고 검사하지 않는 구성

## 다음 검증 작업

1. 각 후보의 라이선스와 배포할 정확한 커밋을 확정한다.
2. 설치 산출물만 별도 디렉터리에 펼쳐 실행 파일과 훅을 재검사한다.
3. 네트워크 차단 환경에서 설치 후 핵심 시나리오를 실행한다.
4. 예상 파일 외의 홈 디렉터리 변경이 없는지 전후 스냅샷으로 확인한다.
5. 통과한 항목만 `skills.lock.yaml`의 허용 목록에 넣는다.

## 조사 출처

- 로컬 `CLAUDE-SETUP.md`와 `~/.claude` 설치 사본
- <https://github.com/DietrichGebert/ponytail>
- <https://github.com/obra/superpowers>
- <https://github.com/Piebald-AI/claude-code-lsps>
- <https://github.com/multica-ai/andrej-karpathy-skills>
- <https://github.com/kimyoon21/brown-claude-marketplace>
- <https://github.com/nutlope/hallmark>
- <https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design>
