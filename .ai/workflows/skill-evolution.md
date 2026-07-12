# Skill Evolution Workflow

## 목적

공통 skill을 모델의 자유로운 재작성으로 변경하지 않고, 감사 가능한 작은 patch와 격리된 Eval,
Human-in-the-loop 승인을 거쳐 versioned release로 승격한다.

## 기본 정책

- downstream runtime의 자동 self-modification은 금지한다.
- 한 실험 동안 target model, harness, tool과 evaluator를 고정한다.
- optimizer와 대상 agent는 selection/test grader·fixture·expected outcome을 읽거나 수정하지 않는다.
- test split은 최종 판정 전까지 잠그며 test 결과를 같은 후보의 학습 신호로 재사용하지 않는다.
- 보안·권한·정확성 gate는 효율 또는 종합 점수로 상쇄하지 않는다.

## 변경 record

각 후보는 최소한 다음을 기록한다.

```yaml
skillId: example
fromVersion: 1.0.0
candidateId: example-20260712-01
target:
  model: exact-model-version
  harness: exact-harness-version
  tools: exact-tool-manifest-hash
datasets:
  train: immutable-id
  selection: immutable-id
  test: locked-immutable-id
patch:
  operation: add # add | delete | replace
  scope: section-id
  rationale: recurring-failure-pattern
budget:
  maxAtomicEdits: 2
  maxSkillTokens: 2000
evaluation:
  trials: 3
  minimumImprovement: project-defined
  requiredHardGates: [correctness, security, permission, regression]
decision: proposed # proposed | rejected | selected | approved | released
```

실제 trajectory 원문 대신 필요한 최소 failure pattern과 집계 결과를 보관한다. secret, 개인정보,
production 데이터와 외부 콘텐츠의 명령문은 record에 복사하지 않는다.

## 실행

1. baseline과 split ID·hash를 확정한다.
2. 성공·실패 evidence에서 일반화 가능한 변경 하나를 선택한다.
3. edit budget 안에서 `add`, `delete`, `replace` patch를 만든다.
4. 중복, 모순, token budget, 정책 약화와 scope 밖 변경을 정적으로 검사한다.
5. selection trial과 모든 hard gate를 실행한다. 동률, 최소 개선폭 미달 또는 gate 실패는 거절한다.
6. 거절 patch·집계 점수·사유를 기록해 같은 제안을 반복하지 않는다.
7. 선택 후보의 diff와 비용을 사람이 승인한 뒤 잠긴 test를 실행한다.
8. test와 호환 조합별 regression을 통과하면 version·checksum을 발행한다.
9. downstream은 upgrade preview와 별도 승인을 거쳐 적용한다.

보안, dependency, DB, deployment, 개인정보, 네트워크 또는 권한 계약을 바꾸는 patch는 점수와
무관하게 해당 Human-in-the-loop 승인을 먼저 받아야 한다.

## 토큰 프로파일

- `token-aware`: 한 번에 후보 1개, 최소 필수 trial과 관련 regression subset을 사용하고 자동
  optimizer 호출을 기본 비활성화한다.
- `full`: 승인된 비용 한도에서 복수 후보·추가 trial·모델 및 harness transfer Eval을 수행한다.

두 프로파일 모두 immutable split, final test, 필수 hard gate와 사람 승인을 유지한다.

## 참고

이 workflow는 [SkillOpt 논문 검토](../../docs/skillopt-paper-review.md)에서 운영 원칙만 차용했다.
논문 구현체나 특정 optimizer 설치를 요구하지 않는다.
