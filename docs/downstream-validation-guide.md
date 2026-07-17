# Downstream 검증 가이드

상태: 설계 승인

단독 maintainer 또는 독립 tester가 downstream 도입을 처음부터 수행해, 공통 환경이 저장소의 문서와
승인된 자동화만으로 동작하는지 검증하는 절차다. upstream을 만들지 않은 tester의 blind onboarding은
더 강한 이식성 증거지만 참여 자격의 필수 조건은 아니다. 제품을 만들기 위한 도입은
[Downstream 시작 가이드](downstream-getting-started.md)를 따른다 — 이 문서는 같은 절차를
**검증 관점**으로 수행할 때의 전제, 판정 기준, 기록 의무를 추가로 정의한다.

## 전제

- 단독 maintainer는 tester·coordinator·maintainer 역할을 기록하고 별도 clean self-review trial을
  수행한다. 여러 사람이 참여하면 다른 reviewer가 증거를 확인한다.
- blind onboarding tester는 작성자에게 구두로 묻지 않는다. 답이 저장소 안 문서에 없으면 그 자체를
  [피드백 기록 계약](upstream-feedback-log.md)에 따라 기록하고, 합리적 추측으로 진행하되
  추측했다는 사실도 entry에 남긴다.
- 검증용 downstream 프로젝트는 제품이 아니다. 선택한 스택의 bootstrap·보안·품질·CI 경로를
  확인할 수 있는 최소 기능만 만든다(기존 pilot 원칙과 동일).
- 현재 검증된 조합은 README의 "검증 범위" 절에 있다. 그 밖의 스택을 고르면 하네스 결함과
  미지원 스택 문제가 섞이므로, **1차 검증은 검증된 조합으로, 스택 중립성 검증은 별도
  회차로** 나눈다.
- 참여 maintainer·tester 명단, 배정 필수 matrix와 upstream SHA를 시작 전에 고정한다. 완료 판정은
  [Downstream Pilot 검증](distributed-pilot-testing-guide.md)의 전원 PASS 계약을 따른다.

## 준비물

- Git, Node.js(스크립트 실행용), 인터넷이 승인된 격리 작업 공간
- 검증에 사용할 AI 도구 최소 1개. 특정 제품으로 제한하지 않으며 provider·tool/surface·tool version·
  model 표시명/ID·mode/profile·adapter·권한·evidence level을 기록한다.
- 빈 downstream 저장소를 만들 별도 디렉터리 (upstream clone 내부가 아닌 곳)

## 절차

### 0. 기록 파일부터 만든다

downstream 저장소를 만들자마자 pilot 결과와 `docs/upstream-feedback.md`를 생성한다. AI provenance와
결과 형식은 [Downstream Pilot 검증](distributed-pilot-testing-guide.md), finding 형식은
[피드백 기록 계약](upstream-feedback-log.md)을 따른다. 이후 모든 단계에서 막히거나,
문서와 실제가 다르거나, 추측이 필요했던 순간을 **그 자리에서** entry로 남긴다.

### 1. 무맥락 진입 테스트

upstream을 clean clone한 뒤, 사전 지식 없이 `README.md`만 읽고 다음 질문에 답해 본다.

- 지금 해야 할 일이 downstream 도입이라는 것과, 어느 문서를 따라야 하는지 찾을 수 있는가?
- 어떤 release를 선택해야 하는지, checksum을 어디서 대조하는지 알 수 있는가?

5분 안에 답을 찾지 못한 질문은 각각 문서 격차 entry가 된다.

### 2. 시작 가이드를 문자 그대로 수행

[Downstream 시작 가이드](downstream-getting-started.md)의 1~7단계를 수행한다. placeholder·선택 stack·
승인 범위는 tester 값으로 채우되 안전 조건과 순서를 약화하지 않는다. 검증 관점에서 각 단계에
추가로 확인할 것:

| 단계 | 검증 확인 항목 |
|---|---|
| 1. 버전 고정 | release archive의 SHA-256이 release note 값과 일치하는가. `upstream.lock`이 실제로 생성됐는가 |
| 2. 읽기 전용 진단 | `scripts/bootstrap preview <downstream>` 전후로 대상 `git status`와 전역 설정이 정말 무변경인가 |
| 3. 개발환경 정의 | AI가 결정을 추측하지 않고 질문했는가. 산출물이 `docs/development-environment.md`로 생성됐는가 |
| 4. 설치 | 지원 stack인가. network 승인 없이 설치가 거부되는가(negative). 승인 후 lockfile·strict peer가 강제되는가 |
| 5. 검증 | `scripts/validate <경로>`가 통과하는가. 일부러 exact version을 floating으로 바꿨을 때 실패하는가(negative) |
| 6. hook 활성화 | 품질 명령이 통과하기 전에는 hook이 활성화되지 않는가 |
| 7. CI·배포 | 배정된 범위의 CI·Preview와 rollback이 PASS하는가. Production·URL 공개가 승인 없이 진행되지 않는가 |

