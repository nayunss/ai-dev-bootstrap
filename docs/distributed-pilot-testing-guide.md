# 다중 참여자 Downstream Pilot 검증 가이드

상태: 제안

## 목적

이 가이드는 실제 공통 환경 구축에 들어가기 전에 여러 참여자가 frontend, backend, full-stack
(frontend + backend) 설계를 독립적으로 검증하는 절차를 정의한다. 각 참여자는 common-project를
**upstream**으로 받아 기준 요구사항·문서·검증 도구를 사용하고, 별도 폴더와 별도 Git 저장소에
최소 **downstream pilot**을 생성해 실제 적용 결과를 확인한다.

Pilot은 제품을 완성하는 프로젝트가 아니다. 선택한 stack에서 bootstrap·dependency·quality·security·
CI·Preview·rollback 경로가 작동하는지 반증하고, 일반화 가능한 누락을 upstream 요구사항·문서·Eval로
환류하는 것이 목적이다.

## 저장소와 폴더 경계

권장 구조는 upstream과 downstream을 형제 폴더로 분리하는 방식이다.

```text
pilot-workspace/
├── common-project/                 # upstream clone, 기준 commit 고정
└── pilots/
    ├── tester-a-frontend/          # 독립 downstream Git 저장소
    ├── tester-b-backend/           # 독립 downstream Git 저장소
    └── tester-c-fullstack/         # 독립 downstream Git 저장소
```

- downstream을 `common-project/` 내부에 만들지 않는다. upstream validator 탐색 범위와 Git 상태를
  오염시키고 실수로 pilot code가 upstream commit에 포함될 수 있다.
- 각 downstream은 별도 `git init` 또는 별도 원격 저장소를 사용한다. upstream Git 이력을 복사해
  제품 저장소처럼 위장하지 않는다.
- 모든 결과에는 upstream URL, branch·tag, commit SHA와 실행일을 기록한다. `main`이나 `latest`만
  기록한 결과는 재현 증거로 인정하지 않는다.
- 여러 참여자가 같은 downstream working tree, database, Preview environment나 credential을 공유하지
  않는다. 같은 stack을 반복 검증할 때도 tester·trial별 식별자를 사용한다.

## 참여 역할

| 역할 | 책임 |
|---|---|
| Pilot coordinator | 검증 matrix·중복 범위·upstream commit을 고정하고 결과를 취합 |
| Tester | downstream 생성, AI 실행 transcript·명령·결과 기록, 범위 밖 변경 중단 |
| Reviewer | 증거와 재현성을 검토하고 pilot PASS와 공통 지원 완료를 구분 |
| Upstream maintainer | 일반화 가능한 실패를 요구사항·문서·validator·fixture로 환류 |

한 사람이 여러 역할을 맡을 수 있지만 tester가 자신의 주장만으로 공통 지원 완료를 선언하지 않는다.
최소한 reviewer가 증거와 upstream 반영 범위를 확인한다.

## 검증 Matrix 배정

Coordinator는 시작 전에 중복과 공백을 볼 수 있도록 다음 표를 작성한다.

| Pilot ID | 유형 | 선택 stack | OS·AI 도구 | 시작 방식 | 필수 경계 |
|---|---|---|---|---|---|
| `FE-001` | frontend | tester가 명시 | 기록 | 신규 | build·browser E2E·Preview |
| `BE-001` | backend | tester가 명시 | 기록 | 신규 | dependency·DB migration·API·CI·deploy |
| `FS-001` | full-stack | tester가 명시 | 기록 | 최초 full-stack | workspace·contract·통합 E2E·다중 배포 |
| `FS-002` | full-stack | 기존 pilot과 호환 | 기록 | frontend 또는 backend에서 증분 | 기존 설정 보존·조합·rollback |

동일 stack 반복은 OS, AI 도구, 신규/증분 경로 또는 실패 fixture가 달라야 의미가 있다. 하나의 성공
사례를 다른 언어·framework·배포 provider의 검증으로 확대하지 않는다.

## 시작 절차

### 1. Upstream 고정

```sh
git clone <common-project-url> common-project
cd common-project
git fetch --tags
git checkout <approved-branch-or-tag>
git rev-parse HEAD
```

