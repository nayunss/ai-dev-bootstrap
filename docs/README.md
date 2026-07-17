# 문서 안내

이 디렉터리는 AI 개발 환경 공통화 프로젝트의 요구사항과 설계를 관리합니다.

## 문서 목록

| 문서 | 목적 | 상태 |
|---|---|---|
| [요구사항](requirements.md) | 승인된 REQ-001–REQ-048과 구현·검증 상태를 추적 | 설계 승인 |
| [설계 완료 감사](design-completion-audit.md) | 설계 명세 완료 범위, 실제 구현 경계와 감사 finding | 설계 승인 |
| [권장 아키텍처](architecture.md) | 도구 중립 코어와 도구별 어댑터 구조 정의 | 설계 승인 |
| [다중 AI 폴더 구조 검토](multi-ai-project-structure-review.md) | 공개 규약·저장소와 제공 이미지 기반 canonical 구조·adapter 비교 | 검토 완료 |
| [AI 생성 코드 라이선스·출처](ai-generated-code-license-provenance.md) | public-code reference, dependency license와 source snippet provenance gate | 검토 완료 |
| [API 계약과 문서화](api-contract-documentation.md) | FastAPI·OpenAPI·Swagger 역할, stack adapter와 production docs gate | 설계 승인 |
| [하네스 구성](harness.md) | 최소 공통 하네스와 프로젝트별 구성 방식 정의 | 설계 승인 |
| [프로젝트 개발환경 정의](project-environment-definition.md) | 기술 스택 자동 감지·질문·버전 확정 절차 | 설계 승인 |
| [개발환경 Profile Schema·Validator 검토](development-environment-profile-schema-review.md) | canonical YAML·JSON Schema·drift·readiness validator 구현 범위 | 설계 승인 |
| [2026년 기준 최초 검증 Stack과 Adapter 우선순위](stack-adapter-priority-review.md) | 기준일 현재 최신 공개 사용량 기반 frontend·backend·full-stack P0~P3 순서 | 검토 완료 |
| [저장소 구조와 Project Template 우선순위](repository-topology-and-template-priority.md) | 단일 starter·retrofit·workspace monorepo·전문 orchestrator 제공 순서 | 설계 승인 |
| [개인·팀·프로젝트 설정 경계](personal-team-settings-boundary.md) | 팀 필수·project 필수·개인 선택·사전 심사·금지 범위 | 설계 승인 |
| [프로젝트 유지관리 기록](project-maintenance.md) | 반복 문제·환경 함정의 원인·탐지·예방 기록 | 운영 메모 |
| [토큰 예산별 프로파일](token-budget-profiles.md) | 토큰 절약형과 충분한 분석형 실행 방식 | 설계 승인 |
| [프롬프트 템플릿](prompt-templates.md) | 프롬프트가 필요한 조건과 최소 공통 템플릿 | 설계 승인 |
| [Eval 전략](evaluation-strategy.md) | 하네스·루프·모델 변경의 outcome 기반 평가 | 설계 승인 |
| [SkillOpt 논문 검토](skillopt-paper-review.md) | 제한적 skill evolution의 근거·한계·차용 범위 | 검토 완료 |
| [유지보수와 도입 모델](adoption-and-maintenance-model.md) | Upstream 기여와 회사·프로젝트 도입 경계 | 설계 승인 |
| [Git Hosting·Namespace·Remote 계약](git-hosting-and-remote-review.md) | GitHub·GitLab·enterprise·self-hosted provider-neutral 원격 계약 | 설계 승인 |
| [Branch 전략과 Review 승인 계약](branch-and-review-strategy.md) | project별 branch·merge·위험별 reviewer·self-review 경계 | 설계 승인 |
| [Downstream Pilot 검증](distributed-pilot-testing-guide.md) | 단독·다중 tester의 frontend·backend·full-stack 생성, AI provenance·증거·환류 절차 | 설계 승인 |
| [Upstream–Downstream 아키텍처](upstream-downstream-architecture.md) | upstream.lock의 역할과 materialization 적용 원리 | 설계 승인 |
| [Downstream 시작 가이드](downstream-getting-started.md) | clone 후 프로젝트 도입·개발 시작 순서 | 설계 승인 |
| [비개발자용 원클릭 프로젝트 도입 검토](one-click-project-adoption-review.md) | GUI 설치 버튼·공통 adoption core·release bundle과 rollback 검토 | 검토 완료 |
| [Downstream 검증 가이드](downstream-validation-guide.md) | 단독·독립 tester가 수행하는 무맥락 하네스 검증과 전원 PASS 판정 | 설계 승인 |
| [Upstream 피드백 기록 계약](upstream-feedback-log.md) | downstream 저장소에 남기는 upstream 수정 필요 사항 기록 형식 | 설계 승인 |
| [Supabase·Firebase 보안](backend-as-a-service-security.md) | BaaS key·권한·Rules·배포 가드레일 | 설계 승인 |
| [MCP 보안과 승인 절차](mcp-security.md) | MCP 공급망·권한 심사와 미승인 server 기본 차단 | 기본 차단 |
| [Human-in-the-loop](human-in-the-loop.md) | Upstream 질문과 Downstream 응답·승인 계약 | 설계 승인 |
| [코드 품질 표준](code-quality-standards.md) | 언어 중립 클린 코드와 시멘틱 웹 접근성 기준 | 설계 승인 |
| [프론트엔드 도구와 훅](frontend-tooling-and-hooks.md) | Prettier·ESLint·Husky 및 AI·Git 훅 정책 | 설계 승인 |
| [스킬 체계](skills.md) | 공통 스킬의 분류, 계약, 설치 및 검증 방식 정의 | 설계 승인 |
| [Skill·Plugin 배포 방식](skill-plugin-distribution-review.md) | core·optional·private skill과 adapter·plugin·MCP 배포 경계 | 설계 승인 |
| [도구 호환성](tool-compatibility.md) | 선호 플러그인의 도구별 지원과 공통 대체 경로 | 설계 승인 |
| [외부 도구 평가](external-tools-review.md) | GitHub Spec Kit과 Agent Skills의 도입·차용 가능성 평가 | 설계 승인 |
| [공급망 보안](supply-chain-security.md) | 텔레메트리 없는 설치와 보안 검토 게이트 | 설계 승인 |
| [AI 보안 가드레일](ai-security-guardrails.md) | AI 도구의 권한·프롬프트 인젝션·파괴적 동작 통제 | 설계 승인 |
| [AI 보안 사고 조사](ai-security-incidents.md) | 공개 사고와 공식 위험 자료에서 도출한 통제 | 조사 완료 |
| [세션 Handoff](handoff.md) | 작업 종료 기록과 새 세션의 안전한 재개 절차 | 설계 승인 |
| [CodeSight](codesight.md) | AI 도구가 공유하는 프로젝트 코드 컨텍스트 | 적용 |
| [에이전트 체계](agents.md) | 역할, 권한, 위임 및 산출물 규칙 정의 | 설계 승인 |
| [페르소나와 작업 역할](persona-and-role-guidelines.md) | 전역 persona와 검증 가능한 role contract의 선택 기준 | 설계 승인 |
| [SDLC](sdlc.md) | 요구사항부터 운영까지의 AI 협업 절차 정의 | 설계 승인 |
| [GitHub Actions·Vercel 프로파일](ci-deployment-profiles.md) | 프로젝트별 CI와 Preview·Production 배포 계약 | 설계 승인 |
| [CI Provider·배포 대상 선택](ci-deployment-provider-selection.md) | Git host와 독립된 CI·artifact·deployment project profile | 설계 승인 |
| [웹서비스 Production 준비](web-service-production-readiness.md) | 보안·운영·개인정보·DB·법적 적용성 팩트체크와 출시 gate | 설계 승인 |
| [Capability task schema](schemas/capability-task.schema.json) | deterministic Eval task·권한·grader·trial·자원 한도 계약 | 적용 |
| [Adapter parity schema](schemas/adapter-parity.schema.json) | 지원 AI adapter의 공통 policy·role·permission 계약 | 적용 |
| [FastAPI contract adapter schema](schemas/fastapi-contract-adapter.schema.json) | OpenAPI drift·route inventory·Production docs 노출 계약 | 적용 |
| [Full-stack materializer schema](schemas/fullstack-materializer.schema.json) | 최초 frontend·backend·shared·migration artifact와 rollback 계약 | 적용 |
| [Dependency bootstrap schema](schemas/dependency-bootstrap.schema.json) | stack별 dependency adapter 입력 계약 | 적용 |
| [Distributed pilot result schema](schemas/distributed-pilot-result.schema.json) | 독립 tester 결과·증거 계약 | 적용 |
| [Stack quality adapter schema](schemas/stack-quality-adapters.schema.json) | 언어별 formatter·linter·typecheck·접근성 실행 계약 | 적용 |
| [Canonical upstream lock schema](schemas/upstream-lock.schema.json) | release·source·target hash lock 계약 | 적용 |
| [Dependency bootstrap template](templates/dependency-bootstrap.json) | 프로젝트별 dependency bootstrap 질문 입력 | 적용 |
| [Distributed pilot campaign template](templates/distributed-pilot-campaign.json) | 실제·synthetic tester campaign 입력 | 적용 |
| [Production readiness template](templates/production-readiness.json) | 법률·retention·limiter·restore evidence 입력 | 적용 |
| [Skill evolution trial template](templates/skill-evolution-trial.json) | model·harness·trial·비용·network·reviewer 입력 | 적용 |
| [Stack quality adapter template](templates/stack-quality-adapters.json) | project별 품질 도구·version·argv 입력 | 적용 |
| [Upstream adoption template](templates/upstream-adoption.json) | release와 downstream 적용 대상 입력 | 적용 |
| [v0.2.0-pilot Release](releases/v0.2.0-pilot.md) | Pilot 자동화·보안 변경과 migration·rollback | 발행 완료 |
| [v0.2.1-pilot Release](releases/v0.2.1-pilot.md) | `.env*` 비접근 hotfix | 발행 완료 |
| [v0.2.2-pilot Release](releases/v0.2.2-pilot.md) | Dependency version 승인 계약과 validator lint 수정 | 발행 완료 |
| [v0.2.3-pilot Release](releases/v0.2.3-pilot.md) | CI·engineering·Production readiness·API contract·점진적 full-stack gate | 발행 완료 |
| [v0.2.4-pilot Release](releases/v0.2.4-pilot.md) | 공통 installer·adapter·canonical lock·upgrade rollback automation | 발행 완료 |
| [v0.2.5-pilot Release](releases/v0.2.5-pilot.md) | deterministic capability·quality·adapter·FastAPI·full-stack materializer | 발행 완료 |
| [v0.2.6-pilot Release](releases/v0.2.6-pilot.md) | REQ-047·048와 project별 profile·배포·저장소 구조 설계 baseline | 발행 준비 |

