# AI 도구 공통 진입점

Codex와 `AGENTS.md`를 지원하는 AI 도구는 작업 전에 다음 순서로 실제 파일을 읽는다.

1. `.ai/standards/engineering.md`
2. `.ai/standards/security.md`
3. `HANDOFF.md`
4. `.codesight/wiki/index.md`
5. `.ai/workflows/change-mode.md`
6. 작업과 관련된 `.ai/workflows/`, 요구사항, 개발환경 문서와, 존재하는 경우
   `docs/project-maintenance.md`

공통 규칙의 단일 진실 원천은 `.ai/`다. 이 파일에 정책 전문을 복제하지 않는다. 새 세션이나 context
compact 뒤에도 위 파일과 Git 상태를 다시 확인한다. 프로젝트별 기술 스택은 감지하거나 사용자에게
확인하며 예시 스택을 기본값으로 적용하지 않는다.
작업 역할은 `docs/agents.md`와 `docs/persona-and-role-guidelines.md`, 권한은
`.ai/standards/security.md`를 따른다. Codex의 네이티브 기능은 이 공통 역할·권한을 확대하지 않는다.

CodeSight는 탐색용 cache다. 구현 전에는 index가 가리키는 실제 source를 읽고, code 변경 후에는
commit 전에 `scripts/codesight-context generate`와 stale 검사를 실행한다.
