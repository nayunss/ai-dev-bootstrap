# Branch 전략과 Review 승인 계약

상태: 설계 승인
확정일: 2026-07-17
관련 요구사항: `REQ-016`, REQ-019–REQ-021, `REQ-033`, `REQ-035`, `REQ-046`, `REQ-048`

## 결론

Branch 전략과 reviewer 수는 공통 고정값이 아니라 project profile이다. 개인 project, 소규모 팀,
다수 팀·monorepo, 정기 release 제품과 규제 환경은 변경 비용과 위험이 다르므로 팀 규모만으로 전략이나
숫자를 추정하지 않는다.

| Project 상황 | 선택 가능한 전략 예시 | Review 계약 |
|---|---|---|
| 개인 project | `main` + short-lived branch 또는 직접 commit | 일반 변경은 명시적 self-review·CI로 허용 가능 |
| 소규모 팀 | trunk-based + short-lived feature branch | project가 정한 최소 승인과 code owner 역할 |
| 다수 팀·monorepo | trunk-based + path owner 또는 project별 release branch | 영향 application·공통 core owner와 required checks |
| 정기 release 제품 | main/develop 또는 release branch | release manager, QA·security 등 promotion 승인 |
| 규제·고위험 환경 | 승인된 branch model | 실행자·승인자 분리, 조직 정책과 audit |
| 외부 contributor | fork + PR/MR | upstream/fork 분리, maintainer 승인과 secret 차단 |

## 공통 불변 조건

- default/protected branch, branch strategy, merge method와 review policy를 기계 판독 profile에 기록한다.
- 일반 code, dependency·supply chain, security policy, release, Production·DB·파괴적 변경의 승인
  등급을 구분한다.
- 승인 숫자뿐 아니라 필수 역할과 작성자의 self-approval 허용 여부를 기록한다.
- required checks와 사람 review는 서로를 대체하지 않는다.
- 관리자 bypass, emergency merge와 force push는 기본 경로가 아니며 승인·만료·rollback·사후 review를
  audit한다.
- 개인 project의 self-review도 diff, test·security, migration·rollback과 HANDOFF 증거를 남긴다.
- 고위험 변경에 필요한 독립 reviewer를 확보하지 못하면 승인 인원을 낮추지 않고 blocked로 둔다.

## 초기 설정과 Retrofit 질문

1. 개인 또는 팀 project인가. reviewer·code owner 역할은 무엇인가.
2. default branch와 protected branch는 무엇인가.
3. 실제 branch 전략과 release/hotfix 수명주기는 무엇인가.
4. 허용 merge method, branch 삭제와 force push 정책은 무엇인가.
5. 변경 위험 등급별 최소 승인 인원과 필수 역할은 무엇인가.
6. 작성자·bot self-approval과 관리자 bypass를 허용하는가.
7. emergency 변경의 승인, 만료, rollback과 사후 review는 무엇인가.

미응답은 `TBD`로 유지한다. Provider adapter는 profile을 ruleset·protected branch·approval rule로
변환하기 전에 exact diff와 미지원 항목을 보여주고 별도 승인을 받는다.

## 검증 기준

- 개인·소규모 팀·다수 팀·고위험 profile의 상태 검증
- 승인 인원은 충족하지만 security/release/Production 필수 역할이 빠진 false approval 차단
- self-review 허용 범위와 고위험 독립 승인 경계
- failed required check가 사람 승인으로 우회되지 않음
- emergency 예외의 승인·만료·사후 review 누락 차단
- GitHub·GitLab·enterprise adapter의 지원 가능 field와 미지원 field 구분
- GUI·CLI profile과 preview 결과 parity