### 3. 보안 gate negative 테스트

gate는 통과가 아니라 **차단**이 정상 동작인 경우가 있다. 실제 비밀·사용자 파일·production 자원을
대상으로 하지 않고, 격리된 임시 저장소와 synthetic 입력을 hook·grader에 전달한다. fixture 전후의
파일·Git·DB 상태 불변과 cleanup을 검사하며 차단되지 않으면 blocker entry다.

- `.env*` 파일을 만들거나 읽지 않고, 민감 경로 문자열을 포함한 synthetic tool-call 입력
- 임시 fixture 경로를 대상으로 한 재귀·강제 삭제 또는 이력 파괴형 Git 명령 문자열
- 실제 server에 연결하지 않은 미승인 MCP manifest·tool-call fixture
- 임시 복제본의 보호 경로를 대상으로 한 write/edit tool-call fixture

각 항목은 "synthetic 입력 → 차단 메시지 원문(익명화) → 상태 불변 → cleanup → 판정"으로 기록한다. 오탐도 기록 대상이다 —
정상 작업(예: 문서에 보호 경로 문자열을 인용)이 차단되면 그것도 entry다.

### 4. 결과 판정

각 단계와 배정 필수 항목을 다음 네 값으로 판정해 downstream 저장소에 결과표로 남긴다.

- **PASS**: 관찰 가능한 기대 결과와 필수 증거가 일치
- **FAIL**: 기대 결과 불일치
- **BLOCKED**: 권한·환경·미구현 기능 때문에 판정 불가
- **NOT-RUN**: 실행하지 않음

finding은 gate 결과와 별도로 기록한다. 문서 격차가 있어도 필수 outcome과 증거가 충족되면 해당 gate는
PASS일 수 있지만, 필수 동작을 우회했거나 증거가 없으면 PASS로 낮추지 않는다.

설계 검증 완료는 참여 maintainer를 포함한 등록된 모든 tester의 배정 필수 항목이 전부 PASS인 경우뿐이다.
FAIL·BLOCKED·NOT-RUN·증거 누락·미검증이 하나라도 있으면 진행 중이며 일부 성공이나 다수결로 대체하지
않는다. 발견 0건을 포함해 `docs/upstream-feedback.md`에 결과를 명시한다.

### 5. Upstream 환류

검증 종료 후 entry들을 [피드백 기록 계약](upstream-feedback-log.md)의 제출 경로에 따라
일반화·익명화해 upstream 후보로 제출한다. tester는 실행 중인 trial의 upstream 기준을 직접 고치지
않는다. trial 종료 후 upstream maintainer가 별도 branch·maintenance 모드
([유지보수와 도입 모델](adoption-and-maintenance-model.md))에서 수정한다. 같은 사람이 두 역할을
맡더라도 commit과 trial 경계를 분리한다.

## 하지 말 것

- 막힌 지점을 작성자에게 물어 해결하고 기록 없이 넘어간다 → 검증 무효. 그 질문이 데이터다.
- upstream clone 안에서 downstream 프로젝트를 만든다 → 별도 저장소가 계약이다.
- 결함을 발견하고 materialize된 공통 파일을 고쳐서 진행한다 → workaround는 프로젝트
  override 계층에 두고 entry로 남긴다.
- 검증용 제품 기능을 키운다 → 하네스 검증보다 제품 개발이 커지면 pilot 원칙 위반이다.

## 추적성

- 관련 요구사항: REQ-001~008, REQ-033~038, REQ-042, REQ-045~046
- 관련 문서: [Downstream 시작 가이드](downstream-getting-started.md),
  [Upstream 피드백 기록 계약](upstream-feedback-log.md),
  [유지보수와 도입 모델](adoption-and-maintenance-model.md),
  [Upstream–Downstream 아키텍처](upstream-downstream-architecture.md),
  [Downstream Pilot 검증](distributed-pilot-testing-guide.md)
