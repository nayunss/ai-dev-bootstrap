# 요구사항

이 문서는 대화를 통해 확인되는 요구사항을 지속적으로 누적하는 단일 목록입니다.
아직 합의되지 않은 아이디어는 확정 요구사항과 구분합니다.

## 목표

- 매번 새로 만드는 웹 애플리케이션에 재사용할 수 있는 AI 개발 환경을 제공한다.
- 서로 다른 AI 도구를 쓰는 개발자들이 동일한 프로젝트 규칙과 작업 절차를 따른다.
- 개발자마다 다른 스킬, 플러그인, 폴더 구조의 차이를 관리 가능한 형태로 표준화한다.
- 공통 환경 자체를 Git으로 버전 관리하고 협업할 수 있게 한다.

## 확정 요구사항

이 절의 `REQ-001`~`REQ-046`는 모두 **요구사항 상태: 승인**이다. 승인은 구현 완료를 뜻하지 않는다.
구현·검증 상태는 아래 표로 별도 관리하며, 새 요구사항을 추가하거나 상태가 바뀌면 관련 문서·Eval·
`HANDOFF.md`를 같은 작업에서 갱신한다.

현재 프로젝트 단계는 요구사항·설계와 downstream pilot 검증이다. 이 단계의 validator·fixture 구현은
설계를 검증하는 수단이며 최종 실제 공통 환경의 구현 완료를 의미하지 않는다. 핵심 설계·검증이 끝난
뒤 이 문서와 `docs/`의 현행 설계를 입력 계약으로 사용해 실제 환경 구현 단계를 별도로 시작한다.

| 요구사항 | 구현·검증 상태 | 근거 또는 남은 gate |
|---|---|---|
| REQ-001~004 | 적용 | 독립 저장소·요구사항 목록·Git 이력. 개별 상태 추적은 이 표로 적용 |
| REQ-005~008 | 부분 검증 | 선호 도구·외부 자산 검토 완료, 선택 설치 adapter는 계속 확장 |
| REQ-009~014 | 부분 검증 | 공통 정책과 frontend pilot 검증. stack별 자동 lint·접근성 Eval은 제한적 |
| REQ-015~016 | 부분 검증 | 보안 hook·SAST fixture 적용, 실제 IAM·복구 이중 통제는 downstream별 검증 필요 |
| REQ-017 | 적용 | staged·PR HANDOFF gate와 semantic-change regression 적용 |
| REQ-018 | 적용 | CodeSight 생성·CI stale 검사와 공통 세션 진입점 연결 |
| REQ-019~024 | 부분 검증 | 문서·workflow 적용. 요구사항 변경의 자동 추적성 검사는 제한적 |
| REQ-025 | 부분 검증 | 결정론적 fixture 존재, 전체 capability suite·비결정 trial 계측은 미완료 |
| REQ-026~028 | 부분 검증 | bootstrap·validate와 downstream 적용 검증. upstream hook은 환경 승인 대기 |
| REQ-029~030 | 설계 완료 | BaaS·HITL 계약 작성, provider별 downstream Eval 필요 |
| REQ-031~036 | 부분 검증 | 민감 파일·MCP·bootstrap·dependency·build policy·CI 배포 fixture 적용, 다음 release 대기 |
| REQ-037~039 | 부분 검증 | 확장 스펙·engineering adapter·role 정책 적용, 다중 도구 Eval 확대 필요 |
| REQ-040 | 부분 검증 | BOLA pilot PASS, rate limit·retention·restore·법률 applicability Eval 미완료 |
| REQ-041 | 설계 완료 | bounded-patch pilot과 격리 grader Eval 미착수 |
| REQ-042 | 부분 구현 | canonical `.ai/`와 Codex·Claude adapter 적용, generator hash·uninstall Eval 미완료 |
| REQ-043 | 설계 완료 | scanner 공급망 심사와 source-match fixture 미착수 |
| REQ-044 | 부분 검증 | env-be Spring Boot 4/SpringDoc 3 contract·breaking-change·production exposure fixture PASS. undocumented endpoint·frontend BFF와 다른 stack 미검증 |
| REQ-045 | 부분 검증 | 재귀 inventory·drift 자동화와 env-be 증분 remediation, 3-service PR 격리·CRUD·application rollback PASS. 최초 full-stack 일괄 materialize·DB migration rollback 미검증 |
| REQ-046 | 설계 완료 | 단독·다중 pilot, downstream 시작·blind 검증·feedback schema와 AI provenance·전원 PASS 계약 작성. 독립 tester 간 실제 재현·결과 취합 운영은 미검증 |

### REQ-001: 독립 저장소

- 관련 작업은 `common-project` 저장소에서 진행한다.
- 기본 브랜치는 `main`을 사용한다.
- 원격 Git 저장소에 게시할 수 있어야 한다.

### REQ-002: 복수 AI 도구 지원

- Codex와 Claude Code를 우선 지원한다.
- 공통 규칙은 특정 도구의 설정 파일에만 존재해서는 안 된다.
- 도구별 진입점은 동일한 공통 규칙을 참조해야 한다.

### REQ-003: 개발 환경 공통화

- 프로젝트 폴더 구조의 기준을 정의한다.
- 공통 스킬과 선택 스킬을 구분한다.
- 플러그인과 외부 도구의 설치 및 호환성 정보를 관리한다.
- AI 에이전트의 역할과 권한을 정의한다.
- AI를 포함한 SDLC를 정의한다.

### REQ-004: 점진적 요구사항 관리

- 새로운 요구사항을 이 문서에 계속 추가한다.
- 각 요구사항은 고유 ID와 상태를 가진다.
- 설계 문서는 요구사항 ID를 추적할 수 있어야 한다.

### REQ-005: 검증된 선호 도구 활용

- Claude Code에서 검증해 자주 사용할 선호 항목은 Ponytail, Superpowers,
  `claude-code-lsps`, Andrej Karpathy Skills, Brown Claude Marketplace의
  `ideas-come-true`, Hallmark, `frontend-design`이다.
- Claude Code 전용 기능은 다른 AI 도구에서 동일한 결과를 내는 도구 중립 스킬이나
  해당 도구의 네이티브 기능으로 연결한다.
- 공통 기능이 존재하면 Claude Code 전용 플러그인을 공통 코어로 복제하지 않는다.

### REQ-006: 설치 전 보안 심사

- 스킬과 플러그인은 설치 전에 출처, 라이선스, 실행 코드, 훅, 네트워크 통신,
  권한과 의존성을 검토한다.
- 텔레메트리, 추적 픽셀 또는 사용 데이터 전송이 기본 활성화된 도구는 설치하지 않는다.
- 옵트아웃에 의존하는 도구는 비활성화 상태를 자동 검증할 수 있을 때만 조건부 허용한다.
- 승인 버전 또는 Git 커밋과 무결성 해시를 잠그고, 업데이트할 때 다시 심사한다.

### REQ-007: 플러그인 독립적인 하네스

- 공통 하네스의 핵심 기능은 특정 AI 도구나 플러그인 없이도 동작해야 한다.
- Codex, Claude Code 등 도구별 플러그인은 선택적 자동화 계층으로 취급한다.
- 프로젝트 설정 질문은 대화형으로 진행할 수 있지만 최종 결과는 저장소의 선언 파일과
  문서로 기록해 모든 개발자와 AI 도구가 재현할 수 있게 한다.
- 자유형 프롬프트만으로 하네스의 현재 상태를 유지하지 않는다.

### REQ-008: 외부 하네스 자산의 선택 도입

- 로컬에 확보한 `addyosmani/agent-skills`와 GitHub Spec Kit 산출물을 공통 환경의
  아키텍처, 스킬, 에이전트와 SDLC에 비교 평가한다.
- 전체 설치, 일부 스킬 직접 사용, 설계 패턴 차용을 구분한다.
- 기존 선호 플러그인과 역할이 중복되면 하나의 기본 라우터만 선택한다.
- 외부 저장소를 그대로 복사하기보다 필요한 최소 자산을 출처와 라이선스를 보존해 도입한다.
- Spec Kit처럼 작업 규모에 따라 비용이 달라지는 도구는 필수가 아닌 선택 프로필로 제공한다.

### REQ-009: 언어 중립 코드 품질

- 사용하는 프로그래밍 언어와 프레임워크에 관계없이 유지보수성, 가독성과 클린 코드를
  우선한다.
- 모듈, 클래스, 함수와 컴포넌트는 관심사를 분리하고 하나의 명확한 변경 이유를 갖게 한다.
- 현재 요구사항에 필요하지 않은 코드, 추측성 추상화, 불필요한 의존성과 보일러플레이트를
  만들지 않는다.
- 동일한 언어·레이어·모듈에서는 naming, import 순서, 들여쓰기, 파일 구성, 오류 처리와 유사한
  문제의 구현 패턴을 일관되게 유지한다.
- 새 코드는 개인 취향이나 AI 도구의 기본 스타일보다 저장소의 승인된 formatter·linter 설정과
  인접한 기존 코드의 명확한 관례를 우선한다.
- 기존 스타일이 안전성·가독성·접근성 또는 현재 표준과 충돌하면 한 파일만 다르게 작성하지 않고
  영향 범위와 migration을 검토해 명시적인 변경으로 통일한다.
- 함수 또는 메서드의 인자와 매개변수는 기본적으로 3개 이하로 유지한다.
- 인자나 매개변수가 4개 이상이면 값 객체, 옵션 객체, 책임 분리 또는 API 재설계를 먼저
  검토한다.
