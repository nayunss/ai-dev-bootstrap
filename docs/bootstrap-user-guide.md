# AI Dev Bootstrap 처음부터 끝까지 사용 가이드

상태: `v0.2.8-pilot` 기준
갱신일: 2026-07-19

이 문서는 AI Dev Bootstrap을 처음 사용하는 사람이 “지금 무엇을 할 수 있는지”를 확인하고,
안전하게 프로젝트를 진단·설정·검증하는 순서를 설명한다.

> **현재 상태**
>
> - 설치 가능한 GUI 앱은 아직 없다.
> - 지금 바로 검증된 기본 경로는 terminal에서 실행하는 CLI다.
> - 설치 없는 GitHub Actions P0도 구현됐지만 실제 downstream 검증 전인 reference다.
> - 기본 명령은 프로젝트를 바꾸지 않는 `preview`다.
> - `apply`와 `--approve`가 포함된 명령만 파일을 변경할 수 있다.
> - `v0.2.8-pilot`의 전체 release adoption은 reference 구현이다. 일반 사용자가 바로 적용할
>   production manifest나 서명된 installer는 아직 제공하지 않는다.

명령의 `/absolute/path/to/project`는 설정하려는 프로젝트 폴더의 절대 경로로 바꾼다. 예를 들어
macOS에서 프로젝트가 `Documents/my-app`에 있다면 `/Users/사용자명/Documents/my-app`처럼 입력한다.

## 먼저 내 경로 선택하기

