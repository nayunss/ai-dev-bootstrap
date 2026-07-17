# 개발환경 Profile Schema·Validator 구현 범위 검토

상태: 설계 승인
확정일: 2026-07-17
관련 요구사항: `REQ-020`, `REQ-021`, `REQ-026`, `REQ-033`, `REQ-037`, `REQ-045`, `REQ-048`

## 결론

프로젝트마다 달라지는 기술 stack·Git·CI·배포·보안 결정을 Markdown 설명만으로 관리하지 않고
canonical YAML profile과 JSON Schema Draft 2020-12 기반 schema로 표현한다. YAML은 사람과 도구가
공유하는 입력이고, JSON Schema는 YAML을 parse한 자료 구조의 형식을 검증한다.

Schema validation만으로 project가 준비됐다고 판정하지 않는다. 별도 validator가 다음 네 층을
순서대로 검사한다.

1. **구조 검증**: 필수 field, type, enum, 안전한 relative path와 schema version
2. **의미 검증**: application ID·root 중복, 상태 조합, cross-reference와 승인 조건
3. **Repository drift 검증**: 실제 manifest·lockfile·CI·deploy 설정과 profile의 일치
4. **Readiness 검증**: `TBD`·미승인·실제 evidence 대기 항목이 요청된 실행 단계에 적합한지 판정

Validator는 dependency를 설치하거나 lifecycle script를 실행하지 않고, 외부 provider를 변경하거나
DB migration·Production write를 수행하지 않는다. 실제 실행은 승인된 adapter가 담당하며 validator는
입력과 evidence만 판정한다.

## Canonical 산출물

| 산출물 | 역할 | 구현 상태 |
|---|---|---|
| `docs/development-environment.profile.yaml` | 프로젝트별 canonical machine-readable profile | 설계 |
| `docs/development-environment.md` | 사람이 읽는 설명·결정 근거·운영 안내 | 기존 계약 |
| `docs/schemas/development-environment-profile.schema.json` | YAML parse 결과의 구조 계약 | 미구현 |
| `scripts/validate-development-environment-profile.mjs` | 의미·drift·readiness validator | 미구현 |
| profile fixture | single frontend/backend/full-stack/monorepo와 negative case | 미구현 |
| schema migration | 이전 schema version을 preview 후 변환 | 미구현 |

Markdown과 YAML이 같은 사실을 중복해 서로 다른 단일 진실 원천이 되지 않게 한다. Runtime, version,
application root, command, provider와 승인 상태는 YAML이 authoritative하고 Markdown은 YAML을
참조해 배경·선택 이유·운영 절차를 설명한다.

## Schema 범위

### 필수 core

```yaml
schemaVersion: 1
profileId: project-defined-id
status: draft
reviewedAt: 2026-07-17
repository:
  topology: single-project
applications: []
shared: {}
collaboration: {}
ci: {}
artifacts: {}
deployments: []
security: {}
decisions: []
extensions: {}
```

Core schema는 다음을 포함한다.

| 영역 | 최소 내용 |
|---|---|
| 식별·상태 | `schemaVersion`, `profileId`, `status`, `reviewedAt`, owner reference |
| 저장소 | topology, application/package boundary, canonical remote reference |
| Application | stable ID, type, root, language, runtime, framework, manifest, lockfile |
| 명령 | application cwd, executable과 argv 배열, network policy, expected artifact |
| 품질 | format, lint, typecheck, test, accessibility, security gate |
| 데이터 | primary DB 또는 `none`, migration, retention·restore evidence reference |
| 협업 | branch·merge·review policy reference와 required role |
| CI·Artifact·배포 | provider-neutral provider ID, config/root, environment, retention, rollback |
| AI 도구 | 선택 adapter, policy source, 권한·network·telemetry decision reference |
| 결정 | 상태, owner reference, evidence path, review/expiry와 blocker |
| 확장 | namespace가 있는 `extensions` 아래 project/provider별 추가 field |

Secret, token, connection string과 개인정보는 profile에 기록하지 않는다. Credential은 secret reference
ID, owner, scope와 rotation policy만 표현한다. `.env*` 경로는 source·evidence·extension 어디에서도
허용하지 않는다.

### 명령 표현

Shell command 문자열은 quoting·injection·working directory가 불명확하므로 canonical 실행 계약으로
사용하지 않는다.

```yaml
commands:
  test:
    cwd: frontend
    executable: pnpm
    argv: [test, --run]
    network: deny
```

Validator는 executable을 임의 실행하지 않고 adapter allowlist와 project-local exact version,
working directory, network·timeout 계약을 검증한다.

### 상태 모델

