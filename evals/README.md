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

REQ-025 deterministic capability suite는 `tasks/deterministic-capability-smoke.json`,
`fixtures/capability-suite/`, `graders/check-capability-outcome.mjs`와
`scripts/capability-suite.mjs`를 사용한다. task schema, fixture hash, trial별 임시 복제,
grader allowlist와 비용·latency·tool-call·diff 집계를 검증한다. token·비용은 0이며 실제 model
trial을 호출하거나 대체하지 않는다.

REQ-009~014 stack quality adapter Eval은 `fixtures/stack-quality/`의 JavaScript·Java·Python source와
고정 failure record를 사용한다. OS 임시 project의 fake project-local tool로 formatter·linter·
typecheck와 web accessibility 순서, exact version, application cwd, network-none 실행 경계,
check-only source drift와 fail-fast를 검증한다. 실제 생태계 tool 설치·실행 결과가 아니다.

REQ-037~039 adapter parity Eval은 `.ai/manifests/adapter-parity.json`과
`scripts/adapter-parity.mjs`를 사용한다. Codex·Claude Code·GitHub Copilot source의 공통 정책·역할·
권한 reference, hook/fallback enforcement와 세 adapter 동시 materialization 결과를 검증한다.
role·permission drift, hook 우회, global persona와 target drift negative fixture를 포함하지만 실제
model을 호출하지 않는다.

REQ-044 FastAPI reference Eval은 `fixtures/fastapi-contract/`의 baseline·compatible·breaking OpenAPI,
route inventory와 Production-disabled docs profile을 사용한다.
`scripts/fastapi-contract-adapter.mjs`가 syntax, semantic breaking drift, undocumented/stale operation,
secret-like metadata, `/openapi.json`·`/docs`·`/redoc`, `Try it out`과 external asset policy를
결정론적으로 검사한다. FastAPI package나 server를 실행하지 않으므로 실제 runtime·authorization
E2E를 대신하지 않는다.

REQ-045 initial full-stack Eval은 `fixtures/fullstack-materializer/`의 frontend·backend·shared source와
up/down SQL artifact pair를 사용한다. preview 무변경, 명시 승인 apply, 기존 파일 충돌의 atomic
차단, 적용 전 동일 파일 보존, rollback과 두 번째 write 실패 후 transaction restore를 검증한다.
SQL은 읽기 가능한 fixture artifact일 뿐 실행하지 않으며 결과는 항상 database `NOT-RUN`이다.

REQ-041 reference pilot은 `tasks/skill-evolution-bounded-patch.json`과 synthetic fixture,
`scripts/evaluate-skill-evolution.mjs`의 결정론적 grader를 사용한다. 외부 optimizer·모델·네트워크 없이
atomic patch budget, 고정 hash, selection strict improvement, hard gate, locked test와 승인 순서를
검증한다. 이는 REQ-025 공통 deterministic runner와 별개의 bounded-patch evaluator이며 실제 model
trial 완료를 뜻하지 않는다.
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
