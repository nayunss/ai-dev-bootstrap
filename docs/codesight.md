# CodeSight 공통 컨텍스트

상태: 적용

CodeSight 1.18.0을 Codex와 Claude Code가 공유하는 프로젝트 코드 컨텍스트 생성기로 사용한다.
로컬 AST 분석 결과를 `.codesight/wiki/`에 저장하며 새 세션은 `index.md`부터 읽는다.

## 보안 적용

- npm lifecycle script를 끄고 정확한 버전을 설치한다.
- 기본 CLI 실행에서 외부 HTTP 통신 코드는 발견하지 못했다.
- `--telemetry`는 외부 전송이 아니라 로컬 토큰 추정 보고서 기능이지만 기본 사용하지 않는다.
- CodeSight의 MCP와 자체 Git hook 설치 기능은 기본 비활성화한다.
- 공통 세션 훅과 CI가 `scripts/codesight-context`를 호출한다. Husky는 프로젝트 개발환경이
  확정되어 Git hook profile이 활성화된 경우에만 같은 명령을 호출한다.
- 생성 결과가 secret이나 민감 경로를 노출하지 않는지 commit 전에 검토한다.

## 실행

```text
scripts/codesight-context generate  # wiki 재생성
scripts/codesight-context read      # index 읽기
```

Claude Code는 `.claude/settings.json`, Codex는 `.codex/hooks.json`의 `SessionStart`에서 같은
read 명령을 실행한다. pre-commit은 wiki를 재생성해 stage하고 CI는 재생성 후 diff가 없는지
확인한다.

CodeSight 문서가 실제 코드와 충돌하면 실제 코드와 테스트를 우선한다.
