# 프론트엔드 도구와 훅

상태: 설계 승인

## 결론

프론트엔드 개발환경이 JavaScript·TypeScript 기반으로 승인된 경우의 기본 품질 스택은 다음과
같다. upstream clone 직후에는 Husky를 설치하지 않는다. 패키지 관리자, workspace 경계와 실제
검증 명령이 확정된 뒤 이 도구들을 하나의 프로파일로 적용한다.

| 역할 | 기본 도구 | 책임 |
|---|---|---|
| 에디터 기본 형식 | EditorConfig | 문자셋, 줄바꿈, 파일 끝 개행, trailing whitespace와 기본 들여쓰기 통일 |
| 코드 포맷 | Prettier | 공백, 줄바꿈, 따옴표 등 기계적인 표현 통일 |
| JavaScript 린트 | ESLint | 오류 가능성, 유지보수성과 프로젝트 규칙 검사 |
| TypeScript 린트 | typescript-eslint | TypeScript 구문과 타입 정보를 활용한 ESLint 규칙 |
| Git 훅 | Husky | 커밋·푸시 전에 저장소의 검증 명령 실행 |
| staged 파일 선택 | `lint-staged` 또는 동등한 로컬 스크립트 | 변경 파일만 빠르게 검사·수정 |
| 최종 게이트 | CI | 훅 우회와 환경 차이에 관계없이 전체 품질 검증 |

TSLint는 신규 프로젝트 기본 도구에 포함하지 않는다. TSLint 프로젝트가 공식적으로
ESLint와 typescript-eslint로의 전환을 선언했고 저장소도 보관 상태이므로, 기존 레거시
프로젝트의 마이그레이션 기간 외에는 사용하지 않는다.

## 도구 책임 분리

### EditorConfig

- package 설치 없이 프로젝트 루트의 `.editorconfig`를 사용한다.
- `root = true`로 상위·개인 설정이 프로젝트 규칙을 예기치 않게 바꾸지 못하게 한다.
- UTF-8, LF, 파일 끝 개행과 trailing whitespace 같은 언어 중립 기본값을 담당한다.
- 언어·파일별 들여쓰기는 개발환경 프로파일에 맞는 glob section으로 선언한다.
- Prettier가 담당하는 세부 코드 포맷을 중복 정의하지 않고 두 설정의 들여쓰기·줄바꿈을 일치시킨다.
- EditorConfig를 지원하지 않는 도구가 있어도 formatter와 CI가 같은 결과를 검증해야 한다.

### Prettier

- 사람이 토론할 필요가 없는 코드 모양을 결정한다.
- 지원 파일의 포맷을 일관되게 만든다.
- ESLint의 포맷 규칙과 충돌하지 않게 구성한다.
- 의미나 동작을 바꾸는 코드 변환 도구로 사용하지 않는다.

### ESLint와 typescript-eslint

- 잠재 오류, 잘못된 Promise 처리, 사용하지 않는 코드와 위험한 타입 사용을 검사한다.
- 접근성 플러그인과 프로젝트 커스텀 규칙을 연결한다.
- TypeScript 프로젝트에서는 필요한 범위에 타입 정보를 사용하는 lint를 활성화한다.
- 순수 포맷 규칙은 가능한 한 Prettier에 맡긴다.

### Husky

- 개발환경 문서가 승인되고 실행 대상 명령이 존재할 때만 활성화한다.
- Git의 native hook 진입점에서 저장소 스크립트를 호출한다.
- 복잡한 검증 로직을 `.husky/pre-commit`에 직접 중복 작성하지 않는다.
- 훅은 빠르게 유지하고 전체 빌드처럼 오래 걸리는 검사는 pre-push나 CI로 옮긴다.
- `--no-verify`나 `HUSKY=0`으로 우회할 수 있으므로 보안 경계나 유일한 품질 게이트로 보지 않는다.

## AI 코드 변경 훅

AI 도구마다 훅 이름과 지원 방식이 다르므로 공통 코어는 도구 고유 훅을 직접 정의하지 않고
하나의 저장소 명령 계약을 제공한다.

```text
AI가 파일 변경
      │
      ▼
변경 파일 목록 계산
      │
      ├─ Prettier --write
      ├─ ESLint --fix
      └─ ESLint check
      │
      ▼
관련 타입 검사·테스트
      │
      ▼
최종 diff를 AI와 사람이 검토
```

