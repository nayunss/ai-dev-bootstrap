# SkillOpt 논문 검토와 차용 범위

상태: 검토 완료 — 운영 원칙 조건부 차용, 구현체 미도입

## 검토 대상

- 논문: [SkillOpt: Executive Strategy for Self-Evolving Agent Skills](https://arxiv.org/abs/2605.23904)
- 버전: arXiv:2605.23904v2, 2026-05-25
- 성격: arXiv 사전논문. 동료평가 또는 독립 재현을 확인한 결과로 간주하지 않는다.
- 공개 구현: 논문이 [공식 프로젝트 링크](https://aka.ms/SkillOpt)를 제시하지만, 이 검토는
  구현체 설치·실행이나 공급망 승인을 포함하지 않는다.

## 논문의 핵심 제안

SkillOpt는 모델 가중치를 바꾸지 않고 외부의 작은 `skill` 문서를 최적화한다. 실행 모델과
하네스는 고정하고 별도 optimizer가 성공·실패 trajectory를 분석해 `add`, `delete`, `replace`
형태의 제한된 패치를 제안한다. 후보는 학습에 사용하지 않은 selection split 점수가 **엄격히
상승할 때만** 채택하며, test split은 최종 보고 전까지 잠근다.

주요 안정화 장치는 다음과 같다.

- 한 step의 수정 개수를 제한하는 textual learning rate/edit budget
- 실패뿐 아니라 성공 trajectory도 분석해 이미 잘되는 행동을 보존
- 거절된 수정과 점수 하락 원인을 기억해 같은 실패를 반복하지 않는 buffer
- batch 단위의 빠른 수정과 epoch 단위의 느린 meta 검토 분리
- 배포 시 optimizer를 호출하지 않고 검증된 작은 skill 문서만 사용

저자 실험은 6개 benchmark, 7개 target model과 direct chat·Codex·Claude Code harness를
대상으로 한다. 최종 skill은 379~1,995 token, 승인된 수정은 1~4개였다고 보고한다. 그러나
학습 비용은 실험별 약 20.8M~213.8M token이었고, 점수 1점당 0.6M~46.4M token으로 편차가
크다.

## 근거를 해석할 때의 한계

- 저자 평가이며 독립 재현 결과가 아니다. 논문 본문에서 통계적 유의성 또는 confidence
  interval 보고를 확인하지 못했으므로 작은 점수 차이를 확정적 개선으로 보지 않는다.
- 자동 verifier, exact match, 실행 가능한 검사가 있는 과제에 가장 적합하다. 주관적 UX,
  아키텍처 품질과 안전 판단은 사람 또는 별도로 보정한 evaluator가 필요하다.
- selection split을 반복 조회하면 그 split에도 과적합할 수 있다. strict-improvement gate만으로
  데이터 누수와 반복 선택 편향이 사라지지 않는다.
- 단일 skill 최적화 결과를 이질적인 프로젝트 전체나 다른 모델·하네스에 그대로 일반화할 수
  없다. 논문도 전송 전에 held-out 검증이 필요하다고 명시한다.
- 큰 offline 계산 비용은 반복 사용되는 안정적 skill에는 상각될 수 있지만, 일회성 프로젝트나
  token-aware 환경에는 부적절할 수 있다.
- optimizer가 좋은 점수를 만드는 문구를 찾는 것과 보안·법률·유지보수 요구를 충족하는 것은
  동일하지 않다. 단일 평균 점수로 필수 gate를 상쇄하면 안 된다.

## Upstream에 차용할 결정

| 논문 요소 | 결정 | 이 프로젝트의 적용 |
|---|---|---|
| 모델·하네스를 고정한 skill 비교 | 채택 | 한 실험에서는 target model, tool, harness, fixture를 고정한다. |
| train/selection/test 분리 | 채택 | test는 최종 1회 평가 전 optimizer와 대상 agent가 읽지 못하게 한다. |
| 작은 `add/delete/replace` 수정 | 채택 | 전체 재작성보다 검토 가능한 atomic patch와 edit budget을 사용한다. |
| strict improvement gate | 보강 채택 | 동률은 거절하고 반복 trial·최소 개선폭·회귀·보안 hard gate를 함께 적용한다. |
| 성공·실패 trajectory 분석 | 채택 | 실패 수정과 함께 성공 행동 보존 근거를 기록한다. |
| rejected-edit buffer | 채택 | patch, 점수, 거절 사유를 저장하되 secret·개인정보·원문 전체는 보관하지 않는다. |
| slow/meta update | 조건부 | 지속적인 공통 원칙 후보만 별도 제안하며 runtime skill에 자동 합치지 않는다. |
| 강한 optimizer 사용 | 미기본화 | 비용·데이터 전송·모델 승인을 먼저 받고 동일 Eval로 이점을 입증한다. |
| 자동 skill 자기수정 | 거절 | downstream runtime과 production에서 self-modification을 허용하지 않는다. |
| 공식 구현체 설치 | 보류 | license, dependency, telemetry, network, 권한과 재현성을 공급망 심사한 뒤 별도 승인한다. |

## 공통 Skill Evolution 계약

Skill 변경은 일반 문서 편집이 아니라 다음의 격리된 release workflow로 수행한다.

1. 현재 skill, target model·harness·tool version과 baseline을 고정한다.
2. 비밀과 production 데이터가 없는 `train`, `selection`, `test` fixture를 분리한다.
3. train trajectory에서 일반화 가능한 실패와 보존할 성공 패턴을 찾는다.
4. 한 번에 제한된 atomic patch를 제안하고 중복·모순·scope 침범을 검사한다.
5. selection에서 여러 trial을 실행한다. baseline 대비 사전 정의한 최소 개선폭을 넘고 모든
   security·permission·correctness regression을 통과한 후보만 임시 승인한다.
6. 사람은 diff, 근거, 비용, 거절 기록과 권한 변경 여부를 검토한다. 보안·배포·dependency·DB·
   개인정보 규칙의 변경은 반드시 명시적 승인을 받는다.
7. 잠긴 test를 최종 평가하고 실패하면 배포하지 않는다. test 결과로 같은 후보를 다시 수정하지
   말고 새 version·새 selection protocol로 시작한다.
8. 승인된 skill을 version·checksum·호환 범위와 함께 upstream release에 포함한다. downstream은
   preview와 Human-in-the-loop 승인 후에만 가져온다.

Optimizer와 평가 대상 agent는 grader, fixture, expected outcome, baseline과 승인 기록을 수정할
권한이 없어야 한다. 외부 콘텐츠에 포함된 prompt injection이 영구 skill 규칙으로 승격되지 않게
출처와 신뢰 경계를 기록한다.

## 판정 기준

단순히 selection 점수가 1회 올랐다는 이유로 승인하지 않는다.

- 기능: 여러 trial의 사전 정의한 최소 개선폭과 회귀 없음
- 안전: secret, prompt injection, 파괴적 작업, 권한·HITL grader 전부 통과
- 품질: 관련 lint·type·test, 유지보수성과 불필요한 diff 기준 통과
- 이식성: 지원한다고 표시할 모델·AI tool·harness 조합별 재검증
- 비용: optimization token·비용·latency와 사람 검토량 기록
- 감사: initial/final hash, atomic diff, evaluator version, split ID, 결과와 승인자 기록

`token-aware`는 후보 수·trial·capability 범위를 줄이고 기존 수동 patch를 우선한다. `full`은 더
많은 후보·trial과 transfer Eval을 허용한다. 두 프로파일 모두 잠긴 test와 필수 보안·정확성·HITL
gate를 생략하지 않는다.

## 적용 순서

1. 기존 `.ai/skills` 중 fixture와 결정론적 grader가 있는 skill 하나를 pilot 대상으로 고른다.
2. 자동 optimizer 없이 사람이 작성한 bounded patch로 workflow와 기록 schema부터 검증한다.
3. selection 재사용 편향, prompt injection과 grader tampering negative Eval을 추가한다.
4. 비용 대비 반복 개선 가치가 입증된 경우에만 별도 optimizer 실험을 승인한다.
5. 공식 구현체가 필요해진 경우 공급망 심사와 sandbox 실행을 별도 변경으로 진행한다.

## 결론

이 프로젝트에는 SkillOpt 구현체보다 **bounded patch + 격리된 held-out Eval + 거절 기록 +
승인된 release**라는 운영 원칙이 적합하다. 이는 기존 REQ-025의 Eval과 upstream/downstream 수동
upgrade 경계를 강화한다. 자동 self-evolution은 공통 환경의 재현성과 안전 목표에 맞지 않으므로
기본 기능으로 도입하지 않는다.

## 추적성

- 요구사항: REQ-015, REQ-016, REQ-025, REQ-027, REQ-028, REQ-041
- 관련 문서: [Eval 전략](evaluation-strategy.md), [스킬 체계](skills.md),
  [공급망 보안](supply-chain-security.md), [Human-in-the-loop](human-in-the-loop.md)
- 실행 계약: [Skill evolution workflow](../.ai/workflows/skill-evolution.md)