| 상태 | 의미 | 실행 허용 |
|---|---|---|
| `draft` | 작성 중이며 `TBD` 허용 | read-only preview·문서 검증 |
| `blocked` | 필수 결정·승인·evidence 누락 | 차단 사유 출력만 |
| `approved` | 지정된 범위의 사람이 profile 승인 | 승인 범위의 local apply 후보 |
| `superseded` | 새 profile로 교체된 역사 자료 | 신규 실행 금지 |

`approved`는 Production 승인과 동일하지 않다. Production readiness, dependency 설치, 외부 network,
DB migration과 배포는 각각의 별도 승인·evidence gate를 계속 통과해야 한다.

## Validator 동작 범위

### P0: 공통 구현

- YAML parse 후 JSON Schema 구조 검증
- schema version, unknown core field와 namespace 없는 extension 차단
- absolute path, parent traversal, symlink escape와 `.env*` path 차단
- application ID·root·manifest·lockfile 중복과 cross-reference 검증
- 명령의 `cwd`·`executable`·`argv` 구조와 shell 문자열 금지
- `draft | blocked | approved | superseded` 상태 전이 검증
- `TBD`·`pending`·expired approval을 readiness 성공으로 해석하지 않음
- 실제 repository manifest·lockfile·application inventory drift 검사
- 사람이 읽는 blocker report와 안정적인 machine-readable JSON report
- single frontend, backend, full-stack, workspace monorepo positive fixture
- missing application, path escape, version drift, false approval, secret field negative fixture

### P1: Profile lifecycle

- 신규 project 질문 결과로 blocked/draft profile materialization
- 기존 project read-only discovery와 retrofit preview
- schema version migration의 before/after diff, 명시 승인과 rollback
- Markdown 개발환경 문서가 canonical profile을 참조하는지 검사
- Git·branch/review·CI·deploy·Production readiness 하위 profile과 cross-validation

### P2: Adapter 확장

- stack·Git host·CI·deployment provider별 schema fragment와 semantic adapter
- 실제 provider read-only evidence collector
- application affected graph와 partial CI 범위 검증
- GUI·CLI에서 동일한 schema·validator·blocker 결과 사용

Provider별 API write, remote cache, dependency 설치, browser download, model 호출, DB write와 deploy는
이 validator의 범위가 아니다. 해당 adapter가 preview와 별도 Human-in-the-loop 승인을 받아야 한다.

## Schema 진화

- `schemaVersion`은 필수 정수이며 validator는 지원 version 범위를 명시한다.
- breaking field 변경은 migration 함수, positive/negative fixture와 rollback을 동반한다.
- migration은 원본을 덮어쓰기 전에 canonical diff와 backup target을 제시하고 명시적 승인을 받는다.
- 알 수 없는 future version을 가장 가까운 version으로 추정하지 않고 fail-closed한다.
- `extensions`는 reverse-DNS 또는 승인된 provider namespace를 사용하고 core validator가 모르는
  extension을 자동 삭제하지 않는다.
- schema와 validator release version·checksum은 canonical upstream lock과 release manifest에
  포함한다.

## 검증 Profile

| 실행 mode | 목적 | 외부 상태 변경 |
|---|---|---|
| `schema` | YAML parse·구조만 검사 | 없음 |
| `semantic` | 참조·상태·승인 조합 검사 | 없음 |
| `repository` | source·manifest·lock·config drift 검사 | 없음 |
| `readiness --stage local` | local apply 후보 여부 | 없음 |
| `readiness --stage ci` | CI 필수 항목 여부 | 없음 |
| `readiness --stage production` | 별도 Production evidence 완결성 | 없음 |

모든 mode는 기본 read-only다. `--fix`로 임의 수정하지 않으며 materializer·migration은 별도 명령과
승인 계약으로 분리한다.

## 완료 조건

REQ-048 공통 구현 완료는 다음 조건을 모두 충족해야 한다.

- canonical schema·example·migration policy가 동일 release에 포함됨
- P0 validator와 positive·negative fixture가 deterministic PASS
- 기존 source를 변경하지 않는 repository drift 검사 증거
- blocker JSON이 누락 field·owner/evidence·경로를 안정적인 code로 반환
- GUI·CLI가 같은 validation core와 결과 schema를 사용
- schema downgrade, unknown version, path escape, `.env*`, false `approved`가 fail-closed
- downstream clean install과 existing project retrofit에서 profile·Markdown·실제 source가 일치
- release manifest·checksum·upgrade·rollback fixture 통과

문서와 schema만 작성된 상태는 `설계 승인`, synthetic fixture까지 통과하면 `reference 구현`, 실제
서로 다른 downstream project에서 검증한 뒤에만 해당 profile 범위를 `지원 검증`으로 표시한다.
