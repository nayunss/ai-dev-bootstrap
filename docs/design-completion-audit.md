# 설계 완료 감사

상태: 설계 승인
감사 기준일: 2026-07-17 Asia/Seoul
baseline ID: `DESIGN-BASELINE-2026-07-17`

## 결론

REQ-001~046의 승인된 요구사항에 대해 공통 정책, architecture, workflow, project-local 질문,
Human-in-the-loop 경계, 검증 outcome과 rollback 계약이 문서화되어 **설계 명세 baseline은 완료**다.

이 판정은 실제 공통 환경 구현, 모든 stack 지원, Production readiness, 유료 model trial, 외부 scanner
corpus 검증 또는 독립 tester campaign 완료를 뜻하지 않는다. 구현·검증 상태는
`docs/requirements.md`의 별도 표와 `HANDOFF.md`의 실행 가능성 분류를 따른다.

## 완료 판정의 두 축

| 축 | 판정 | 의미 |
|---|---|---|
| 설계 명세 | 완료 | 승인 요구사항, 책임 경계, 입력 profile, fail-closed gate, evidence와 rollback 계약이 구현 입력으로 사용 가능 |
| reference automation | 부분 검증 | 주요 schema·validator·fixture·pilot은 존재하지만 목표 runtime 전체 구현은 아님 |
| 실제 구현·지원 | 미완료 | canonical release materialization, stack adapter 확대와 clean downstream 적용이 남음 |
| 실제 환경 검증 | 외부 입력 대기 | Production evidence, model 호출, release 적용과 독립 tester가 project별로 필요 |

REQ-046의 “설계 완료”라는 기존 표현은 이 감사의 **설계 명세 완료**가 아니라 여러 tester가 실제
구현의 지원 상태를 승격시키는 **설계 검증 완료**를 의미한다. 두 판정을 서로 대체하지 않는다.

## 감사 범위

- 요구사항: `REQ-001`~`REQ-046`의 고유 ID, 승인 상태와 구현·검증 추적
- normative source: `.ai/standards/`, `.ai/workflows/`, `docs/requirements.md`
- architecture·operation: `docs/architecture.md`, `docs/harness.md`,
  `docs/upstream-downstream-architecture.md`, `docs/adoption-and-maintenance-model.md`
- project 결정: Production readiness, skill evolution trial, upstream adoption template와 retrofit
- verification: deterministic Eval, security gate, CodeSight, HANDOFF와 CI
- 경계: 실제 secret·개인정보·Production credential·고객 data는 감사 입력에서 제외

## 요구사항 coverage

| 요구사항 묶음 | 설계 source | 설계 판정 | 실제 구현의 대표 남은 gate |
|---|---|---|---|
| REQ-001~008 | repository·architecture·tool review·supply chain | 완료 | 선택 도구 adapter와 installer 확대 |
| REQ-009~018 | engineering·quality·security·HITL·HANDOFF·CodeSight | 완료 | stack별 formatter·accessibility·IAM 검증 |
| REQ-019~028 | requirement intake·project profile·token·Eval·bootstrap·hook | 완료 | 범용 capability suite와 stack hook adapter |
| REQ-029~039 | BaaS·MCP·CI/deploy·dependency·extension·role | 완료 | provider별 실제 IAM·deploy·build lifecycle |
| REQ-040 | Production readiness schema·workflow·onboarding | 완료 | owner evidence, multi-instance와 provider restore |
| REQ-041 | bounded patch·offline/live trial·held-out 승인 계약 | 완료 | 실제 model/harness trial과 사람 release 승인 |
| REQ-042 | canonical 구조·선택 adapter·core adoption 계약 | 완료 | canonical YAML lock, release materialization·rollback |
| REQ-043 | provenance·scanner 공급망·조건부 CI 계약 | 완료 | true public-corpus source snippet provenance |
| REQ-044~045 | API contract·점진 stack·rollback 계약 | 완료 | 추가 stack과 최초 full-stack materialization |
| REQ-046 | campaign/result schema·독립성·전원 PASS 계약 | 완료 | 독립 tester 최소 2명의 실제 결과 취합 |

## 발견 사항과 처리

| ID | 발견 | 처리 | 상태 |
|---|---|---|---|
| DCA-001 | “설계 완료”가 명세 완료와 다중 tester 검증 완료로 혼용됨 | 두 축을 분리하고 REQ-046 판정을 “설계 검증 완료”로 한정 | 해결 |
| DCA-002 | README·HANDOFF가 계속 설계 작성 단계로 표현됨 | 설계 baseline 완료·실제 구현 착수 준비로 전환 | 해결 |
| DCA-003 | architecture가 발행된 v0.2.3을 발행 준비로 표시 | v0.2.3 발행 완료로 현행화 | 해결 |
| DCA-004 | JSON reference lock과 canonical YAML lock의 완료 범위가 혼동될 수 있음 | JSON은 pilot 증적, YAML은 실제 구현 첫 작업으로 유지 | 해결 |
| DCA-005 | project별 값을 공통값처럼 요구할 위험 | 초기/retrofit onboarding template과 `TBD/pending` 차단 계약으로 분리 | 해결 |
| DCA-006 | 남은 작업의 실행 가능성과 외부 입력 대기가 혼재 | HANDOFF 분류와 validator regression으로 강제 | 해결 |

## 구현 착수 조건

다음 조건을 만족한 이 baseline의 병합 commit부터 실제 구현 변경을 시작한다.

1. deterministic regression, HANDOFF, downstream validation, CodeSight stale와 security 검사가 PASS다.
2. 설계 문서와 reference automation 변경이 같은 baseline에 포함된다.
3. JPEG 등 project 범위 밖 사용자 파일은 stage·commit하지 않는다.
4. 첫 실제 구현 increment는 canonical YAML lock schema·migration과 release manifest 생성 automation이다.
5. project·사람·실제 환경 입력이 필요한 gate는 synthetic PASS로 승격하지 않는다.

## 변경 관리

baseline 이후 새 요구사항이나 설계 변경은 기존 문서를 조용히 덮어쓰지 않는다. 고유 REQ 또는 change
record, 영향받는 acceptance criteria, migration·rollback, 관련 Eval과 HANDOFF를 같은 변경에서
갱신한다. 실제 구현에서 발견한 공통 결함은 익명화된 regression으로 설계에 환류한다.
