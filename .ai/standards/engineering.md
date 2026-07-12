# 공통 엔지니어링 실행 원칙

상태: 제안

이 문서는 Claude Code, Codex와 다른 AI 도구가 공유하는 기본 작업 지침의 단일 진실 원천이다.
프로젝트별 기술 스택과 명령은 `docs/development-environment.md`, 반복되는 프로젝트 유지관리 사항은
`docs/project-maintenance.md`, 세션 상태는 `HANDOFF.md`에 둔다. 도구별 adapter에 이 내용을 복제하지
않는다.

## 매 세션의 필수 시작점

1. 경로, 설정값, 명령과 runtime 동작을 답하거나 변경하기 전에 실제 repository source를 읽는다.
2. 새 세션, context compact 또는 resume 뒤에는 루트 tool adapter, 이 문서, 보안 정책과
   `HANDOFF.md`를 다시 읽고 Git 상태와 대조한다.
3. 완료할 수 없는 작업은 완료로 표현하지 않고 blocker, 안전하게 끝낸 범위와 다음 행동을 보고한다.
   테스트가 실패하거나 required work가 남은 상태를 완료 commit으로 만들지 않는다.
4. 프로젝트에서 `docs/project-maintenance.md`를 운영하거나 재발 가능한 새 버그 패턴·환경 함정이
   실제로
   발견되면 해당 문서에 증상, 원인, 탐지와 예방을 기록한다. 파일이 없는 프로젝트에 빈 문서를
   의무 생성하지 않으며 대화 기억만 믿지 않는다.

## 구현 전 사고

- 가정과 확인된 사실을 구분한다. source로 확인할 수 있는 것은 질문 전에 읽는다.
- 결과가 달라지는 복수 해석이 있으면 대안과 trade-off를 제시하고 임의로 선택하지 않는다.
- 더 단순한 해법이 있으면 먼저 제안한다. 요청 밖 기능과 추측성 확장 지점을 만들지 않는다.
- 다단계 작업은 관찰 가능한 목표, 단계별 검증과 중단 조건으로 바꾼다.

## 단순하고 외과적인 변경

- 사용자 요청과 인수 조건에 직접 필요한 파일과 줄만 변경한다.
- 관련 없는 코드·주석·format·dead code를 함께 정리하지 않는다. 기존 문제는 별도로 보고한다.
- 기존 프로젝트 스타일과 적절한 패턴을 따르되 보안·정확성·접근성을 위반하는 관례는 복제하지
  않는다.
- 현재 불가능한 시나리오의 방어 코드, 사용되지 않는 abstraction과 중복 wrapper를 추가하지 않는다.
- 모든 변경 줄을 요구사항, bug reproduction, test 또는 필수 migration으로 설명할 수 있어야 한다.

## TDD와 Tidy First

- 관찰 가능한 동작 변경과 bug fix는 가능한 경우 `Red → Green → Refactor`로 진행한다.
- bug fix는 먼저 실패를 재현하는 가장 작은 test 또는 결정론적 fixture를 만든다.
- 테스트할 수 없는 문서·메타데이터 작업은 TDD를 흉내 내지 않고 schema, link, validator 또는 diff
  check처럼 적합한 검증을 사용한다.
- 구조 변경(rename·extract·move)과 동작 변경을 같은 commit에 섞지 않는다. 구조 변경 전후에 같은
  test가 통과해야 한다.
- refactor는 Green 상태에서만 수행하고 요청 범위를 넘어가지 않는다.

## 완료와 검증

- “validation 추가” 같은 요청을 정상·경계·negative test와 명시적 PASS 조건으로 바꾼다.
- formatter, linter, compiler, test, build, security와 Eval 중 변경에 해당하는 gate를 실행한다.
- warning 0 정책이 설정된 프로젝트에서는 새 warning과 기존 warning을 구분하고 새 warning을 남기지
  않는다.
- 실행하지 못한 검사는 이유와 위험을 보고한다. 모델의 설명보다 실제 command·state 결과를 우선한다.
- 임시 workaround로 원인을 숨기지 않는다. 범위 안에서 구조적 원인을 수정하고 regression을 남긴다.

## Git 규율

- `git commit`, `git push`, PR 생성·merge와 release는 사용자의 현재 요청에 명시적 지시가 있을 때만
  실행한다. 코드 변경 요청만으로 Git 외부 상태 변경을 추론하지 않는다.
- commit 전 관련 test·lint·security와 `HANDOFF.md` 동기화를 확인한다.
- 한 commit은 하나의 논리 단위다. 구조 변경과 동작 변경은 분리한다.
- Conventional Commit을 사용하고 필요하면 commit body에 `Structural` 또는 `Behavioral`과 검증을
  기록한다.
- `--no-verify`, force push와 검증 우회는 금지한다. 상세 파괴적 Git 정책은 `security.md`를 따른다.

## 응답과 사실성

- 한 요청에는 결론을 한 번만 전달하고 같은 요약을 형태만 바꿔 반복하지 않는다.
- code·diff·전체 파일을 중복 출력하지 않는다. 기본은 변경 요약과 실제 검증 결과다.
- 단순 질문은 짧게, 구현 결과는 변경·검증·주의·blocker 중심으로 작성한다.
- 사용자가 요청하지 않은 후속 구현을 자동 시작하지 않는다. 현재 요청의 안전한 완료에 필요한 정상
  구현·검증 단계는 수행한다.
- 언어와 형식은 프로젝트 정책과 사용자의 언어를 따른다. 모든 도구에 강제 bilingual 출력을 요구하지
  않는다.
- 최종 응답 전 언급한 경로·class·method·명령·URL이 실제로 존재하고 근거와 일치하는지 확인한다.
  확인할 수 없으면 `미검증`으로 표시하고 추측하지 않는다.

## 안전 경계

- dependency·build/security/config, DB schema·migration, container·infrastructure와 production 변경은
  `.ai/standards/security.md`와 Human-in-the-loop 계약을 우선한다.
- `.env*`를 읽거나 만들거나 수정하지 않는다. 비밀이 없는 별도 schema 문서를 사용한다.
- destructive data·file·Git 작업, production write와 security control 변경은 정확한 대상·preview·
  rollback에 대한 별도 승인이 필요하다.
- 공통 원칙과 프로젝트별 예외가 충돌하면 보안·정확성·사용자의 최신 명시 요구사항을 우선하고 예외
  근거를 기록한다.
- AI는 출처·license가 확인되지 않은 external-code match를 생성물로 확정하지 않는다. public-code
  reference와 scanner match를 숨기거나 이름·format·단순 재작성으로 우회하지 않고
  `.ai/standards/security.md`의 provenance gate와 사람 review를 따른다.
