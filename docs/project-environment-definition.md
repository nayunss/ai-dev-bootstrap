# 프로젝트 개발환경 정의

상태: 제안

## 결론

공통 하네스는 보안, 품질, 접근성, 작업 절차와 검증 방식을 제공한다. 프레임워크와 데이터베이스
같은 기술 선택은 프로젝트마다 다르므로 **자동 감지 → 차이 확인 → 필요한 질문 → 문서 확정 →
설정 검증** 순서로 결정한다.

개발환경 정의 문서가 이미 있으면 이를 먼저 읽고 실제 저장소 설정과 대조한다. 문서가 없으면
AI가 질문을 통해 `docs/development-environment.md` 초안을 만들고 사용자가 확인하게 한다.

확정된 언어와 파일 유형에 맞춰 project-local `.editorconfig`를 생성하거나 검증한다. 상위·개인
설정 상속을 막기 위해 `root = true`를 사용하고, formatter·linter와 들여쓰기·줄바꿈 규칙이
충돌하면 hook 활성화 전에 하나의 프로젝트 기준으로 정리한다.

## 결정 흐름

1. root와 승인된 하위 경계의 `package.json`, lockfile, 빌드 파일, 컨테이너, CI와 배포 설정을 읽어
   application 목록과 기존 환경을 감지한다.
2. 감지한 값과 출처를 제시하고 충돌·누락·낡은 문서만 표시한다.
3. 프로젝트 유형과 사용 환경을 먼저 확인한다.
4. 구현을 막는 핵심 항목부터 한 번에 소수의 질문으로 확정한다.
5. 보안·비용·운영 데이터에 영향을 주는 결정은 명시적 승인을 받는다.
6. 정확한 버전과 결정 근거를 문서, manifest, lockfile과 ADR에 기록한다.
7. 실제 format·lint·typecheck·test 명령을 검증한 뒤 기술 스택에 맞는 Git hook을 선택한다.
8. 로컬 검증과 CI에서 문서와 실제 설정의 일치 여부를 확인한다.

## 최초 구성과 점진적 Stack 확장

### 최초부터 Full-stack인 경우

frontend·backend가 처음부터 요구되면 한 번의 계획에서 둘 다 질문하고 적용한다. 그러나 하나의
runtime이나 package manager로 합치지 않고 application별 경계를 유지한다.

1. frontend·backend 경로와 shared 영역을 먼저 확정한다.
2. 각 application의 runtime, framework, dependency, quality·test 명령과 배포 service를 독립 기록한다.
3. API contract, 인증·cookie·CORS·CSRF, private network와 통합 E2E처럼 경계를 넘는 항목을 별도 확정한다.
4. root EditorConfig·AI adapter·CodeSight·security-check와 application별 formatter·linter·hook을 함께
   materialize한다.
5. CI의 frontend·backend 독립 job과 필요한 contract·E2E job이 모두 통과해야 완료한다.

### Backend 또는 Frontend로 시작해 나중에 확장하는 경우

새 application이 추가되면 개발환경 정의를 다시 실행하되 기존 application을 재생성하지 않는다.

1. 이전 `docs/development-environment.md`, manifest, lockfile, CI와 배포 상태를 baseline으로 고정한다.
2. 새 application root와 manifest를 감지하고 “새 stack 추가” diff를 사용자에게 표시한다.
3. 새 dependency·hook·browser·배포 provider만 별도 공급망 심사와 승인을 받는다.
4. 공통 계층(EditorConfig, CodeSight, AI adapter, security, HANDOFF)에서 새 파일 유형과 경로가 포함되는지
   재검증한다.
5. application별 format·lint·typecheck·test 명령이 실제로 통과한 뒤 hook과 CI를 확장한다.
6. 기존 backend migration·version·production 설정이 새 frontend 추가로 변경되지 않았는지 확인한다.
7. Preview에서 새·기존 application의 조합을 검증하고 승인 후 Production을 적용한다.

개발환경 문서에는 최소한 다음과 같은 기계 판독 가능한 application inventory가 필요하다.

```json
{
  "applications": [
    {
      "id": "backend",
      "root": ".",
      "type": "backend",
      "manifest": "pom.xml",
      "quality": ["./mvnw test", "./mvnw -Pintegration verify"],
      "ci": ".github/workflows/ci.yml",
      "deploy": "railway.json",
      "hook": "not-applicable"
    },
    {
      "id": "frontend",
      "root": "frontend",
      "type": "frontend",
      "manifest": "frontend/package.json",
      "quality": ["pnpm verify", "pnpm test:e2e"],
      "ci": ".github/workflows/ci.yml",
      "deploy": "frontend/railway.json",
      "hook": "required"
    }
  ],
  "shared": {
    "codeSight": "required"
  }
}
```

