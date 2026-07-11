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

현재는 계약 설계 단계이며 runner나 외부 Eval 의존성을 설치하지 않았다. 도구 선정 전 공급망,
텔레메트리, 권한, 네트워크, 비용과 데이터 처리를 심사한다. 상세 정책은
`docs/evaluation-strategy.md`와 `.ai/workflows/evaluation.md`를 따른다.
