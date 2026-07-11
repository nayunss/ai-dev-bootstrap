# Handoff

갱신: 2026-07-11 Asia/Seoul
상태: 진행 중

## 목표

Codex, Claude Code 등 서로 다른 AI 도구에서 재사용할 수 있는 안전한 AI 개발환경 공통
하네스를 설계한다. 현재까지 REQ-001부터 REQ-034까지 수집했다.

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
- Husky 선행 설치를 제거하고 프로젝트 개발환경과 실제 format·lint·test 명령이 승인된 뒤
  기술 스택 프로파일로 적용하도록 변경했다.
- Supabase·Firebase의 client/server key, RLS·Security Rules, App Check, environment와 배포
  가드레일을 추가했다.
- upstream이 질문 조건을 정의하고 downstream 사용자가 선택·승인·거절로 답하는
  Human-in-the-loop 계약과 Eval 기준을 추가했다.
- 첫 downstream 검증 대상 `../env-downstream`에서 pilot pin, 공급망 심사, Todo 구현, 공통 보안,
  CodeSight와 Husky 적용을 완료했다.
- downstream에서 format·lint·typecheck·unit 3건·production build·브라우저 E2E 5건과 full
  secret/SAST scan을 통과했다.
- pilot 피드백으로 TypeScript 7·ESLint 10 peer 충돌, PostCSS 전이 취약점, pnpm 11 override 위치,
  생성물 secret-scan 오탐과 Corepack 재다운로드 위험을 기록했다.
- REQ-031로 AI의 민감정보 비접근과 모든 `.env*` 파일 읽기·검색·색인 차단을 추가하고 Codex·
  Claude Code 공통 pre-tool 훅 및 회귀 테스트에 연결했다.
- REQ-032와 MCP 보안 조사 문서를 추가했다. 승인 manifest는 빈 allowlist·default-deny이며
  미승인 server·tool 호출과 CLI 설정 변경을 pre-tool 훅에서 차단한다.
- REQ-009에 언어·레이어별 코드 스타일 일관성, 저장소 formatter·linter 우선과 스타일 변경의
  명시적 migration 원칙을 추가했다. 두 토큰 프로파일 모두 같은 필수 품질 기준이라 분기하지 않는다.
- REQ-012에 project-local `.editorconfig` 적용과 formatter·linter 충돌 방지 요구사항을 추가하고
  upstream 자체에도 UTF-8·LF·끝 개행·공백 정리·2칸 들여쓰기 기준 파일을 적용했다.
- HANDOFF 갱신을 문서 규칙에서 자동 gate로 강화했다. staged task 변경과 PR base 범위에서
  `HANDOFF.md`가 빠지면 validator가 실패하며 공통 security-check와 CI가 이를 호출한다.
- Pilot 피드백을 `scripts/bootstrap`과 `scripts/validate`로 자동화했다. preview 기본값, exact
  version·lockfile·strict peer·scripts-off·pnpm 11 override·Next telemetry·Corepack 금지·온라인
  audit 분리와 Playwright/Husky 별도 승인을 검사한다.
- `v0.2.0-pilot` release note와 package version을 준비했다. clean clone 검증 결과, migration,
  rollback과 별도 checksum artifact 발행 계약을 기록했다.
- `v0.2.0-pilot` tag commit `a373c48`과 GitHub prerelease를 발행했다. archive SHA-256은
  `454a3d4a2d9781ce529f9e41408d1f3f59bff941c3a3e94e67ae099df07a4584`이며 게시 후 재다운로드
  검증을 통과했다.
- Downstream 적용 중 `v0.2.0-pilot` validator가 telemetry evidence 후보로 `.env.example`을
  읽는 REQ-031 위반을 발견해 적용·lock 갱신을 중단했다. 참조를 제거하고 source regression을
  추가한 `v0.2.1-pilot` hotfix를 준비한다.
- `v0.2.1-pilot` tag commit `ee4b352`과 GitHub prerelease를 발행했다. archive SHA-256은
  `a283c4688d141e67c519cc129bdeec3d9518fa90e0decbbe49ad37ff2df8fcbd`이며 clean clone과 게시
  asset 재다운로드 검증을 통과했다.
- Downstream ESLint가 validator의 미사용 `execFileSync` import warning을 발견해 동작 변화 없는
  safe lint 수정으로 upstream main과 downstream local override에 반영했다. 다음 release에 포함한다.
- REQ-034와 dependency upgrade workflow를 추가했다. 설치된 package의 update·downgrade·override·
  lockfile-only 변경은 영향 preview와 정확한 version 승인을 받기 전에는 실행하지 않는다.
- `v0.2.2-pilot` package version과 release note를 준비했다. v0.2.1 이후 validator lint 수정과
  REQ-034 dependency version 승인 계약만 묶고 application dependency는 변경하지 않는다.
- `v0.2.2-pilot` tag commit `bfe3ef0`과 GitHub prerelease를 발행했다. archive SHA-256은
  `880f9c6e127606bf746bf06ee7ba34285ac960b3187e06294348ce8e9c5972ca`이며 clean clone과 게시
  asset 재다운로드 검증을 통과했다.