| 원하는 일 | 이동할 절 |
|---|---|
| 프로젝트 상태만 안전하게 확인하고 싶다 | [빠른 시작](#빠른-시작-변경-없이-확인) |
| Codex·Claude Code·GitHub Copilot 설정을 프로젝트에 연결하고 싶다 | [AI 도구 연결](#ai-도구-연결하기) |
| Stack starter나 skill bundle을 검토된 manifest로 적용하고 싶다 | [고급 적용](#고급-적용-검토된-manifest가-있는-경우) |
| Dependency 또는 보안 도구를 설치하고 싶다 | [별도 설치](#dependency와-보안-도구는-별도-설치) |
| Apple 가입 없이 browser에서 적용 흐름을 검증하고 싶다 | [GitHub Actions P0](#설치-없는-github-actions-p0) |
| GUI 앱을 설치하고 싶다 | [GUI 설치 상태](#gui-설치-상태) |

## 먼저 알아둘 안전 경계

- `preview`, `validate`는 파일 변경 계획과 문제를 확인하는 단계다.
- `apply --approve`는 검토한 계획을 실제 파일에 적용하는 단계다.
- 개인 전역 AI·Git·shell 설정을 자동 변경하지 않는다.
- `.env*`, credential store와 project 밖 파일을 읽거나 쓰지 않는다.
- 프로젝트의 언어·framework·DB·CI·배포 제공자는 감지하거나 질문하며 예시 stack을 강제하지 않는다.
- dependency network, lifecycle script, DB migration, provider write와 Production deploy는 별도
  preview와 사람 승인이 없으면 실행하지 않는다.
- reference·synthetic PASS는 실제 프로젝트 지원 또는 Production 승인이 아니다.

실제 적용 전에는 대상 프로젝트에서 새 branch를 만들고 기존 변경을 commit하거나 별도로 보존한다.
기존 파일이 예상과 다르면 자동 덮어쓰지 않고 적용을 차단한다.

## 빠른 시작: 변경 없이 확인

아래 과정은 `v0.2.8-pilot` source를 고정하고 대상 프로젝트를 읽기 전용으로 검사한다.

### 1. 검증된 release 받기

공식 저장소와 release page만 사용한다.

- 저장소: <https://github.com/nayunss/ai-dev-bootstrap>
- 최신 release 목록: <https://github.com/nayunss/ai-dev-bootstrap/releases>
- 현재 검증 기준: [v0.2.8-pilot](https://github.com/nayunss/ai-dev-bootstrap/releases/tag/v0.2.8-pilot)

```sh
git clone https://github.com/nayunss/ai-dev-bootstrap.git
cd ai-dev-bootstrap
git checkout v0.2.8-pilot
```

이 clone은 CLI와 문서를 받는 과정이며 GUI 설치가 아니다. Release page의 source archive도 GUI
installer가 아니다.

Release archive를 직접 내려받았다면 release note의 SHA-256과 파일 checksum을 대조한다.
`v0.2.8-pilot` archive SHA-256은
`3963402cf8d28c88858055a90e4be3c9c4170ea99f483f8360bd8749c22db4f8`이다.
다음 release에서는 해당 release note의 값을 사용하고 과거 값을 재사용하지 않는다.

### 2. 대상 프로젝트 진단하기

```sh
scripts/bootstrap preview /absolute/path/to/project
scripts/validate /absolute/path/to/project
```

- `bootstrap preview`: 프로젝트 구조와 적용 전 확인할 항목을 보여준다. 파일을 변경하지 않는다.
- `validate`: 필수 profile, application 목록, 승인과 파일 drift를 검사한다. 파일을 변경하지 않는다.

`validate`가 실패해도 설치가 망가졌다는 뜻은 아니다. 출력된 누락 항목을 확인한 뒤 다음 단계에서
설정한다. 이해하지 못한 오류가 있으면 곧바로 `apply`하지 않는다.

### 3. 프로젝트 기본 정보 만들기

신규 프로젝트와 기존 프로젝트 모두 onboarding을 사용할 수 있다.

```sh
scripts/bootstrap onboarding /absolute/path/to/project
scripts/bootstrap readiness /absolute/path/to/project
```

Onboarding은 누락된 project profile 초안만 만들며 기존 파일을 덮어쓰지 않는다. 생성된 파일의
`TBD`와 `pending`은 오류가 아니라 아직 사람이 결정하지 않은 항목이다.

다음 값은 프로젝트 owner와 함께 확정한다.

- frontend·backend·full-stack 구성, package manager, DB와 migration 방식
- Git hosting, branch 전략, review 인원, CI·artifact·deployment provider
- 사용할 AI 도구와 adapter
- model·harness 정확한 버전, trial 횟수, token·비용·network 상한과 사람 reviewer
- 법률·개인정보 책임자, data category별 retention·파기 정책
- 다중-instance rate limiter와 Production provider restore evidence

`TBD`와 `pending`을 그대로 두어도 되지만 그 상태에서는 dependency 설치, 외부 model 호출 또는
Production 승인을 진행하지 않는다.

## AI 도구 연결하기

사용할 AI 도구만 선택한다. 먼저 `preview`로 변경될 파일을 확인하고, 내용에 동의할 때만
`apply ... --approve`를 실행한다.

```sh
# 1. 변경 계획만 확인
scripts/bootstrap adapters preview /absolute/path/to/project codex
scripts/bootstrap adapters preview /absolute/path/to/project codex,claude-code,github-copilot

# 2. 검토한 Codex 계획을 실제 적용
scripts/bootstrap adapters apply /absolute/path/to/project codex --approve

# 3. 적용 결과 확인
scripts/bootstrap adapters validate /absolute/path/to/project
```

지원 선택 값은 `codex`, `claude-code`, `github-copilot`이다. 쉼표로 여러 개를 선택할 수 있다.
선택하지 않은 도구의 설정은 만들지 않는다.

제거할 때도 installer가 만들었고 이후 바뀌지 않은 파일만 삭제한다. 기존 파일과 사용자가 변경한
파일은 보존한다.

```sh
scripts/bootstrap adapters uninstall /absolute/path/to/project codex --approve
```

## 고급 적용: 검토된 manifest가 있는 경우

이 절은 maintainer나 팀 owner가 검토한 profile·release manifest를 이미 제공한 경우에만 사용한다.
파일 경로가 무엇인지 모른다면 이 절을 실행하지 않고 [AI 도구 연결](#ai-도구-연결하기)까지만
진행한다.

개발환경 profile과 stack starter:

```sh
# profile: 첫 명령은 preview, 두 번째 명령은 실제 적용
scripts/bootstrap profile /absolute/path/to/project /path/to/reviewed-profile.json
scripts/bootstrap profile /absolute/path/to/project /path/to/reviewed-profile.json --approve

# stack starter: dependency 설치와 DB SQL 실행은 포함하지 않음
scripts/bootstrap stack-fixture preview /absolute/path/to/project /path/to/reviewed-profile.json
scripts/bootstrap stack-fixture apply /absolute/path/to/project /path/to/reviewed-profile.json --approve
scripts/bootstrap stack-fixture rollback /absolute/path/to/project /path/to/reviewed-profile.json --approve
```

검토된 skill bundle:

```sh
scripts/bootstrap skills preview /absolute/path/to/project /path/to/release/manifest.json --optional=frontend --adapters=codex
scripts/bootstrap skills apply /absolute/path/to/project /path/to/release/manifest.json --optional=frontend --adapters=codex --approve
```

`scripts/bootstrap adopt`는 GUI와 CLI가 공유하는 headless adoption core의 reference 진입점이다.
`v0.2.8-pilot`에는 실제 사용자 프로젝트에 바로 적용할 production release-adoption manifest나
서명된 desktop app이 포함되지 않으므로, 저장소의 synthetic fixture를 실제 프로젝트 설치 입력으로
사용하지 않는다.

## 설치 없는 GitHub Actions P0

이 경로는 macOS 인증서나 특정 device가 필요하지 않다. Downstream GitHub 저장소의 Actions
화면에서 workflow를 수동 실행하고, 변경 계획을 artifact로 확인한 뒤 승인된 변경만 PR로 받는다.
아직 실제 downstream pilot 전이므로 일반 사용자용 설치 서비스나 GitHub App Portal은 아니다.

진행 순서는 다음과 같다.

1. Maintainer가 [P0 workflow template](templates/github-actions-web-adoption-p0.yml)을 downstream의
   `.github/workflows/`에 복사한다.
2. `REPLACE_WITH_EXACT_UPSTREAM_COMMIT`을 검증된 upstream 40자리 commit SHA로 바꾼다.
3. Downstream 설정에 승인자가 필요한 `web-adoption-apply` environment를 만든다.
4. Actions의 **Run workflow**에서 `preview`를 실행한다. 이 job은 repository를 변경하지 않는다.
5. 결과 artifact의 plan SHA-256과 변경 파일을 검토한다.
6. 같은 plan SHA-256을 입력해 `apply`를 실행하고 environment 승인자가 승인한다.
7. 생성된 새 branch와 PR의 diff·hosted checks를 검토한다. 자동 merge하지 않는다.

현재 allowlist의 `reference-v1`, `reference-v2`는 synthetic 검증용이다. 실제 프로젝트에 적용할
production release로 사용하지 않는다. Preview에 write 권한이 생기거나, apply가 default branch를
직접 수정하거나, exact plan 검증 없이 진행되면 즉시 중단한다. 상세 권한과 pilot 합격 조건은
[GitHub 기반 Web Adoption Delivery](web-adoption-delivery-review.md)를 따른다.

## Dependency와 보안 도구는 별도 설치

Bootstrap이나 adapter 적용은 dependency를 자동 설치하지 않는다. Project profile, package manager의
정확한 version과 lockfile을 검토한 뒤 별도로 승인한다.

```sh
# 먼저 계획 확인
scripts/bootstrap dependencies preview /absolute/path/to/project

# 승인된 local artifact만 사용하는 offline 적용
scripts/bootstrap dependencies apply /absolute/path/to/project --offline --approve

# 결과 확인
scripts/bootstrap dependencies validate /absolute/path/to/project
```

Network가 필요한 기존 npm·pnpm 설치 경로는 `--allow-network`가 없으면 거부된다.

```sh
scripts/bootstrap dependencies /absolute/path/to/project --allow-network
```

Gitleaks·Opengrep project-local 보안 도구는 팀이 제공한 승인 artifact와 checksum이 있을 때만
적용한다. `/approved/artifacts`가 무엇인지 모르면 실행하지 않는다.

```sh
scripts/bootstrap security-tools preview /absolute/path/to/project
scripts/bootstrap security-tools apply /absolute/path/to/project /approved/artifacts --approve
```

Plugin catalog는 심사 정보이며 설치 승인이 아니다. Plugin과 MCP는 공급망·권한·telemetry·network를
별도 심사하고 사용자가 승인하기 전에는 설치하거나 호출하지 않는다.

## 적용 후 확인

```sh
scripts/validate /absolute/path/to/project
scripts/bootstrap adapters validate /absolute/path/to/project
```

대상 프로젝트가 선언한 formatter, linter, typecheck, unit·integration·E2E와 security gate도 별도로
실행한다. `scripts/validate` PASS만으로 실제 제품 동작, Production readiness나 배포 성공을
확정하지 않는다.

Production 후보는 owner evidence가 채워진 profile에 대해서만 hard gate를 실행한다.

```sh
node scripts/validate-production-readiness.mjs /path/to/profile.json --expect-blocked
node scripts/validate-production-readiness.mjs /path/to/profile.json --expect-ready
```

두 번째 명령의 PASS도 schema 증거 완전성 판정이며 법률 판단이나 Production 변경을 자동 수행하지
않는다.

## 팀 저장소에 반영하기

적용 결과 diff와 생성된 lock을 검토하고 다음을 확인한다.

1. 선택하지 않은 adapter·skill·plugin·MCP가 추가되지 않았다.
2. 기존 project 파일과 개인 설정이 덮어써지지 않았다.
3. network·dependency·DB·provider·Production 작업이 승인 범위를 넘지 않았다.
4. project quality·security test가 통과했다.
5. `HANDOFF.md`에 완료·미완료·실제 환경 대기 작업과 검증 결과가 구분되어 있다.

검토가 끝난 변경만 일반 프로젝트의 branch·review·CI 정책에 따라 commit하고 병합한다.

## Update와 rollback

새 release를 자동 적용하지 않는다.

1. 새 tag·commit·archive checksum과 release note를 확인한다.
2. 현재 downstream lock과 local override를 기록한다.
3. migration·지원 범위·새 dependency·권한을 검토한다.
4. preview diff를 승인한 뒤 upgrade한다.
5. project regression과 security gate를 다시 실행한다.
6. 실패하면 생성 시점의 rollback record 또는 이전 release pin으로 복귀한다.

자동 rollback은 installer가 관리하고 hash가 변하지 않은 파일만 대상으로 한다. 사용자가 변경한
파일, dependency, DB와 provider rollback은 각각 별도 절차와 승인이 필요하다.

## GUI 설치 상태

GUI·CLI 공통 plan·lock·transaction core와 synthetic parity fixture는 구현돼 있다. 그러나
`v0.2.8-pilot`에는 macOS·Windows·Linux용 서명된 desktop installer가 없다.

- 설치 asset 확인: <https://github.com/nayunss/ai-dev-bootstrap/releases/latest>
- GUI 설치 자산과 현재 배포 상태:
  [GUI 설치 자산·배포 준비 검토](gui-installation-distribution-review.md)
- GUI UX와 공통 core 설계:
  [비개발자용 원클릭 프로젝트 도입 검토](one-click-project-adoption-review.md)

향후 release page에 OS별 installer가 나타나더라도 publisher, 지원 OS, signature/notarization,
SHA-256과 해당 release의 사용성 검증 상태가 문서에 모두 기록된 경우에만 설치한다.

## 문제가 생겼을 때

- 적용 전 차단: 충돌 파일과 미응답 project 결정을 해결한 뒤 preview를 다시 실행한다.
- 적용 중 실패: 성공으로 간주하지 말고 transaction rollback 결과와 변경 파일을 확인한다.
- target drift: 사용자가 변경한 파일을 자동 덮어쓰지 말고 유지·재적용·제외 중 하나를 사람이 정한다.
- upstream 공통 결함: project 고유 정보와 비밀을 제거하고
  [upstream feedback 계약](upstream-feedback-log.md)에 따라 재현 조건과 release baseline을 기록한다.
- 다음 작업 인계: 루트 `HANDOFF.md`, 실제 Git 상태와 관련 requirement를 함께 현행화한다.