- 숫자 제한만 피하기 위한 의미 없는 객체 포장이나 래퍼 함수는 만들지 않는다.

### REQ-010: JavaScript 표현 복잡도

- JavaScript와 TypeScript에서 한 번의 구조 분해 할당이 4개 이상의 이름을 꺼내거나,
  하나의 표현식·호출·객체 구성에서 spread/rest 연산이 4개 이상 필요하면 설계를 재검토한다.
- 긴 구조 분해는 필요한 값만 가까운 위치에서 읽거나 의미 있는 하위 객체로 책임을 나눈다.
- 반복적인 spread 병합은 명시적인 변환 함수, 데이터 모델 또는 더 단순한 상태 구조로 바꾼다.
- 원본 데이터 계약을 그대로 매핑해야 하는 경계 코드에서는 명시적인 예외를 허용하되
  가독성과 테스트 가능성을 증명한다.

### REQ-011: 시멘틱 웹과 접근성

- 웹 UI는 시각적 모양이 아니라 의미와 동작에 맞는 HTML 요소를 사용한다.
- 탐색은 `<a>`, 현재 화면의 동작은 `<button>`을 사용한다.
- 클릭, 키보드 또는 포커스 동작을 일반 `<div>`나 `<span>`에 부여하지 않는다.
- 문단은 `<p>`, 중요 강조는 `<strong>`, 문맥상 강조는 `<em>` 등 의미에 맞는 요소를 쓴다.
- 제목 계층, landmark, 목록, 표, 폼 label과 오류 메시지를 의미에 맞게 구성한다.
- 네이티브 HTML로 표현할 수 있을 때 ARIA나 커스텀 위젯으로 대체하지 않는다.
- 키보드, 포커스, 스크린 리더 이름과 상태, 색상 외 정보 전달을 검증한다.

### REQ-012: 프론트엔드 기본 품질 도구

- 프로젝트 루트에는 `root = true`인 `.editorconfig`를 두고 문자 인코딩, 줄바꿈, 파일 끝 개행,
  trailing whitespace와 들여쓰기의 에디터 기본값을 선언한다.
- 언어·파일별 들여쓰기는 승인된 개발환경 프로파일에 맞춰 section으로 재정의하며 formatter·
  linter 설정과 충돌하지 않게 검증한다.
- 프론트엔드 프로젝트는 EditorConfig, Prettier, ESLint, TypeScript용 typescript-eslint와 Husky를
  기본 품질 도구로 구성한다.
- TSLint는 폐기된 도구이므로 신규 프로젝트에 설치하지 않는다. 기존 프로젝트에서는
  typescript-eslint로 마이그레이션하는 동안에만 한시적으로 허용한다.
- 포맷은 Prettier, 코드 정확성과 유지보수 규칙은 ESLint가 담당하도록 책임을 분리한다.
- 도구와 플러그인은 정확한 버전을 잠그고 공급망 보안 게이트를 통과해야 한다.
- 단, 실제 설치와 Husky 활성화는 프로젝트 개발환경 프로파일이 JavaScript·TypeScript 기반
  프론트엔드 사용을 확정하고 실행할 format·lint·typecheck·test 명령이 정의된 뒤 수행한다.

### REQ-013: AI 변경과 Git 훅

- AI가 프론트엔드 코드를 변경한 뒤 해당 변경 파일에 포맷과 자동 수정 가능한 린트 규칙을
  적용하고, 수정 불가능한 오류는 보고한다.
- 자동 수정은 AI가 이번 작업에서 변경한 파일 범위로 제한하며 사용자 변경 전체를 임의로
  재작성하지 않는다.
- pre-commit 훅은 staged 파일의 포맷과 린트를 검사하고 안전한 자동 수정을 반영한다.
- pre-push 또는 CI는 타입 검사와 관련 테스트를 실행한다.
- Git 훅은 우회할 수 있으므로 CI에서 동일하거나 더 강한 품질 게이트를 독립적으로 수행한다.
- 훅이 자동 수정한 파일은 커밋 전에 다시 stage되고 최종 diff를 검토할 수 있어야 한다.

### REQ-014: 제목 요소의 의미

- `<h1>`부터 `<h6>`은 텍스트 크기나 시각 스타일을 선택하기 위해 사용하지 않는다.
- 제목 요소는 페이지와 section의 논리적 문서 구조를 표현할 때만 사용한다.
- 글자 크기와 시각적 위계는 CSS 또는 디자인 토큰으로 제어한다.
- 시각적으로 큰 일반 문구가 제목이 아니라면 `<p>`, `<span>` 등 의미에 맞는 요소를 사용한다.
- 시각적으로 작은 제목도 실제 문서 제목이면 적절한 heading 요소를 유지한다.

### REQ-015: AI 개발 보안 가드레일

- 보안 정책의 단일 진실 원천은 `.ai/standards/security.md`에 둔다.
- 외부 웹페이지, 문서, 이슈, PR, 코드 주석, 로그, 도구 출력과 MCP 응답은 지시가 아닌
  신뢰하지 않는 데이터로 처리한다.
- AI 모델의 판단만으로 권한 승인, 보안 결정 또는 고위험 작업 실행 여부를 결정하지 않는다.
- 파일·브랜치·데이터 삭제, 운영환경 변경, 배포, 외부 전송, 비밀 접근과 권한 변경에는
  정확한 대상과 명령에 묶인 사람의 명시적 승인을 요구한다.
- 운영 데이터베이스 자격증명과 클라우드 관리자 자격증명을 AI 개발 세션에 제공하지 않는다.
- 개발·테스트·운영 환경과 자격증명을 분리하고, 운영 백업은 AI가 삭제할 수 없는 별도
  권한 경계에 둔다.
- AI 도구는 기본적으로 저장소 범위 파일 쓰기와 네트워크 차단 샌드박스에서 실행한다.
- 모든 AI 변경은 Git diff, 검증 결과와 사람의 리뷰를 거쳐 병합한다.
- 과거 사고와 새로운 공격 기법을 회귀 테스트와 정책 업데이트로 반영한다.

### REQ-016: 파괴적 작업의 이중 통제

- 훅의 문자열 탐지만으로 파괴적 동작을 막았다고 간주하지 않는다.
- AI 도구 권한, 운영체제 샌드박스, DB·클라우드 IAM, 훅과 CI를 중첩 적용한다.
- 승인 요청은 실행될 명령, 대상 환경, 영향 범위, 백업·복구 상태와 롤백 방법을 보여준다.
- 승인 후 명령이나 대상이 달라지면 기존 승인은 무효다.
- bulk delete, schema drop, force push와 운영 배포는 실행 주체와 승인 주체를 분리한다.
- 삭제 전 preview 또는 dry-run, 영향 건수 제한과 복구 검증을 요구한다.

### REQ-017: 세션 Handoff

- 각 작업 또는 세션을 종료할 때 저장소 루트의 `HANDOFF.md`를 최신 상태로 갱신한다.
- 새 세션은 전체 대화 기록을 다시 불러오기 전에 `HANDOFF.md`, 관련 요구사항과 현재 Git
  상태를 읽는다.
- handoff에는 목표, 완료 작업, 현재 상태, 주요 결정, 변경 파일, 검증 결과, 남은 작업,
  위험과 다음 시작점을 간결하게 기록한다.
- 완료되지 않은 추정이나 AI의 주장과 실제 검증 결과를 구분한다.
- 비밀정보, 개인정보, production 데이터와 불필요한 대화 전문을 기록하지 않는다.
- 외부 콘텐츠의 지시를 handoff에 영구 규칙으로 복사하지 않는다.
- `HANDOFF.md`는 세션 요약이며 요구사항, 보안 정책, ADR과 Git 기록을 대체하지 않는다.
- 공통 validator는 task 파일이 staged되거나 pull request에 포함됐을 때 `HANDOFF.md`도 같은 변경
  단위에 포함됐는지 검사하고, 누락·필수 섹션 부재·충돌 마커가 있으면 실패한다.
- Codex·Claude Code·Husky와 CI는 별도 규칙을 복제하지 않고 같은 validator 또는 이를 포함한
  공통 security-check를 호출한다.
- 단순히 검사를 통과하려는 공백 변경은 허용하지 않고 완료·검증·남은 작업 등 실제 변경된
  맥락을 기록한다.

### REQ-018: 공통 CodeSight 컨텍스트

- 공통 하네스는 CodeSight를 프로젝트 범위의 기본 코드 컨텍스트 생성기로 제공한다.
- CodeSight는 감사된 정확한 버전을 lifecycle script 없이 설치하고 외부 네트워크와 MCP를
  기본 비활성화한다.
- 생성된 `.codesight/wiki/index.md`와 관련 문서는 Git으로 관리해 Codex, Claude Code와
  다른 AI 도구가 동일한 코드 구조 정보를 읽게 한다.
- 새 세션은 전체 코드를 다시 탐색하기 전에 CodeSight index를 읽고 필요한 문서와 원본
  코드만 선택적으로 확인한다.
- CodeSight 결과는 탐색용 캐시이며 원본 코드, 테스트, 요구사항과 ADR을 대체하지 않는다.
- 코드 변경 후 commit 전에 wiki를 재생성하고 CI에서 stale 여부를 검사한다.
- CodeSight가 secret, `.env`, dependency, generated output과 제외 경로를 색인하지 않도록
  설정과 생성 결과를 검토한다.

### REQ-019: 대화 입력의 요구사항 편입