새 manifest가 inventory에 없거나 inventory application의 quality·CI·deploy adapter가 없으면 validator는
구성이 완료되지 않은 drift로 보고해야 한다. `hook`은 `required | not-approved | not-applicable` 중
하나이며, `not-approved`는 설치 완료가 아니라 Human-in-the-loop 대기 상태다. 다중 application 저장소는
`scripts/bootstrap preview /absolute/path/to/project`로 감지 결과와 미선언 manifest를 먼저 확인한다.

질문에 답이 없더라도 안전한 문서 작업은 계속할 수 있다. 다만 결과가 크게 달라지는 값을
임의로 선택하거나 의존성을 설치하지 않고 `TBD`로 남긴다.

## 질문 카탈로그

모든 질문을 매번 제시하지 않는다. 자동 감지할 수 없고 현재 작업에 필요한 항목만 선택한다.
아래 목록은 닫힌 schema가 아니다. 사용자가 프로젝트에 필요한 추가 스펙을 제시하면 같은 감지·승인·
기록·검증 절차로 확장한다.

### 프로젝트 공통

- 목적, 사용자, 프로젝트 유형: 프론트엔드, 백엔드, 풀스택, API, 라이브러리
- 저장소 형태: 단일 앱, 모노레포, 패키지·서비스 경계
- 언어, 런타임, 패키지·빌드 관리자와 정확한 버전
- 개발 운영체제, 컨테이너 사용 여부와 로컬 실행 명령
- 환경 구분: local, test, staging, production
- CI 제공자, 배포 대상, 릴리스·롤백 방식
- 지원 기간, 업데이트 정책, 호환성·마이그레이션 제약

### 프론트엔드

- 프레임워크와 렌더링: CSR, SSR, SSG, ISR, edge
- 라우팅, 서버 상태와 클라이언트 상태의 소유권
- 상태 관리 도구와 전역 상태를 허용하는 기준
- CSS 방식, 디자인 시스템, 토큰과 반응형 기준
- 폼, 데이터 검증, API client와 오류 처리
- 단위·컴포넌트·통합·E2E·시각 회귀 테스트 범위
- 지원 브라우저, 버전, 기기, viewport와 입력 방식
- WCAG 목표, 키보드·스크린 리더 시험 범위
- 국제화, locale, 시간대와 RTL 필요 여부
- 성능 예산과 Core Web Vitals 목표

### 백엔드

- 언어, 프레임워크, 런타임과 빌드 도구
- API 방식: REST, GraphQL, gRPC, event와 계약 관리
- API contract: OpenAPI·GraphQL schema·protobuf·AsyncAPI, contract-first/code-first와 source of truth
- API 문서·SDK: Swagger UI·ReDoc·Scalar·generated client, versioning·deprecation·breaking-change gate
- 데이터베이스 종류·버전, ORM·query 도구와 마이그레이션 방식
- 트랜잭션 경계, 일관성, idempotency와 동시성 정책
- 인증·인가, 세션·토큰, 사용자·서비스 신원 경계
- 메시지 큐, scheduler, 비동기 작업과 재시도 정책
- 캐시, 검색, 파일·object storage와 외부 서비스 연동
- 입력 검증, 오류 계약, rate limit과 abuse 방어
- 로그, metric, trace, health check와 alert 기준
- schema·docs UI의 environment별 공개 범위, authentication, `Try it out`과 external asset 정책
- 백업·복구 목표, 데이터 보존·삭제와 장애 대응

### 데이터·보안·운영

- 개인정보, 민감정보, 결제정보와 규제 대상 데이터의 분류
- 비밀 저장소, 키 회전, 개발·운영 자격증명 분리
- 데이터 저장 지역, 외부 전송과 third-party processor
- 네트워크 경계, 허용된 endpoint와 egress 정책
- SAST, secret scan, dependency·container scan과 SBOM
- SLO, RTO, RPO, 용량·비용 한도와 운영 책임자
- 운영 접근·배포 승인, 감사 로그와 incident response
- admin·tenant·object authorization과 paid API rate limit·quota·spending cap
- 아동·국외이전·위탁·위치·광고·전자상거래·subscription·사용자 제공 AI 기능의 적용 여부
- data retention·파기·legal hold, backup RPO·RTO와 restore rehearsal
- instant·local time·timezone과 currency·rounding policy

이 영역은 편리한 기본값으로 확정하지 않는다. 사용자 승인 전에는 운영 자격증명 연결,
외부 데이터 전송, production migration 또는 배포를 수행하지 않는다.
웹서비스 Production 준비는 [운영·배포 안전 및 법적 준비 가이드](web-service-production-readiness.md)를
함께 적용한다.
API project는 [API 계약과 문서화 프로파일](api-contract-documentation.md)의 framework·contract·
문서 UI 분리 질문과 production exposure gate를 함께 적용한다.

