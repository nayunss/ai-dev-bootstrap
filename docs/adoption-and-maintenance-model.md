# 유지보수와 도입 모델

상태: 제안

## 두 가지 사용 경로

이 저장소에는 서로 다른 두 가지 작업 목적이 있다.

```text
Upstream: 공통 환경 개발·운영
maintainer ← contributor
    │  versioned release + checksum + migration
    ▼
Downstream: 회사·팀·개인 프로젝트 도입
platform owner/adopter → application developer + AI tools
```

한 사람이 두 역할을 모두 할 수 있지만, “공통 환경을 바꾸는 작업”과 “공통 환경을 이용해 제품을
개발하는 작업”의 변경 범위와 완료 조건은 구분한다.

## 1. Upstream maintenance

### 대상

- 이 오픈소스 저장소의 maintainer
- 새로운 skill, plugin, AI tool adapter와 Eval을 기여하는 contributor
- bootstrap, validate, hook, CI와 보안 정책을 운영하는 사람

### 책임

- Codex, Claude Code 등 지원 도구의 호환성을 유지한다.
- skill·plugin·scanner·SAST를 설치 전에 공급망과 텔레메트리 관점에서 심사한다.
- 공통 정책과 도구별 adapter가 drift하지 않게 한다.
- `token-aware`와 `full`을 포함한 공통 regression·capability Eval을 관리한다.
- breaking change에는 migration, rollback, deprecation과 지원 기간을 제공한다.
- release tag, source commit, checksum, changelog와 알려진 위험을 발행한다.

### 완료 조건

- 공통 요구사항과 지원 매트릭스 갱신
- 결정론적 검사와 다중 도구 compatibility Eval 통과
- 공급망 재심사와 잠금 정보 갱신
- 문서, 예제, migration·rollback과 `HANDOFF.md` 동기화
- 최소 한 개의 clean clone fixture에서 bootstrap·validate 통과

## 2. Downstream adoption

### 대상

- 회사에서 이 저장소를 fork하거나 release로 가져와 사내 기본 환경을 만드는 platform owner
- 프로젝트에 공통 환경을 설치·구성하는 tech lead 또는 adopter
- 구성된 환경에서 제품을 개발하는 팀원과 AI 도구 사용자

### 책임

- 검증된 upstream release 또는 commit과 checksum을 고정한다.
- 회사·프로젝트 기술 스택, 보안 등급, 데이터·배포 환경과 추가 품질 게이트를 확정한다.
- 사내 policy와 proprietary skill은 upstream 코어와 분리된 조직 계층에 둔다.
- 구성원에게 같은 bootstrap·validate 명령과 지원 AI 도구 매트릭스를 제공한다.
- upstream upgrade를 staging·sandbox에서 평가하고 조직 고유 regression을 실행한다.
- 제품 코드는 공통 게이트와 프로젝트별 추가 게이트를 모두 통과한다.

### 완료 조건

- clean clone 또는 승인된 fork에서 재현 가능
- 팀 필수와 개인 선택 설정이 구분됨
- 전역 설정 변경 없이 프로젝트 로컬 환경 우선 적용
- 조직 policy, 제품 테스트와 보안 Eval 통과
- 설치 manifest, upstream 버전, local override와 rollback 기록
- 승인된 개발환경에 맞는 품질 명령이 먼저 검증되고 그 뒤에만 Git hook이 활성화됨

## 회사 적용 구조

```text
upstream common-project release
        │ pin + verify
        ▼
company AI baseline repository
├── upstream.lock             upstream tag/commit/checksum
├── organization/            사내 정책·허용 도구·private skill
├── profiles/                web, backend, high-risk 등
├── adapters/                사내 Codex·Claude Code 연결
└── evals/organization/      조직 고유 보안·품질 regression
        │
        ▼
application repositories
├── 프로젝트 기술 스택·ADR
├── 제품 코드·테스트
└── 필요한 최소 local override
```

사내 비밀, 내부 endpoint, 개인정보와 proprietary source는 upstream issue, telemetry 또는 public
Eval 결과로 전송하지 않는다.

## 변경 소유권

| 변경 | 기본 소유 위치 | upstream 기여 가능성 |
|---|---|---|
| 도구 중립 보안·품질 개선 | upstream core | 직접 PR |
| 새 AI 도구 adapter | upstream adapters | 호환성·보안 Eval 후 PR |
| 회사의 비밀 관리·배포 정책 | organization layer | 일반화·익명화한 원칙만 |
| 프로젝트 기술 스택 | application repository | 공통 profile 가치가 검증된 경우 |
| proprietary skill | private organization layer | 원저작권·비밀 제거 전 불가 |
| 실제 사고 regression | 발생한 downstream + upstream 후보 | synthetic fixture로 익명화 후 |

## 업데이트 흐름

1. Upstream이 서명·해시된 versioned release와 변경 내용을 제공한다.
2. Downstream adopter가 source, checksum, license, telemetry와 migration을 검토한다.
3. 격리 환경에서 bootstrap, validate와 공통·조직 Eval을 실행한다.
4. 프로젝트 개발환경과 format·lint·test 명령을 확정한 뒤 필요한 Git hook profile을 선택한다.
5. 생성된 설정·코드 diff, 권한과 제거 방법을 사람이 검토한다.
6. 승인된 버전을 조직 baseline에 반영하고 애플리케이션은 명시적으로 업그레이드한다.
7. 실패 시 이전 잠금 버전으로 rollback하고 일반화 가능한 실패를 regression으로 제출한다.

`main` 또는 `latest`를 자동으로 production 개발환경에 동기화하지 않는다.

## 작업 시작 시 모드 확인