- Dependency 승인 자동 gate를 추가했다. staged·PR range의 direct version과 lockfile-only SHA-256
  diff를 구조화된 승인 record와 대조하고 positive·negative fixture를 CI에서 실행한다.

## 현재 상태

- branch: `main`
- remote: `git@github.com:nayunss/ai-dev-bootstrap.git`, `main` 추적
- 최신 기능 commit: `6b20f02 feat: enforce task handoff updates`
- 최근 보안·품질 변경:
  - `7514549`: AI의 `.env*` 접근 차단
  - `2140c25`: 미승인 MCP default-deny
  - `f134ea1`: 코드 스타일 일관성
  - `6eb6e64`: project-local EditorConfig
  - `6b20f02`: HANDOFF staged·PR 자동 gate
- Semgrep은 거부하고 Opengrep `1.22.0`을 조건부 승인해 공통 security-check를 구현했다.
- 첫 downstream pilot `../env-downstream`은 독립 Git 저장소이며 upstream `v0.1.0-pilot`을
  `upstream.lock.yaml`로 고정했다. 이후 upstream 변경은 자동 반영되지 않는다.
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
- downstream은 upstream 파일을 symlink·submodule·실시간 참조하지 않는다. release/commit과
  checksum을 고정하고 diff·보안·호환성 검토와 Human-in-the-loop 승인 후에만 명시적으로
  upgrade한다.
- 검증되지 않은 MCP와 `.env*` 접근은 기본 차단하며 hook만이 아니라 sandbox·OS 권한·egress·
  IAM을 실제 보안 경계로 사용한다.
- EditorConfig는 에디터 기본 표현을, formatter는 코드 포맷을, linter는 정확성·유지보수 규칙을
  담당하며 서로 충돌하지 않게 한다.

## 변경 파일

- `docs/`: 요구사항과 설계 문서
- `.ai/`: 도구 중립 보안 정책·프로젝트 환경 워크플로·역할·manifest
- `HANDOFF.md`: 현재 세션 재개 정보
- `README.md`, `.gitignore`: 저장소 기본 파일
- `scripts/`: 공통 security, MCP manifest, HANDOFF와 CodeSight validator
- `.github/workflows/security.yml`: clean CI 보안 검사와 PR HANDOFF gate
- `.editorconfig`: upstream 표현 형식 기준

## 검증

- Agent Skills 내장 스킬 검증: PASS
- Agent Skills 명령 parity 검증: PASS
- 문서 trailing whitespace 검사: PASS
- 상대 Markdown 링크 대상 검사: PASS
- `security-tools.yaml` YAML 파싱: PASS
- Gitleaks 전체 저장소 secret scan: PASS
- CodeSight generate·read: PASS
- Semgrep `1.168.0`: FAIL·거부 — metrics off에서도 OpenTelemetry/X509 runtime crash
- Opengrep `1.22.0` source·license·release checksum: PASS, version check·metrics 강제 차단 조건
- Opengrep local-rule 전체 SAST: PASS
- SAST positive fixture 탐지·negative fixture 비탐지: PASS
- AI hook destructive Git 명령 차단: PASS
- AI hook `.env*` Read·Glob·Grep·Bash·MCP 차단과 일반 소스 Read 허용: PASS
- MCP manifest schema·만료·integrity 검증과 미승인 MCP 호출·설정 변경 차단: PASS
- HANDOFF 필수 구조·staged 동반 변경·PR range validator: PASS
- Bootstrap preview·downstream validator positive/negative fixture: PASS
- Dependency direct version·lockfile-only 승인 positive/negative fixture: PASS
- 원격 clean clone bootstrap·npm audit·security full scan: PASS
- 원격 clean clone CodeSight stale check: 최초 FAIL 후 timestamp 정규화 적용, 최종 PASS
- 최신 clean clone `npm ci --ignore-scripts`·npm audit·checksum bootstrap·full security: PASS
- Markdown 시각 렌더링 검사: 미구현

## 남은 작업

1. Downstream CI·배포 제공자와 운영 환경을 감지하고 미확정 항목을 Human-in-the-loop로 확인한다.
2. 승인된 범위의 CI·배포 프로파일을 적용하고 security·quality·deployment preview를 검증한다.

## 위험·주의

- Opengrep은 opt-out 강제 조건부 승인이므로 version check·metrics 환경변수 검증을 제거하면 안 된다.
- Husky는 downstream 개발환경과 품질 명령 승인 전까지 적용하지 않는다.
- Superpowers의 원격 이미지 요청과 Agent Skills의 network cache hook은 기본 도입에서 제외했다.
- 현재 `tool/github-speckit`은 원본 clone이 아니라 Claude 통합 프로젝트 산출물이다.

## 다음 시작점

- 먼저 `docs/requirements.md`, `.ai/standards/security.md`와 현재 `git status`를 확인한다.
- 신규 설치나 파괴적 명령 없이 문서 승인 범위와 우선 기술 스택을 결정한다.
