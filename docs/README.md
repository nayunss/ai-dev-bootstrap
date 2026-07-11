# 문서 안내

이 디렉터리는 AI 개발 환경 공통화 프로젝트의 요구사항과 설계를 관리합니다.

## 문서 목록

| 문서 | 목적 | 상태 |
|---|---|---|
| [요구사항](requirements.md) | 사용자가 원하는 기능과 제약을 지속적으로 수집 | 작성 중 |
| [권장 아키텍처](architecture.md) | 도구 중립 코어와 도구별 어댑터 구조 정의 | 제안 |
| [하네스 구성](harness.md) | 최소 공통 하네스와 프로젝트별 구성 방식 정의 | 제안 |
| [프로젝트 개발환경 정의](project-environment-definition.md) | 기술 스택 자동 감지·질문·버전 확정 절차 | 제안 |
| [토큰 예산별 프로파일](token-budget-profiles.md) | 토큰 절약형과 충분한 분석형 실행 방식 | 제안 |
| [프롬프트 템플릿](prompt-templates.md) | 프롬프트가 필요한 조건과 최소 공통 템플릿 | 제안 |
| [Eval 전략](evaluation-strategy.md) | 하네스·루프·모델 변경의 outcome 기반 평가 | 제안 |
| [유지보수와 도입 모델](adoption-and-maintenance-model.md) | Upstream 기여와 회사·프로젝트 도입 경계 | 제안 |
| [코드 품질 표준](code-quality-standards.md) | 언어 중립 클린 코드와 시멘틱 웹 접근성 기준 | 작성 중 |
| [프론트엔드 도구와 훅](frontend-tooling-and-hooks.md) | Prettier·ESLint·Husky 및 AI·Git 훅 정책 | 제안 |
| [스킬 체계](skills.md) | 공통 스킬의 분류, 계약, 설치 및 검증 방식 정의 | 제안 |
| [도구 호환성](tool-compatibility.md) | 선호 플러그인의 도구별 지원과 공통 대체 경로 | 작성 중 |
| [외부 도구 평가](external-tools-review.md) | GitHub Spec Kit과 Agent Skills의 도입·차용 가능성 평가 | 제안 |
| [공급망 보안](supply-chain-security.md) | 텔레메트리 없는 설치와 보안 검토 게이트 | 제안 |
| [AI 보안 가드레일](ai-security-guardrails.md) | AI 도구의 권한·프롬프트 인젝션·파괴적 동작 통제 | 제안 |
| [AI 보안 사고 조사](ai-security-incidents.md) | 공개 사고와 공식 위험 자료에서 도출한 통제 | 조사 완료 |
| [세션 Handoff](handoff.md) | 작업 종료 기록과 새 세션의 안전한 재개 절차 | 제안 |
| [CodeSight](codesight.md) | AI 도구가 공유하는 프로젝트 코드 컨텍스트 | 적용 |
| [에이전트 체계](agents.md) | 역할, 권한, 위임 및 산출물 규칙 정의 | 제안 |
| [SDLC](sdlc.md) | 요구사항부터 운영까지의 AI 협업 절차 정의 | 제안 |

## 문서 상태

- `작성 중`: 계속 수집하거나 구체화하는 문서
- `제안`: 검토가 필요한 권장안
- `승인`: 팀의 표준으로 채택된 내용
- `폐기`: 더 이상 사용하지 않으며 대체 문서를 명시한 내용

중요한 설계 선택은 추후 `docs/decisions/` 아래 ADR(Architecture Decision Record)로 남깁니다.

## 자주 찾는 질문

- 특정 플러그인 없이 하네스를 구성할 수 있는가? → [하네스 FAQ](harness.md#faq)
- 공통 환경에 하네스가 필수인가? → [하네스 FAQ](harness.md#faq)
- AI에게 프롬프트로 하네스 구성을 맡겨도 되는가? → [하네스 FAQ](harness.md#faq)