도구별 어댑터는 파일 변경 묶음이 끝난 뒤 예를 들어 `quality:changed` 같은 공통 명령을
호출한다. Codex와 Claude Code의 훅 이름이 달라도 실행 결과는 같아야 한다.

### 자동 수정 범위

- 이번 AI 작업에서 변경한 파일만 대상으로 한다.
- Git에 이미 존재하던 사용자 수정 파일을 전체 포맷하지 않는다.
- Prettier와 ESLint의 검토된 safe fix만 자동 적용한다.
- 대규모 import 재배치, API 변경, 코드 삭제와 의미가 달라질 수 있는 fix는 자동 적용하지 않는다.
- 자동 수정 후 diff가 예상 범위를 벗어나면 원복하지 말고 중단해 사용자에게 보고한다.
- 생성 파일과 vendor 파일은 명시적인 ignore 목록으로 제외한다.

## Git 훅 정책

### 활성화 선행 조건

다음을 모두 만족해야 Husky 또는 다른 hook manager를 설치한다.

1. `docs/development-environment.md` 상태가 `approved`다.
2. 언어, 런타임, 패키지 관리자와 monorepo 경계가 확정됐다.
3. format, lint, typecheck, test와 security 명령이 실제로 존재하고 단독 실행에 성공한다.
4. Prettier, ESLint, typescript-eslint, staged runner와 Husky가 공급망 심사를 통과했다.
5. 생성·수정 파일, lifecycle script, 자동 수정 범위와 uninstall 절차를 사용자가 승인했다.
6. CI가 같은 명령 또는 더 강한 독립 gate를 실행한다.

조건이 충족되지 않으면 hook 상태를 `pending-environment-definition`으로 유지한다. 보안 검사만
연결한 임시 Husky를 만들지 않고, 개발환경과 무관한 검사는 명시적인 검증 명령이나 CI로
실행한다.

현재 upstream 자체의 hook 상태는 `pending-environment-definition`이다. `.husky/_` runtime 흔적은
활성화된 `pre-commit`·`pre-push` 증거가 아니며, upstream에는 Husky·lint-staged dependency와 실제 hook
파일이 없다. 따라서 local hook이 적용됐다고 주장하지 않고 CI와 명시적 `scripts/security-check`를
현재 gate로 사용한다. 향후 hook을 활성화하려면 정확한 dependency version·lifecycle·uninstall preview와
사용자 승인을 거쳐 이 상태를 갱신한다.

### pre-commit

목표는 staged 파일이 최소 기준을 어긴 채 커밋되는 것을 빠르게 막는 것이다.

```text
staged 파일 선택
→ Prettier write/check
→ ESLint fix/check
→ 자동 수정 파일 다시 stage
→ 실패 시 커밋 중단
```

권장 검사:

- staged JavaScript, TypeScript, JSX와 TSX의 ESLint
- Prettier가 지원하는 staged 파일의 포맷
- 빠른 비밀정보 검사
- 필요하면 커밋 메시지 규칙

전체 테스트나 전체 빌드를 매 커밋마다 강제하지 않는다. 훅이 느려지면 우회 사용이 늘고
개발 피드백도 나빠진다.

### pre-push

권장 검사:

- 전체 또는 영향받은 패키지의 타입 검사
- 변경과 관련된 단위·통합 테스트
- 빠르게 수행 가능한 빌드 검증

팀의 저장소 규모에 따라 pre-push는 선택 사항으로 둘 수 있지만 CI 검사는 필수다.

### CI

CI는 클라이언트 훅과 독립적으로 다음을 실행한다.

- Prettier check
- ESLint check
- TypeScript typecheck
- 단위·통합 테스트
- 필요한 빌드와 접근성 검사
- 커스텀 코드 품질 규칙

로컬 훅과 CI는 같은 `package.json` 스크립트나 공통 실행 파일을 호출해 규칙이 달라지지 않게 한다.

## 권장 명령 계약

패키지 관리자는 프로젝트에서 하나만 선택하고 lockfile과 함께 고정한다. 다음 이름은 특정
패키지 관리자에 종속되지 않는 계약 예시다.

```json
{
  "scripts": {
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "quality": "run format:check, lint, typecheck and test",
    "quality:changed": "format and lint only the current task files",
    "prepare": "husky"
  }
}
```