Tester는 `README.md`, `HANDOFF.md`, `docs/requirements.md`, `docs/README.md`와 자신의 pilot에 관련된
문서를 먼저 읽는다. 시작 후 upstream이 바뀌어도 trial 도중 자동 pull하지 않는다. 새 commit 검증은
별도 trial로 시작한다.

### 2. Downstream 생성

upstream 밖에 pilot 폴더를 만들고 독립 Git 저장소로 초기화한다. 비밀·개인정보·production data는
사용하지 않으며 `.env*`를 AI에게 읽히거나 결과물에 포함하지 않는다.

```sh
mkdir -p ../pilots/tester-a-frontend
cd ../pilots/tester-a-frontend
git init
```

### 3. AI에 범위 전달

다음 입력을 AI 도구에 명시한다.

```text
이 저장소는 common-project <commit SHA>를 검증하는 독립 downstream pilot이다.
pilot 유형: frontend | backend | full-stack
선택 stack과 정확한 version: <값>
검증할 요구사항 ID: <REQ 목록>
허용 범위: 이 downstream 저장소와 격리 test/Preview 자원
금지: upstream 직접 수정, production 자원, 비밀 열람, 미승인 dependency·외부 도구 설치
먼저 upstream 문서를 읽고 preview → 승인 → 적용 → 검증 → rollback evidence 순서로 진행한다.
발견 사항은 downstream HANDOFF와 익명화된 upstream feedback 후보로 기록한다.
```

AI가 기술 stack이나 dependency를 임의 선택하지 않게 한다. 설치·network·외부 service·browser binary·
배포·파괴적 DB 작업은 영향과 rollback preview 후 Human-in-the-loop 승인을 받는다.

## 공통 실행 단계

1. **Baseline**: OS, AI 도구·버전, upstream SHA, 선택 stack, runtime, 기존 전역 의존성을 기록한다.
2. **Read-only preview**: `scripts/bootstrap preview <downstream>`으로 manifest와 application inventory
   후보를 확인한다.
3. **환경 확정**: downstream의 `docs/development-environment.md`와 application inventory를 작성하고
   tester가 승인한다.
4. **공급망 심사**: dependency·plugin·scanner·action의 exact version, source, checksum/integrity,
   license, lifecycle, telemetry, network와 제거 절차를 확인한다.
5. **Materialize**: 승인된 항목만 downstream에 적용한다. upstream 파일을 무비판적으로 전부 복사하지
   않고 선택 stack과 요구사항에 필요한 adapter를 사용한다.
6. **Local gate**: format·lint·type/build·unit·integration·security와 stack별 fixture를 실행한다.
7. **CI·Preview**: 독립 job, 임시 database·secret, healthcheck와 실제 사용자 경로를 검증한다.
8. **Negative·rollback**: secret 누락, contract breaking, 권한 우회, deploy 실패 같은 안전한 fixture가
   실패를 탐지하는지 확인하고 이전 상태 복구를 증명한다.
9. **환류**: downstream 고유 문제와 공통 설계 결함을 구분해 보고하고, 공통 결함은 upstream
   requirement·docs·Eval·validator 후보로 제출한다.

## 유형별 최소 검증 범위

### Frontend

- exact runtime·package manager·lockfile와 lifecycle script 통제
- formatter·linter·typecheck·unit·production build
- semantic HTML·keyboard·accessible name·320 px 이상 responsive 경계
- 지원 browser의 핵심 E2E와 telemetry·secret negative fixture
- CI, Preview URL, Production과의 환경 격리 및 application rollback

### Backend

- exact runtime·build tool·dependency resolution과 artifact 존재성
- database schema 생성과 append-only migration, 격리 integration DB와 cleanup
- API contract syntax·필수 operation·breaking-change·production docs exposure
- authentication, BOLA·rate limit 등 해당 요구사항의 positive·negative test
- secret·SAST·dependency scan, CI, healthcheck·Preview와 application/DB rollback 구분

### Full-stack

