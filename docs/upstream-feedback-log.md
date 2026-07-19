# Upstream 피드백 기록 계약

상태: 설계 승인

downstream 작업 중 발견한 "upstream에 수정이 필요한 사항"을 기록하는 공통 계약이다.
[제품 도입](bootstrap-user-guide.md)과 [하네스 검증](downstream-validation-guide.md)
두 경우 모두 이 계약을 따른다.

## 원칙

- **기록 위치는 downstream 저장소다.** 각 downstream 저장소의 `docs/upstream-feedback.md`
  한 파일에 누적한다. upstream 저장소에 직접 쓰지 않는다 — upstream 반영은 아래 제출
  경로를 거친다.
- **발견 즉시 기록한다.** 세션이 끝난 뒤 기억으로 재구성하지 않는다. 우회해서 진행했더라도
  우회 자체가 기록 대상이다.
- **모든 발견이 0건으로 완주한 경우가 아닌 한, 피드백 기록 없는 도입·검증은 미완성이다.**
- 발견이 0건이어도 pilot ID, tester, AI provenance와 `findings: none`을 결과에 명시한다. 빈 파일은
  0건 증거가 아니다.
- **downstream에서 upstream 코어를 고치지 않는다.** 결함을 발견해도 materialize된 공통
  파일을 임의 수정하지 말고 기록으로 남긴다. 급한 경우 workaround를 별도 계층(프로젝트
  override)에 두고 그 사실을 entry에 적는다.
- **비밀·내부 정보를 제거한다.** 조직 비밀, 내부 endpoint, 개인정보, proprietary 코드가
  entry에 들어가면 upstream 제출이 불가능해진다. 처음부터 익명화해 적는다.

## Entry 형식

파일 하나에 아래 entry를 시간순으로 누적한다. 필드는 전부 필수이며 해당 없으면 `none`, 확인할 수
없으면 `not-exposed` 또는 `unknown`으로 채운다. AI provenance 전체 schema는
[Downstream Pilot 검증](distributed-pilot-testing-guide.md)을 따른다.

```markdown
## UF-<번호>: <한 줄 제목>

- 날짜: <YYYY-MM-DD, 절대 날짜>
- pilot/trial ID: <FE-001/T1 등>
- tester와 역할: <공개 가능한 식별자 / maintainer·tester·reviewer>
- upstream: <repository, tag/branch, commit SHA, release checksum 또는 not-published>
- downstream: <commit SHA 또는 private reference>
- 요구사항 ID: <REQ 목록>
- AI provenance: <provider, tool/surface·version, model display/ID, mode, adapter, permissions, evidence level>
- 작업 맥락: <제품 도입 | 하네스 검증> / <진행 중이던 단계>
- 유형: <결함 | 문서 격차 | 개선 제안>
- 증상: <무엇이 기대와 달랐는가>
- 재현 절차: <제3자가 clean clone에서 따라 할 수 있는 명령·입력 순서>
- 기대 동작: <문서 또는 상식이 약속한 것>
- 실제 동작: <실제 출력·오류 메시지, 익명화>
- 실행 증거: <명령, exit status, CI·Preview run 또는 state grader>
- 심각도: <blocker: 진행 불가 | major: 우회 필요 | minor: 불편>
- 우회: <적용한 workaround와 그 위치, 없으면 "없음">
- cleanup·rollback: <fixture 제거와 상태 복구 증거>
- 비용: <시간·token·외부 비용 또는 측정 불가 이유>
- 필수 gate 영향: <PASS | FAIL | BLOCKED | NOT-RUN과 이유>
- 상태: <기록됨 | upstream 제출됨(링크) | 반영됨(버전) | 기각됨(사유)>
```

## 무엇이 기록 대상인가

| 대상 | 예 |
|---|---|
| 스크립트·gate 결함 | validate가 통과해야 할 구성을 거부, hook 오탐·미탐 |
| 문서 격차 | 가이드만으로 다음 행동을 결정할 수 없어 질문·추측이 필요했던 지점 |
| 문서-동작 불일치 | 문서가 약속한 출력·순서와 실제 스크립트 동작이 다름 |
| 이식성 문제 | 특정 OS·shell·stack에서만 실패 |
| 개선 제안 | 반복되는 수작업, 더 안전한 기본값 |

제품 코드 자체의 버그는 대상이 아니다 — 그것은 downstream 프로젝트의 이슈 트래커에 둔다.
경계가 모호하면(제품 버그처럼 보이지만 원인이 공통 하네스) 일단 여기 기록하고 유형에 물음표를
남긴다.

finding의 심각도·상태와 pilot gate 결과는 같은 값이 아니다. minor 문서 finding이 있어도 필수 outcome과
증거가 충족되면 gate는 PASS일 수 있다. 반대로 blocker·필수 우회·증거 누락이 있으면 finding을 기록했다는
이유로 PASS 처리하지 않는다. 설계 검증 완료에는 참여 maintainer를 포함한 모든 tester의 필수 gate PASS가
필요하다.

## Upstream 제출 경로

1. entry를 일반화한다: 조직·프로젝트 고유 명칭을 제거하고 synthetic fixture로 재현을 옮긴다.
2. [변경 소유권](adoption-and-maintenance-model.md#변경-소유권) 표에서 기여 가능 여부를
   확인한다. proprietary·비밀 관련이면 일반화한 원칙만 제출한다.
3. upstream issue 또는 PR로 제출하고 entry의 상태를 링크와 함께 갱신한다.
4. upstream release에 반영되면 상태를 `반영됨(버전)`으로 바꾼다. 해당 downstream이 그 버전으로
   upgrade할 때 workaround를 제거한다.

Tester와 upstream maintainer가 같은 사람이어도 실행 중인 trial의 upstream 기준을 즉시 수정하지 않는다.
trial 결과를 먼저 고정하고 별도 branch·maintenance 작업으로 보완한 뒤 새 upstream SHA로 재검증한다.

## Upstream Triage

제출된 finding은 requirements에 그대로 복사하지 않는다. Upstream maintainer는 다음 결과를 기록한다.

- 일반화 가능한 공통 원인
- 중복 finding과 대표 finding
- 구현·완료 판정을 소유하는 primary REQ 하나
- 보강할 기존 REQ 또는 새 REQ
- 구현 상태, 검증 상태와 안정적인 후속 task ID
- 기각·downstream 고유 판정 사유

여러 기존 REQ가 영향을 받아도 finding의 primary REQ는 하나만 둔다. 관련 REQ는 consumer 또는
secondary reference로 연결해 같은 결함을 여러 구현 task가 중복 해결하지 않게 한다. Source review와
synthetic fixture만으로 downstream finding을 `반영됨`이나 `해결`로 바꾸지 않고, 새
release·commit·checksum을 고정한 실제 downstream 재시험 결과를 요구한다.

`env-be`의 첫 공식 triage와 mapping은
[Downstream Feedback 요구사항 Triage](downstream-feedback-requirement-triage.md)를 따른다.

## 추적성

- 관련 문서: [처음부터 끝까지 사용 가이드](bootstrap-user-guide.md),
  [Downstream 검증 가이드](downstream-validation-guide.md),
  [유지보수와 도입 모델](adoption-and-maintenance-model.md),
  [Upstream–Downstream 아키텍처](upstream-downstream-architecture.md),
  [Downstream Pilot 검증](distributed-pilot-testing-guide.md)
