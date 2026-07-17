# Claude Code 프로젝트 진입점

Claude Code는 작업 전에 다음 순서로 실제 파일을 읽는다.

1. `.ai/standards/engineering.md`
2. `.ai/standards/security.md`
3. `HANDOFF.md`
4. `.codesight/wiki/index.md`
5. `.ai/workflows/change-mode.md`
6. 작업과 관련된 `.ai/workflows/`, 요구사항, 개발환경 문서와, 존재하는 경우
   `docs/project-maintenance.md`

공통 규칙의 단일 진실 원천은 `.ai/`다. `CLAUDE.md` 또는 `.claude/`에 정책 전문을 복제하지 않는다.
새 세션, resume 또는 context compact 뒤에도 위 파일과 Git 상태를 다시 확인한다. Claude 전용 기능은
공통 outcome과 보안 gate를 약화하지 않는 얇은 adapter로만 사용한다.

CodeSight는 탐색용 cache다. 구현 전에는 index가 가리키는 실제 source를 읽고, code 변경 후에는
commit 전에 `scripts/codesight-context generate`와 stale 검사를 실행한다.
