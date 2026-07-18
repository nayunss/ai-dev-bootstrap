# Downstream Feedback 요구사항 Triage

상태: 설계 승인
확정일: 2026-07-17
관련 요구사항: `REQ-040`, `REQ-046`, `REQ-049`–`REQ-052`

## 입력 기준

- downstream repository: `nayunss/env-be`
- source: `docs/upstream-feedback.md`
- 최초 관찰 upstream: `f6ffc56f309233c914ffb77e64f4b3ee59ad458d`
- 재관찰 upstream: `v0.2.5-pilot`,
  `d0a3a6d31c4cbf883708335ff0f9bab121c5f2f0`
- 재관찰 archive SHA-256:
  `84d27ae9607f1fdc7fd6b662382f3ba50b9c73482cc191c10a9695c78f2a9757`
- 입력 finding: `UF-001`–`UF-013`

Downstream source의 project 이름, Railway, Spring Boot, Next.js, PostgreSQL과 구현 세부는 공통
기본값으로 옮기지 않는다. 서로 다른 stack·provider에서도 같은 false PASS나 증거 오판정이 발생하는
조건만 요구사항으로 일반화한다.

## 중복 제거 원칙

1. 한 finding에는 구현과 완료 판정을 소유하는 **primary REQ 하나**만 지정한다.
2. 기존 REQ의 목적과 acceptance criteria로 충분하면 새 REQ를 만들지 않는다.
3. 같은 원인의 여러 증상은 하나의 schema·validator·negative fixture 묶음으로 통합한다.
4. Product 기능 자체가 아니라 공통 하네스가 질문·기록·검증해야 하는 계약만 upstream으로 가져온다.
5. 실제 downstream 재시험 없이 source 검토나 synthetic fixture만으로 `해결`로 승격하지 않는다.

## Primary REQ Mapping

| Finding | 일반화된 공통 원인 | Primary REQ | 처리 |
|---|---|---|---|
| UF-001 | 자유 텍스트가 이행 evidence 없이 정책 완료로 판정됨 | REQ-049 | 신규 |
| UF-002 | 정책 조문과 구현·test 사이 mapping이 없음 | REQ-049 | UF-001과 통합 |
| UF-003 | 미수집·미사용과 server-side 차단을 구분하지 않음 | REQ-049 | UF-001과 통합 |
| UF-004 | client UX를 server enforcement로 과대평가함 | REQ-049 | UF-001과 통합 |
| UF-005 | 파기 후 token/session 지연 창과 read/write 차단 evidence가 없음 | REQ-049 | UF-001과 통합 |
| UF-006 | 법률 판단 근거가 실제 data-processing service·region에 연결되지 않음 | REQ-049 | UF-001과 통합 |
| UF-007 | generated cache가 staged tree가 아닌 working tree를 반영함 | REQ-050 | 신규 |
| UF-008 | check-only 검증 명령이 tracked source를 변경함 | REQ-050 | UF-007과 통합 |
| UF-009 | push 완료가 CI 실행·PASS처럼 보고됨 | REQ-051 | 신규 |
| UF-010 | deploy·health PASS가 핵심 behavior PASS처럼 보고됨 | REQ-051 | UF-009와 통합 |
| UF-011 | falsifiable하지 않은 확인이 정책 이행 evidence로 채택됨 | REQ-049 | UF-001과 통합 |
| UF-012 | 사용자 노출 언어를 frontend 문자열로만 한정함 | REQ-052 | 신규 |
| UF-013 | feedback에 upstream release·commit·checksum 기준이 없음 | REQ-046 | 기존 REQ 보강 |

`REQ-040`, `REQ-044`, `REQ-045` 등은 영향을 받는 기존 gate이지만 위 표의 finding을 중복 소유하지
않는다. REQ-049가 policy evidence 계약을 정의하고 기존 gate가 이를 소비하는 방식으로 연결한다.

## 신규 요구사항 경계

### REQ-049

법률·정책·retention·파기·applicability 주장이 실제 enforcement, data flow, test와 evidence에 연결되는지
검증한다. 법률 판단을 자동화하지 않고, 사람이 승인한 주장이 구현으로 뒷받침되는지만 fail-closed한다.

### REQ-050

Commit과 검증 명령 전후의 repository 상태가 self-consistent한지 검증한다. Staged tree 생성물과
check-only source mutation은 같은 repository-state invariant로 묶는다.

### REQ-051

`created`, `pushed`, `CI triggered`, `CI passed`, `deployed`, `healthy`, `behavior verified`,
`Production approved`를 서로 다른 상태와 evidence로 기록한다.

### REQ-052

사용자에게 도달하는 frontend·BFF·backend message, validation error, document language와 locale
formatting을 application 경계를 넘는 하나의 계약으로 검증한다. 특정 자연어를 기본값으로 강제하지
않는다.

## 구현 순서

완료된 공통 구현: `REQ-049-policy-evidence-validator`,
`REQ-050-repository-state-invariants`, `REQ-051-delivery-evidence-states`,
`REQ-052-fullstack-locale-contract`

1. `UF-001-013-downstream-revalidation`: 위 구현을 포함한 새 upstream release·commit·checksum을
   고정해 실제 `env-be`에 적용하고 UF-001–UF-013을 항목별로 재시험

## 자동화 계약

- Machine-readable 결과는 `.ai/manifests/downstream-feedback-triage.json`, 구조 계약은
  `docs/schemas/downstream-feedback-triage.schema.json`에서 관리한다.
- `.ai/workflows/downstream-feedback-triage.md`의 tool-neutral 절차에 따라 원문·project 고유
  세부·source excerpt·비밀을 복제하지 않고 일반화 원인만 기록한다.
- `scripts/validate-downstream-feedback-triage.mjs`는 단일 primary REQ, duplicate 일관성, 공통 구현·
  실제 재검증 task 분리, release·commit·archive checksum 고정과 traceability drift를 차단한다.
- 이 계약은 reference automation이며 UF 해결이나 실제 downstream 재검증 완료를 의미하지 않는다.

## 완료 판정

- schema·validator·positive/negative fixture가 deterministic PASS
- 원본 downstream 고유 source·provider·비밀을 upstream fixture에 복제하지 않음
- 각 UF entry가 하나의 primary REQ와 하나의 후속 task로 추적됨
- synthetic PASS를 실제 downstream 해결로 승격하지 않음
- 새 release·commit·checksum으로 실제 downstream을 upgrade한 뒤 해당 UF entry 상태를 갱신함