### 사용자 정의 스펙

기본 카탈로그에 없는 항목도 `customSpecifications` 또는 의미에 맞는 새 section으로 추가한다.

```yaml
customSpecifications:
  - category: runtime | framework | datastore | protocol | infrastructure | quality | other
    name: <user-selected-name>
    versionPolicy: <exact-or-reviewed-policy>
    source: <manifest-doc-or-user-decision>
    install: USER_CONFIRMATION_REQUIRED
    permissions: []
    network: []
    telemetry: unknown
    compatibility: []
    validation: []
    rollback: TBD
```

필드를 추가할 수는 있지만 비밀 값은 저장하지 않는다. 설치 대상이면 source·license·integrity·
telemetry·lifecycle·권한을 심사하고 정확한 변경 preview를 승인받는다. validator는 알 수 없는 스펙을
무시하지 않고 검증 adapter가 필요한 확장 항목으로 보고하되 자동 삭제하지 않는다.

## 버전 정책

`Next.js latest`는 “새 프로젝트를 만들 때 현재 안정 버전을 검토한다”는 정책이다. 재현 가능한
환경 정의에는 검토 날짜와 실제 선택 버전을 기록한다.

```yaml
versionPolicy:
  intent: latest-stable
  resolvedAt: YYYY-MM-DD
  updateStrategy: reviewed

frontend:
  framework:
    name: next
    version: "<exact-version>"
    source: package.json
```

- 애플리케이션 의존성은 lockfile로 고정한다.
- Node.js, Java 같은 런타임은 프로젝트 파일과 CI에서 같은 버전을 사용한다.
- 브라우저 범위는 `latest`만 쓰지 않고 Browserslist 또는 명시적인 최소 버전·시험 매트릭스로
  표현한다.
- 버전을 올릴 때 release note, 보안 공지, 호환성, migration과 rollback을 검토한다.

## 확정 문서 형식

각 프로젝트의 `docs/development-environment.md`에는 최소한 다음 내용을 둔다.

```markdown
# 개발환경

- 상태: draft | approved | superseded
- 확인일: YYYY-MM-DD
- 책임자: <team-or-owner>

## 프로젝트 범위
## 저장소와 로컬 실행
## 프론트엔드
## 백엔드
## 데이터와 외부 서비스
## 테스트와 품질 게이트
## 지원 브라우저·기기·접근성
## 보안과 비밀 관리
## CI·배포·관측성
## 정확한 버전과 버전 정책
## TBD와 사용자 확인 필요 항목
## 관련 ADR
```

기술을 선택한 이유나 대안 비교가 중요하면 `docs/decisions/ADR-NNN-*.md`로 분리한다. 문서에는
비밀 값, 운영 접속 문자열과 개인정보를 기록하지 않는다.

## 예시 프로파일

다음은 정답이나 기본 설치 목록이 아니라 질문을 통해 확정할 수 있는 예시다. frontend·backend 모두
다른 언어와 framework로 대체하거나 사용하지 않을 수 있다.

```yaml
frontend:
  framework: { name: next, version: "<exact-version>" }
  state: { name: zustand, version: "<exact-version>", scope: client-only }
  styling: { name: tailwindcss, version: "<exact-version>" }
  test:
    unit: vitest
    e2e: TBD
  browsers:
    policy: "Chrome stable and one previous major"

backend:
  framework: { name: spring-boot, version: "<exact-version>" }
  runtime: { name: java, version: "<exact-version>" }
  database: { name: postgresql, version: "<exact-version>" }
  migration: TBD
  authentication: USER_CONFIRMATION_REQUIRED
```

## AI 실행 규칙

- 신규 프로젝트를 만들기 전에 이 문서의 결정 흐름을 따른다.
- 기존 파일에서 확인한 내용을 다시 질문하지 말고 감지 결과만 확인받는다.
- 특정 라이브러리를 추천하거나 설치할 때 유지보수 상태, 라이선스, 텔레메트리, 취약점과
  공급망 심사를 먼저 수행한다.
- 승인되지 않은 `TBD`를 구현 편의를 위해 임의로 확정하지 않는다.
- 결정 후 `HANDOFF.md`에 확정값, 남은 `TBD`, 관련 문서와 검증 결과를 요약한다.
- 개발환경 승인 전에는 Husky나 다른 hook manager를 선행 설치하지 않는다.

## 추적성

- 관련 요구사항: REQ-007, REQ-020, REQ-021, REQ-037, REQ-045
- 관련 문서: [하네스 구성](harness.md), [권장 아키텍처](architecture.md),
  [공급망 보안](supply-chain-security.md), [SDLC](sdlc.md)
