# Downstream 시작 가이드

상태: 설계 승인

이 저장소를 clone한 뒤 회사·팀·개인 프로젝트에 공통 환경을 적용하는 **목표 절차**다. 현재
common-project의 설계 명세 baseline은 완료됐고 실제 구현 단계로 전환했다. canonical
`upstream.lock.yaml` validator와 core materializer는 구현됐지만 범용 installer·stack별 bootstrap은
아직 완성되지 않았으므로 구현 완료된 명령만 실행 가이드로 사용한다.

역할·책임과 업데이트 흐름의 상세는 [유지보수와 도입 모델](adoption-and-maintenance-model.md)을,
단계별 세부 규칙은 각 단계에 연결된 문서를 따른다. 이 가이드는 순서만 정의하고 규칙을
복제하지 않는다.

## 사전 확인

- 지금 작업이 downstream 도입인지 확인한다. 공통 환경 자체를 고치는 작업이면 이 가이드가
  아니라 `.ai/workflows/change-mode.md`의 upstream maintenance를 따른다. 제품 개발이 아니라 하네스
  검증이 목적이면 이 절차 위에 [Downstream 검증 가이드](downstream-validation-guide.md)의
  전제와 판정 기준을 겹쳐 적용한다.
- downstream 프로젝트는 이 저장소와 **별도 Git 저장소**로 만든다. upstream 파일을 symlink,
  submodule 또는 실시간 참조하지 않는다.
- 현재 자동화와 목표 설계의 차이는 [Upstream–Downstream 아키텍처](upstream-downstream-architecture.md)의
  구현 상태 표를 먼저 확인한다. 미구현 명령을 AI가 임의로 만들어 실행하지 않는다.

## 절차

### 1. Upstream 버전 고정

- 검증된 release를 사용하면 tag와 release archive SHA-256을 대조한다. 발행된 release와 checksum은
  [release note](releases/)에 있다.
- release 이후 설계를 검증하려면 승인된 branch commit SHA를 고정한다. 이 경우 commit SHA는 기록하되
  release archive checksum이 있는 것처럼 쓰지 않고 `not-published`로 표시한다.
