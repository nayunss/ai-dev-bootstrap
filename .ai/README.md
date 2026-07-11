# AI 공통 코어

이 디렉터리는 AI 도구와 무관하게 적용되는 정책, 워크플로, 역할과 승인된 도구 정보를
관리한다. `AGENTS.md`, `CLAUDE.md` 등 도구별 진입점은 이 내용을 참조하는 어댑터다.

`prompts/`에는 하네스로 결정화할 수 없는 사람의 의도·판단·승인 입력을 구조화하는 최소
템플릿만 둔다. 반복 규칙과 보안 정책을 프롬프트에 복제하지 않는다.

## 보안 파일

- `standards/security.md`: 보안 정책의 단일 진실 원천
- `workflows/threat-model.md`: 변경 전 위협 모델 템플릿
- `workflows/security-review.md`: 구현·리뷰·릴리스 보안 절차
- `agents/security-reviewer.md`: 독립 보안 리뷰 역할
- `manifests/security-tools.yaml`: 보안 도구 승인 및 버전 잠금 형식
- `workflows/handoff.md`: 세션 종료와 재개 절차
- `workflows/token-budget.md`: 토큰 예산에 따른 탐색·검증 범위 선택
- `workflows/evaluation.md`: 하네스·루프 변경의 Eval 설계와 판정
- `workflows/change-mode.md`: upstream 유지보수와 downstream 도입 경계
- `workflows/human-in-the-loop.md`: upstream 질문 조건과 downstream 승인 처리

보안 정책의 배경과 공개 사례는 `docs/ai-security-guardrails.md`와
`docs/ai-security-incidents.md`를 참고한다.
