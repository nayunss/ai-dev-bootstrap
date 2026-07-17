# Evals

AI 개발 하네스와 반복 루프의 capability·regression 평가 자산을 둔다.

```text
evals/
├── tasks/
├── fixtures/
├── graders/
├── rubrics/
├── baselines/
└── results/
```

REQ-041 reference pilot은 `tasks/skill-evolution-bounded-patch.json`과 synthetic fixture,
`scripts/evaluate-skill-evolution.mjs`의 결정론적 grader를 사용한다. 외부 optimizer·모델·네트워크 없이
atomic patch budget, 고정 hash, selection strict improvement, hard gate, locked test와 승인 순서를
검증한다. 이는 범용 Eval runner 구현 완료를 뜻하지 않는다.
`baselines/skill-evolution-*`에는 이 reference pilot의 고정 record, sanitized selection 집계와 거절
reason buffer만 보존한다. trajectory 원문, test fixture 내용과 모델 출력은 포함하지 않는다.
`fixtures/skill-evolution/trial-plan.offline.json`과
`scripts/validate-skill-evolution-trial.mjs`는 실제 호출 전 dry-run 계약을 검증한다. 이 PASS는 실제
모델 실행, 비결정 성능 개선이나 release 승인이 아니다.

REQ-046 준비 automation은 `fixtures/distributed-pilot/`의 synthetic campaign·두 result와
`scripts/validate-pilot-result.mjs`, `scripts/aggregate-pilot-results.mjs`를 사용한다. 고정 baseline은
`SYNTHETIC_COMPLETE`이지만 `supportDecisionEligible: false`다. 실제 tester의 독립 실행을 대체하지 않는다.

외부 Eval 도구 선정 전 공급망, 텔레메트리, 권한, 네트워크, 비용과 데이터 처리를 심사한다. 상세
정책은 `docs/evaluation-strategy.md`와 `.ai/workflows/evaluation.md`를 따른다.