## 문서 상태

- `작성 중`: 계속 수집하거나 구체화하는 문서
- `제안`: 검토가 필요한 권장안
- `설계 승인`: 실제 구현 입력으로 채택된 설계. 구현·지원·Production 검증 완료를 뜻하지 않음
- `승인`: 팀의 표준으로 채택된 내용
- `폐기`: 더 이상 사용하지 않으며 대체 문서를 명시한 내용
- `검토 완료`: 조사·비교가 끝났지만 구현·적용 완료를 뜻하지 않는 근거 문서
- `적용`: 현재 upstream 실행 경로에 연결되어 검증되는 문서·기능
- `기본 차단`: 승인 전 사용하지 않는 default-deny 정책
- `운영 메모`: 반복되는 실제 운영 경험을 누적하는 문서
- `발행 완료`: tag·release·checksum 게시와 재검증까지 끝난 release 문서

문서의 상태와 요구사항 구현 상태는 별개다. `설계 승인` 문서의 automation이 부분 구현일 수 있고,
`검토 완료` 문서도 자동화는 미구현일 수 있다. 요구사항별 구현·검증 상태는
[`requirements.md`](requirements.md)의 상태 추적 절을 기준으로 한다.

중요한 설계 선택은 추후 `docs/decisions/` 아래 ADR(Architecture Decision Record)로 남깁니다.

## 자주 찾는 질문

- 특정 플러그인 없이 하네스를 구성할 수 있는가? → [하네스 FAQ](harness.md#faq)
- 공통 환경에 하네스가 필수인가? → [하네스 FAQ](harness.md#faq)
- AI에게 프롬프트로 하네스 구성을 맡겨도 되는가? → [하네스 FAQ](harness.md#faq)
