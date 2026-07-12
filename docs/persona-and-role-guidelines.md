# AI 페르소나와 작업 역할 가이드

상태: 제안
검토일: 2026-07-12

## 결론

공통 개발환경에는 “20년 경력의 천재 개발자” 같은 전역 성격형 페르소나를 기본으로 부여하지 않는다.
최신 AI 모델과 제품은 일반적인 지시 준수와 대화 성향을 제공하지만, provider·model·surface마다 기본
행동이 다르고 프로젝트의 책임·권한·완료 조건이 자동으로 탑재되는 것은 아니다.

프로젝트에는 긴 인물 설정보다 **작업 역할 계약**을 사용한다. 역할 계약은 성격이나 경력 서사가 아니라
책임, 책임 밖의 일, 권한, 입력, 산출물, 검증과 중단·승인 조건을 정의한다.

## 구분

| 구분 | 예시 | 기본 정책 |
|---|---|---|
| 성격형 페르소나 | “대담하고 카리스마 있는 시니어 개발자” | 공통 baseline에서 제외 |
| 작업 역할 | security reviewer, architect, release manager | 결과가 달라질 때만 선택 사용 |
| 행동 계약 | source-first, 최소 변경, 검증 후 완료 | 모든 AI 도구에 공통 적용 |
| 출력 취향 | 친근한 말투, bilingual summary | 사용자·프로젝트 선택 |

## 모델 기본 능력과 한계

- 최신 모델은 명확한 지시와 system/developer instruction을 따르도록 설계되어 있어 단순한 개발 작업에
  역할극형 페르소나가 필수는 아니다.
- role/persona instruction은 특정 관점이나 산출물 형식을 안정시키는 데 여전히 사용할 수 있다.
- provider의 기본 prompt나 모델 학습 성향은 공통 하네스가 통제할 수 없고 version·surface에 따라
  바뀔 수 있으므로 project policy의 대체물이 아니다.
- “전문가처럼 행동하라”는 문장은 실제 전문성, 권한 또는 정확성을 보장하지 않는다. source, test,
  validator와 사람 승인을 완료 판정의 근거로 사용한다.

## 역할을 추가하는 조건

다음 중 하나가 실제로 필요한 경우에만 역할을 둔다.

- 보안·접근성·DB migration처럼 누락되기 쉬운 별도 관점이 필요하다.
- 구현자와 독립된 검증 책임이 필요하다.
- 읽기 전용, 배포 제한 등 다른 권한 경계가 필요하다.
- 반복 작업에 고정된 입력·산출물·grader가 있다.

작은 작업을 역할 수만 늘려 분할하거나, 하나의 agent에게 architect·implementer·reviewer·security·
release 성격을 장문으로 동시에 부여하지 않는다.

## 역할 계약 형식

```markdown
# 역할 이름

## 사용 조건
## 책임과 제외 범위
## 필요한 입력과 신뢰 경계
## 허용 도구·경로·네트워크
## 금지 작업과 Human-in-the-loop 조건
## 산출물
## 완료 조건과 검증
## 실패·handoff 조건
```

역할은 `.ai/agents/<role>.md`에 두고 `CLAUDE.md`, `AGENTS.md` 또는 전역 prompt에 전문을 복제하지
않는다. 도구가 subagent를 지원하지 않으면 같은 계약을 순차 검토 단계로 적용한다.

## 페르소나를 선택적으로 허용하는 경우

브랜드 voice, 교육 대상 수준, 인터뷰 simulation과 창작물처럼 표현 자체가 인수 조건인 경우에는
제한된 persona를 사용할 수 있다. 이때도 다음을 지킨다.

- 적용 범위와 종료 조건을 명시한다.
- 사실성, 보안, 권한과 검증 규칙을 덮어쓰지 못한다.
- 실존 인물 흉내보다 관찰 가능한 tone·audience·format을 정의한다.
- token 비용과 품질 효과를 Eval하고 효과가 없으면 제거한다.

## Eval

새 역할·페르소나를 공통 profile에 추가하기 전에 동일 task fixture에서 baseline과 비교한다.

- 정확성·누락·회귀
- 요구사항과 권한 준수
- 불필요한 질문·verbosity·token 사용량
- tool call과 승인 경계
- 여러 지원 AI 도구에서의 outcome 일관성

역할 이름만 바꾸고 outcome이 개선되지 않으면 공통 구성에 추가하지 않는다.

## 공식 근거

- [Anthropic Claude 4 prompt engineering best practices](https://docs.anthropic.com/ko/docs/build-with-claude/prompt-engineering/claude-4-best-practices): 최신 Claude도 명확하고 구체적인 지시를 권장한다.
- [Google Gemini prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies): role/persona를 system instruction의 중요 제약과 함께 둘 수 있지만 명확한 목표·구조·출력 조건을 함께 요구한다.
- [OpenAI API message roles](https://platform.openai.com/docs/api-reference/fine-tuning): system/developer 역할은 개발자가 모델 행동 지시를 제공하는 계층이다.

## 관련 문서

- [에이전트 체계](agents.md)
- [공통 엔지니어링 실행 원칙](../.ai/standards/engineering.md)
- [Eval 전략](evaluation-strategy.md)
- [Human-in-the-loop](human-in-the-loop.md)
