# GitHub App Web Portal 로컬 no-network 사용 가이드

상태: local reference 구현·deterministic PASS, GitHub 연동·Production `NOT-RUN`
갱신일: 2026-07-19
관련 요구사항: `REQ-047`

## 이 가이드의 범위

현재 구현은 GitHub App Web Portal의 사용자 흐름과 보안 계약을 외부 연결 없이 확인하는
reference다. 로컬 브라우저에서 `저장소 선택 → 변경 미리보기 → exact plan 승인 → Pull Request
결과 확인`을 체험할 수 있지만 GitHub 로그인, App 설치, repository checkout, branch push와 PR
생성은 실행하지 않는다.

지원 surface는 다음과 같다.

- 비개발자 흐름 검증: 이 문서의 local no-network Portal
- GitHub 기반 delivery 검증: GitHub Actions P0
- 로컬 프로젝트 진단·적용: CLI와 AI 도구 시작 프롬프트

## 준비

- Node.js `22.23.1`
- npm `10.9.8`
- 이 저장소의 검토된 clone 또는 checksum을 확인한 공식 release archive

처음 한 번 다음 명령으로 현재 source와 핵심 Portal fixture를 확인한다.

```sh
npm ci --ignore-scripts
npm run test:github-app-portal
```

`npm ci`는 lock에 고정된 개발 도구를 설치한다. 외부 network를 사용할 수 없는 환경에서는 이미
검증된 dependency cache가 없으면 이 단계가 실패할 수 있다. Demo 자체는 GitHub credential을
요구하지 않는다.

## 실행

```sh
npm run portal:demo
```

브라우저에서 <http://127.0.0.1:4173>을 연다. Server는 loopback interface에만 bind하며 다음 경계를
유지한다.

- `fixture/example`이라는 synthetic repository만 표시한다.
- API 요청은 same-origin으로 제한한다.
- 응답은 `no-store`이며 CSP와 16 KiB request body 제한을 적용한다.
- GitHub API, OAuth, webhook endpoint와 telemetry에 연결하지 않는다.
- 화면의 Pull Request 결과는 예시이며 실제 외부 resource를 만들지 않는다.

## 화면에서 확인할 순서

1. 상단의 **로컬 검증 모드**와 `실행하지 않는 작업`을 읽는다.
2. synthetic repository를 선택한다.
3. **미리보기**에서 생성·변경·보존·차단 건수와 위험 요약을 확인한다.
4. 상세 plan과 plan SHA-256이 같은 repository와 actor에 묶였는지 확인한다.
5. 명시적 승인 후 **적용 PR 만들기** 흐름을 실행한다.
6. 결과에 branch·PR 예시와 `merge: NOT_RUN`이 표시되는지 확인한다.
7. terminal에서 `Ctrl+C`로 server를 종료한다.

오류가 나면 GitHub credential을 추가하거나 권한을 넓히지 않는다. 먼저
`npm run test:github-app-portal`을 다시 실행하고, 사용 중인 Node/npm 버전과 포트 충돌을 확인한다.

## 구현 위치

| 경로 | 역할 |
|---|---|
| `web-portal/` | 반응형 한국어 화면과 keyboard semantic UI |
| `scripts/github-app-portal-demo.mjs` | loopback 전용 no-network demo server |
| `scripts/github-app-portal.mjs` | 권한·auth state·webhook·token·plan·PR-only 계약 |
| `scripts/test-github-app-portal.mjs` | 보안 negative와 browser/API contract fixture |

상세 권한, token confinement, webhook replay와 Production pilot 중단 조건은
[GitHub App Web Portal Reference](github-app-web-portal-reference.md)를 따른다.

## 완료로 해석하면 안 되는 항목

Local deterministic PASS는 다음 항목의 완료 증거가 아니다.

- 실제 GitHub App 등록과 selected-repository 설치
- OAuth callback·webhook public endpoint와 provider API
- persistent replay store·secret manager·ephemeral compute·egress enforcement
- 실제 branch·PR 생성 실패 rollback과 revoke·suspend·uninstall
- 비개발자 browser·keyboard·screen reader 사용성 Eval
- Production hosting과 운영 승인

이 외부 입력이 준비되기 전에는 reference를 Production 서비스나 실제 repository 적용 도구로
표시하지 않는다.
