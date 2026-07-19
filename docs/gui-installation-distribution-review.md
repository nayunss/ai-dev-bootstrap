# GUI 설치 자산·배포 준비 검토

상태: 설치 자산 미발행
검토일: 2026-07-19
관련 요구사항: `REQ-047`
현재 release 기준: `v0.2.8-pilot`

## 결론

현재 공식적으로 설치할 수 있는 desktop GUI는 없다. `v0.2.8-pilot`은 GUI·CLI가 공유하는 headless
adoption core와 synthetic GUI surface parity를 검증했지만, macOS·Windows·Linux용 desktop
application과 서명된 installer를 발행하지 않았다.

GitHub release page의 자동 생성 source archive와 현재 게시된 tracked archive는 소스 배포물이다.
확장자가 압축 파일이라는 이유만으로 GUI application 또는 installer로 취급하지 않는다.

- 공식 release 목록: <https://github.com/nayunss/ai-dev-bootstrap/releases>
- 최신 release 확인: <https://github.com/nayunss/ai-dev-bootstrap/releases/latest>
- 현재 release 증거: [v0.2.8-pilot](releases/v0.2.8-pilot.md)
- 현재 사용 가능한 경로: [CLI 도입 가이드](bootstrap-user-guide.md#빠른-시작-변경-없이-확인)

`curl | sh`, unsigned executable, 개인이 다시 포장한 installer와 비공식 mirror는 지원 설치 경로가
아니다.

## 현재 상태

| 영역 | 상태 | 확인 근거 |
|---|---|---|
| GUI·CLI 공통 adoption core | reference 구현 | release pin, checksum, target inventory, plan, lock, transaction, validate와 rollback 경로가 존재 |
| Synthetic GUI surface | deterministic PASS | CLI와 같은 union plan·plan SHA-256·result schema를 생성하는 fixture 통과 |
| 실제 desktop application | 개발 셸 구현·deterministic PASS | macOS 개발 runtime, reviewed bundle picker, preview·apply·validate·rollback·upgrade, 취소·중복 실행·worker crash fail-closed와 공통 core IPC 검증; package는 미발행 |
| 지원 OS | 없음 | macOS·Windows·Linux 어느 것도 지원 완료로 승격하지 않음 |
| Installer·package | unsigned 개발 package 검증·지원 installer 미발행 | macOS arm64 `.app` ZIP의 2회 재현성·fuse·checksum 검증 PASS; `.dmg`·서명된 installer와 release asset 없음 |
| Publisher identity·credential | `NOT-RUN` | publisher 확정, credential 격리·회전·접근 통제 증거 없음 |
| Code signing·notarization | `NOT-RUN` | OS별 signature, notarization 또는 동등한 배포 신뢰 증거 없음 |
| 게시 asset 재다운로드 | GUI 기준 `NOT-RUN` | 개발 package 생성 직후 checksum 재검증은 PASS; release page 게시·재다운로드는 GUI-07까지 `NOT-RUN` |
| 접근성·비개발자 사용성 | 부분 검증 | keyboard semantic control, focus 이동·표시, live status·오류 요약과 기본 상태 시각 확인; 실제 screen reader·비개발자 Eval은 `NOT-RUN` |

따라서 현재 상태는 “GUI core 일부 구현”이지 “GUI 설치 가능” 또는 “지원 OS 있음”이 아니다.

## 지원 설치 자산의 필수 조건

OS별 자산은 다음 조건을 모두 만족한 경우에만 공식 release page에 지원 installer로 게시한다.

1. Asset 이름, version과 대상 OS·architecture가 모호하지 않다.
2. 승인된 publisher identity로 code signing하고 OS가 제공하는 검증 절차를 통과한다.
3. macOS는 notarization·stapling과 Gatekeeper clean-machine 검증을 통과한다. 다른 OS는 해당 플랫폼의
   동등한 signature·reputation·permission 검증 증거를 남긴다.
4. Release manifest가 installer, 포함된 adoption core와 component의 SHA-256을 고정한다.
5. CI가 생성 직후 checksum과 signature를 검증하고, 게시 후 공식 release page에서 다시 내려받아
   같은 검증을 반복한다.
6. Network·filesystem permission, telemetry 기본값, update 경로와 uninstall·rollback 범위를
   문서화한다.
7. 신규 프로젝트와 기존 프로젝트에서 preview·apply·validate·rollback, 충돌·변조·부분 실패
   negative fixture를 통과한다.
8. Keyboard·screen reader·focus·오류 요약·취소/재실행 복구와 비개발자 사용성 Eval을 통과한다.

한 OS의 PASS는 다른 OS·architecture 지원 증거가 아니다. 조건이 누락된 플랫폼은 release note와
manifest에 `unsupported`로 표시하며, 실행 가능해 보이는 개발 artifact를 일반 사용자 자산으로
게시하지 않는다.

## Release page 표시 계약

지원 GUI asset이 생기기 전에는 README와 release note에 “GUI 설치 파일 없음”을 명시한다. GUI를
처음 게시하는 release부터는 각 asset 옆 또는 release note에 다음 정보를 함께 제공한다.

- 지원 OS와 architecture
- publisher 표시 이름과 signature 검증 방법
- notarization 또는 플랫폼 동등 검증 상태
- asset SHA-256과 release manifest
- 게시 후 재다운로드 검증 결과
- 알려진 제한, 권한, network·telemetry 기본값
- 검증된 설치·update·uninstall·rollback 범위

`releases/latest`는 발견용 링크일 뿐 무결성 고정값이 아니다. 실제 설치와 downstream 기록에는 선택한
exact release tag, commit, manifest와 asset checksum을 사용한다.

## 필요한 작업 목록

상위 추적 ID는 `REQ-047-gui-installer-delivery`다. 아래 작업은 순서대로 진행하며, 앞 단계의 산출물과
PASS 증거가 없으면 뒤 단계를 시작하거나 지원 상태를 승격하지 않는다.

| 순서 | 작업 ID | 작업 | 주요 산출물·완료 증거 | 실행 분류 |
|---|---|---|---|---|
| 1 | `GUI-01-delivery-baseline` | 최초 지원 OS·architecture, desktop framework, package 형식, 최소 OS version과 update 정책을 결정한다. 새 dependency는 공급망·license·lifecycle·권한 심사 후 exact version·integrity를 고정한다. | [기술 기준·threat model](desktop-gui-delivery-baseline.md), exact dependency lock, tar·runtime checksum, audit 0 | 완료 |
| 2 | `GUI-02-desktop-shell` | Native window, folder picker, 쉬운 결과 요약, 상세 diff, apply·validate·rollback, 취소·재실행 복구 UI를 공통 adoption core에 연결한다. | Reviewed bundle 전체 흐름, typed IPC·manifest-bound plan hash, 파일 hash diff, read-only worker 취소·무변경 재실행, root·home·`.env*` 차단 | 완료 |
| 3 | `GUI-03-resilience-accessibility` | Clean·retrofit·upgrade, 충돌·변조·target drift·부분 실패, crash·취소·중복 실행과 keyboard·screen reader semantic·focus·오류 요약을 자동 검증한다. | 정상·경계·negative fixture, GUI·CLI parity, rollback 이후 무변경 또는 정확한 복구 증거 | 완료 |
| 4 | `GUI-04-package-provenance` | OS별 재현 가능한 unsigned development package, SBOM·provenance, release manifest·`SHA256SUMS`, 게시 전후 재다운로드 검증 gate를 구현한다. | Clean runner package, asset/core/component checksum, SBOM·provenance, metadata drift 차단 | 완료; 개발 자산만 생성 |
| 5 | `GUI-05-signing-notarization` | Publisher 법적 표시명, credential owner·보관·회전·폐기·감사 계약을 승인하고 OS별 code signing·notarization 또는 동등 검증을 수행한다. | 서명·notarization log, clean-machine OS 검증, credential 비노출 증거 | 사람 승인·외부 credential·실제 OS 대기 |
| 6 | `GUI-06-usability-eval` | Terminal 비숙련 사용자가 신규·기존 프로젝트에서 설치, preview, 적용, 오류 이해, rollback과 uninstall을 수행하는 접근성·사용성 Eval을 진행한다. | 사전 정의 task·합격 기준, 참여자 결과, blocker 0, keyboard·screen reader PASS | 사람 참여·실제 OS 대기 |
| 7 | `GUI-07-release-publish` | 모든 gate가 PASS한 OS asset만 exact release에 게시하고 README·release note·manifest의 지원 상태를 동기화한다. 게시 후 asset을 다시 내려받아 signature와 checksum을 재검증한다. | 승인된 release, 게시 asset digest, 재다운로드 PASS, migration·rollback note | 외부 변경·release 승인 대기 |

### GUI-03 검증 결과

- GUI session은 현재 lock을 읽어 신규 적용과 update를 구분한다. v1 적용 뒤 v2 release를 선택하면
  공통 adoption core의 `upgrade` mode로 preview·apply·validate·rollback을 수행하며, GUI와 CLI의
  plan entry·plan SHA-256·lock·result 계약은 동일 core fixture로 검증한다.
- Clean·동일 파일 retrofit·v1→v2 upgrade와 정확한 rollback, 기존 파일 충돌, manifest·archive
  변조, target drift와 두 번째 write 실패를 검증했다. 차단·실패·취소·worker 비정상 종료 뒤에는
  소유자 파일을 보존하거나 transaction 시작 전 상태로 전체 원복한다.
- 동시에 두 작업을 시작하면 두 번째 요청을 차단한다. Read-only preview·validate만 취소할 수 있고
  write transaction은 완료 전 강제 취소하지 않는다. Worker 비정상 종료는 성공으로 표시하지 않으며
  사용자가 적용 상태를 다시 확인하도록 안내한다.
- Renderer는 native button·input·details, 한국어 document language, polite live status, dedicated
  alert 오류 요약, `aria-busy`, rollback 설명과 결과·오류·재시도 focus 이동 및 시각적 focus 표시를
  제공한다. Positive tabindex와 click-handler div는 허용하지 않는다.
- `test:release-adoption`, `test:desktop-gui`, `test:desktop-resilience`를 hosted security workflow에
  연결했다. macOS 화면의 기본 렌더링은 확인했지만 현재 Orca runtime이 실행 중이 아니어서 접근성
  트리 검사는 `BLOCKED`다. 실제 VoiceOver·비개발자 사용성 평가는 `GUI-06`까지 `NOT-RUN`이며,
  이 자동 검증을 사람 평가 PASS로 확대하지 않는다.

### GUI-04 검증 결과

- macOS arm64 clean runner에서 Electron `43.1.1`과 현재 desktop/core source만 ASAR에 포함한
  `.app`을 생성한다. `runAsNode`, `NODE_OPTIONS`, Node CLI inspect와 file protocol 추가 권한을
  fuse로 끄고 embedded ASAR integrity와 ASAR-only loading을 켠 뒤 실제 fuse wire를 재확인한다.
- 모든 file·directory·symlink timestamp와 archive entry 순서를 정규화해 같은 source를 두 번
  package한다. 두 `.app` inventory digest와 ZIP SHA-256이 모두 같은 경우에만 PASS한다.
- 산출물은 unsigned development ZIP, CycloneDX 1.6 SBOM, source/core digest와 고정 builder version을
  담은 provenance, `UNSIGNED_DEVELOPMENT_ONLY` manifest와 `SHA256SUMS`다. Checksum, SBOM format,
  provenance/core binding과 `supported: false`, signing·notarization `NOT_RUN` 경계를 재검증한다.
- SBOM bytes와 manifest 지원 metadata 변조 fixture는 fail-closed한다. GitHub의 별도
  `macos-14` read-only job이 lifecycle script 없이 도구를 설치하고 고정 Electron runtime으로 같은
  package Eval을 수행하도록 구성했다.
- 생성되는 ZIP은 `.dmg` installer가 아니며 workflow artifact나 GitHub release에 업로드하지 않는다.
  GUI-05 서명·notarization과 GUI-06 사람 Eval 전에는 macOS 지원 상태와 공식 installer 발행 상태를
  계속 `없음`으로 유지한다. 게시 후 재다운로드 검증은 실제 게시를 다루는 GUI-07까지 `NOT-RUN`이다.

### 중단 조건

- `GUI-01`에서 최초 지원 OS·framework·package 형식 또는 dependency 승인이 확정되지 않으면 구현을
  시작하지 않는다.
- `GUI-02` 또는 `GUI-03`에서 공통 core 우회, project 밖 접근, `.env*` 접근, silent overwrite,
  rollback 불일치가 발견되면 package 승격을 중단한다.
- `GUI-04` 산출물은 `UNSIGNED_DEVELOPMENT_ONLY`이며 release page의 일반 사용자 installer로 게시하지
  않는다.
- `GUI-05`의 credential은 AI context·repository·일반 CI log에 제공하지 않는다.
- `GUI-05` 또는 `GUI-06`이 `NOT-RUN`·FAIL·BLOCKED이면 `GUI-07`을 실행하지 않고 해당 OS를
  `unsupported`로 유지한다.

Desktop UX와 공통 core의 상세 계약은
[비개발자용 원클릭 프로젝트 도입 검토](one-click-project-adoption-review.md)를 따른다.

## 완료 판정

최소 한 OS·architecture에서 서명된 installer가 공식 release에 게시되고, publisher·signature·
notarization, checksum 재다운로드, clean install, update·uninstall·rollback과 비개발자 사용성
증거가 모두 PASS해야 “GUI 설치 가능”으로 표시한다. Source archive checksum PASS, mock UI 또는
synthetic surface PASS만으로는 완료로 판정하지 않는다.
