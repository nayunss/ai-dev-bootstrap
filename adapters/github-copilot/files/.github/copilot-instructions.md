# GitHub Copilot 프로젝트 진입점

GitHub Copilot은 변경을 제안하기 전에 다음 실제 파일을 순서대로 확인한다.

1. `.ai/standards/engineering.md`
2. `.ai/standards/security.md`
3. `HANDOFF.md`
4. `.codesight/wiki/index.md`
5. `.ai/workflows/change-mode.md`
6. 작업과 관련된 workflow·요구사항·개발환경 문서

공통 규칙의 단일 진실 원천은 `.ai/`다. 이 파일에는 정책 전문을 복제하지 않는다. CodeSight는
탐색용 cache이므로 구현 전에는 index가 가리키는 실제 source를 읽고, 변경 뒤에는 프로젝트 검증과
CodeSight stale 검사를 실행한다.