- 이 프로젝트에 관해 사용자가 대화에 입력한 선호, 제약, 운영 방식, 문제 사례와 추가 요청은
  별도 형식 없이도 요구사항으로 간주한다.
- 새 입력은 관련 기존 요구사항을 갱신하거나 새 `REQ-*` 또는 `NFR-*` ID로 추적한다.
- 요구사항 반영은 문서 작성으로 끝내지 않고 해당되는 아키텍처, 스킬, hook, CI, 검증과
  `HANDOFF.md`까지 연결한다.
- 기존 요구사항과 충돌하거나 여러 해석이 결과를 크게 바꾸면 임의 확정하지 않고 충돌과
  가정을 기록해 사용자에게 확인한다.
- 사용자가 요구사항을 철회, 변경 또는 실험 항목으로 지정하면 현재 의도를 우선하고 변경
  기록을 남긴다.

### REQ-020: 프로젝트별 개발환경 정의

- 프레임워크, 언어, 런타임, 상태 관리, CSS, 데이터베이스, 테스트와 배포 환경은 공통
  하네스에 하나의 값으로 고정하지 않고 프로젝트 프로파일로 관리한다.
- 기존 프로젝트에서는 manifest, lockfile, 설정과 소스에서 먼저 자동 감지하고, 확인할 수
  없거나 서로 충돌하는 항목만 사용자에게 질문한다.
- 신규 프로젝트에서는 프로젝트 유형과 운영 제약을 먼저 확인한 뒤 필요한 질문만 단계적으로
  제시한다. 사용자가 개발환경 정의서를 제공하면 질문보다 해당 문서를 우선 입력으로 삼는다.
- 질문의 답과 감지 결과는 `docs/development-environment.md`에 기록하며 자유형 프롬프트나
  AI 세션 기억만을 설정의 근거로 사용하지 않는다.
- `latest`는 사용자의 업데이트 의도를 나타낼 때만 허용한다. 설치와 CI에는 검증 시점의 정확한
  버전, lockfile, 런타임 버전과 지원 범위를 고정한다.
- 아키텍처와 운영에 영향을 주는 결정은 `docs/decisions/`의 ADR로 근거와 대안을 기록한다.
- 문서와 실제 manifest·lockfile·CI 설정의 불일치는 자동 검증 대상으로 삼는다.

### REQ-021: 개발환경 질문과 승인 경계

- AI는 한 번에 전체 설문을 요구하지 않고 프로젝트 유형, 실행 환경, 핵심 스택, 품질·테스트,
  운영·보안 순으로 질문 범위를 좁힌다.
- 프론트엔드는 렌더링 방식, 상태 관리, 스타일링, 테스트, 접근성 기준, 대상 브라우저·기기와
  국제화 요구를 확인한다.
- 백엔드는 언어·프레임워크, API 방식, 데이터베이스·마이그레이션, 인증·인가, 비동기 처리,
  캐시와 외부 연동을 확인한다.
- 공통으로 패키지 관리자, 저장소 형태, 배포 대상, CI, 관측성, 성능 목표, 데이터 분류,
  비밀 관리, 백업·복구와 규제 요구를 확인한다.
- 인증, 개인정보, 외부 전송, 클라우드·운영 DB 접근, 데이터 보존·삭제, 배포 권한처럼 보안과
  비용에 영향을 주는 항목은 AI가 기본값으로 확정하지 않고 사용자의 명시적 확인을 받는다.
- 확정되지 않은 값은 추측해 구현하지 않고 `TBD`와 결정 책임자 또는 확인 조건을 기록한다.

### REQ-022: 토큰 예산별 실행 프로파일

- 공통 하네스는 토큰 사용량을 줄이는 `token-aware` 프로파일과 토큰 제약 없이 충분히
  탐색·분석하는 `full` 프로파일을 제공한다.
- 프로파일은 결과의 정확성·보안·필수 품질 게이트가 아니라 컨텍스트 읽기 범위, 설명 깊이,
  대안 수, 중간 산출물과 검증의 확장 범위를 조정한다.
- 새 프로젝트 또는 새 세션에서 저장된 설정이 없으면 AI는 사용 가능한 토큰 예산이나 원하는
  프로파일을 짧게 확인한다. 답이 없으면 `token-aware`로 시작하고 위험·불확실성이 커질 때
  필요한 확장 범위를 사용자에게 알린다.
- 선택한 프로파일은 프로젝트 기본값과 세션별 override를 구분한다. 팀원이 서로 다른 AI 도구와
  토큰 한도를 사용해도 필수 완료 조건은 동일해야 한다.
- `token-aware`에서도 secret scan, SAST, 승인 경계, 파괴적 작업 차단, 관련 테스트와
  `HANDOFF.md`는 생략할 수 없다.
- `full`은 불필요한 코드, 문서, 추상화 또는 무관한 전체 저장소 재탐색을 허용하는 모드가 아니다.
- 토큰 부족으로 필수 검증이나 안전한 완료가 불가능하면 완료로 표시하지 않고 수행하지 못한
  항목과 다음 시작점을 handoff에 기록한다.

### REQ-023: 요구사항과 토큰 프로파일 동기화

- 요구사항이 추가, 수정, 철회되거나 우선순위가 바뀔 때마다 `token-aware`와 `full` 실행
  프로파일에 미치는 영향을 함께 검토한다.
- 각 프로파일에서 달라지는 탐색 범위, 사용자 질문, 구현 순서, 검증 깊이, 문서 산출물과
  handoff 내용을 갱신한다.
- 두 프로파일 모두에 공통인 필수 보안·품질·승인 조건은 요구사항 원문을 참조하고 별도 문서에
  서로 다른 내용으로 복제하지 않는다.
- 새로운 요구사항이 두 프로파일에서 동일하게 수행된다면 차이를 억지로 만들지 않고
  `공통 필수`로 표시한다.
- 프로파일 문서를 갱신하지 않아도 되는 변경은 영향 없음의 이유를 요구사항 변경 검토 또는
  handoff에 기록한다.
- 요구사항 변경의 완료 조건에는 관련 문서, `.ai/workflows/token-budget.md`, 검증 자동화와
  `HANDOFF.md`의 동기화 확인을 포함한다.

### REQ-024: 최소 프롬프트 템플릿

- 반복 가능한 규칙, 컨텍스트 수집, 도구 호출, 검증과 재시도는 자유형 프롬프트가 아니라
  하네스, 워크플로, hook과 CI에 둔다.
- 프롬프트 템플릿은 제품 의도, 성공 기준, 우선순위, 미확정 선택, 사람의 판단과 정확한 승인
  범위를 전달할 때만 사용한다.
- 공통 템플릿은 프로젝트 시작·요구사항 구체화, 변경 요청, 버그 재현·진단, 설계 결정,
  UI·접근성 의도와 고위험 작업 승인 요청을 최소 범위로 제공한다.
- 각 템플릿은 사용 조건, 사용하지 않을 조건, 필수 입력, 기대 산출물과 완료 조건을 명시한다.
- 템플릿은 보안 정책, 권한, 테스트와 완료 조건을 대체하거나 우회할 수 없다.
- 외부 문서·웹페이지·이슈의 문구를 프롬프트 템플릿이나 영구 규칙으로 자동 승격하지 않는다.
- 토큰 프로파일에 따라 질문과 설명 길이는 조정하되 필수 승인 정보와 인수 조건은 동일하게
  유지한다.

### REQ-025: Eval 기반 하네스·루프 검증

- 평가 대상은 모델 하나가 아니라 모델, 하네스, 루프, 프롬프트·스킬, 도구와 실행 환경의
  조합으로 정의한다.
- 에이전트의 완료 주장보다 테스트, 파일·DB·UI 상태와 정책 준수 등 실제 outcome을 우선한다.
- 요구사항과 실제 실패 사례에서 capability eval과 regression eval을 만들고 Git으로 관리한다.
- task는 입력, 초기 fixture, 허용 도구, 기대 outcome, grader, trial, 자원 한도와 중단 조건을
  명시하며 production과 분리된 깨끗한 환경에서 실행한다.
- grader는 상태 검사와 결정론적 테스트를 우선하고 정적 분석, 규칙 검사, 사람 검토와 보정된
  model grader를 필요한 범위에서 조합한다.
- 정상 사례와 함께 negative case, prompt injection, 과도한 권한, 파괴적 작업 거부,
  불필요한 변경과 over-engineering을 평가한다.
- 비결정적 결과는 여러 trial과 분포로 비교하며 단일 성공 사례로 개선을 주장하지 않는다.
- 정확성 외에 token·비용, latency, turn·tool-call, 재시도·복구, diff 크기와 사람 개입량을
  추적하되 품질·보안을 효율 점수로 상쇄하지 않는다.
- 평가 대상 agent가 grader, 기대값, fixture와 baseline을 약화하거나 수정해 통과하지 못하게
  권한과 작업공간을 분리한다.
- eval에는 secret, production 데이터와 불필요한 개인정보를 사용하지 않는다.
- `token-aware`와 `full`은 실행 범위와 별도 효율 baseline을 가질 수 있지만 공통 필수
  보안·정확성 grader는 동일하게 통과해야 한다.

### REQ-026: Clone 후 동일한 AI 개발환경 구성

- 이 저장소는 각 사용자가 clone한 뒤 서로 다른 개인 AI 도구 환경을 프로젝트 범위의 동일한
  개발 하네스로 정렬하고 안전하게 개발을 시작하도록 제공한다.
