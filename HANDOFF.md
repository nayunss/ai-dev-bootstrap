# Handoff

갱신: 2026-07-11 Asia/Seoul
상태: 진행 중

## 목표

Codex, Claude Code 등 서로 다른 AI 도구에서 재사용할 수 있는 안전한 AI 개발환경 공통
하네스를 설계한다. 현재까지 REQ-001부터 REQ-027까지 수집했다.

## 완료

- 독립 Git 저장소와 문서 구조를 만들었다.
- 아키텍처, 스킬, 에이전트, SDLC와 최소 하네스를 설계했다.
- 선호 플러그인과 Agent Skills·GitHub Spec Kit을 비교 평가했다.
- 언어 중립 코드 품질, 시멘틱 HTML과 프론트엔드 훅 정책을 작성했다.
- AI prompt injection, 파괴적 작업, DB·파일 삭제와 공급망 위험을 조사했다.
- `.ai/`에 보안 정책, 위협 모델, 보안 리뷰, reviewer와 도구 manifest 골격을 만들었다.
- 세션 handoff 정책과 워크플로를 추가했다.
- 프로젝트별 기술 스택을 자동 감지하고 필요한 값만 질문해 확정하는 개발환경 정의 절차를
  추가했다.
- 토큰 절약형(`token-aware`)과 충분한 분석형(`full`) 실행 프로파일을 추가했다. 두 방식은
  탐색·설명 범위만 다르며 보안과 필수 품질 게이트는 동일하다.
- 요구사항이 달라질 때 두 토큰 프로파일과 관련 워크플로를 함께 검토·갱신하는 동기화 규칙을
  추가했다.
- 하네스·루프가 대체하지 못하는 제품 의도, 변경·버그, 설계·UI 판단과 고위험 승인용 최소
  프롬프트 템플릿 및 사용 가이드를 추가했다.
- 모델·하네스·루프·프롬프트·스킬 변경을 outcome과 regression·capability suite로 평가하는
  Eval 전략, 워크플로와 실제 개발용 디렉터리 계약을 추가했다.
- clone 후 사용자별 AI 환경을 읽기 전용 진단하고 승인된 프로젝트 로컬 환경으로 맞춘 뒤
  개발을 시작한다는 저장소의 배포 목적을 명시했다.
- 공통 환경을 개발·운영하는 upstream maintainer/contributor와 이를 회사·프로젝트에 적용하는
  downstream adopter/developer의 책임, 확장 계층과 업데이트 흐름을 분리했다.
- 첫 downstream 검증 대상은 형제 경로 `../env-downstream`으로 정했다. upstream이 아직 첫
  commit 전이므로 실제 적용은 pin 가능한 baseline이 생길 때까지 대기한다.

## 현재 상태

- branch: `main`
- 논리적 단위의 최초 커밋 2개를 만들었다.
  - `6448c61 docs: define common AI environment architecture`
  - `f1181e3 feat: add tool-neutral AI workflows and policies`
- 보안 실행 계층, AI tool hook과 package 설정은 Semgrep runtime 실패 때문에 아직 uncommitted다.
- 원격 저장소는 아직 연결하지 않았다.
- 문서와 정책은 대부분 `제안` 또는 `작성 중` 상태다.

## 주요 결정

- 공통 정책은 `.ai/`에 두고 도구별 파일은 얇은 어댑터로 만든다.
- plugin은 선택 자동화이며 하네스의 필수 runtime이 아니다.
- security policy는 `.ai/standards/security.md`가 단일 진실 원천이다.
- hooks는 sandbox, IAM, CI와 복구 통제를 대체하지 않는다.
- production credential과 destructive action은 AI에게 기본 허용하지 않는다.
- `HANDOFF.md`는 세션 요약이며 요구사항·ADR·Git을 대체하지 않는다.
- 공통 하네스 정책과 프로젝트별 기술 스택을 분리하며 `latest`는 정확한 버전으로 해석해
  문서·lockfile·CI에 고정한다.
- 토큰 예산이 달라도 필수 보안 검사, 사용자 승인, 관련 테스트와 handoff는 생략하지 않는다.
- 요구사항 변경 시 토큰 프로파일에 차이가 없더라도 영향 없음의 이유를 handoff에 남긴다.
- 프롬프트는 반복 규칙이나 검증의 저장소가 아니며, 확정 내용은 요구사항·ADR·설정으로 옮긴다.
- Eval은 agent 자기 보고보다 실제 outcome과 결정론적 grader를 우선한다.
- 개인 전역 AI 설정은 자동으로 덮어쓰지 않고 프로젝트 로컬 bootstrap과 validate를 우선한다.
- 회사·프로젝트의 private policy와 skill은 public upstream에서 분리하고 upstream release를
  명시적으로 고정·검증·업그레이드한다.

## 변경 파일

- `docs/`: 요구사항과 설계 문서
- `.ai/`: 도구 중립 보안 정책·프로젝트 환경 워크플로·역할·manifest
- `HANDOFF.md`: 현재 세션 재개 정보
- `README.md`, `.gitignore`: 저장소 기본 파일

## 검증

- Agent Skills 내장 스킬 검증: PASS
- Agent Skills 명령 parity 검증: PASS
- 문서 trailing whitespace 검사: PASS
- 상대 Markdown 링크 대상 검사: PASS
- `security-tools.yaml` YAML 파싱: PASS
- Gitleaks 전체 저장소 secret scan: PASS
- 첫 commit pre-commit: FAIL — Semgrep `1.168.0` runtime/version 검증 실패
- 실패 후 문서·정책 커밋만 `HUSKY=0`으로 생성했으며 보안 자동화 파일은 커밋하지 않았다.
- Markdown 시각 렌더링 검사: 미구현
- SAST: FAIL — 현재 Semgrep 후보를 승인 목록에서 제거하고 대체 도구를 재심사해야 한다.

## 남은 작업

1. 실패한 Semgrep 후보를 승인 목록과 실행 경로에서 제거한다.
2. 대체 SAST 후보를 공급망·telemetry·runtime 관점에서 심사하고 고정한다.
3. `security-check`를 통과시킨 뒤 남은 hook·CI·package·manifest를 논리적으로 커밋한다.
4. 요구사항의 미결정 항목과 우선 지원 웹 기술 스택을 확정한다.
5. `.ai/project.yaml`, `bootstrap`, `validate`와 downstream 설치 흐름을 구현한다.
6. 원격 저장소를 연결하고 versioned upstream baseline을 발행한다.

## 위험·주의

- Gitleaks와 CodeSight 감사는 완료했지만 SAST 후보는 승인 상태가 아니다.
- 현재 hook은 Semgrep 실패로 정상 commit을 차단하므로 보안 자동화를 완료한 것으로 간주하지 않는다.
- Superpowers의 원격 이미지 요청과 Agent Skills의 network cache hook은 기본 도입에서 제외했다.
- 현재 `tool/github-speckit`은 원본 clone이 아니라 Claude 통합 프로젝트 산출물이다.

## 다음 시작점

- 먼저 `docs/requirements.md`, `.ai/standards/security.md`와 현재 `git status`를 확인한다.
- 신규 설치나 파괴적 명령 없이 문서 승인 범위와 우선 기술 스택을 결정한다.