`quality`와 `quality:changed`의 실제 구현과 `prepare` 추가는 스택과 monorepo 여부가 정해진 뒤
결정한다.
문서의 의사 코드를 그대로 shell 문자열로 복사하지 않는다.

## 공통 stack quality adapter

`docs/schemas/stack-quality-adapters.schema.json`은 JavaScript·Java·Python application별 formatter,
linter, typecheck와 접근성 gate를 선언하는 공통 계약이다. 특정 도구를 공통 기본값으로 설치하지
않고 downstream이 공급망 심사를 통과한 project-local executable, 정확한 version과 shell을 사용하지
않는 argv를 기록한다.

- formatter·linter·typecheck는 세 언어 모두 필수다.
- `web: true` application은 accessibility gate가 필수다.
- UI가 없는 Java·Python backend는 `not-applicable`과 구체적인 근거를 기록할 수 있다.
- preview는 실행하지 않고 application cwd·tool·version·argv를 보여준다.
- run은 preview 뒤 `--approve`와 caller-enforced network-none sandbox가 모두 있어야 한다.
- runner는 version drift, non-zero exit, timeout과 source 변경을 fail-closed한다.
- check-only 품질 실행이므로 formatter가 source를 수정하면 성공 exit라도 실패다.

synthetic runner는 실제 Prettier·ESLint·Java·Python 도구 설치나 브라우저 접근성 검증을 대신하지
않는다. project별 도구와 version은 개발환경 정의·dependency 승인 뒤 확정한다.

## 커스텀 규칙 후보

초기에는 기존 생태계 규칙을 우선하고 다음 프로젝트 선호를 AST 기반 커스텀 규칙으로
검토한다.

- 함수·메서드의 자체 정의 매개변수 최대 3개
- 한 구조 분해 표현에서 꺼내는 이름 최대 3개
- 한 표현식의 spread/rest 연산 최대 3개
- 클릭 이벤트가 있는 비대화형 HTML 요소 금지
- 링크와 버튼의 이동·동작 의미 검사
- heading을 시각적 스타일 목적으로 선택하는 패턴의 리뷰 신호

마지막 항목은 CSS와 문서 문맥을 함께 봐야 해 정적 분석만으로 정확히 판단하기 어렵다.
heading 단계와 접근성 기본 오류는 린터로 검사하되 의미 적합성은 코드 리뷰와 브라우저
접근성 트리 검증으로 확인한다.

## 제목 요소 정책

`<h1>`부터 `<h6>`은 문서의 제목과 하위 제목 관계를 표현한다. 기본 글자 크기를 얻기 위한
스타일 요소가 아니다.

```html
<!-- 피한다: 크기를 위해 heading 선택 -->
<h4 class="small-text">이용약관에 동의합니다</h4>

<!-- 선호: 실제 의미에 맞는 요소와 스타일 -->
<p class="text-small">이용약관에 동의합니다</p>
```

```html
<!-- 선호: 실제 section 제목은 시각적으로 작아도 heading 유지 -->
<h2 class="text-small">결제 정보</h2>
```

원칙:

- 페이지의 주제를 나타내는 제목부터 논리적인 계층을 만든다.
- CSS 클래스와 디자인 토큰으로 크기·굵기·간격을 제어한다.
- 시각 디자인 때문에 heading 단계를 건너뛰지 않는다.
- 재사용 컴포넌트가 임의로 heading 단계를 고정하지 않도록 section 문맥을 설계한다.
- heading이 아닌 문구를 heading처럼 꾸밀 수 있고, heading도 작은 텍스트로 꾸밀 수 있다.
- 자동화된 heading-order 검사 후 실제 접근성 트리에서 문서 개요를 확인한다.

## 보안과 공급망

- Prettier, ESLint, typescript-eslint, Husky와 플러그인의 버전을 잠근다.
- install lifecycle script와 전이 의존성을 설치 전에 검토한다.
- 훅에서 네트워크 요청, 원격 코드 다운로드와 텔레메트리를 허용하지 않는다.
- 훅은 저장소 파일과 Git index에 필요한 최소 권한만 사용한다.
- 자동 업데이트 대신 검토 가능한 의존성 업데이트 PR을 사용한다.

## 출처

- <https://prettier.io/docs/integrating-with-linters>
- <https://typescript-eslint.io/users/what-about-tslint/>
- <https://github.com/palantir/tslint/issues/4534>
- <https://typicode.github.io/husky/get-started.html>
- <https://typicode.github.io/husky/how-to.html>
