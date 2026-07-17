# 웹서비스 운영·배포 안전 및 법적 준비 가이드

상태: 설계 승인
검토 기준일: 2026-07-12 Asia/Seoul

## 목적과 한계

웹서비스 출시 전 보안, 개인정보, 데이터, 운영과 대한민국 법률 검토가 누락되지 않도록 공통 질문과
gate를 제공한다. 프로젝트의 기능, 사업자 지위, 사용자, 데이터, 국가, 결제·광고·위치·AI 제공 방식에
따라 적용 법률이 달라진다. 이 문서는 법률 자문이 아니며 법적 의무와 제재 금액의 최종 판단은 출시
시점의 법령, 감독기관 지침과 변호사·개인정보 전문가 검토를 따른다.

온라인 게시물의 형량·과태료·과징금 숫자는 법정 상한, 적용 조문, 시행일과 가중·감경 조건이 섞이기
쉽다. 숫자를 CI 판정값으로 고정하지 않고 `법률 적용성 확인 → 기술 통제 → 증거 → 사람 승인`으로
관리한다.

## 제공된 보안 주장 팩트체크

| 주장 | 판정 | 프로젝트에 적용할 통제 |
|---|---|---|
| Git에 secret commit | 타당. 구체적 “1초·3시간·800만원” 사례는 출처 미제공으로 미검증 | secret scanner, push protection, secret manager, 최소 권한·만료·회전·사고 폐기 |
| frontend bundle에 secret 포함 | 타당. 브라우저에 전달된 값은 비밀로 취급할 수 없음 | public identifier와 secret 구분, 서버 측 credential, bundle·source map 검사 |
| `/admin` URL만 숨기기 | 취약 | 서버에서 인증·기능 권한을 매 요청 검사하고 deny-by-default test 수행 |
| 정수 PK 노출 | 그 자체는 취약점 아님 | ID 형식과 무관하게 object-level authorization 적용. UUID는 추측 난이도만 높이며 권한 검사를 대체하지 않음 |
| SMS·인증 API rate limit 없음 | 타당 | user·device·IP·tenant별 limit, quota·budget alert, cooldown, abuse 탐지와 provider spending cap |
| `id`만 바꿔 타인 정보 조회 | 전형적인 BOLA/IDOR | 서버 정책에 따른 객체 소유권·tenant·역할 검사와 horizontal/vertical authorization negative test |
| DB port public exposure | 고위험 misconfiguration | public ingress 기본 차단, private network, firewall/security group allowlist, TLS·최소 권한·audit |
| 보안 update 방치 | 타당. 특정 별칭만으로 위험을 판정하지 않음 | SBOM·dependency inventory, advisory monitoring, 승인된 patch SLA, scripts-off install과 회귀·rollback |
| 비밀번호 평문 저장 | 명백히 부적절 | 검증된 password hashing(예: Argon2id·bcrypt·PBKDF2), unique salt, credential stuffing 방어·MFA |
| API key에 모든 권한 | 고위험 | 목적별 service identity, least privilege scope, 환경 분리, short-lived key, rotation·usage audit |

OWASP는 객체 ID가 정수·UUID·임의 문자열인지와 무관하게 모든 객체 접근 함수에 object-level
authorization이 필요하다고 설명한다. UUID는 보조 통제일 뿐 권한 통제가 아니다.

## 제공된 운영 주장 팩트체크

