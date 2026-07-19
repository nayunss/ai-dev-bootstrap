# 비개발자용 원클릭 프로젝트 도입 검토

상태: shared adoption core·GitHub Actions P0 실제 delivery mechanics pilot PASS
검토일: 2026-07-19
관련 요구사항: `REQ-047`

## 문제

현재 release archive, checksum, canonical manifest와 materializer는 안전한 도입 기반을 제공하지만
사용자가 terminal 명령, 압축 해제, checksum 대조와 `preview`·`apply` 인자를 직접 연결해야 한다.
스크립트와 terminal에 익숙하지 않은 사용자는 이 경계에서 잘못된 경로를 선택하거나 검증을 생략할 수
있다. release가 갱신될 때마다 설치 안내와 실제 asset이 어긋날 위험도 있다.

목표는 보안 경계를 제거하는 진짜 무확인 설치가 아니라 GitHub 저장소에서 다음 흐름으로 줄이는
것이다.

```text
GitHub 로그인 → repository 선택 → preview 확인 → 적용 승인 → PR 검토
```

변경 preview, 무결성 검사, 충돌 차단과 rollback은 UI 뒤에서 항상 수행한다. 사용자가 terminal이나
checksum 형식을 알아야만 안전해지는 구조로 만들지 않는다.

## 검토한 방식

| 방식 | 장점 | 한계 | 판정 |
|---|---|---|---|
| 웹페이지의 설치 버튼 | 접근이 가장 쉬움 | 일반 웹페이지는 사용자 로컬 프로젝트에 안전하게 쓰기 어렵고 browser 권한에 종속됨 | 단독 방식 제외 |
| `curl \| sh` 한 줄 설치 | 짧음 | 다운로드 내용과 checksum을 확인하기 전에 실행하며 공통 보안 정책과 충돌 | 금지 |
| IDE extension | IDE 안에서 folder와 diff 표시 가능 | 특정 IDE에 종속되고 Codex·Claude Code·Copilot 공통 진입점이 되기 어려움 | 후속 adapter 후보 |
| GitHub template | 신규 저장소 생성이 쉬움 | 기존 프로젝트 retrofit과 project별 stack 질문·충돌 처리가 어려움 | 보조 방식 |
| CLI adoption tool | 자동화·CI·전문가 사용에 적합 | terminal 비숙련자의 기본 경로로 부적합 | Web과 공통 core 사용 |
| GitHub Actions `workflow_dispatch` | OS 인증서·로컬 설치 없이 browser에서 preview·승인·PR 가능 | GitHub 저장소·workflow 설치와 visibility·billing별 environment capability 확인 필요 | Portal 전 P0 pilot PASS |
| GitHub App Web Portal | 설치 없이 repository 선택·preview·승인·PR을 한 UI에서 제공 | App 권한·token·webhook·ephemeral checkout 운영 검증 필요 | 기본 권장 |

## 권장 구조

Portal·CLI·GitHub Actions가 각각 파일 적용 로직을 구현하지 않는다.
network·manifest·plan·transaction·lock·rollback을 담당하는 하나의 headless adoption core를
사용하고 각 surface는 입력·표시와 제한된 delivery만 담당한다.

```text
Release assets
  ├─ CLI adoption entrypoint
  ├─ tracked source archive
  ├─ canonical release manifest
  ├─ SHA256SUMS
  └─ release note
          │
          ▼
Shared adoption core
  pin → verify → inspect target → plan → approve → apply → validate → rollback
          │
          ├─ CLI: preview·apply·validate·rollback
          ├─ GitHub Actions P0: read-only preview → 승인 → branch·PR
          └─ GitHub App Portal: repository 선택·preview·승인·PR review
```

## 비개발자용 사용자 흐름

1. README에서 **프로젝트에 적용** 버튼을 눌러 공식 Web Portal로 이동한다.
2. GitHub App을 선택한 account·organization과 repository에만 설치한다.
3. Portal이 선택한 exact release·commit·manifest 무결성과 repository 권한을 검증한다.
4. 사용자는 접근을 허용한 repository와 branch를 선택한다.
5. Portal은 격리 checkout에서 application·기존 lock·충돌·필요 질문을 read-only로 검사한다.
6. 생성·변경·보존·차단 건수와 위험 요약, 선택 가능한 상세 diff를 보여준다.
7. 충돌이나 필수 결정 누락이 없을 때만 **적용 PR 만들기**를 활성화한다.
8. 승인 시 transaction을 적용한 새 branch와 PR만 만들고 default branch를 직접 수정하지 않는다.
9. Hosted validation 결과와 release·commit·checksum을 PR에 연결한다.
10. 실패하면 PR을 만들지 않고 원복 결과를 이해할 수 있는 문장으로 표시한다.

전문 용어 대신 “기존 파일과 충돌해 적용하지 않았습니다”, “어떤 파일도 변경되지 않았습니다”처럼
실제 결과를 표시한다. 로그와 manifest 상세는 고급 정보로 제공하되 오류 해결을 위해 terminal 사용을
필수로 만들지 않는다.

## 설정 질문

AI 도구 선택처럼 설치 결과를 즉시 바꾸는 값만 첫 화면에서 묻는다. stack, model·harness·비용,
법률·개인정보 책임자, retention, Production provider와 rollback처럼 프로젝트마다 달라지는 값은
단계별 설정 화면에서 질문한다.

