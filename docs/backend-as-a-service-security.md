# Supabase·Firebase 보안 가드레일

상태: 설계 승인

## 적용 계약

upstream은 provider별 질문·policy template·emulator test·CI gate를 제공한다. downstream은 실제
데이터, 인증, region, 비용과 운영 책임을 답하고 설정을 승인한다. provider가 선택되지 않으면
SDK, CLI, MCP와 credential을 설치하지 않는다.

## 공통 Human-in-the-loop 질문

- 사용하는 제품: database, auth, storage, functions, realtime, analytics
- local·test·staging·production project와 region
- 개인정보·민감정보·규제 데이터 여부
- browser의 read·write와 user·tenant ownership
- server-only·admin 작업과 credential 보관 위치
- 비용·quota·rate limit·abuse 책임자
- backup, export, retention, user deletion과 recovery 목표
- rules·schema·function·production 배포 승인자

답이 없으면 client SDK 설치, production 연결, rules 배포와 migration을 보류한다.

## Supabase

### Key 경계

- browser에는 publishable key 또는 legacy anon key만 사용한다.
- secret key·legacy `service_role`, DB password와 admin credential은 server secret manager에 둔다.
- `service_role`과 RLS bypass role을 `NEXT_PUBLIC_*`, browser bundle, log, fixture와 AI prompt에
  포함하지 않는다.
- client key의 노출 가능성을 authorization으로 오해하지 않고 RLS를 실제 경계로 사용한다.

### Database·Storage

- exposed schema의 모든 table에 RLS를 활성화한다.
- anon·authenticated와 SELECT·INSERT·UPDATE·DELETE를 개별 검토한다.
- user·tenant ID는 client 입력만 신뢰하지 않고 검증된 JWT claim과 연결한다.
- bucket public 여부와 `storage.objects`의 operation·bucket·`owner_id` policy를 테스트한다.
- migration과 RLS policy를 Git으로 관리하고 local·staging negative test 후 배포한다.

차단 조건: RLS 없는 exposed table, browser의 service credential, 근거 없는 전체 허용 policy,
cross-tenant test 실패, backup·rollback 없는 destructive migration.

공식 근거: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
[API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Firebase

### Key·권한 경계

- Firebase client API key는 project·app 식별용일 수 있지만 Firebase API로 제한한다.
- 데이터 authorization은 API key 은닉이 아니라 Security Rules와 IAM으로 강제한다.
- App Check는 abuse 보조 통제이며 Authentication·Rules를 대체하지 않는다.
- service account, Admin SDK private key와 Gemini Developer API key를 browser·public config에
  포함하지 않는다.

### Rules·Emulator

- Firestore, Realtime Database, Storage마다 사용하는 제품의 Rules를 작성한다.
- default deny에서 필요한 path·operation·identity·field validation만 허용한다.
- emulator에서 owner, non-owner, unauthenticated, malformed data와 privilege escalation의
  allow·deny case를 함께 테스트한다.
- Rules와 index를 Git으로 관리하고 console drift를 검사한다.
- test mode와 만료된 임시 Rules를 production에 배포하지 않는다.

차단 조건: 전체 read·write 허용, Rules test 없는 배포, App Check 미적용 근거 부재, client의
admin credential, staging app의 production project 연결.

공식 근거: [API keys](https://firebase.google.com/docs/projects/api-keys),
[Security Rules](https://firebase.google.com/docs/rules),
[App Check](https://firebase.google.com/docs/app-check).

## 공통 Eval·CI

- client bundle secret scan과 environment 간 project ID·endpoint 교차 연결 검사
- policy·Rules syntax, local emulator와 owner/non-owner positive·negative matrix
- schema·Rules diff의 사람 승인
- production deploy의 preview, backup·rollback과 감사 기록
- 실제 사고를 비밀 없는 synthetic regression fixture로 재현

## Downstream 산출물

- 개발환경 문서: provider, products, environment, region과 데이터 분류
- ADR: 선택 대안, lock-in, 비용, export와 rollback
- Rules·migration과 test, secret 이름만 있는 `.env.example`
- 배포·삭제 Human-in-the-loop 승인 기록

## 추적성

- 관련 요구사항: REQ-006, REQ-015, REQ-016, REQ-020, REQ-021, REQ-025, REQ-029, REQ-030