- frontend·backend·shared 영역의 application inventory와 application별 cwd·quality job
- API/BFF contract, cookie·CORS·CSRF·authorization와 통합 E2E
- frontend·backend·database가 같은 임시 environment에 속하고 Production data·secret과 격리됨
- 한 application 실패가 다른 application의 승인·배포 범위를 암묵적으로 확대하지 않음
- 최초 full-stack과 frontend/backend에서 증분 확장하는 경로를 구분하고 기존 설정·migration 보존
- 조합 version, 다중 배포, application revert와 migration·restore rollback 호환성

## 증거와 결과 보고서

각 downstream은 최소한 `HANDOFF.md`와 다음 형식의 결과 문서를 남긴다. log 전체나 secret은 첨부하지
않고 필요한 명령, exit status, commit·run URL과 익명화한 관찰만 기록한다.

```markdown
# Pilot result: FS-001

- tester: <공개 가능한 식별자>
- date/timezone: <값>
- upstream: <URL, tag/branch, commit SHA>
- downstream: <commit SHA 또는 private reference>
- type/stack: <frontend | backend | full-stack, exact versions>
- environment: <OS, AI 도구·version, container/CI/deploy provider>
- requirement IDs: <REQ 목록>

## Outcome
| Gate | Command/evidence | Result | Notes |
|---|---|---|---|

## Negative and rollback fixtures
| Fixture | Expected | Observed | Cleanup |
|---|---|---|---|

## Findings
| ID | Scope | Reproduction | Expected/actual | Upstream candidate |
|---|---|---|---|---|

## Unverified and cost
- unverified: <항목>
- duration/token/external cost: <값 또는 측정 불가 이유>
```

결과는 `PASS | FAIL | BLOCKED | NOT-RUN`으로 구분한다. `PASS`는 명시된 upstream SHA·stack·환경·범위에만
유효하다. 미실행 항목을 PASS에 포함하거나 AI의 완료 문장만 증거로 사용하지 않는다.

## Upstream 환류와 중복 처리

1. 기존 `docs/requirements.md`, issue·finding 목록에서 같은 실패를 검색한다.
2. downstream 고유 설정 오류면 해당 pilot에서 수정하고 공통 요구사항을 만들지 않는다.
3. 둘 이상의 stack·tester에 공통이거나 upstream 지침 때문에 재현되면 upstream 후보로 분류한다.
4. 비밀·회사명·내부 URL·proprietary code를 제거한 최소 synthetic fixture와 재현 절차를 작성한다.
5. requirement 상태, 관련 docs, Eval/validator, README 검증 범위와 HANDOFF를 같은 변경에서 갱신한다.
6. 다른 tester가 깨끗한 downstream 또는 결정론적 fixture에서 재검증한 뒤 지원 범위를 승격한다.

여러 사람이 같은 finding을 제출하면 최초 보고자를 기준으로 합치되 OS·도구·stack이 다른 재현 증거는
별도 trial로 보존한다. 서로 다른 결과가 나오면 성공 사례로 덮지 않고 환경 차이를 독립 변수로 기록한다.

## 중단·금지 조건

- production database 삭제·migration, 실제 credential rotation, public domain·유료 자원 생성은 pilot의
  기본 권한이 아니다.
- scanner·container runtime·AI plugin·MCP·배포 integration을 승인 없이 설치하거나 연결하지 않는다.
- grader·fixture·기대 결과를 약화하거나 테스트를 삭제해 PASS로 만들지 않는다.
- 같은 실패가 반복되거나 비용·권한 한도에 도달하면 안전한 마지막 상태로 복구하고 BLOCKED로 보고한다.
- downstream failure 때문에 upstream working tree를 즉시 수정하지 않는다. 먼저 재현·범위·일반화 가능성을
  기록하고 maintainer review를 거친다.

## 설계 단계 완료 판정

Frontend·backend·full-stack 각각에 대해 최소 한 개의 독립 downstream PASS만으로 전체 지원을 선언하지
않는다. 선택한 지원 matrix의 positive·negative·rollback gate, clean clone 재현, 미해결 high-risk finding과
문서 drift가 닫혀야 해당 범위를 “설계 검증 완료”로 올릴 수 있다. 이후 `docs/requirements.md`와 `docs/`를
입력 계약으로 실제 환경 구축 단계를 별도로 시작한다.
