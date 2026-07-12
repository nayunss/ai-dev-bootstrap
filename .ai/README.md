# AI 공통 코어

이 디렉터리는 AI 도구와 무관하게 적용되는 정책, 워크플로, 역할과 승인된 도구 정보를
관리한다. `AGENTS.md`, `CLAUDE.md` 등 도구별 진입점은 이 내용을 참조하는 어댑터다.

`prompts/`에는 하네스로 결정화할 수 없는 사람의 의도·판단·승인 입력을 구조화하는 최소
템플릿만 둔다. 반복 규칙과 보안 정책을 프롬프트에 복제하지 않는다.

## 보안 파일

- `standards/engineering.md`: 모든 AI 도구의 구현·검증·Git·응답 기본 원칙
- `standards/security.md`: 보안 정책의 단일 진실 원천
- `workflows/threat-model.md`: 변경 전 위협 모델 템플릿
- `workflows/security-review.md`: 구현·리뷰·릴리스 보안 절차
- `agents/security-reviewer.md`: 독립 보안 리뷰 역할
- `manifests/security-tools.yaml`: 보안 도구 승인 및 버전 잠금 형식
- `workflows/handoff.md`: 세션 종료와 재개 절차
- `workflows/token-budget.md`: 토큰 예산에 따른 탐색·검증 범위 선택
- `workflows/evaluation.md`: 하네스·루프 변경의 Eval 설계와 판정
- `workflows/skill-evolution.md`: bounded skill patch의 격리 Eval·승인·release 절차
- `workflows/change-mode.md`: upstream 유지보수와 downstream 도입 경계
- `workflows/human-in-the-loop.md`: upstream 질문 조건과 downstream 승인 처리
- `workflows/production-readiness.md`: 웹서비스 보안·운영·법률 적용성과 Production 승인 gate

역할은 성격형 persona가 아니라 책임·권한·산출물·검증 계약으로 정의한다. 선택 기준은
`docs/persona-and-role-guidelines.md`를 따른다.

## 도구별 진입점

- `AGENTS.md`: Codex와 AGENTS 규약을 읽는 도구의 얇은 adapter
- `CLAUDE.md`: Claude Code의 얇은 adapter
- 그 밖의 AI 도구: 이 README에서 시작해 `standards/engineering.md`, `standards/security.md`와
  `HANDOFF.md`, `../.codesight/wiki/index.md`를 같은 순서로 읽는다.

도구별 파일에는 공통 정책을 복제하지 않는다. 도구 고유 권한·hook·명령 매핑만 adapter에 두고
공통 outcome과 gate는 `.ai/`에서 관리한다.

CodeSight index는 탐색용 cache이며 원본 source·요구사항·테스트를 대체하지 않는다. 새 세션은 index로
범위를 좁힌 뒤 관련 원본을 읽고, code 변경 후 commit 전에는 context를 재생성해 stale 여부를 확인한다.

보안 정책의 배경과 공개 사례는 `docs/ai-security-guardrails.md`와
`docs/ai-security-incidents.md`를 참고한다.