AI는 변경 전에 저장소 성격과 사용자의 목적을 파일에서 감지한다. 결과가 불명확하고 변경 위치가
달라질 때만 다음을 질문한다.

> 지금 작업은 공통 환경 자체를 개선하는 upstream 유지보수인가요, 아니면 회사·프로젝트에
> 적용하는 downstream 도입인가요?

- upstream이면 공통성, backward compatibility, 공급망과 다중 도구 Eval을 우선한다.
- downstream이면 upstream 코어 직접 수정 최소화, 조직·프로젝트 override와 재현성을 우선한다.
- 단순 제품 기능 개발이면 승인된 downstream 환경을 사용하며 하네스 자체를 임의 변경하지 않는다.

## 토큰 프로파일

- `token-aware`: 역할과 변경 계층을 먼저 확인하고 관련 release·policy·Eval subset만 읽는다.
- `full`: upstream/downstream 의존 관계, migration, 호환성 매트릭스와 전체 관련 Eval을 검토한다.

두 방식 모두 공급망 심사, 비밀 분리, 명시적 upgrade와 필수 보안 gate를 유지한다.

## 추적성

- 관련 요구사항: REQ-001~008, REQ-019, REQ-023, REQ-025~027
- 관련 문서: [아키텍처](architecture.md), [하네스](harness.md),
  [공급망 보안](supply-chain-security.md), [Eval 전략](evaluation-strategy.md)
## Downstream pilot에서 확인한 적용 규칙

- `latest` 버전들을 독립적으로 선택하지 않고 runtime·framework·lint plugin의 peer 범위를 함께
  계산한다. 실제 pilot에서는 TypeScript 7과 ESLint 10을 호환성 문제로 채택하지 않았다.
- lockfile 생성 후 production 전이 의존성까지 vulnerability audit한다. Next.js가 가져온 취약한
  PostCSS는 심사한 최소 패치 버전으로 override해야 했다.
- pnpm 11의 override는 `package.json#pnpm`이 아니라 `pnpm-workspace.yaml`에 둔다.
- Playwright package와 브라우저 바이너리 다운로드를 별도 승인하고, browser cache는 프로젝트
  로컬 경로에 둔다.
- Gitleaks full scan은 `.next`, `.cache`, Playwright 결과 같은 재생성 가능한 산출물을 제외한다.
  이 경로를 포함하면 browser binary와 빌드 manifest가 secret 오탐과 불필요한 scan 비용을 만든다.
- project-local package manager를 적용한 뒤 hook·E2E web server에서 전역 shim을 다시 호출하지
  않는다. 전역 Corepack shim이 승인하지 않은 registry 다운로드를 유발할 수 있다.

## Pilot 피드백 자동화 상태

| Pilot 발견 사항 | 자동화 |
|---|---|
| floating version·lockfile 누락 | `scripts/validate`가 exact version과 package manager별 lockfile 검사 |
| TypeScript·ESLint peer 충돌 | `scripts/bootstrap dependencies`가 strict peer install을 강제 |
| package lifecycle 위험 | dependency install에 `--ignore-scripts` 강제 |
| provider install의 lifecycle 차이 | exact-version `allowBuilds` 검사와 별도 provider-equivalent clean install Eval 요구 |
| pnpm 11 override 위치 변경 | `package.json#pnpm.overrides` 사용 시 validate 실패 |
| 전이 dependency 취약점 | 별도 승인된 `scripts/validate TARGET --online-audit`에서 moderate 이상 차단 |
| Corepack의 암묵적 다운로드 | project-local Node·pnpm이 없으면 pnpm bootstrap 중단 |
| Playwright browser 별도 CDN | bootstrap에서 제외하고 별도 preview·HITL 필요 note 출력 |
| Next telemetry | `NEXT_TELEMETRY_DISABLED`의 project-controlled evidence 검사 |
| 생성물 secret 오탐 | 공통 Gitleaks allowlist에서 `.cache`, `.next`, Playwright 결과 제외 |
| 개발환경 전 Husky 설치 | bootstrap에서 제외하고 품질 명령 통과 후 별도 활성화 |

기본 `scripts/bootstrap preview`는 파일이나 전역 환경을 바꾸지 않는다. dependency network 설치와
온라인 audit은 분리하며, Playwright binary·Husky·배포 설정을 암묵적으로 설치하지 않는다.

## 추가 pilot 검증 계획

현재 완료된 pilot은 Next.js frontend 한 건이다. 공통 환경의 stack 중립성을 주장하기 전에 다음
두 pilot을 별도 downstream 저장소에서 검증한다.

### Backend pilot

- 스택은 고정하지 않고 pilot 시작 시 사용자가 선택한다. Node.js·NestJS·Python·Spring Boot와 관계형·
  문서형 database 등은 후보 예시일 뿐 기본값이 아니다.
- 선택된 언어·runtime·framework·database·migration tool에 맞는 unit·integration·API test를 정의한다.
- 검증: exact JDK·build tool, dependency lock·verification, secret 비접근, DB least privilege,
  migration preview·rollback, SAST·dependency scan, GitHub Actions와 승인된 deployment provider
- 파괴적 DB 작업과 Production migration은 synthetic fixture와 Human-in-the-loop negative Eval 포함

### Fullstack pilot

- frontend와 backend의 독립 build·test·deploy 경계, shared contract와 workspace 정책 검증
- API schema·contract test, 통합 E2E, CORS·CSRF·cookie·session·authorization과 secret 경계 검증
- 한쪽 dependency·배포 실패가 다른 쪽의 승인·rollback을 암묵적으로 확장하지 않는지 Eval
- Preview·Production의 frontend/backend version 조합과 rollback 호환성을 기록