| 주장 | 판정 | 프로젝트에 적용할 통제 |
|---|---|---|
| DB backup 필요 | 타당하나 backup 존재만으로 부족 | 자동 backup, 암호화·접근통제, RPO/RTO, 별도 계정·지역, 정기 restore rehearsal |
| 삭제는 항상 soft delete | 일반화하면 부정확하고 개인정보 파기 의무와 충돌 가능 | 목적·법적 근거별 retention matrix, 법적 보존 자료 분리·접근 제한, 만료 후 파기·익명화, legal hold |
| frontend 권한 체크만 사용 | 취약 | frontend는 UX용, 최종 인증·객체·기능 권한은 server/API·DB policy에서 강제 |
| 외부 API 실패 미고려 | 타당 | timeout, 제한된 retry·backoff·jitter, idempotency key, outbox/saga·reconciliation, circuit breaker |
| 운영 log 없음 | 운영 위험 | 보안·업무 핵심 event와 correlation ID 기록, alert·retention·access control. password·token·불필요한 개인정보는 기록 금지 |
| 모든 시간을 UTC로 저장 | “instant”에는 유용하지만 모든 시간 데이터에 적용하면 부정확 | instant는 UTC, 사용자 zone은 IANA ID, 생일·영업일·지역 예약 같은 local/floating time은 의미와 zone을 별도 보존 |
| 금액에 float 사용 | 타당 | currency와 minor unit 또는 decimal type, rounding mode·세금·할인 순서·overflow를 domain policy로 고정 |

Soft delete는 복구·감사 편의 기능이지 법적 보존 근거가 아니다. 탈퇴·삭제 요청 데이터는 법적 보존
의무가 있는 항목만 목적별로 분리하고 접근을 제한하며, 근거가 끝나면 실제 파기해야 한다.

## 대한민국 법률 주장 팩트체크

### 대체로 확인된 의무

- 개인정보를 처리하면 개인정보 보호법 제30조에 따른 처리방침 공개와 제29조 안전조치를 검토한다.
- 만 14세 미만 아동의 개인정보를 “동의를 근거로” 처리할 때에는 제22조의2에 따라 법정대리인 동의와
  확인이 필요하다. 모든 회원가입에 동일한 형사처벌이 자동 적용된다는 표현은 부정확하다.
- 개인정보 유출 신고는 민감정보·고유식별정보, 외부 불법 접근, 1천 명 이상 등 법정 조건에 해당하면
  정당한 사유 없이 72시간 이내 신고하는 체계를 준비한다.
- 주민등록번호는 법령상 근거 등 허용 사유 없이 동의만으로 수집할 수 없다.
- 개인정보 처리위탁, 국외 제공·위탁·보관이 실제 발생하면 처리방침, 계약·보호조치와 국외이전의 법적
  근거·고지·동의 요건을 확인한다. 해외 region을 쓴다는 사실만으로 판단을 끝내지 않고 실제 데이터
  흐름과 정보주체 계약을 확인한다.
- 광고성 정보는 수신 동의, 야간 전송의 별도 동의, 광고 표시와 수신거부 방법 등 정보통신망법 제50조
  요건을 campaign별로 검증한다.
- 모바일 접근권한은 서비스에 본질적으로 필요한 권한과 선택 권한을 구분하고 선택 권한 거부만으로
  본질적이지 않은 서비스 전체를 거부하지 않도록 검토한다.
- 전자상거래 사업 범위에 해당하면 사이버몰 사업자 신원·거래조건 표시와 법정 거래기록 보존을
  적용한다. 시행령상 계약·청약철회 및 대금결제·공급 기록은 5년, 소비자 불만·분쟁은 3년,
  표시·광고 기록은 6개월 항목이 있다.
- 위치정보 기능은 개인위치정보사업·위치기반서비스 등 실제 사업 유형을 분류하고 등록·신고, 동의,
  처리방침과 보호조치를 관할 기관에 확인한다. “1인기업은 무조건 개시 후 1개월” 같은 단일 규칙으로
  구현하지 않는다.

### 정정 또는 추가 확인이 필요한 주장

- 처리방침·CPO·접근권한·국외이전 등의 과태료·과징금 상한은 위반 조항과 사업자·매출·행위에 따라
  달라진다. 게시물의 숫자를 그대로 acceptance criterion으로 사용하지 않는다.
- password가 log에 평문으로 남는 것은 안전조치 위반과 유출 위험이 크지만, “항상 과태료 3천만원,
  유출 시 매출 3%”처럼 결과를 단정할 수 없다.
- 탈퇴 정보는 무조건 보관하거나 무조건 즉시 삭제하는 것이 아니라 개인정보 보호법의 목적 달성 후
  파기 원칙과 전자상거래법 등 별도 보존 근거를 함께 적용하고 분리 보관한다.
