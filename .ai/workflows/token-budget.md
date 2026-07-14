# Token budget workflow

## 시작

1. 프로젝트 기본 프로파일과 세션 override가 있는지 확인한다.
2. 값이 없으면 사용자에게 `token-aware` 또는 `full`을 짧게 확인한다.
3. 답이 없으면 `token-aware`로 시작한다.

## 공통 완료 조건

- 관련 요구사항과 보안 정책을 확인한다.
- 사용자 승인 경계를 유지한다.
- 변경 관련 필수 검사와 보안 검사를 실행한다.
- 실제 diff와 사용자 변경 보존 여부를 확인한다.
- `HANDOFF.md`에 검증 결과와 미완료 사항을 기록한다.

## token-aware

- `HANDOFF.md` → CodeSight index → 관련 요구사항 → 대상 코드 순서로 읽는다.
- 검색과 직접 의존성으로 컨텍스트를 좁힌다.
- 구현을 바꾸는 질문만 한다.
- 최소 diff와 위험 기반 테스트를 우선한다.
- 요약은 결과, 검증, 남은 위험 중심으로 작성한다.

## full

- 관련 ADR, 아키텍처, 소비자와 변경 이력을 추가로 조사한다.
- 의미 있는 대안과 trade-off를 비교한다.
- 회귀·통합·비기능 검증 범위를 위험에 비례해 확대한다.
- 중요한 근거와 기각한 대안을 기록한다.

## 안전 규칙

토큰 부족을 이유로 secret scan, SAST, MCP 승인 manifest·공급망 심사, 설치된 package version
변경 승인·호환성 검증, 파괴적 작업 승인, 관련 테스트와 handoff를 생략하지 않는다. 필수 검증을
실행할 수 없으면 완료로 선언하지 않고 중단 지점과 다음 행동을 기록한다.

AI 생성 code의 dependency license·source snippet provenance 검사와 unresolved match의 사람 review도
공통 필수다. `token-aware`는 changed·high-risk source부터, `full`은 wider history·corpus·배포 의무와
suppression baseline까지 검토 범위를 확장할 수 있지만 판정 gate는 동일하다.

API project의 contract drift·breaking change·authorization test와 production docs UI 공개 승인도
공통 필수다. `full`은 consumer·SDK·versioning·deprecation 대안을 확대할 수 있다.

GitHub Actions·Vercel 프로파일에서도 토큰 부족을 이유로 action pin·permission·secret 경계,
Preview·Production 분리, URL 공개 범위, rollback과 provider 연결 승인을 생략하지 않는다.

웹서비스 Production에서도 token 부족을 이유로 authorization, secret, 개인정보·법률 applicability,
rate limit·비용, DB exposure, backup restore, retention·파기와 사람 승인을 생략하지 않는다.

새 application이나 service가 추가되면 두 프로파일 모두 재귀 application inventory와 CodeSight·
EditorConfig·AI adapter·hook·CI·배포 drift를 확인한다. `token-aware`는 새 경계와 직접 영향부터,
`full`은 기존 application 조합·contract·Preview·rollback까지 확대하되 REQ-045의 필수 gate는 같다.

## 요구사항 변경 시

1. 추가·수정·철회된 요구사항 ID를 확인한다.
2. `token-aware`와 `full`의 컨텍스트, 질문, 구현, 검증과 산출물 영향을 각각 검토한다.
3. 차이가 없으면 공통 필수로 유지하고 불필요한 변형을 만들지 않는다.
4. 차이가 있으면 `docs/token-budget-profiles.md`와 이 워크플로를 함께 갱신한다.
5. hook, CI 또는 검증기가 영향을 받는지 확인한다.
6. `HANDOFF.md`에 반영 결과나 영향 없음의 이유를 기록한다.
