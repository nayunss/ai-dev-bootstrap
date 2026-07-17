# API 계약과 문서화 프로파일

상태: 설계 승인
검토일: 2026-07-12

## 결론

백엔드 project 설정에서는 framework 선택과 API 계약·문서화 선택을 별도 질문한다. FastAPI는 Python
web framework이고, OpenAPI는 언어 중립 HTTP API description standard이며, Swagger는 OpenAPI를
작성·표시·code generation하는 도구 모음이다. 따라서 “Java는 Swagger, Python은 FastAPI”라는
일대일 대응은 정확하지 않다.

- Python backend는 FastAPI, Django, Flask 등 중 project 요구에 맞는 framework를 선택할 수 있다.
- FastAPI를 선택하면 OpenAPI schema와 Swagger UI·ReDoc이 기본 제공되지만 production 공개 정책은
  별도 결정한다.
- Spring Boot는 springdoc-openapi 같은 adapter 후보로 OpenAPI와 Swagger UI를 제공할 수 있다.
- Node.js·NestJS·Go·.NET 등도 각 framework adapter로 같은 OpenAPI contract outcome을 만들 수 있다.

OpenAPI를 모든 backend의 강제 기본값으로 설치하지 않는다. REST/HTTP API이고 consumer·SDK·contract
test·외부 문서화 필요가 있을 때 선택하며 GraphQL은 schema, gRPC는 protobuf, event API는 AsyncAPI 등
실제 protocol의 contract를 사용한다.

## 프로젝트 시작 질문

### API와 소비자

- REST/HTTP, GraphQL, gRPC, event 중 어떤 방식인가?
- consumer는 frontend, mobile, partner, public developer, internal service 중 누구인가?
- contract-first와 code-first 중 어느 방식이며 single source of truth는 무엇인가?
- API versioning, deprecation, backward compatibility와 breaking-change 승인 규칙은 무엇인가?

### 문서 산출물

- machine-readable contract가 필요한가? OpenAPI version은 무엇인가?
- Swagger UI, ReDoc, Scalar, static portal 또는 generated SDK가 필요한가?
- example, error schema, pagination, authentication·authorization scheme와 rate-limit response를 어디까지
  문서화할 것인가?
- contract artifact를 repository에 고정할지 runtime에서 생성할지, drift는 어떻게 검사할 것인가?

### 공개와 보안

- documentation UI와 raw schema를 local·test·staging·production 중 어디에 노출할 것인가?
- production에서는 public, authenticated internal, network-restricted 또는 disabled 중 무엇인가?
- `Try it out`이 production write·admin·paid API를 호출할 수 있는가?
- example·schema·description에 internal hostname, stack trace, secret, 개인정보와 미공개 field가 포함되지
  않는가?
- OAuth client secret, API key와 production credential을 UI config에 넣지 않는가?

## Stack adapter 예시

이 표는 설치 기본값이 아니라 사용자가 stack을 선택한 뒤 심사할 adapter 후보이다.

| Stack | Framework | Contract·문서 adapter 예시 | 기본 확인 endpoint |
|---|---|---|---|
| Python | FastAPI | framework 내장 OpenAPI + Swagger UI + ReDoc | `/openapi.json`, `/docs`, `/redoc` |
| Java | Spring Boot | springdoc-openapi + Swagger UI/Scalar 후보 | `/v3/api-docs`, UI path는 설정값 |
| TypeScript | NestJS | `@nestjs/swagger` 후보 | project 설정값 |
| Node.js | Express/Fastify | schema-first 또는 framework plugin 후보 | project 설정값 |
| .NET | ASP.NET Core | built-in/approved OpenAPI tooling 후보 | project 설정값 |

dependency는 source, exact version, license, checksum·lockfile, telemetry, transitive dependency와 security
advisory를 심사하고 사용자의 설치 승인을 받는다. Springdoc·FastAPI의 문서 예시에 나온 version을 현재
project에 그대로 복사하지 않는다.