- onboarding은 사용자 운영체제, AI 도구, 런타임과 기존 전역 설정을 읽기 전용으로 진단하고
  필수·선택·충돌·미지원 항목을 보고한다.
- 공통 정책, 스킬, prompt, workflow, hook, scanner, formatter, linter와 Eval의 승인 버전은
  저장소 manifest·lockfile과 프로젝트 로컬 설치로 재현한다.
- 개인 전역 설정이나 다른 프로젝트 파일을 동의 없이 덮어쓰지 않는다. 도구별 전역 설치가
  불가피하면 변경 내용, 권한, 텔레메트리와 되돌리기 방법을 보여주고 명시적 승인을 받는다.
- Codex, Claude Code와 다른 지원 도구는 얇은 어댑터를 통해 동일한 공통 정책과 검증 명령을
  호출하며 특정 AI 도구가 없어도 공통 품질 게이트는 실행 가능해야 한다.
- bootstrap은 반복 실행해도 안전한 idempotent 방식이어야 하며 설치 전 공급망 심사, 정확한
  버전·해시 검증과 lifecycle script 차단을 적용한다.
- validate는 clone 후 개발 준비 상태, 도구 버전, 설정 drift, 텔레메트리·네트워크 정책,
  hook·CI 연결과 필수 Eval grader를 확인한다.
- onboarding이 통과하기 전에는 코드 생성을 기본 시작하지 않으며, 미지원 또는 미설치 항목은
  우회하지 않고 해결 방법과 제한을 보고한다.

### REQ-027: Upstream 유지보수와 Downstream 도입 분리

- 저장소는 공통 환경 자체를 개발·운영하는 `upstream-maintenance` 경로와 이를 clone·fork해
  실제 프로젝트에 적용하는 `downstream-adoption` 경로를 명시적으로 구분한다.
- upstream maintainer와 contributor는 공통 정책, 스킬·플러그인 후보, bootstrap, adapter,
  Eval, 보안 도구와 배포 버전을 변경하며 호환성·공급망·migration 책임을 가진다.
- downstream adopter는 회사 또는 프로젝트의 기술 스택, 추가 정책, 허용 도구와 배포 환경을
  확정하고, 일반 개발자는 승인된 환경에서 제품 코드를 개발한다.
- 회사·조직의 확장은 upstream 코어를 직접 훼손하지 않고 별도의 조직 policy, manifest,
  profile과 adapter override 계층에 둔다.
- downstream의 비밀, 내부 URL, 사내 규칙과 proprietary skill은 public upstream에 자동
  전송하거나 포함하지 않는다.
- downstream은 upstream release·commit·무결성 정보를 잠그고 명시적으로 업그레이드한다.
  자동 pull이나 무검토 최신 버전 추종을 기본으로 하지 않는다.
- upstream 변경은 공통 regression·호환성·보안 Eval을 통과하고 changelog, migration,
  rollback과 지원 범위를 포함한 versioned release로 제공한다.
- downstream 도입과 업그레이드는 조직 고유 정책·프로젝트 테스트를 추가 실행하고 생성된
  diff를 사람이 승인해야 한다.
- downstream에서 발견한 일반화 가능한 개선은 비밀과 조직 정보를 제거한 issue·PR·Eval
  regression case로 upstream에 기여할 수 있다.
- 하나의 사람이 maintainer와 adopter 역할을 동시에 수행할 수 있지만 작업 모드와 적용 대상,
  권한 및 완료 조건은 섞지 않는다.

### REQ-028: 개발환경 확정 후 Git Hook 적용

- upstream 공통 저장소는 Husky를 무조건 설치·활성화하거나 모든 downstream에 JavaScript
  package lifecycle을 강제하지 않는다.
- `docs/development-environment.md`가 승인되고 언어, 패키지 관리자, monorepo 경계와 실제 검증
  명령이 확정된 뒤 해당 기술 스택용 Git hook adapter를 적용한다.
- JavaScript·TypeScript 프론트엔드 프로파일은 공급망 심사를 통과한 Prettier, ESLint,
  typescript-eslint, staged-file runner와 Husky를 정확한 버전으로 함께 구성한다.
- 다른 언어·생태계는 해당 환경의 native hook manager 또는 도구 중립 Git hook adapter를
  선택할 수 있으며 Husky를 필수로 설치하지 않는다.
- hook 적용 전 설치 파일, lifecycle script, 실행 명령, 자동 수정 범위와 제거 방법을 preview해
  사용자의 승인을 받는다.
- 설정되지 않은 명령을 가리키는 빈 hook이나 보안 검사만 있는 불완전한 Husky 구성을 만들지
  않는다.
- hook은 CI를 대체하지 않으며 활성화 여부와 무관하게 공통 보안·필수 품질 gate를 CI에서
  독립적으로 실행한다.

### REQ-029: Supabase·Firebase 보안 프로파일

- downstream이 Supabase 또는 Firebase를 선택하면 upstream은 서비스별 보안 질문, default-deny
  정책, 검증기와 배포 gate를 제공한다.
- Supabase browser에는 publishable·anon 범위 key만 허용하고 `service_role`, secret key, DB
  password와 RLS bypass 권한을 포함하지 않는다.
- Supabase exposed table과 Storage에는 RLS를 활성화하고 role·operation·ownership별 최소 권한과
  cross-user·cross-tenant negative test를 검증한다.
- Firebase client API key는 project 식별자일 수 있음을 구분하되 Firebase 관련 API로 제한하고,
  데이터 권한은 Security Rules·IAM·App Check로 강제한다.
- Firebase service account, Admin SDK credential, Gemini·비 Firebase API key는 browser bundle,
  public 환경 변수와 저장소에 포함하지 않는다.
- Firestore, Realtime Database와 Cloud Storage는 제품마다 default-deny Rules와 emulator test를
  제공하고 production 배포 전에 ruleset diff를 승인받는다.
- 두 서비스 모두 local·test·staging·production project와 credential, billing·quota, backup,
  retention·deletion, audit log와 incident response를 분리한다.
- AI는 production console, admin credential, schema·rules 배포, bulk write·delete와 project
  삭제를 사용자 승인 없이 수행하지 않는다.
- provider 선택은 telemetry, 외부 전송, region, 개인정보·규제, lock-in, export·rollback을
  검토해 개발환경 문서와 ADR에 기록한다.

### REQ-030: Upstream·Downstream Human-in-the-loop 계약

- upstream은 질문 조건, 필수 필드, 승인 형식·유효 범위와 무응답 시 default-deny를 정의한다.
- downstream AI는 자동 감지 가능한 값을 반복 질문하지 않고 결과를 크게 바꾸거나 권한·보안·
  비용·데이터·배포에 영향을 주는 미확정 사항만 질문한다.
- downstream 사용자는 대상, 영향, 대안, 추천안, 검증·rollback을 확인하고 선택·승인·거절하거나
  추가 정보를 요청한다.
- 승인은 특정 명령, 환경, resource, 범위와 유효 시간에 묶고 대상이 바뀌면 다시 질문한다.
  침묵, 과거의 포괄 동의와 모호한 긍정은 승인으로 보지 않는다.
- 인증·인가, 개인정보·외부 전송, production, secret, 비용, 의존성·hook 설치, 배포·migration·
  삭제와 보안 통제 변경은 Human-in-the-loop 대상이다.
- 저위험 read-only 진단, 승인된 범위의 결정론적 검사와 되돌릴 수 있는 project-local 변경은
  질문 남발 없이 수행할 수 있다.
- 질문과 답은 비밀 없는 구조화된 결정으로 요구사항·개발환경 문서·ADR 또는 승인 기록에
  반영하며 채팅 기억만을 근거로 실행하지 않는다.
- 토큰 프로파일은 설명 길이를 조정할 수 있지만 필수 질문과 승인 정보는 생략하지 않는다.

### REQ-031: AI의 민감 파일 비접근

- AI는 secret, credential, 개인정보와 그 밖의 민감한 정보를 읽지 않는다.
- downstream의 파일명이 `.env`로 시작하면 내용과 용도에 관계없이 AI의 읽기, 검색, glob, shell,
  MCP, 색인과 context 수집을 차단한다. `.env.example`도 예외로 두지 않는다.
- upstream은 지원 AI 도구 adapter가 공통 pre-tool 보안 훅을 호출하게 하고 `.env*` 접근 차단
  회귀 테스트를 제공한다.
- downstream은 hook만 신뢰하지 않고 가능한 경우 AI 실행 계정·sandbox·container의 파일 권한으로
  `.env*`를 보이지 않게 한다.
- AI에 환경 변수 구조가 필요하면 `.env*` 대신 비밀 값 없는 별도 스키마나 개발환경 문서를
  제공한다.
- 토큰 프로파일, 사용자 포괄 승인과 개발 편의를 이유로 이 차단을 생략하지 않는다.

### REQ-032: MCP 공급망 심사와 기본 차단

- upstream은 project-local MCP server를 설정하기 전에 source·publisher·license, 정확한 version·
  integrity, lifecycle·binary, dependency·CVE·SAST, telemetry·network, tool description과 실제
  filesystem·credential·API 권한을 심사한다.
- 검증하지 않았거나 승인 manifest에 없는 MCP는 downstream에서 설정·활성화·호출하지 않는다.
- manifest는 기본 빈 allowlist·default-deny이며 심사 승인과 프로젝트 사용자의 활성화를 분리한다.
- `.env*`, ambient credential, home, 다른 repository와 production data는 MCP에 제공하지 않는다.
- token passthrough, 인증 없는 원격 endpoint, floating version, checksum 없는 artifact, 끌 수 없는
  telemetry, 과도한 shell·filesystem·network 권한과 미패치 high·critical 취약점은 거부한다.
