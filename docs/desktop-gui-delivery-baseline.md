# Desktop GUI Delivery Baseline

상태: `GUI-01-delivery-baseline` 완료
확정일: 2026-07-18
관련 요구사항: `REQ-047`
관련 작업: `REQ-047-gui-installer-delivery`, `GUI-01-delivery-baseline`

## 결정

최초 desktop 개발·지원 후보는 다음으로 고정한다.

| 항목 | 결정 | 현재 상태 |
|---|---|---|
| 최초 OS | macOS 13 Ventura 이상 | 지원 표시는 clean-machine Eval 전까지 `unsupported` |
| 최초 architecture | Apple Silicon `arm64` | 현재 개발 host와 일치, x64·universal은 별도 검증 전 미지원 |
| Desktop framework | Electron `43.1.1` | exact version·lock 고정, 개발 runtime 검증 완료 |
| Runtime | Electron 내장 Node.js `24.18.0`, Chromium `150.0.7871.114` | Electron release metadata 기준 |
| 개발 package | `.app` | `UNSIGNED_DEVELOPMENT_ONLY` |
| 사용자 배포 package | Developer ID 서명·notarization·stapling된 `.dmg` | 미구현·미발행 |
| 배포 경로 | 공식 GitHub release의 exact tag asset | 비공식 mirror·source archive 제외 |
| Update | 자동 확인·다운로드 없음, release page 안내 후 수동 preview·승인 | updater dependency·background network 제외 |
| Telemetry | 기본 비활성화, crash upload 없음 | opt-in 설계·심사 전 수집 금지 |

`macOS 13+ arm64`는 첫 구현·Eval 범위이며 현재 지원 완료 선언이 아니다. 실제 최소 OS는 macOS 13
clean machine에서 설치·실행·apply·rollback을 검증해야 유지할 수 있다.

## Framework 비교

| 후보 | 기존 core 재사용 | 보안·배포 특성 | 판정 |
|---|---|---|---|
| Native SwiftUI | Node ESM core를 직접 호출할 수 없어 재구현 또는 별도 process 필요 | macOS native signing·accessibility 장점, 다중 OS 확장 비용 | 최초 후보 제외 |
| Tauri 2 | Rust port 또는 Node sidecar 없이는 현재 core 직접 재사용 불가 | OS WebView·capability model로 작은 권한 표면, Rust·Cargo 공급망 추가 | core가 언어 중립 service로 분리될 때 재검토 |
| Electron 43 | Main process에서 현재 Node ESM core를 직접 import 가능 | Chromium·Node bundle과 privileged main/IPC 위험, 빠른 security patch 필요 | 조건부 선택 |

Electron 선택 이유는 UI 기술 선호가 아니라 `GUI와 CLI가 동일 adoption core를 사용한다`는 REQ-047
계약을 현재 코드에서 가장 적은 재구현으로 지키기 위해서다. Renderer는 core나 filesystem을 직접
호출하지 않고 main process의 좁은 IPC adapter만 사용한다.

## Dependency 승인 결과

사용자 승인 후 scripts-off 설치 preview와 실제 개발 runtime 설치를 분리해 검증했다. 세 package는
exact version으로 `package.json`과 `package-lock.json`에 고정했고 `npm audit` 결과는 취약점 0건이다.

| Package | 용도 | 고정·검증 결과 | 판정 |
|---|---|---|---|
| `electron@43.1.1` | Desktop runtime | npm integrity 고정, package tar SHA-256 `102ba5e7ce656a306c13ce0c4b3d69f7bc2554e1a3c2b4d403539358dc7b5577`; macOS arm64 binary zip SHA-256 `d6d0598d042ef4d146278d08d84deac9dde145eae31eb4f32ef46206d6bd6169` | 개발 runtime 승인 |
| `@electron/packager@20.0.3` | `.app` 생성 후보 | exact version·lock 고정, 아직 package 산출물 생성 전 | `GUI-04`에서 사용 |
| `@electron/fuses@2.1.3` | 불필요한 Electron 실행 표면 차단 | exact version·lock 고정, 아직 packaged executable 적용 전 | `GUI-04`에서 사용 |
| macOS signing/notarization tool | Developer ID·notary service 연계 | keychain·외부 Apple service·credential 접근 | `GUI-05`까지 도입 금지 |

격리 lock 분석에서 53개 package, install lifecycle 표시 0개, license는
MIT·BSD-2-Clause·ISC·Apache-2.0·BlueOak만 확인했다. Electron 자체 `install.js`는 공식 artifact와
동봉 checksum을 사용해 platform binary를 받으므로, scripts-off 설치 뒤 별도 명령으로 runtime을
받아 checksum을 다시 확인했다. `npx`, floating `latest`와 원격 scaffold는 사용하지 않았다.

다운로드된 upstream `Electron.app`은 Developer ID 배포 서명이 아니다. 로컬 검사에서
`TeamIdentifier`가 없고 strict `codesign` 검증도 실패했으므로 지원 자산으로 사용할 수 없다.
`GUI-04`의 fuse 적용·개발 package 생성과 `GUI-05`의 승인된 publisher 서명 전까지 이 상태를
의도적인 중단 조건으로 유지한다.

