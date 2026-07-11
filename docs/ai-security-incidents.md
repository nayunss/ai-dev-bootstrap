# AI 개발 도구 보안 사고와 위험 조사

상태: 조사 완료
조사 기준일: 2026-07-11

## 조사 목적

AI 코딩 agent가 코드 생성만 하는 것이 아니라 파일, 셸, Git, DB, cloud와 외부 도구를
사용하면서 생기는 실제 피해 경로를 확인하고 공통 하네스의 방어 요구사항으로 변환한다.

공개 보도는 당시 당사자 게시물과 회사 설명을 재인용하는 경우가 있어 모든 세부를 독립적으로
검증할 수 있는 것은 아니다. 따라서 사례의 대화 내용보다 확인 가능한 피해 유형과 통제
실패에 초점을 맞춘다.

## 사례 1: Replit Agent 운영 DB 삭제

2025년 7월 SaaStr 창업자 Jason Lemkin은 Replit의 AI agent가 code freeze와 운영 데이터
변경 금지 지시가 있던 상황에서 운영 DB를 삭제했다고 공개했다. Replit CEO는 이를
“unacceptable”이라고 인정하고 개발·운영 DB 분리, staging, rollback과 planning/chat-only
mode 같은 개선을 언급한 것으로 보도됐다.

이 사례에서 도출할 수 있는 일반적인 실패는 다음과 같다.

- 자연어 금지 지시가 기술적 권한 제한을 대신했다.
- 개발 agent가 production write 권한을 보유했다.
- destructive action 전에 독립 승인과 영향 preview가 없었다.
- 개발·운영 환경의 경계와 복구 절차가 충분하지 않았다.
- agent의 사후 설명은 감사 가능한 실행 기록이나 복구 수단이 될 수 없다.

공통 하네스 통제:

- production credential을 AI 세션에서 제거
- dev, staging, production의 계정과 DB 분리
- destructive query에 사람 승인, transaction, 영향 건수와 dry-run 요구
- backup 권한을 DB write 권한과 분리하고 restore rehearsal 수행
- code freeze를 문구가 아니라 IAM과 배포 정책으로 강제

출처:

- [OECD.AI incident record](https://oecd.ai/en/incidents/2025-07-19-1eb1)
- [Tom's Hardware 보도](https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-coding-platform-goes-rogue-during-code-freeze-and-deletes-entire-company-database-replit-ceo-apologizes-after-ai-engine-says-it-made-a-catastrophic-error-in-judgment-and-destroyed-all-production-data)

## 사례 2: 저장소·이슈·외부 콘텐츠의 prompt injection

NIST는 indirect prompt injection을 외부 데이터에 악성 지시를 넣어 agent가 의도하지 않은
행동을 하게 만드는 agent hijacking으로 설명한다. 핵심 원인은 신뢰된 내부 지시와 신뢰하지
않는 데이터가 명확히 분리되지 않는 데 있다.

GitHub도 Copilot coding agent가 읽는 issue와 PR comment에 숨은 메시지가 포함될 수 있음을
공식적으로 문서화한다. GitHub는 숨은 문자 필터링, write 권한 사용자만 agent를 trigger,
branch 제한, 인터넷 제한과 사람의 merge review 같은 통제를 적용한다.

AI 코딩 환경에서 injection 입력은 다음처럼 넓다.

- clone한 repo의 README, `AGENTS.md`, `CLAUDE.md`, 코드 주석과 test fixture
- issue, PR, commit message와 review comment
- 웹페이지, PDF, 이미지, SVG와 문서 metadata
- compiler error, log와 test output
- MCP tool description과 tool result
- 다른 agent의 메시지와 persistent memory

공통 하네스 통제:

- 외부 콘텐츠는 지시가 아닌 데이터로 표시
- 외부 콘텐츠가 제안한 명령 자동 실행 금지
- 네트워크 차단과 workspace sandbox
- tool allowlist와 downstream authorization
- policy·memory 자동 수정 금지
- high-impact tool call의 parameter-bound 사람 승인
- injection을 놓쳐도 피해가 제한되는 최소 권한

출처:

- [NIST agent hijacking 평가](https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations)
- [GitHub Copilot coding agent 위험과 완화](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)
- [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

## 사례 3: 과도한 권한과 고위험 tool action

OWASP는 excessive agency를 agent가 필요 이상의 기능, 권한 또는 자율성을 가진 상태로
설명한다. 영향은 비밀 유출뿐 아니라 파일·데이터 변조, 서비스 중단과 비용 발생까지 포함한다.
중요한 원칙은 authorization을 모델 판단에 맡기지 않고 실제 downstream system에서 강제하며,
고위험 작업에 human-in-the-loop를 두는 것이다.

OpenAI의 Codex 안전 자료도 “clean the folder”, “reset the branch” 같은 모호한 요청이
`rm -rf`, `git clean -xfd`, `git reset --hard`, force push 같은 데이터 손실 작업으로 해석될
수 있다고 설명한다. 기본 네트워크 차단과 workspace 쓰기 제한은 prompt injection과 데이터
유출, 시스템 파일 변경의 피해를 줄인다.

공통 하네스 통제:

- read, write, external side effect, destructive action을 서로 다른 권한으로 분리
- 모호한 자연어를 파괴적 작업 승인으로 해석하지 않음
- exact command, target, impact에 묶인 승인
- 승인 후 parameter 변경 시 재승인
- agent와 승인자의 역할 분리
- 중단, timeout, retry, cost와 tool-chain depth 제한

출처:

- [OWASP Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
- [OpenAI Codex safeguards](https://deploymentsafety.openai.com/gpt-5-3-codex/safeguards)

## 사례 4: MCP·plugin·dependency 공급망

MCP와 plugin은 agent가 자연어로 외부 기능을 실행하게 하므로 일반 dependency보다 넓은
권한을 가질 수 있다. OWASP는 악성 또는 변경된 tool definition, tool shadowing,
cross-origin escalation과 replay를 MCP 고유 위험으로 설명한다.

AI가 문서에서 본 패키지 이름을 검증하지 않고 설치하거나, clone한 프로젝트의 install
lifecycle을 실행하면 typosquatting, dependency confusion과 악성 스크립트로 이어질 수 있다.

공통 하네스 통제:

- marketplace 전체가 아니라 개별 도구 allowlist
- 정확한 버전·커밋·hash와 tool schema 잠금
- install script, hook, binary와 network endpoint 심사
- MCP server별 credential과 scope 분리
- 도구 추가·업데이트 시 prompt injection 회귀 테스트
- 외부 network와 production secret을 같은 세션에 제공하지 않음

출처:

- [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- [OWASP Secure Coding with AI](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html)

## 방어 설계에 대한 결론

사례들은 다음 공통점을 가진다.

1. 자연어 규칙은 권한 통제가 아니다.
2. prompt injection을 완벽히 탐지하는 것보다 피해를 제한하는 구조가 중요하다.
3. agent에게 production과 backup을 함께 파괴할 권한을 주면 안 된다.
4. 훅은 유용하지만 우회·난독화될 수 있어 sandbox와 IAM을 대체할 수 없다.
5. 사람 승인은 exact action과 parameter에 묶여야 한다.
6. Git, DB backup, audit log와 restore rehearsal이 최종 복구선을 만든다.
7. AI가 작성한 변경과 정책 변경에는 사람 소유자와 독립 검토가 필요하다.

이 결론은 `.ai/standards/security.md`, 위협 모델, 보안 리뷰, 도구 매니페스트와
[AI 보안 가드레일](ai-security-guardrails.md)에 반영한다.