- tool poisoning, rug pull, shadowing, confused deputy, prompt injection, path traversal, command
  injection과 credential exfiltration을 격리 환경에서 평가한다.
- tool·version·publisher·integrity·host·scope가 바뀌거나 review가 만료되면 자동 활성화를 중단하고
  Human-in-the-loop 재승인을 요구한다.
- Codex·Claude Code 등 지원 adapter는 같은 승인 manifest와 pre-tool default-deny 훅을 사용하며
  CI는 manifest와 설정 drift를 독립적으로 검증한다.
- 토큰 프로파일은 조사 설명량만 바꿀 수 있고 MCP 심사·차단·필수 Eval을 생략하지 않는다.

### REQ-033: Pilot 기반 Bootstrap·Validate 자동화

- bootstrap 기본 동작은 변경 없는 preview이며 project-local 변경, network, lifecycle, browser
  binary, hook과 제거 방법을 먼저 표시한다.
- package manager와 runtime은 정확한 버전으로 고정하고 Corepack이나 `latest` fallback을 사용하지
  않는다.
- dependency 적용은 lockfile, lifecycle 비활성화와 strict peer 검사를 강제하며 network 승인을
  명시적으로 분리한다.
- validate는 exact dependency·engine, lockfile, pnpm 11 override 위치, EditorConfig, Next
  telemetry 차단, 공통 보안 자산, MCP manifest와 HANDOFF를 결정론적으로 검사한다.
- 전이 dependency 취약점 audit은 network가 필요한 별도 모드이며 moderate 이상 finding을
  downstream 승인 없이 무시하지 않는다.
- Playwright browser binary와 Husky는 bootstrap dependency 단계에 포함하지 않고 각각 별도
  preview·Human-in-the-loop 및 품질 gate 후 활성화한다.
- token-aware와 full 모두 같은 bootstrap mutation boundary와 필수 validate 결과를 사용한다.

### REQ-034: 설치된 Package Version 변경 승인

- 이미 manifest·lockfile 또는 vendored artifact에 존재하는 package의 version을 변경하기 전에
  downstream 사용자에게 확인하고 명시적 승인을 받는다.
- patch·minor·major, direct·transitive, security update, downgrade, override와 lockfile-only 변경을
  모두 승인 대상으로 본다. 자동 update bot과 AI의 추천도 예외가 아니다.
- 질문에는 package 이름, 현재·목표 정확한 version, 변경 이유, release·migration·security 근거,
  peer·runtime·framework 호환성, code·type·config·build·runtime·browser·data 영향, 예상 lockfile·
  dependency 변화, 검증과 rollback을 포함한다.
- 승인 전에는 package manifest, lockfile, package manager override와 vendored dependency를 수정하거나
  install·update 명령을 실행하지 않는다. 답이 없거나 범위가 모호하면 현재 version을 유지한다.
- 적용 중 예상하지 못한 code migration, 새 dependency, lifecycle, telemetry, network, permission 또는
  breaking change가 나타나면 중단하고 변경된 범위로 재승인을 받는다.
- 승인 후 exact version·scripts-off·strict peer·공급망 심사를 적용하고 관련 코드 migration과
  formatter·linter·typecheck·unit·integration·E2E·build·security·dependency audit를 검증한다.
- 결정과 결과는 개발환경 문서, ADR 또는 dependency upgrade record, lockfile과 `HANDOFF.md`에
  기록하며 채팅의 과거 포괄 승인만으로 다른 package update를 수행하지 않는다.
- token-aware와 full 모두 승인 질문과 필수 호환성·보안·회귀 검증을 생략하지 않는다.
- staged와 PR gate는 direct dependency version diff를 승인 record의 package·manifest·from·to와
  대조하고, direct 변경 없는 lockfile-only diff는 이전·새 SHA-256 승인을 요구한다.
- 승인 누락·만료·범위 불일치 negative fixture와 정확한 승인 positive fixture를 CI Eval로 유지한다.

### REQ-035: GitHub Actions CI와 Vercel 배포 프로파일

- CI·배포 provider는 프로젝트별 개발환경으로 관리하고 upstream 공통값으로 강제하지 않는다.
- 사용자가 GitHub Actions를 선택하면 실제 stack 명령을 기반으로 최소 권한, action commit SHA 고정,
  exact runtime·package manager, frozen lockfile·scripts-off·strict peer, dependency 승인, secret·SAST·
  audit, format·lint·typecheck·test·build와 필요한 E2E의 기본 CI를 구성한다.
- workflow event·branch, cache·artifact·network·timeout·비용과 fork PR secret 경계를 preview하고 승인
  전에는 remote에 push하거나 required check를 변경하지 않는다.
- Vercel을 선택하면 framework 공식 Git integration을 우선하고 불필요한 CLI·token·`vercel.json`을
  추가하지 않는다.
- Vercel account·team·private repository access, Preview·Production branch, deployment URL 공개·보호,
  environment·secret 분리, analytics·telemetry, region·domain·비용과 rollback을 사용자에게 확인한다.
- CI 성공은 production 배포 승인이 아니다. Preview 검증과 production promotion·custom domain은
  별도의 Human-in-the-loop 결정을 요구한다.
- GitHub App·Vercel integration과 production external state는 project-local 파일 삭제만으로
  rollback되지 않으므로 권한 회수·이전 deployment 복구를 별도로 검증한다.
- token-aware와 full 모두 provider 연결·production·secret·공개 범위 질문과 필수 보안·품질 gate를
  생략하지 않는다.

### REQ-036: Dependency Build Script와 실제 배포 Eval

- package lifecycle script는 dependency 설치와 별도의 실행 권한으로 취급하며 package·정확한 version·
  script·publisher·필요성·network·filesystem 영향을 심사하고 Human-in-the-loop 승인을 받는다.
- pnpm 11 이상은 `strictDepBuilds` 기본 차단을 유지하고 `allowBuilds`에 package와 정확한 version을
  `true` 또는 `false`로 기록한다. placeholder, version 없는 matcher, wildcard와
  `dangerouslyAllowAllBuilds`는 금지한다.
- scripts-off CI 성공만으로 provider install 성공을 추론하지 않는다. 배포 전에는 provider와 같은
  lifecycle 정책의 clean install, production build와 secret·SAST·test를 격리 환경에서 Eval한다.
- Git provider와 배포 provider가 commit author를 확인할 수 있도록 verified email 또는 provider의
  noreply email을 project-local Git 설정에 사용한다. 기존 commit 재작성·force push는 별도 승인 없이는
  수행하지 않는다.
- Vercel import 전 account·team에서 같은 Git repository와 root directory의 기존 project 연결을
  검색한다. 중복 연결은 자동 삭제하지 않고 project·deployment 영향을 preview한 후 사람이 유지 대상과
  제거 대상을 결정한다.
- Preview는 commit status만 보지 않고 deployment environment·실제 URL·접근 정책·핵심 UI를 확인한다.
  승인된 Preview 이후에만 main 병합과 Production을 수행하고 Production에서도 CI·deployment·rollback
  상태를 독립 검증한다.
- 배포 실패·성공, integration 정리, Preview·Production URL과 검증 결과를 비밀 없이 개발환경 문서와
  `HANDOFF.md`에 기록한다.
- token-aware와 full 모두 build-script 승인, commit identity, 중복 integration, Preview와 Production
  승인 경계를 생략하지 않는다.

### REQ-037: 확장 가능한 프로젝트 기술 스펙

- upstream은 frontend·backend·fullstack에 특정 언어, runtime, framework, database, package·build
  manager, test, CI 또는 deployment provider를 기본값이나 필수 조합으로 고정하지 않는다.
- Next.js, NestJS, Node.js, Python, Spring Boot, PostgreSQL과 Vercel 등 문서의 기술명은 검증 사례나
  질문 예시이며 사용자가 선택하지 않은 프로젝트에 자동 적용·설치하지 않는다.
- 기존 프로젝트는 manifest·lockfile·source·container·CI에서 실제 스펙을 먼저 감지하고, 신규
  프로젝트는 사용자 답변이나 승인된 개발환경 정의서를 단일 결정 근거로 사용한다.
- 기본 질문 카탈로그에 없는 runtime, framework, protocol, datastore, infrastructure, code generator,
  quality tool과 조직별 제약도 사용자 정의 항목으로 추가할 수 있어야 한다.
- 사용자 정의 스펙은 이름만 저장하지 않고 category, source, exact version 또는 version policy,
  install·remove 명령, dependency, 권한·network·telemetry, 호환성, quality·security gate와 rollback을
  개발환경 문서 또는 확장 프로파일에 기록한다.
- 새 스펙의 설치·활성화·외부 연결은 공급망 심사와 Human-in-the-loop 승인 후 project-local adapter로
  적용한다. 공통 validator가 모르는 category라는 이유만으로 삭제하거나 임의 기본값으로 치환하지
  않는다.
- 스펙 변경 시 영향을 받는 bootstrap, hook, CI, Eval, CodeSight와 HANDOFF를 재생성·검증하며 기존
  설치 버전 변경은 REQ-034의 승인 계약을 따른다.
- token-aware는 현재 작업에 필요한 custom field만 질문하고 full은 연관 운영·확장 항목까지
  질문한다. 두 방식 모두 미확정 스펙을 `TBD`로 유지하고 설치 승인을 생략하지 않는다.

