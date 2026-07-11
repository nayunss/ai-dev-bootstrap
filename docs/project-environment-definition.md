# 프로젝트 개발환경 정의

상태: 제안

## 결론

공통 하네스는 보안, 품질, 접근성, 작업 절차와 검증 방식을 제공한다. 프레임워크와 데이터베이스
같은 기술 선택은 프로젝트마다 다르므로 **자동 감지 → 차이 확인 → 필요한 질문 → 문서 확정 →
설정 검증** 순서로 결정한다.

개발환경 정의 문서가 이미 있으면 이를 먼저 읽고 실제 저장소 설정과 대조한다. 문서가 없으면
AI가 질문을 통해 `docs/development-environment.md` 초안을 만들고 사용자가 확인하게 한다.

## 결정 흐름

1. `package.json`, lockfile, 빌드 파일, 컨테이너, CI와 배포 설정을 읽어 기존 환경을 감지한다.
2. 감지한 값과 출처를 제시하고 충돌·누락·낡은 문서만 표시한다.
3. 프로젝트 유형과 사용 환경을 먼저 확인한다.
4. 구현을 막는 핵심 항목부터 한 번에 소수의 질문으로 확정한다.
5. 보안·비용·운영 데이터에 영향을 주는 결정은 명시적 승인을 받는다.
6. 정확한 버전과 결정 근거를 문서, manifest, lockfile과 ADR에 기록한다.
7. 로컬 검증과 CI에서 문서와 실제 설정의 일치 여부를 확인한다.

질문에 답이 없더라도 안전한 문서 작업은 계속할 수 있다. 다만 결과가 크게 달라지는 값을
임의로 선택하거나 의존성을 설치하지 않고 `TBD`로 남긴다.

## 질문 카탈로그

모든 질문을 매번 제시하지 않는다. 자동 감지할 수 없고 현재 작업에 필요한 항목만 선택한다.

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

- 언어, 프레임워크, JVM·런타임과 빌드 도구
- API 방식: REST, GraphQL, gRPC, event와 계약 관리
- 데이터베이스 종류·버전, ORM·query 도구와 마이그레이션 방식
- 트랜잭션 경계, 일관성, idempotency와 동시성 정책
- 인증·인가, 세션·토큰, 사용자·서비스 신원 경계
- 메시지 큐, scheduler, 비동기 작업과 재시도 정책
- 캐시, 검색, 파일·object storage와 외부 서비스 연동
- 입력 검증, 오류 계약, rate limit과 abuse 방어
- 로그, metric, trace, health check와 alert 기준
- 백업·복구 목표, 데이터 보존·삭제와 장애 대응

### 데이터·보안·운영

- 개인정보, 민감정보, 결제정보와 규제 대상 데이터의 분류
- 비밀 저장소, 키 회전, 개발·운영 자격증명 분리
- 데이터 저장 지역, 외부 전송과 third-party processor
- 네트워크 경계, 허용된 endpoint와 egress 정책
- SAST, secret scan, dependency·container scan과 SBOM
- SLO, RTO, RPO, 용량·비용 한도와 운영 책임자
- 운영 접근·배포 승인, 감사 로그와 incident response

이 영역은 편리한 기본값으로 확정하지 않는다. 사용자 승인 전에는 운영 자격증명 연결,
외부 데이터 전송, production migration 또는 배포를 수행하지 않는다.

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

다음은 정답이나 기본 설치 목록이 아니라 질문을 통해 확정할 수 있는 예시다.

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

## 추적성

- 관련 요구사항: REQ-007, REQ-020, REQ-021
- 관련 문서: [하네스 구성](harness.md), [권장 아키텍처](architecture.md),
  [공급망 보안](supply-chain-security.md), [SDLC](sdlc.md)