- 생성형 AI 표시 의무는 모든 “AI를 사용한 개발”에 적용되는 것이 아니다. 인공지능기본법은 2026년
  1월 22일 시행됐으며 인공지능사업자가 제공하는 고영향·생성형 AI와 결과물, 명백성·내부 업무 등
  시행령 예외를 서비스별로 판정해야 한다. 고객 웹사이트 제작 과정에서 AI로 asset을 만든 행위와
  최종 사용자에게 생성형 AI 기능을 제공하는 행위를 구분한다.
- 무료체험 유료전환·정기결제 대금 증액 관련 30일 이내 별도 동의 개정은 2026년 7월 12일 현재
  시행 전이며 2026년 7월 21일 시행 예정 법령이 확인된다. 출시일에 시행 상태와 하위 규정을 다시
  확인한다.

## 프로젝트 적용 프로파일

프로젝트 초기 설정에서 최소한 법률·개인정보 검토, retention·파기 정책과 다중 인스턴스 rate-limit의
책임자·결정 기한·evidence를 질문한다. 즉시 확정할 수 없으면
[`docs/templates/production-readiness.json`](templates/production-readiness.json)을 기반으로 `TBD`를
기록한다. `TBD`는 누락이 아니라 추적되는 blocker이며 Production 전에 반드시 해소한다.
기존 운영 project에 profile이 없으면 `scripts/bootstrap preview <target>`으로 적용성을 확인하고
`scripts/bootstrap readiness <target>`으로 blocked profile을 최초 생성한다. 기존 파일은 보존하며
자동 merge나 overwrite를 하지 않는다.

schema v2 profile은 다음 네 evidence 묶음이 모두 `approved`여야 한다.

| Gate | Production 승인에 필요한 최소 evidence |
|---|---|
| 법률·개인정보 | owner, reviewer, 검토일, 비밀 없는 검토 문서 reference |
| retention·파기 | 정책 owner와 data category별 목적·기간·파기·legal hold·review evidence |
| 다중 instance rate limit | 실제 multi-instance mode, enforcement layer, 2개 이상 instance와 분산 우회 test PASS |
| provider restore | provider backup source와 별도 restore target, 장애 격리 경계, rehearsal 시각, 목표·실측 RPO/RTO, 무결성 PASS |

일반 downstream validation은 blocked profile의 구조적 일관성을 허용하면서 Production 차단 note를
출력한다. 네 evidence 묶음이 모두 충족되어도 `productionApproval`에 approver·승인 시각·reference가
없으면 `productionDecision`은 `blocked`를 유지한다. 사람이 evidence를 검토해 승인을 기록한 뒤에도
배포 승인 gate는 별도로 다음 명령에서 `READY`를 반환해야 한다.

```sh
node scripts/validate-production-readiness.mjs docs/production-readiness.json --expect-ready
```

기존 schema v1 profile은 자동 변환하거나 기존 결정을 덮어쓰지 않는다. schema v2 template과 diff를
검토해 evidence를 직접 이관할 때까지 Production은 차단된다.

개발환경 확정 시 다음 feature flag를 `yes | no | TBD`로 분류한다.

```yaml
productionReadiness:
  publicService: TBD
  authentication: TBD
  adminFunctions: TBD
  personalData: TBD
  childrenUnder14: TBD
  sensitiveOrUniqueIdentifiers: TBD
  overseasTransfer: TBD
  processors: TBD
  locationData: TBD
  marketingMessages: TBD
  ecommerce: TBD
  subscriptionOrRecurringPayment: TBD
  generativeAiProvidedToUsers: TBD
  paidExternalApis: TBD
  database: TBD
```

`yes`인 항목은 아래 evidence owner와 gate를 연결하고 `TBD`는 Production을 차단한다. 법률에 영향을
주는 질문은 비밀이나 실제 개인정보를 요구하지 않는다.

readiness 자동 검사는 최소한 synthetic ready positive, 허용되지 않은 applicability 값, 필수 retention·
파기 누락과 미결정 profile을 승인으로 위조하는 negative fixture를 포함한다. fixture가 PASS해도 실제
프로젝트 profile의 `TBD`를 자동으로 `no`나 `approved`로 바꾸지 않는다.