### REQ-038: 도구 중립 공통 작업 지침과 얇은 Adapter

- Claude Code용 `CLAUDE.md`, Codex·AGENTS 규약용 `AGENTS.md`와 기타 AI 도구는 같은 공통
  engineering·security·workflow를 사용해야 한다.
- 공통 작업 지침의 단일 진실 원천은 `.ai/standards/engineering.md`이며 도구별 adapter에 전문을
  복제하지 않는다. 경로와 project-specific reference는 downstream 구조에 맞게 생성·검증한다.
- 모든 도구는 경로·설정·runtime 질문에 답하기 전 실제 source를 읽고, 새 세션·resume·compact 뒤
  공통 지침·보안 정책·HANDOFF와 Git 상태를 다시 확인한다.
- 작업은 가정 명시, 최소 범위, YAGNI, 외과적 변경, 목표·검증 중심으로 수행한다. bug fix와 관찰 가능한
  동작 변경은 가능한 경우 Red·Green·Refactor를 적용하고 구조 변경과 동작 변경을 commit에서 분리한다.
- 완료할 수 없으면 blocker와 미검증 범위를 보고한다. 재발 가능한 새 bug pattern은 프로젝트가
  운영하는 경우 `docs/project-maintenance.md`에 기록하며 대화 기억만 사용하지 않는다.
- commit·push·PR·merge·release는 사용자의 현재 요청에 명시적 지시가 있을 때만 실행한다. 변경 요청을
  외부 Git 상태 변경 승인으로 확대하지 않는다.
- 응답은 같은 결론·code·diff를 중복하지 않고 실제 검증과 미검증 항목을 구분한다. 강제 bilingual 등
  특정 작성자의 개인 출력 취향은 공통 필수 규칙으로 채택하지 않고 사용자 언어·프로젝트 정책을 따른다.
- dependency·config·DB·container·production·secret·파괴적 작업은 engineering 지침보다 security와
  Human-in-the-loop 계약을 우선한다.
- validator는 공통 지침과 adapter의 존재 및 필수 reference를 검사한다.
  `docs/project-maintenance.md`는 프로젝트가 운영하는 경우에만 사용하며 존재를 강제하지 않는다. 도구
  고유 기능이 없어도 같은 outcome과 필수 gate를 수행할 수 있어야 한다.

### REQ-039: Persona보다 검증 가능한 작업 역할 우선

- 공통 baseline은 특정 성격, 경력 서사나 “천재·시니어 전문가” 같은 전역 persona를 필수로 부여하지
  않는다. 최신 모델의 기본 행동도 프로젝트의 책임·권한·정확성을 보장한다고 가정하지 않는다.
- 모든 도구에 적용할 내용은 persona가 아니라 `.ai/standards/engineering.md`의 행동 계약과
  `.ai/standards/security.md`의 권한 경계로 관리한다.
- 별도 관점, 독립 검증, 다른 권한 또는 반복 가능한 산출물이 실제로 필요할 때만 작업 역할을
  `.ai/agents/<role>.md`로 추가한다.
- 역할 문서는 사용 조건, 책임·제외 범위, 입력·신뢰 경계, 허용 도구·권한, 금지 작업·HITL, 산출물,
  완료·검증과 실패·handoff 조건을 포함한다.
- 도구가 subagent를 지원하지 않아도 같은 역할 계약을 순차 검토 단계로 수행할 수 있어야 한다.
- 브랜드 voice·교육·simulation처럼 표현이 인수 조건인 경우에만 제한된 persona를 선택 허용하며,
  사실성·보안·승인 규칙을 덮어쓰지 못하게 한다.
- 새 역할·persona는 baseline 대비 정확성, 누락, 권한 준수, 질문·verbosity·token, tool call과 다중 AI
  도구 outcome Eval을 통과한 경우에만 공통 profile에 포함한다.
- 세부 판단과 role contract는 `docs/persona-and-role-guidelines.md`를 따른다.

### REQ-040: 웹서비스 Production 보안·운영·법적 준비 Gate

- public 웹·앱을 출시하거나 Production에 배포하기 전에 `docs/web-service-production-readiness.md`의
  feature applicability와 SDLC gate를 프로젝트별로 작성한다.
- server는 admin·role·tenant·object authorization을 모든 요청에 강제한다. URL 은닉, frontend 버튼
  숨김, UUID와 client 전달 ID는 인증·인가를 대체하지 않는다.
- secret은 Git, frontend bundle, source map과 log에 포함하지 않고 secret manager, 최소 권한,
  환경 분리, 만료·rotation·폐기와 사용 audit을 적용한다.
- paid·sensitive API와 업무 흐름에는 rate limit, quota, spending cap, idempotency, timeout, 제한된
  retry, abuse·duplicate·partial failure와 reconciliation test를 적용한다.
- DB는 public ingress와 default credential을 차단하고 최소 권한·암호화·audit을 적용한다. backup은
  존재 여부가 아니라 RPO·RTO와 정기 restore rehearsal로 검증한다.
- 개인정보 삭제를 일률적인 soft delete로 구현하지 않는다. 목적·법적 근거별 retention matrix,
  분리·접근 제한, legal hold와 만료 후 파기·익명화를 정의한다.
- password는 평문·복호화 가능한 형태로 저장하지 않고 검증된 느린 password hashing, salt와
  credential stuffing 방어를 적용한다.
- log는 핵심 보안·업무 event와 correlation을 제공하되 password·token·불필요한 개인정보를 기록하지
  않고 접근권한·보존·redaction을 검증한다.
- instant·local/floating time과 사용자 timezone을 구분하고 금액은 currency-aware integer minor unit
  또는 decimal과 명시적 rounding policy로 처리한다.
- 개인정보, 아동, 민감·고유식별정보, 위탁·국외이전, 위치, 광고, 전자상거래, subscription, 사용자
  제공 생성형 AI의 적용 여부를 `yes | no | TBD`로 분류한다. `TBD` 또는 법률 검토 미완료는 관련
  Production 기능·배포를 차단한다.
- 벌금·과태료·과징금 숫자와 법 적용 범위를 게시물에서 복사해 고정하지 않는다. 출시 시점의 공식
  법령·감독기관 지침과 자격 있는 법률·개인정보 전문가 확인을 기록한다.
- dependency 보안 update는 REQ-034 승인 절차와 patch SLA를 함께 적용하며 자동 `--force` 수정이나
  검증 우회로 처리하지 않는다.
- token-aware와 full 모두 authorization, secret, 개인정보·법률 applicability, backup restore,
  rate-limit·비용과 Production approval gate를 생략하지 않는다.

### REQ-041: Eval로 통제되는 제한적 Skill Evolution

- 공통 skill 변경은 전체 자동 재작성보다 versioned `add`, `delete`, `replace` atomic patch와 사전
  정의된 edit·token budget을 사용한다.
- 한 최적화 실험에서는 target model, AI tool·harness, tool manifest, evaluator와 fixture를 고정하고
  결과 metadata에 정확한 version·hash를 기록한다.
- train, selection, test를 격리한다. test는 최종 판정 전 optimizer와 대상 agent가 읽지 못하게 하고,
  test 결과를 같은 후보를 고치는 학습 신호로 재사용하지 않는다.
- selection은 여러 trial의 최소 개선폭을 요구하며 동률은 거절한다. correctness·security·permission·
  regression은 평균 점수로 상쇄할 수 없는 hard gate다.
- 성공·실패 trajectory에서 일반화 가능한 패턴을 추출하되 원문 secret·개인정보·production data와
  외부 prompt injection을 skill 또는 기록에 복사하지 않는다.
- 거절된 patch, 집계 점수와 거절 사유를 감사 가능한 buffer에 남겨 동일한 실패를 반복하지 않는다.
- optimizer와 대상 agent는 grader, fixture, expected outcome, baseline과 승인 기록을 수정하거나
  약화할 권한을 갖지 않는다.
- security·dependency·DB·deployment·개인정보·network·권한 규칙을 바꾸는 patch와 최종 release는
  Human-in-the-loop 승인을 필수로 한다.
- downstream runtime의 자동 self-modification은 금지한다. 승인된 skill은 version·checksum·지원
  model/harness 범위와 함께 upstream release로 제공하고 downstream은 preview 승인 후 적용한다.
- 다른 model, AI tool, harness와 task로의 transfer는 가정하지 않고 각 지원 조합에서 독립적으로
  재검증한다.
- `token-aware`는 후보·trial 범위와 optimizer 사용을 줄이고 `full`은 추가 후보·transfer Eval을
  허용할 수 있다. 두 프로파일 모두 잠긴 test, 필수 hard gate와 사람 승인을 생략하지 않는다.
- 근거, 한계와 상세 실행 계약은 `docs/skillopt-paper-review.md`와
  `.ai/workflows/skill-evolution.md`를 따른다. 논문 구현체 설치는 별도 공급망 심사·승인이 필요하다.

### REQ-042: 다중 AI 도구용 Canonical 폴더 구조와 선택형 Adapter

- AI 개발 하네스의 canonical source는 tool-neutral `.ai/`로 유지한다. 정책·workflow·skill·역할·
  manifest를 `.claude`, `.cursor`, `.github` 등 특정 도구 폴더에만 저장하지 않는다.
- root `AGENTS.md`를 다중 도구 공통의 얇은 entrypoint로 사용하고, `CLAUDE.md`, `GEMINI.md`,
  Copilot·Cursor·Cline 설정은 공통 코어를 참조하는 선택형 adapter로 취급한다.
