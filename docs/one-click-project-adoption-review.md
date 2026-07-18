# 비개발자용 원클릭 프로젝트 도입 검토

상태: shared adoption core reference 구현
검토일: 2026-07-17
관련 요구사항: `REQ-047`

## 문제

현재 release archive, checksum, canonical manifest와 materializer는 안전한 도입 기반을 제공하지만
사용자가 terminal 명령, 압축 해제, checksum 대조와 `preview`·`apply` 인자를 직접 연결해야 한다.
스크립트와 terminal에 익숙하지 않은 사용자는 이 경계에서 잘못된 경로를 선택하거나 검증을 생략할 수
있다. release가 갱신될 때마다 설치 안내와 실제 asset이 어긋날 위험도 있다.

목표는 보안 경계를 제거하는 진짜 무확인 설치가 아니라 다음 세 동작으로 줄이는 것이다.

```text
앱 실행 → 프로젝트 폴더 선택 → 프로젝트에 적용
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
| 서명된 local desktop app | folder picker, native diff·확인·rollback 제공 가능 | OS별 packaging·code signing·notarization과 release Eval 필요 | 기본 권장 |
| CLI adoption tool | 자동화·CI·전문가 사용에 적합 | terminal 비숙련자의 기본 경로로 부적합 | GUI와 공통 core 사용 |

## 권장 구조

GUI와 CLI가 각각 파일 적용 로직을 구현하지 않는다. network·manifest·plan·transaction·lock·rollback을
담당하는 하나의 headless adoption core를 사용하고, GUI와 CLI는 입력과 표시만 담당한다.

```text
Release assets
  ├─ signed desktop application
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
          ├─ Desktop GUI: folder picker·diff·button·progress·복구
          └─ CLI: preview·apply·validate·rollback
```

초기 구현은 현재 검증 환경과 일치하는 macOS desktop app을 우선할 수 있다. Windows installer와 Linux
AppImage는 동일 core·manifest를 사용하되 각 OS의 signing, permission, path, quarantine와 clean install
fixture를 통과한 뒤 지원으로 표시한다. 미지원 OS에 실행 가능한 것처럼 asset을 게시하지 않는다.

## 비개발자용 사용자 흐름

1. README 또는 release page에서 **프로젝트에 적용** 버튼을 누른다.
2. 공식 release에서 OS에 맞는 서명된 앱을 내려받는다.
3. 앱이 publisher, release version과 asset 무결성을 검증한다.
4. 사용자는 native folder picker에서 프로젝트 폴더 하나를 선택한다.
5. 앱은 읽기 전용으로 application·기존 lock·충돌·필요 질문을 검사한다.
6. 기본 화면에는 생성·변경·보존·차단 건수와 위험 요약을 보여준다. 상세 diff는 선택해서 볼 수 있다.
7. 충돌이나 필수 결정 누락이 없을 때만 **프로젝트에 적용** 버튼을 활성화한다.
8. 적용은 transaction record를 먼저 만들고 공통 core와 사용자가 선택한 AI adapter만 기록한다.
9. 자동 validation에 성공하면 적용 release·commit·checksum과 rollback 지점을 보여준다.
10. 실패하면 자동 원복하고 원복 결과를 사람이 이해할 수 있는 문장으로 표시한다.

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
- GUI의 체크박스는 고위험 승인 계약을 포괄 승인하는 수단으로 사용하지 않는다.

## 보안·복구 경계

- floating `latest`가 아니라 선택한 exact release·commit·manifest·asset checksum을 고정한다.
- 앱 자체는 OS별 code signing과 가능한 경우 notarization을 적용하고 publisher identity를 표시한다.
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

- OS별 지원 앱 또는 명시적인 `미지원`
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
- GUI와 CLI가 동일 plan·lock·결과를 생성하는 parity
- 게시 asset 재다운로드 checksum과 앱 서명 검증

필수 asset, 서명, manifest, checksum, supported-OS fixture 또는 rollback 검증이 하나라도 없으면 release
발행을 차단한다. README의 버튼과 최신 release 정보는 수기 버전 문자열이 아니라 검증된 release
metadata에서 생성하거나 drift 검사한다.

## 접근성·사용성

- keyboard만으로 folder 선택 이후 모든 동작을 수행할 수 있어야 한다.
- 버튼과 진행 상태에 접근 가능한 이름·focus·오류 요약을 제공한다.
- 색상만으로 성공·경고·차단을 구분하지 않는다.
- “설치”와 “Production 승인”, “파일 적용”과 “dependency/DB 실행”을 같은 표현으로 합치지 않는다.
- 취소, 창 종료와 재실행 시 transaction 상태를 판별하고 중복 적용하지 않는다.

## 단계적 구현

1. GUI·CLI가 공유할 release adoption core와 결과 schema를 구현한다.
2. archive·manifest·checksum을 포함하는 release bundle automation과 실패 fixture를 구현한다.
3. macOS GUI의 folder picker, preview, apply, validate, rollback을 구현하고 서명 전에는 개발
   artifact로만 검증한다.
4. signing·notarization 책임자와 credential 격리를 확정한 뒤 macOS release asset으로 승격한다.
5. Windows·Linux는 OS별 signing·permission·clean fixture를 별도 통과한 뒤 확장한다.

## 완료 판정

문서와 mock UI만으로 완료하지 않는다. 최소 한 supported OS에서 서명된 release asset을 비개발자
사용성 Eval로 실행하고, 신규·기존 프로젝트의 preview·apply·validate·rollback과 게시 asset
재다운로드가 모두 PASS해야 해당 OS를 지원 완료로 표시한다. 다른 OS와 IDE extension은 개별 상태로
추적한다.

2026-07-18 reference 구현은 P0 stack profile과 검증된 skill bundle을 clean staging에서 결합한 뒤
실제 target에 단일 transaction으로 적용하는 headless core를 제공한다. CLI·synthetic GUI adapter는
동일 plan hash·lock·결과 schema를 사용하고 clean install·retrofit·upgrade·rollback·manifest 및
component checksum 변조·충돌·두 번째 write 실패 원복 fixture를 통과했다. Network·dependency
install·DB migration·provider write·Production deploy·telemetry는 실행하지 않는다.

이는 desktop application 또는 지원 OS 발행이 아니다. Folder picker와 실제 GUI, code signing,
notarization, publisher credential, 게시 asset 재다운로드와 비개발자 사용성 Eval은 계속 `NOT_RUN`이다.
