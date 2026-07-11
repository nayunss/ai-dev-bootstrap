# Evaluation workflow

## 적용 시점

- 요구사항·실제 실패에서 새 성공 조건이 생길 때
- harness, loop, prompt, skill, model, tool 또는 권한을 바꿀 때
- 버그·보안 사고를 수정하거나 모델·도구를 업그레이드할 때

## 절차

1. 요구사항 ID와 관찰 가능한 outcome을 정의한다.
2. 정상·경계·negative case와 격리 fixture를 만든다.
3. state check와 결정론적 grader를 우선 선택한다.
4. known-good solution으로 task와 grader를 검증한다.
5. 모델, 하네스, 도구, commit과 환경을 고정한다.
6. 비결정적 동작은 여러 trial로 실행한다.
7. regression, capability와 효율 지표를 구분해 판정한다.
8. transcript 표본으로 agent 실패와 grader 결함을 구분한다.
9. regression이면 수정·rollback하고 해당 case를 suite에 유지한다.
10. 결과와 미검증 항목을 `HANDOFF.md`에 기록한다.

## 안전 규칙

- 완료 주장보다 실제 outcome을 우선한다.
- 평가 agent가 grader, 기대값과 baseline을 수정하지 못하게 한다.
- production 자원과 secret을 Eval에 연결하지 않는다.
- 품질·보안 실패를 token·비용 점수와 상쇄하지 않는다.

## 토큰 프로파일

- `token-aware`: 변경 관련 필수 regression subset부터 실행한다.
- `full`: 관련 전체 regression, 추가 trial과 capability Eval을 실행한다.
- 공통 보안·정확성 grader와 실패 보고 기준은 동일하다.