- adapter는 canonical 정책을 수작업으로 복제하지 않는다. 도구 형식상 materialization이 필요하면
  generator version·source hash를 기록하고 validator와 CI에서 drift를 검사한다.
- upstream은 지원 도구별 mapping을 논리적 `adapters/<tool>/` 계층으로 관리하되 빈 폴더를 미리
  만들지 않는다. downstream에는 사용자가 onboarding에서 선택하고 검증한 adapter만 생성한다.
- portable skill은 self-contained `<skill-name>/SKILL.md`와 필요한 최소 `scripts`, `references`,
  `assets`로 구성한다. 전체 skill library를 모든 프로젝트에 설치하지 않고 manifest·lockfile로
  선택·버전·checksum을 고정한다.
- hook, MCP, executable script와 tool settings는 Markdown보다 높은 공급망 위험으로 분류하고
  preview, 최소 권한, telemetry·network·secret, integrity와 rollback 심사를 통과해야 한다.
- clone 직후 자동 실행되는 installer, `curl | sh`, unpinned remote execution과 모든 도구 설정의
  일괄 설치를 금지한다. bootstrap은 기본 preview이며 외부 실행·설치 전에 명시적 승인을 받는다.
- `HANDOFF.md`는 세션 상태, requirements·ADR·project maintenance는 지속 지식을 담당한다. 검증되지
  않은 conversation transcript나 범용 `MEMORY.md`를 자동 누적·상시 주입하지 않는다.
- monorepo의 하위 instruction은 root baseline을 대체하지 않고 실제 scope 차이만 추가한다. 도구별
  discovery·상속·우선순위 차이를 supported version별 Eval로 확인한다.
- 기술 스택의 application folder는 고정하지 않는다. project environment definition으로 정한 실제
  구조 위에 adapter를 배치하며 frontend·backend·fullstack 예시는 기본값이 아니다.
- upstream release는 adapter와 canonical core를 version·checksum으로 묶되 downstream에 자동 반영하지
  않는다. diff preview, Human-in-the-loop 승인과 validation 후 명시적으로 upgrade한다.
- 세부 비교와 권장 구조는 `docs/multi-ai-project-structure-review.md`를 따른다.

### REQ-043: AI 생성 코드 라이선스·출처 검증

- AI가 생성·수정한 code도 사람이 제출한 외부 code와 동일하게 provenance·license review를 거친다.
- GitHub Copilot을 선택한 downstream은 public-code match 차단 또는 code referencing 표시를 활성화하되,
  변경된 suggestion·CLI·다른 AI 도구까지 포괄하지 못하므로 단독 gate로 신뢰하지 않는다.
- dependency·container·binary license inventory/SBOM과 source snippet scanning을 별도 검사로 구성한다.
- exact·near match는 source repository·commit·license·match 범위와 scanner·corpus version을 evidence로
  남기며, scanner 미실행·outage·empty corpus를 성공으로 처리하지 않는다.
- GPL·AGPL·unknown·no-license match를 이름만으로 자동 판결하지 않고 실제 복제, project policy,
  배포·network 제공 방식, license version·exception과 의무 이행 가능성을 사람이 검토한다.
- 근거 없는 strong-copyleft match는 merge·release를 차단한다. 사용할 수 없으면 원본을 보지 않는
  담당자가 공개 specification·표준·test vector로 clean-room 재구현하고 독립성 evidence를 남긴다.
- 변수명·format만 바꾸거나 AI에게 단순 재작성을 요청하는 것은 provenance 문제의 해결로 인정하지
  않는다.
- algorithm·parser·protocol·codec·cryptography·numerical implementation처럼 특징적인 장문 구현은
  강화 snippet scan과 사람 review 대상으로 분류한다.
- license·snippet scanner는 code 외부 전송, corpus, telemetry, 권한, exact version·checksum, license,
  성능·비용을 공급망 심사하고 사용자 승인 전에는 설치·CI 연결하지 않는다.
- 세부 정책·사례·Eval은 `docs/ai-generated-code-license-provenance.md`를 따른다.

### REQ-044: Backend API 계약·문서화 선택

- backend onboarding은 framework와 API contract·documentation을 별도 질문한다. FastAPI는 Python web
  framework이며 OpenAPI·Swagger의 대체물이 아니라 OpenAPI schema와 docs UI를 제공하는 선택지다.
- REST/HTTP는 OpenAPI, GraphQL은 schema, gRPC는 protobuf, event API는 AsyncAPI 등 protocol에 맞는
  machine-readable contract 후보를 검토하되 project 필요가 없으면 강제 설치하지 않는다.
- REST project는 contract-first/code-first, OpenAPI version, schema source of truth, Swagger UI·ReDoc·
  Scalar, SDK generation, versioning·deprecation·breaking-change policy를 확인한다.
- Java Spring Boot의 springdoc-openapi, Python FastAPI의 built-in docs 등 stack adapter는 exact version,
  license·integrity·telemetry·security를 심사하고 사용자 승인 후 설치한다.
- CI는 contract syntax, implementation drift, undocumented endpoint와 breaking change를 검사하고 API
  authentication·authorization negative test를 문서 생성과 별도로 실행한다.
- production의 schema·docs UI 공개, authentication, `Try it out`, CDN asset, internal metadata와 secret
  노출은 Human-in-the-loop 대상이며 필요하지 않으면 docs UI를 비활성화한다.
- generator·template·generated source도 AI 생성 code와 동일한 license·snippet·security gate를 거친다.
- 세부 질문과 Eval은 `docs/api-contract-documentation.md`를 따른다.
- Spring Boot 4 pilot은 승인된 SpringDoc `3.0.3` API-only starter로 생성한 OpenAPI 3 JSON을 필수
  operation·response·schema baseline과 비교하고, 필수 path 제거 fixture가 breaking change를 탐지했다.
  contract integration에서만 schema를 활성화하고 기본 runtime에서는 인증 요청도 `/v3/api-docs` 404로
  닫았다. 이는 해당 조합의 검증 근거이며 다른 stack의 기본 dependency가 아니다.

### REQ-045: 점진적 Stack 확장과 최초 Full-stack 구성

- 프로젝트 유형은 최초 bootstrap 시 한 번 정하고 고정하는 값이 아니다. backend-only·frontend-only로
  시작한 저장소에 이후 frontend, backend, worker, mobile app 또는 다른 service가 추가될 수 있다.
- 최초 요구사항이 full-stack이면 frontend·backend·공통 계층을 한 계획에서 함께 감지·질문·승인하고,
  각 application의 runtime·dependency·quality·test·deploy profile과 shared contract를 한 번에 구성한다.
- 기존 backend에 frontend를 추가하는 등 점진적 확장에서는 기존 application의 승인된 version·설정·
  migration·배포를 보존하고 새 application과 영향을 받는 공통 계층만 preview한다. 전체 저장소를 신규
  full-stack template으로 다시 생성하거나 기존 설정을 암묵적으로 덮어쓰지 않는다.
- bootstrap과 validator는 저장소 root만 보지 않고 승인된 탐색 경계 안에서 하위 manifest, lockfile,
  build file과 application root를 재귀적으로 발견한다. 각 application의 경로·역할·명령·소유 배포를
  개발환경 문서에 기록하고 같은 package 이름만으로 경계를 추정하지 않는다.
- application 명령은 선언된 application root를 process working directory로 실행하고 그 manifest의 exact
  runtime·package manager를 해석한다. root에 `packageManager`가 없을 때 `pnpm --dir frontend` 또는 root
  fallback으로 Corepack `latest` lookup을 유발하면 실패한다.
- stack 추가 시 root EditorConfig, CodeSight, AI adapter, security-check, HANDOFF, shared schema·contract,
  Git hook, CI job, Preview·Production 배포와 rollback 조합의 영향을 다시 계산한다. 새 frontend를 감지한
  뒤에도 CodeSight·Husky·lint-staged·frontend lint profile을 누락한 채 기존 backend 검증 성공만으로
  full-stack 구성을 완료 처리하지 않는다.
- 새 application dependency·hook·browser binary·외부 service 설치와 기존 version 변경은 각각 공급망
  preview와 Human-in-the-loop 승인을 받는다. 기존 application의 승인 범위를 새 application 설치 승인으로
  확대하지 않는다.
- validator는 `docs/development-environment.md`의 선언된 application 목록과 실제 manifest·CI·hook·
  CodeSight·EditorConfig profile을 대조하고, 새 application이 감지됐지만 문서·gate가 갱신되지 않으면
  drift로 실패한다.
- CI는 application별 독립 job과 필요한 contract·E2E 통합 job을 제공한다. 한 job 성공으로 다른
  application을 검증했다고 추론하지 않으며, deployment provider에서도 application별 root directory,
  environment variable, private/public network와 healthcheck를 검증한다.
- full-stack Preview는 frontend·backend·database가 같은 임시 environment ID에 속하고 Production과
  secret·data가 격리되는지 CRUD와 Production negative login으로 검증한다. application healthcheck 실패의
  revert rollback과 migration·database restore rollback은 별도 경계로 기록한다.
- token-aware는 새 application과 직접 영향받는 공통 계층을 우선 검사하고, full은 전체 application
  조합·rollback·운영 경계를 추가 평가한다. 두 프로파일 모두 필수 CodeSight·hook·CI·보안 drift 검사를
  생략하지 않는다.