- 선택한 tag/commit/checksum을 downstream 저장소에 기록한다(예: `upstream.lock`).
- 이후 upgrade는 자동 동기화가 아니라 [유지보수와 도입 모델](adoption-and-maintenance-model.md#업데이트-흐름)의
  명시적 업데이트 흐름을 따른다.

### 2. 읽기 전용 진단

```sh
scripts/bootstrap preview /absolute/path/to/downstream
```

명령은 upstream clone root에서 실행한다. preview는 대상 파일이나 전역 환경을 바꾸지 않고 root·하위
manifest와 application inventory drift를 표시한다. target 없이 실행하면 공통 설명만 출력하므로
downstream 진단 증거가 되지 않는다.

### 3. 프로젝트 개발환경 정의

- `.ai/workflows/project-environment.md` 절차에 따라 기술 스택을 감지·질문·확정하고
  `docs/development-environment.md`를 작성한다. 배경은
  [프로젝트 개발환경 정의](project-environment-definition.md)를 본다.
- 언어·framework·database·배포 provider는 고정 기본값이 없다. 문서의 Next.js·Spring Boot
  조합은 검증된 pilot 사례일 뿐이다. 실제 검증 범위는 README의 현재 상태 절을 본다.
- 모든 버전은 `latest`가 아니라 정확한 버전으로 고정한다. peer 호환 범위를 함께 계산한다.
- 초기 설정과 기존 project retrofit 모두 다음 명령으로 REQ-040·041·042의 누락 profile과
  프로젝트별 질문을 준비한다. 기존 profile은 덮어쓰지 않는다.

```sh
scripts/bootstrap onboarding /absolute/path/to/downstream
```

생성되는 `docs/production-readiness.json`, `docs/skill-evolution-trial.json`,
`docs/upstream-adoption.json`의 `TBD`·`pending`은 의도적인 blocker다. 각 project owner가 실제
책임자·evidence·model/harness·비용/network·reviewer·release/checksum·rollback을 결정하기 전에는
Production, 외부 model 호출이나 upstream release 적용을 승인하지 않는다.

### 4. 보안 도구와 dependency 설치

dependency 단계는 아직 범용 installer가 아니지만 승인된 security binary의 project-local offline
installer는 구현돼 있다.

```sh
scripts/bootstrap security-tools preview /absolute/path/to/project
scripts/bootstrap security-tools apply /absolute/path/to/project /approved/artifacts --approve
scripts/bootstrap security-tools validate /absolute/path/to/project
scripts/bootstrap dependencies preview /absolute/path/to/project
scripts/bootstrap dependencies apply /absolute/path/to/project --offline --approve
scripts/bootstrap dependencies validate /absolute/path/to/project
scripts/bootstrap dependencies uninstall /absolute/path/to/project --approve
```

- target 없는 `scripts/bootstrap security-tools`는 backward-compatible upstream 설치 명령이다.
  target을 지정한 preview/apply/validate/uninstall은 downstream `.tools/security/`만 사용한다.
  installer network는 deny이며 별도 승인으로 확보한 artifact만 exact checksum 검증 후 적용한다.
- project의 `.ai/manifests/dependency-bootstrap.json`은 application별 root, npm·pnpm·Yarn·Maven·
  Gradle·Python adapter, exact version, manifest와 lockfile을 선언한다. 임의 shell command는 계약에
  넣을 수 없다.
- apply는 `--offline` 또는 별도 network 승인인 `--allow-network` 중 하나와 `--approve`를 모두
  요구한다. npm 외 adapter runtime은 심사를 마친 project-local `.tools/` 경로만 사용한다.
- Node adapter는 lifecycle/build script를 차단한다. Python은 hash lock·no-deps·binary-only를
  강제하고, Maven·Gradle은 daemon·대화형 동작을 제한한 고정 argv만 실행한다.
- apply 전에 모든 adapter version과 기존 output 충돌을 일괄 검사한다. 결과 lock과 ownership marker가
  drift하면 validate가 실패하며 uninstall은 marker가 변경된 output을 보존한다.
- 새 skill·plugin·scanner는 설치 전 [공급망 보안](supply-chain-security.md) 심사를 거친다.

### 5. 검증

```sh
scripts/validate /absolute/path/to/project
scripts/validate /absolute/path/to/project --online-audit
```

- `--online-audit`는 network를 쓰므로 별도 승인 후 실행하고, production 전이 의존성까지
  moderate 이상 취약점을 차단한다. 현재 online audit은 npm·pnpm만 구현됐으며 다른 package manager는
  미지원으로 실패해야 한다.

### 6. Git hook 활성화

Husky 등 hook manager는 clone 직후 설치하지 않는다. 확정된 개발환경에서 실제
format·lint·test 명령이 먼저 통과한 뒤에만 해당 프로파일로 활성화한다.
상세는 [프론트엔드 도구와 훅](frontend-tooling-and-hooks.md)을 본다.
현재 bootstrap은 hook을 자동 활성화하지 않는다. 적용할 profile과 lifecycle dependency는 별도 승인한다.

### 7. CI·배포

`.ai/workflows/ci-deployment.md` 계약에 따라 CI, Preview·Production 배포와 rollback을
승인받아 구성한다. 배포 provider 선택과 URL 공개 범위는
[Human-in-the-loop](human-in-the-loop.md) 승인 대상이다.

### 8. 제품 개발 시작

이 단계는 설계 검증과 실제 환경 구현이 끝난 뒤에만 적용한다. 현재 pilot에서는 최소 fixture를 넘는
제품 기능 확장을 하지 않는다. 승인된 환경에서 제품 코드를 개발할 때도 upstream 하네스·grader를 임의로
약화하지 않는다. 도입·개발 중 발견한 공통 환경 결함, 문서 격차, 개선 사항은 이 downstream
저장소의 `docs/upstream-feedback.md`에 발견 즉시 기록한다. 형식과 upstream 제출 경로는
[Upstream 피드백 기록 계약](upstream-feedback-log.md)을 따른다. 발견이 0건으로 완주한
경우가 아닌 한, 피드백 기록 없는 도입은 미완성이다.

## 단계별 입력 프롬프트

프롬프트에는 사람이 확정해야 하는 의도·선택·승인만 담는다. 기계적으로 검증 가능한 규칙은
하네스가 집행하므로 반복해서 붙이지 않는다([프롬프트 템플릿](prompt-templates.md)).
`<>`는 사용자가 채우는 값이며, upstream clone 루트에서 AI 도구에 입력한다. Pilot이면
[Downstream Pilot 검증](distributed-pilot-testing-guide.md)의 AI provenance·권한·결과 schema도 함께
적용한다.

### 1단계 — 시작과 버전 고정

```text
downstream 프로젝트 <절대 경로>를 새로 시작합니다. docs/downstream-getting-started.md
절차를 따르고, upstream은 <release tag 또는 commit>으로 고정해 tag/commit/checksum을
`.ai/manifests/upstream.lock.yaml` 초안에 기록해줘. release가 아닌 commit이면 archive checksum은
not-published로 표시해. 현재 lock parser가 없다는 사실도 HANDOFF에 남기고 다른 설치는 하지 마.
```

### 2단계 — 읽기 전용 진단

```text
scripts/bootstrap preview <downstream 절대 경로>를 upstream clone root에서 실행하고, 감지된 manifest·
inventory drift와 별도 승인이
필요한 항목을 구분해 보고해줘. 파일과 전역 설정은 변경하지 마.
```

### 3단계 — 개발환경 정의

```text
`.ai/workflows/project-environment.md` 절차로 <프로젝트 한 줄 설명> 프로젝트의
개발환경을 정의해줘.
- 실행 프로파일: <token-aware | full>
- 확정된 스택: <언어·framework·database·배포 provider, 모르면 TBD>
결정이 필요한 값은 추측하지 말고 질문해줘. 결과는 docs/development-environment.md로
작성해줘.
```

### 4단계 — 설치 승인

```text
bootstrap preview 결과를 검토했습니다. 다음을 승인합니다.
- upstream clone에 scripts/bootstrap security-tools 실행
- 검토한 dependency bootstrap profile에 대해 scripts/bootstrap dependencies apply <절대 경로> --offline --approve 실행
lockfile에 없는 package 추가나 버전 변경은 별도 승인 전에 하지 마.
```

### 5단계 — 검증

```text
scripts/validate <절대 경로>를 실행하고 실패 항목을 원인과 함께 보고해줘.
온라인 취약점 audit(--online-audit)도 승인하니 이어서 실행해줘.
```

### 6단계 — Git hook 활성화

```text
확정된 개발환경의 format·lint·test 명령이 모두 통과하는지 먼저 확인하고, 통과한
경우에만 해당 프로파일의 Git hook을 활성화해줘. 실패하면 활성화하지 말고 보고해줘.
```

### 7단계 — CI·배포 (배포하는 프로젝트만)

```text
`.ai/workflows/ci-deployment.md` 계약으로 CI를 구성해줘. 배포 provider는 <TBD>이고,
Production 배포와 URL 공개 범위는 별도 승인 전에 진행하지 마.
```

### 8단계 — 제품 개발

```text
실제 환경 구현 완료가 확인된 경우에만 승인된 환경에서 <기능 요구>를 구현해줘. 범위·인수 조건은 `.ai/prompts/change-request.md`
템플릿으로 전달합니다.
```

## 완료 조건

[유지보수와 도입 모델](adoption-and-maintenance-model.md#2-downstream-adoption)의
Downstream adoption 완료 조건을 그대로 적용한다. 요약하면: clean clone 재현 가능, 전역 설정
무변경, upstream 버전·override·rollback 기록, 공통 gate와 프로젝트 gate 모두 통과. 여기에
더해 [피드백 기록 계약](upstream-feedback-log.md)에 따른 upstream 수정 필요 사항 기록이
있어야 한다(발견 0건 완주 제외).

Pilot의 설계 검증 완료 판정은 별도다. 참여 maintainer를 포함해 등록된 모든 tester의 배정 필수 항목이
전부 `PASS`여야 하며 `FAIL`, `BLOCKED`, `NOT-RUN`, 증거 누락 또는 미검증이 하나라도 있으면 진행 중이다.

## 자주 하는 실수

- 조직 비밀·내부 endpoint·개인정보를 public upstream issue나 Eval 결과로 전송한다. → 사내
  policy와 proprietary skill은 upstream 코어 밖 organization 계층에 분리한다.
- `.env*` 파일을 AI에게 읽히거나 생성시킨다. → 금지. 비밀 없는 schema 문서를 쓴다.
- backend-only로 시작한 뒤 frontend를 파일 복사로 추가한다. → 증분 전환은
  [Stack 진화](adoption-and-maintenance-model.md#downstream-저장소의-stack-진화) 절차로
  inventory·CodeSight·hook·CI 경계를 재계산한다.
- pilot에서 이미 확인된 함정(TypeScript·ESLint peer 충돌, pnpm 11 override 위치, Gitleaks
  생성물 오탐 등)을 다시 밟는다. →
  [pilot 적용 규칙](adoption-and-maintenance-model.md#downstream-pilot에서-확인한-적용-규칙)을
  먼저 읽는다.

## 추적성

- 관련 요구사항: REQ-001~008, REQ-027, REQ-033~038, REQ-042, REQ-045~046
- 관련 문서: [유지보수와 도입 모델](adoption-and-maintenance-model.md),
  [프로젝트 개발환경 정의](project-environment-definition.md),
  [공급망 보안](supply-chain-security.md), [Human-in-the-loop](human-in-the-loop.md)
