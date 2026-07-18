# Web service Production readiness workflow

## 적용 조건

public 웹·앱 출시, Production 배포, 인증·개인정보·DB·결제·광고·위치·사용자 제공 AI 또는 paid API
도입 전에 실행한다.

## 절차

1. 프로젝트 초기 설정에서 법률·개인정보 검토, retention·파기 정책과 다중 인스턴스 rate-limit의
   owner·결정 기한·evidence를 질문한다. 답이 없으면 `docs/templates/production-readiness.json`의
   `TBD`를 유지하고 Production을 차단한다.
2. `docs/web-service-production-readiness.md`의 feature applicability를 `yes | no | TBD`로 작성한다.
3. data inventory·flow, authorization matrix, retention matrix, external API와 비용 경계를 작성한다.
4. `TBD`가 구현·법률·Production 결과를 바꾸면 사용자·법률·개인정보 책임자에게 질문한다.
5. secret·bundle·log, admin·BOLA, rate limit·quota, DB exposure·least privilege, password hashing,
   backup restore, 외부 API failure, 시간·금액 boundary를 test·scanner·review로 검증한다.
6. 개인정보처리방침·동의·위탁·국외이전·보존·파기·사업자 표시와 실제 data flow의 일치를 확인한다.
   구조화된 claim에는 `docs/schemas/policy-evidence.schema.json`을 적용하고
   `scripts/validate-policy-evidence.mjs`로 owner 승인 범위, 실제 service·region·data category,
   server/database/provider enforcement와 반증 가능한 evidence 연결을 검증한다. 이 PASS는 법률
   결론이나 `productionApproval`을 생성하지 않는다.
7. 법령 시행일과 공식 지침을 배포 시점에 다시 확인한다. 제재 숫자는 gate의 근거로 사용하지 않는다.
8. 미검증 고위험 항목과 적용되는 법률의 `TBD`가 있으면 Production을 default-deny한다.
9. provider backup을 Production과 다른 장애 경계에 restore하고 RPO·RTO·무결성 evidence를 기록한다.
   logical restore나 backup 생성 성공만으로 이 gate를 통과시키지 않는다.
10. 사람이 evidence를 검토해 `productionApproval`을 기록한 뒤
    `node scripts/validate-production-readiness.mjs PROFILE --expect-ready`를 통과해야
    Preview·Production·rollback을 진행하고 evidence와 재검토 날짜를 HANDOFF에 기록한다.

기존 운영 project의 문서가 누락된 경우 `scripts/bootstrap readiness <target>`은 blocked template만
최초 생성한다. 기존 profile이 있으면 실패하며, 기존 정책을 자동 덮어쓰거나 `TBD`를 추측해 채우지 않는다.
schema v1 profile도 자동 migration하지 않는다. schema v2 diff를 사람이 검토해 기존 결정을 보존하면서
구조화된 evidence를 추가해야 하며, 그 전에는 Production gate가 실패한다.

## 금지

- UUID, 숨겨진 URL이나 frontend permission을 server authorization 대체로 사용하지 않는다.
- 삭제 요청을 근거 없이 일괄 soft delete 또는 즉시 물리 삭제로 처리하지 않는다.
- backup 생성 성공을 restore 성공으로 보고하지 않는다.
- 실제 password·token·개인정보를 test fixture, log, prompt나 문서에 넣지 않는다.
- 게시물의 벌금·과태료·과징금 또는 시행 예정 법령을 현재 확정 의무로 복사하지 않는다.