rate limit과 restore evidence는 적용 경계를 함께 기록한다. 단일 process memory limiter는 다중 instance
방어가 아니며, 같은 ephemeral container의 별도 DB에 수행한 logical restore는 provider backup·계정 또는
region 장애 복구의 증거가 아니다. 각 단계는 별도 PASS/미검증으로 유지한다.

BFF·API gateway를 사용하면 backend의 초과 응답이 최종 client 경계에서도 유지되는지 확인한다.
`429`, 오류 계약, `Retry-After`와 correlation ID는 명시적 allowlist로 전달하고 Authorization·cookie·
내부 topology header는 전달하지 않는다.

Spring Boot + Next.js pilot은 실제 backend limiter·보안 log integration과 별도로, 동일 synthetic login
subject의 제한 전 응답부터 429까지를 BFF route handler에 순서대로 주입하는 CI fixture를 둔다. 이
fixture는 `Retry-After`·correlation ID 보존과 Authorization·Set-Cookie·내부 topology header 비전파를
검사한다. 단일 process와 synthetic upstream을 사용하므로 다중 instance Production rate limit을
증명하지 않는다.

## SDLC Gate

### 요구사항·설계

- data inventory와 flow diagram: 수집, 목적, 저장, 조회, 위탁·국외이전, 보존·파기
- 인증 주체, role·tenant·object authorization matrix
- admin·support·batch·service account의 별도 권한
- API별 rate limit, quota, 금액 상한과 abuse case
- retention matrix와 backup·restore·legal hold·파기 책임자
- 외부 API timeout·idempotency·reconciliation·rollback
- 시간·통화·rounding domain policy

### 구현·테스트

- secret·frontend bundle·source map·log scan
- unauthenticated admin, BOLA/IDOR와 function-level authorization negative test
- rate-limit·quota·concurrency·replay·duplicate request test
- password hashing 설정과 credential stuffing 방어
- DB public exposure·default credential·least privilege 검사
- backup restore rehearsal와 destructive migration dry-run
- external API timeout·partial failure·duplicate callback·reconciliation test
- UTC instant, DST, local date와 currency rounding boundary test

### Production 승인

- 개인정보처리방침·약관·사업자 표시·동의 화면과 실제 data flow 일치
- 위탁·국외이전·location·marketing·children·AI·subscription 적용성의 법률 검토 상태
- secret manager·key scope·rotation, WAF·rate limit·budget alert와 incident owner
- backup restore 결과, log·alert 접근권한과 개인정보 redaction
- CI·SAST·dependency audit·E2E, Preview와 Production rollback evidence

필수 항목이 `TBD`, 실패 또는 미검증이면 Production 배포를 승인하지 않는다.

## 공식 근거

- [개인정보 보호법](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=270351)
- [개인정보보호위원회 개정 안내: 72시간 유출 신고 조건](https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=8868)
- [개인정보 국외 이전 제28조의8](https://www.law.go.kr/LSW/lsInfoP.do?ancNo=19234&ancYd=20230314&ancYnChk=0&chrClsCd=010202&efGubun=Y&efYd=20240315&lsiSeq=248613&nwJoYnInfo=Y)
- [정보통신망법 광고성 정보 제50조](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1025057393)
- [전자상거래법 시행령 거래기록 보존](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0006&lsiSeq=269055&urlMode=lsScJoRltInfoR)
- [전자상거래법 2026년 7월 21일 시행 본문](https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21312&ancYd=20260120&efYd=20260721&lsiSeq=282793)
- [인공지능기본법](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=&chrClsCd=010202&efYd=20260122&lsiSeq=282791&urlMode=lsInfoP)
- [인공지능기본법 시행령](https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260122&lsiSeq=282879)
- [인공지능기본법 지원데스크](https://www.sw.or.kr/AI_act_helpdesk/main.jsp)
- [위치정보 사업 신고·등록 규정](https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000279362)
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