- 확정하지 않은 값은 `TBD`·`pending`으로 보존할 수 있다.
- 미응답 값은 Production, dependency network, 실제 DB write, 외부 model 호출을 승인하지 않는다.
- 기존 프로젝트의 owner 문서와 profile은 자동 덮어쓰거나 추정하지 않는다.
- Portal의 체크박스는 고위험 승인 계약을 포괄 승인하는 수단으로 사용하지 않는다.

## 보안·복구 경계

- floating `latest`가 아니라 선택한 exact release·commit·manifest·asset checksum을 고정한다.
- release archive, manifest와 모든 materialized file hash를 검증한다.
- `.env*`, credential store, 다른 repository와 project 밖 경로는 읽거나 쓰지 않는다.
- 기본 동작은 preview이며 기존 사용자 파일이 다르면 쓰기 전에 전체 적용을 차단한다.
- dependency install, lifecycle script, network 확대, DB migration과 Production write는 기본 실행하지
  않는다.
- 부분 실패는 transaction snapshot으로 원복하고, 원복 검증이 실패하면 성공으로 표시하지 않는다.
- update는 자동 적용하지 않고 새 release 알림 → diff preview → 사람 승인 순서로 진행한다.
- telemetry와 crash upload는 기본 비활성화한다. 향후 도입하려면 목적·필드·보존·수신자를 별도
  심사하고 명시적 opt-in을 받아야 한다.

## Release 동기화 계약

모든 release는 같은 adoption bundle을 자동 생성해야 한다.

- CLI adoption entrypoint
- tracked source archive
- canonical `release-manifest.json`
- `SHA256SUMS`
- migration·rollback release note

tag workflow는 전체 regression과 보안 검사 후 bundle을 생성하고, 비밀 없는 clean fixture에서 다음을
검증한다.

- 신규 프로젝트 최초 적용·validate·rollback
- 기존 프로젝트 retrofit과 이전 release→새 release upgrade·rollback
- 기존 파일 충돌, manifest/archive 변조와 target drift 차단
- 두 번째 write 실패 등 부분 적용 transaction 원복
- Web과 CLI가 동일 plan·lock·결과를 생성하는 parity
- 게시 asset 재다운로드 checksum 검증

필수 asset, manifest, checksum 또는 rollback 검증이 하나라도 없으면 release
발행을 차단한다. README의 버튼과 최신 release 정보는 수기 버전 문자열이 아니라 검증된 release
metadata에서 생성하거나 drift 검사한다.

## 접근성·사용성

- keyboard만으로 repository 선택 이후 모든 동작을 수행할 수 있어야 한다.
- 버튼과 진행 상태에 접근 가능한 이름·focus·오류 요약을 제공한다.
- 색상만으로 성공·경고·차단을 구분하지 않는다.
- “설치”와 “Production 승인”, “파일 적용”과 “dependency/DB 실행”을 같은 표현으로 합치지 않는다.
- 취소, 창 종료와 재실행 시 transaction 상태를 판별하고 중복 적용하지 않는다.

## 단계적 구현

1. Web·CLI가 공유할 release adoption core와 결과 schema를 구현한다.
2. archive·manifest·checksum을 포함하는 release bundle automation과 실패 fixture를 구현한다.
3. GitHub Actions P0를 실제 downstream에서 검증한다.
4. P0 pilot이 PASS한 뒤 최소 권한 GitHub App Web Portal을 승인·구현한다.
5. Repository authorization·webhook·token·격리 실행과 browser 접근성·사용성 Eval을 통과한다.

## 완료 판정

문서와 mock UI만으로 완료하지 않는다. 실제 분리된 GitHub repository에서 App 설치, read-only
preview, 사람 승인, 새 branch·PR, hosted checks, 실패 원복과 비개발자 browser 사용성 Eval이 모두
PASS해야 Portal을 지원 완료로 표시한다. IDE extension은 별도 범위다.

2026-07-18 reference 구현은 P0 stack profile과 검증된 skill bundle을 clean staging에서 결합한 뒤
실제 target에 단일 transaction으로 적용하는 headless core를 제공한다. CLI·web adapter는
동일 plan hash·lock·결과 schema를 사용하고 clean install·retrofit·upgrade·rollback·manifest 및
component checksum 변조·충돌·두 번째 write 실패 원복 fixture를 통과했다. Network·dependency
install·DB migration·provider write·Production deploy·telemetry는 실행하지 않는다.

2026-07-19 GitHub Actions P0는 `workflow_dispatch` preview와 protected environment
apply를 분리하고, exact plan SHA-256 재검증 뒤 새 branch와 PR만 만들도록 구성했다. Web·CLI
plan parity와 dirty checkout·stale plan·unreviewed release 차단은 deterministic PASS다. 분리된
public downstream에서 preview artifact, protected apply, branch·PR, read-only hosted check와 OWNER
approval을 PASS했고 main·owner file을 보존했으며 자동 merge하지 않았다. Private repository의
required reviewer는 현재 billing plan에서 미지원임을 확인했다. 상세 증거와 중단 조건은
[GitHub 기반 Web Adoption Delivery](web-adoption-delivery-review.md)를 따른다.