공식 근거:

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.0.html)
- [Swagger와 OpenAPI의 차이](https://swagger.io/docs/specification/v3_0/about/)
- [FastAPI OpenAPI와 자동 문서](https://fastapi.tiangolo.com/features/)
- [FastAPI documentation URL 설정](https://fastapi.tiangolo.com/tutorial/metadata/)
- [springdoc-openapi](https://springdoc.org/)

## 구현 원칙

### Contract-first

OpenAPI 등 contract를 먼저 review하고 server stub·client를 생성한다. generated code는 output directory와
regeneration command를 고정하고 사람이 직접 수정하지 않는다. generator exact version과 template
license·provenance를 고정하며 생성물도 secret·license·SAST scan을 통과한다.

### Code-first

framework annotation·type에서 contract를 생성한다. CI는 application을 build해 schema를 생성하고
승인된 baseline과 semantic diff를 비교한다. undocumented endpoint, response·error schema drift와
unapproved breaking change를 실패 처리한다.

두 방식 모두 runtime implementation과 contract가 일치해야 한다. 문서가 build됐다는 사실만으로 API
동작을 증명하지 않으며 contract test와 authentication·authorization negative test를 실행한다.

## Production 보안 기본값

- raw schema와 UI의 production 공개 여부는 Human-in-the-loop 결정이다.
- 필요하지 않으면 production docs UI를 끄고 approved internal environment에서 제공한다.
- 공개해야 하면 authentication 또는 별도 access policy, rate limit, CSP와 dependency update를 적용한다.
- `Try it out`은 production write·delete·admin·paid operation에 기본 비활성화한다.
- schema에 존재하는 endpoint가 실제 server authorization을 대신하지 않는다.
- hidden endpoint는 보안 통제가 아니다. 모든 endpoint에서 server-side authorization을 강제한다.
- FastAPI Swagger UI·ReDoc의 기본 asset은 외부 CDN을 사용할 수 있으므로 production CSP·egress·privacy
  정책에 따라 self-host 또는 approved asset source를 결정한다.

## CI·Eval

- contract syntax·schema validation
- generated contract와 committed baseline의 drift
- backward-compatible change positive fixture와 breaking change negative fixture
- undocumented endpoint와 stale endpoint 탐지
- authentication scheme, standard error, pagination과 required response example 검사
- docs UI에 secret·internal URL·개인정보가 포함되지 않는 fixture
- production profile에서 docs exposure policy와 `Try it out` 제한 검사
- generated SDK/server code의 deterministic regeneration, license·snippet·security scan

Spring Boot + Next.js pilot은 Spring MVC의 실제 project REST operation과 생성 OpenAPI를 대조해
undocumented endpoint를 탐지하고, BFF route handler를 호출해 backend method·path 매핑 drift를 검사한다.
이 fixture는 해당 조합의 근거이며 다른 framework adapter 검증을 대신하지 않는다.

contract diff tool과 generator도 plugin·dependency이므로 공급망 심사와 exact version 승인을 거친다.

## FastAPI deterministic reference adapter

`docs/schemas/fastapi-contract-adapter.schema.json`과
`scripts/fastapi-contract-adapter.mjs`는 FastAPI를 설치·호출하지 않는 OpenAPI 3.0/3.1 reference
검사기다. committed baseline, 현재 generated contract, FastAPI route inventory와 environment별 docs
관측 profile을 입력으로 받는다.

- OpenAPI version·info·operationId·2xx response와 secret-like/internal metadata를 검사한다.
- operation·2xx response·component schema·property 삭제와 새 required parameter를 breaking으로 판정한다.
- route inventory와 contract를 양방향 비교해 undocumented·stale operation을 차단한다.
- Production의 `/openapi.json`, `/docs`, `/redoc`이 disabled/authenticated/network-restricted/
  public-approved 정책과 실제 관측 status에 맞는지 검사한다.
- write operation이 있을 때 Production `Try it out` 활성화와 별도 승인 없는 외부 docs asset host를
  차단한다.

```sh
node scripts/evaluate-fastapi-contract.mjs \
  baseline.openapi.json current.openapi.json routes.json profile.json --expect-pass
```

synthetic PASS는 FastAPI runtime, server-side authorization, 실제 network restriction, CSP 또는
브라우저 UI를 검증한 결과가 아니다. 실제 project에서는 승인된 exact FastAPI version과 생성 schema,
runtime route inventory, 인증 전후 HTTP 응답과 authorization negative E2E를 별도로 제공해야 한다.