### REQ-046: 다중 참여자 Downstream Pilot 검증

- 실제 환경 구축 전에 여러 tester가 고정된 upstream commit을 기준으로 frontend·backend·full-stack
  downstream pilot을 독립 폴더·독립 Git 저장소·격리 자원에서 검증할 수 있어야 한다.
- tester는 upstream과 downstream 경계를 유지하고 선택 stack·OS·AI provider·tool/surface·tool version·
  model 표시명과 노출된 정확한 ID·mode/profile·adapter·권한·확인 수준, 요구사항 ID,
  명령·exit status, positive·negative·rollback 결과, 비용과 미검증 범위를 공통 형식으로 기록한다.
- AI model 정보가 UI 별칭·자동 선택·비노출이면 보이는 값을 그대로 기록하고 공식 ID를 추정하지 않는다.
  `undisclosed` 결과는 기능 결과로 보존할 수 있지만 AI 도구별 호환성 근거에는 포함하지 않는다.
- pilot PASS는 기록된 조합과 범위에만 유효하며 하나의 tester·stack 성공을 공통 지원 완료로 확대하지
  않는다. 참여 maintainer를 포함해 시작 시 등록한 모든 tester의 배정된 필수 테스트·검증 항목이 전부
  PASS이고 clean 재현·필수 증거가 갖춰진 경우에만 설계 완료와 지원 상태 승격을 판정한다.
- 참여자별 필수 matrix에 `FAIL`, `BLOCKED`, `NOT-RUN`, 증거 누락이나 미검증 항목이 하나라도 있으면
  설계는 진행 중이다. 다수결이나 일부 tester 성공으로 대체하지 않으며, 중도 이탈·재배정은 사유와
  matrix 변경 이력을 기록한다.
- 일반화 가능한 실패는 비밀·내부 정보·proprietary source를 제거한 synthetic fixture로 upstream의
  요구사항·docs·Eval·validator·HANDOFF에 환류한다. downstream 고유 오류와 공통 결함을 구분한다.
- dependency·외부 도구·배포·파괴적 작업은 preview와 Human-in-the-loop 승인 범위를 유지하며 tester
  참여가 권한을 확대하지 않는다.
- 역할, matrix, 실행 단계, 결과 schema와 중단 조건은
  `docs/distributed-pilot-testing-guide.md`를 따른다.
- 한 사람이 전 역할을 수행할 수 있으며, 이 경우 배정된 모든 필수 항목과 별도 clean self-review가
  전부 PASS해야 설계 완료로 판정한다.

## 비기능 요구사항

### NFR-001: 도구 중립성

공통 지식과 정책은 Markdown, YAML, JSON 등 공개적이고 이식 가능한 형식을 우선 사용한다.

### NFR-002: 재현성

새 개발자가 문서화된 명령으로 동일한 필수 환경을 구성할 수 있어야 한다.

### NFR-003: 검증 가능성

폴더 구조, 필수 파일, 설정 버전, 품질 게이트는 가능한 범위에서 자동 검사한다.

### NFR-004: 최소 권한

에이전트와 자동화는 작업에 필요한 최소 권한만 가지며, 비밀정보를 저장소에 기록하지 않는다.

### NFR-005: 점진적 도입

모든 도구를 한 번에 지원하지 않고 기준 구현을 먼저 만든 뒤 어댑터를 추가할 수 있어야 한다.

### NFR-006: 기본 네트워크 차단

설치된 스킬과 플러그인의 런타임 네트워크 접근은 기본적으로 허용하지 않는다. 작업상 외부
접근이 필요한 경우 대상과 목적을 명시하고 사용자 승인을 받아 일시적으로 허용한다.

### NFR-007: 코드 품질 규칙의 자동화

정적 분석으로 신뢰성 있게 검사할 수 있는 코드 품질과 접근성 규칙은 언어별 린터와 CI에
연결한다. 자동 검사가 오탐을 많이 만드는 설계 판단은 코드 리뷰 체크리스트로 유지한다.

## 검토가 필요한 항목

- 최초 검증용 기술 스택과 추가 stack adapter 우선순위
- 개인용 설정과 팀 필수 설정의 경계
- 스킬 및 플러그인의 배포 방식
- GitHub 조직과 원격 저장소 이름
- 브랜치 전략과 리뷰 승인 인원
- CI 제공자 및 배포 대상
- 모노레포와 프로젝트 템플릿 중 우선 제공 형태
- 개발환경 프로파일의 기계 판독용 스키마와 검증기 구현 범위

## 변경 기록

| 날짜 | 변경 내용 |
|---|---|
| 2026-07-12 | 여러 tester의 frontend·backend·full-stack 독립 downstream pilot·증거·환류 요구사항 추가 |
| 2026-07-11 | 초기 목표와 확정 요구사항 작성 |
| 2026-07-12 | 최초 full-stack 구성과 backend→full-stack 점진 확장 lifecycle 요구사항 추가 |
| 2026-07-11 | 선호 도구, 도구 중립 대체와 공급망 보안 요구사항 추가 |
| 2026-07-11 | 플러그인 독립 하네스와 대화형 구성 요구사항 추가 |
| 2026-07-11 | Agent Skills와 GitHub Spec Kit의 선택 도입 검토 요구사항 추가 |
| 2026-07-11 | 언어 중립 클린 코드, 복잡도 제한과 시멘틱 웹 접근성 요구사항 추가 |
| 2026-07-11 | 프론트엔드 기본 도구, AI·Git 훅과 제목 요소 의미 요구사항 추가 |
| 2026-07-11 | AI 프롬프트 인젝션, 파괴적 작업과 데이터 손실 방지 요구사항 추가 |
| 2026-07-11 | 작업 종료 HANDOFF와 새 세션 재개 요구사항 추가 |
| 2026-07-11 | 공통 환경 CodeSight 설치·세션 참조·갱신 요구사항 추가 |
| 2026-07-11 | 사용자의 대화 입력을 기본 요구사항으로 편입하는 규칙 추가 |
| 2026-07-11 | 프로젝트별 개발환경 감지·질문·버전 고정·승인 경계 요구사항 추가 |
| 2026-07-11 | 토큰 절약형·충분한 분석형 실행 프로파일과 공통 필수 게이트 추가 |
| 2026-07-11 | 요구사항 변경 시 두 토큰 프로파일을 함께 갱신하는 동기화 규칙 추가 |
| 2026-07-11 | 하네스·루프가 대신할 수 없는 사람의 의도와 승인용 최소 프롬프트 템플릿 추가 |
| 2026-07-11 | 실제 개발에서 하네스·루프 변경을 판정하는 outcome 중심 Eval 요구사항 추가 |
| 2026-07-11 | clone 후 사용자별 AI 환경을 안전한 프로젝트 로컬 공통 환경으로 정렬하는 목적 명시 |
| 2026-07-11 | 공통 환경 유지보수자와 프로젝트 도입자의 두 사용 경로·책임·업데이트 경계 추가 |
| 2026-07-11 | 프로젝트 개발환경과 실제 품질 명령이 확정된 뒤에만 Husky를 적용하는 규칙 추가 |
| 2026-07-11 | Supabase·Firebase 보안 프로파일과 Human-in-the-loop 역할 계약 추가 |
| 2026-07-11 | AI의 민감정보 및 `.env*` 파일 읽기·검색·색인 금지 요구사항 추가 |
| 2026-07-11 | MCP 공급망·권한 심사, 승인 manifest와 미승인 server 기본 차단 요구사항 추가 |
| 2026-07-11 | 언어·레이어별 코드 스타일 일관성과 저장소 formatter·linter 우선 원칙 추가 |
| 2026-07-11 | 프로젝트 로컬 EditorConfig와 formatter·linter 간 일관성 요구사항 추가 |
| 2026-07-11 | 작업·PR의 HANDOFF 갱신 누락을 공통 validator와 CI에서 차단하도록 강화 |
| 2026-07-11 | Downstream pilot 피드백을 공통 bootstrap preview·dependency·validate gate로 자동화 |
| 2026-07-11 | 설치된 package version 변경 전 영향 preview와 사용자 승인·재승인 요구사항 추가 |
| 2026-07-11 | GitHub Actions 기본 CI와 Vercel Git integration 배포 프로파일 요구사항 추가 |
| 2026-07-11 | Downstream pilot 기반 dependency build-script·commit identity·실제 배포 Eval 요구사항 추가 |
| 2026-07-11 | 프로젝트별 임의 기술 스펙과 사용자 정의 확장·설치 승인 요구사항 추가 |
| 2026-07-12 | source-first·단순성·TDD·Git·응답 원칙의 도구 중립 지침과 얇은 adapter 요구사항 추가 |
| 2026-07-12 | 전역 persona 대신 검증 가능한 역할·행동·권한 계약을 우선하는 요구사항 추가 |
| 2026-07-12 | 웹서비스 보안·운영·개인정보·DB·대한민국 법률 적용성의 Production readiness gate 추가 |
| 2026-07-12 | SkillOpt 논문을 검토하고 bounded patch·격리 Eval·HITL 기반 skill evolution 요구사항 추가 |
| 2026-07-12 | 공개 다중 AI 도구 구조를 비교해 canonical `.ai/`와 선택형 adapter 요구사항 추가 |
| 2026-07-12 | AI 생성 코드 public reference·dependency license·source snippet provenance gate 요구사항 추가 |
| 2026-07-12 | FastAPI와 OpenAPI·Swagger 역할을 분리한 backend API 계약·문서화 요구사항 추가 |
