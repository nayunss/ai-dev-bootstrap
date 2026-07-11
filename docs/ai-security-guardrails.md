# AI 개발 보안 가드레일

상태: 제안

## 결론

보안 가드레일은 hooks 한 곳에 작성하지 않는다. 정책, 권한, 실행 전 차단, 변경 후 검사,
CI와 복구를 중첩한다.

```text
보안 정책 (.ai/standards/security.md)
        │
        ├─ 위협 모델과 보안 리뷰
        ├─ AI tool permission·sandbox·network allowlist
        ├─ PreToolUse / PostToolUse hooks
        ├─ Git hooks와 CI
        ├─ DB·cloud IAM과 환경 분리
        └─ backup·audit·incident response
```

단일 진실 원천은 `.ai/standards/security.md`다. hooks와 CI는 정책을 집행하는 구현이며,
도구별 차이가 있어도 같은 위험 분류와 승인 계약을 따라야 한다.

## Hooks의 역할

### 실행 전 훅

빠르게 차단할 후보:

- `rm`, destructive Git, force push와 광범위한 overwrite
- production hostname·account를 대상으로 하는 write
- `DROP`, `TRUNCATE`, 조건 없는 bulk mutation
- 파일명이 `.env`로 시작하는 모든 파일, credential, keychain, cloud config와 저장소 밖 민감
  경로 읽기·검색·색인·수정
- 승인되지 않은 network host와 upload
- 보안 정책, hook, CI와 backup 설정 변경
- 원격 script, package lifecycle과 신뢰하지 않는 binary 실행

차단 메시지는 어떤 정책에 걸렸고 어떤 승인 정보가 필요한지 보여준다.

### 실행 후 훅

- 실제 변경 경로와 사용자가 승인한 범위 비교
- 삭제·새 executable·dependency·permission 변경 탐지
- secret과 개인정보 유출 검사
- protected security file 변경 탐지
- 예상하지 못한 network와 child process 기록

### Hooks의 한계

문자열 검사는 alias, shell expansion, encoded payload, interpreter, API wrapper와 MCP를 통해
우회될 수 있다. 따라서 hook PASS는 안전 보증이 아니다. workspace sandbox, OS permission,
DB account, cloud IAM과 branch protection이 실제 권한 경계를 만든다.

`.env*` 차단도 동일하다. 공통 hook은 Read·Glob·Grep·Bash·MCP의 명시적 경로 접근을 차단하지만
우회 불가능한 기밀 경계를 보장하지 않는다. downstream은 가능하면 AI 프로세스가 실행되는
container·sandbox·OS 권한에서 `.env*` 파일을 보이지 않게 하며, 필요한 변수 이름은 별도
비민감 스키마 문서로 제공한다.

## AI 도구별 어댑터 원칙

- Codex와 Claude Code의 hook event 이름을 공통 정책에 직접 넣지 않는다.
- 각 어댑터는 공통 action classifier와 검사 명령을 호출한다.
- 도구가 hook을 지원하지 않으면 shell wrapper, sandbox와 CI로 동일 통제를 구현한다.
- 승인 UI가 있어도 광범위한 prefix나 wildcard 권한을 고위험 명령에 부여하지 않는다.
- 권한 상승 요청은 실패한 명령과 필요한 최소 범위를 표시한다.

## 구현 순서

### 1단계: 즉시 적용

- security policy와 protected paths를 저장소에 둔다.
- production credential을 AI 개발 환경에서 제거한다.
- network default deny와 workspace write scope를 사용한다.
- destructive action은 사람 승인 전 실행하지 않는다.
- AI 변경은 branch·diff·CI·human review를 거친다.

### 2단계: 공통 검사기

- `scripts/security-check`에 action classification, protected path와 secret 검사를 구현한다.
- 도구별 hooks와 Husky는 같은 검사기를 호출한다.
- false positive와 bypass case를 test fixture로 관리한다.

현재 저장소에는 승인된 secret scanner와 SAST 도구가 아직 없으므로 검증되지 않은 자체
스크립트를 안전 장치처럼 즉시 배포하지 않는다. 먼저 `security-tools.yaml`의 도구 심사를
완료한 뒤 공통 검사기를 구현한다.

### 3단계: CI와 적대적 테스트

- prompt injection corpus와 예상 deny 결과를 버전 관리한다.
- destructive action approval bypass, secret exfiltration와 policy tampering을 검사한다.
- agent, model, plugin, MCP, hook 또는 policy 변경 시 보안 회귀 테스트를 실행한다.

### 4단계: 운영 통제

- dev·staging·production IAM 분리
- production write와 deploy의 이중 승인
- immutable 또는 별도 권한 backup
- restore rehearsal, audit log와 incident drill

## 승인 없는 삭제 방지

파일과 DB 삭제는 모델이 의도를 잘 이해했는지에 의존하지 않는다.

```text
삭제 제안
→ 대상 목록·건수·환경 preview
→ Git/backup/transaction 복구 가능성 확인
→ 정확한 명령과 대상에 사람 승인
→ 제한된 권한으로 실행
→ 결과와 audit 기록
→ 복구 가능성 유지
```

- untracked file은 Git으로 복구되지 않으므로 자동 삭제하지 않는다.
- production DB와 backup 삭제 권한을 한 credential에 주지 않는다.
- bulk mutation은 상한과 조건 검증을 둔다.
- “cleanup”, “reset”, “start over”는 삭제 승인이 아니다.

## Prompt injection 대응

Prompt injection은 모델의 텍스트 판단만으로 완전히 제거할 수 없다고 가정한다.

- 신뢰하지 않는 콘텐츠와 정책 지시를 구조적으로 분리한다.
- 외부 콘텐츠의 명령을 실행하지 않는다.
- tool call은 원래 사용자 목적과 policy로 다시 정당화한다.
- network와 secret을 동시에 허용하지 않는다.
- agent가 rules, memory와 hooks를 자동 수정하지 못하게 한다.
- 고위험 tool은 parameter-bound approval token 없이는 실행되지 않게 한다.
- injection이 성공해도 sandbox와 downstream authorization이 피해를 차단해야 한다.

## 보안 완료 조건

- [ ] 위협 모델이 필요한 변경인지 분류했다.
- [ ] 외부 입력과 prompt injection 경로를 확인했다.
- [ ] agent에 불필요한 credential과 tool이 없다.
- [ ] production write, deploy와 destructive action에 사람 승인이 있다.
- [ ] dry-run, backup, rollback과 restore가 검증됐다.
- [ ] hook뿐 아니라 sandbox·IAM·CI 통제가 존재한다.
- [ ] AI 변경을 사람이 이해하고 승인했다.
- [ ] 보안 회귀 테스트와 audit evidence가 남았다.

## 관련 문서

- [보안 사고 조사](ai-security-incidents.md)
- [공급망 보안](supply-chain-security.md)
- [프론트엔드 훅](frontend-tooling-and-hooks.md)
- [에이전트 체계](agents.md)
- [SDLC](sdlc.md)