## Process·IPC 보안 기준

```text
local packaged renderer
        │ allowlisted typed IPC
        ▼
Electron main process
        │ direct in-process import
        ▼
shared release-adoption core
        │ confined target root
        ▼
user-selected project
```

- Renderer는 packaged local content만 로드하며 remote URL·`webview`·iframe을 사용하지 않는다.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`를 명시하고
  `webSecurity`를 끄지 않는다.
- Preload는 `selectProject`, `preview`, `apply`, `validate`, `rollback`처럼 기능별 method만 노출하고
  raw `ipcRenderer`, shell, filesystem과 arbitrary channel을 노출하지 않는다.
- Main process는 모든 IPC sender URL·frame, argument schema, mode와 selected root binding을
  검증한다.
- Navigation, 새 window, permission request와 외부 URL 열기는 기본 차단한다.
- CSP는 packaged resource만 허용하고 inline/eval script와 remote font·image·network를 차단한다.
- Electron fuses에서 `runAsNode`, Node CLI inspect와 불필요한 debug 표면을 package 전에 차단한다.
- Renderer에 release manifest 원문이나 임의 filesystem path를 실행 지시로 전달하지 않는다.
- Native folder picker가 반환한 한 project root만 session capability로 유지한다. `.env*`, symlink
  escape, credential store, home 전체와 다른 repository 접근은 core와 IPC 양쪽에서 거부한다.

## Threat model

| 위협 | 기본 통제 | 필수 negative fixture |
|---|---|---|
| Renderer XSS가 privileged API 호출 | local-only content, CSP, sandbox, 기능별 IPC | inline/eval/remote navigation과 arbitrary IPC 거절 |
| 조작된 IPC sender·argument | sender/frame allowlist, schema, selected-root binding | child frame, 다른 URL, unknown field·mode·path 거절 |
| Project 밖·민감 파일 접근 | native picker root, core confinement, `.env*`·symlink 차단 | parent traversal, symlink escape, `.env*`, home·sibling repo 거절 |
| Preview와 apply 사이 target drift | plan hash와 target inventory 재검증 | 파일 변경 뒤 apply 전체 차단·0 write |
| 부분 write·crash | transaction snapshot과 재실행 상태 판별 | 두 번째 write failure, process 종료, 중복 apply 원복 |
| 변조된 app·release asset | code signing, notarization, manifest·SHA-256, 재다운로드 | signature·manifest·asset mismatch fail-closed |
| 자동 update 공급망 | P0 자동 updater 없음 | startup network 0, background download 0 |
| Credential 유출 | signing은 격리 release job, AI·renderer·일반 log 비노출 | repository·artifact·log secret scan |

## Packaging·signing 기준

- `.app` 개발 artifact는 일반 사용자 release에 게시하지 않는다.
- 직접 배포 `.dmg`는 Developer ID Application signature, hardened runtime, secure timestamp,
  Apple notarization과 stapled ticket을 요구한다.
- `codesign --deep`에 의존하지 않고 nested code를 올바른 순서와 entitlement로 서명한다.
- Notarization은 `notarytool` 또는 승인된 동등 API만 사용하며 deprecated `altool`을 사용하지 않는다.
- Publisher credential은 repository, AI context, 일반 CI job과 분리된 secret store·release
  environment에 두고 owner·scope·rotation·revocation을 기록한다.
- Build 직후와 공식 release 게시 후 각각 `codesign`, Gatekeeper, stapler, SHA-256을 검증한다.

## Update 정책

P0에는 Electron `autoUpdater`와 update service를 포함하지 않는다. App은 startup과 background에서
release endpoint를 조회하지 않는다. 새 release 안내는 README·release page에서 제공하고 사용자가
exact tag·publisher·signature·checksum을 확인한 뒤 preview와 승인으로 교체한다.

자동 update는 다음을 별도 설계·위협 분석한 뒤 P1 후보로만 검토한다.

- signed update metadata와 rollback·downgrade 방지
- network host·method·timeout·proxy·partial download
- 채널 안정성, 강제 update 금지와 사용자 승인
- update server 장애·침해와 현재 release 지속 사용

## 완료·중단 조건

`GUI-01-delivery-baseline`은 기술 선택, dependency 승인·고정과 개발 runtime 검증까지 완료했다.
이 완료는 desktop 지원 완료가 아니다. Upstream app signature가 배포 기준을 충족하지 않았으므로
다음 중단 조건을 유지한다.

- `GUI-02`·`GUI-03`에서 core 우회, root escape, `.env*` 접근 또는 preview/apply drift가 발견되면
  packaging으로 승격하지 않는다.
- `GUI-04`에서 fuse·ASAR·checksum·SBOM·provenance를 검증하기 전 개발 `.app`을 배포하지 않는다.
- `GUI-05`의 Developer ID signing·notarization과 `GUI-06`의 사람 Eval 전에는 macOS를
  `unsupported`로 표시한다.

## 공식 근거

- [Electron 43.1.1 release metadata](https://releases.electronjs.org/release/)
- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [Apple distribution signing](https://developer.apple.com/documentation/xcode/creating-distribution-signed-code-for-the-mac)
- [Tauri security model](https://v2.tauri.app/security/)
