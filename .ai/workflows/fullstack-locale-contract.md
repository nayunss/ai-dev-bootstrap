# Full-stack locale contract workflow

## Project profile

1. 프로젝트 owner가 default locale, 지원 locale, timezone과 currency를 결정한다. 공통 하네스는
   한국어·영어 또는 특정 locale을 기본값으로 선택하지 않는다.
2. Frontend·BFF·backend adapter는 같은 profile을 참조하되 layer별 source와 output을 별도로 기록한다.
3. Machine-readable error code는 locale과 layer에 관계없이 유지하고 user message만 locale별로
   mapping한다. Backend raw diagnostic을 사용자에게 직접 노출하지 않는다.

## 검증 범위

- 모든 지원 locale에 frontend·BFF·backend output이 존재해야 한다.
- Document language, frontend HTML `lang`, 날짜·숫자·통화·timezone과 접근성 label이 선택 locale
  계약과 일치해야 한다.
- 각 layer·locale은 같은 error code 집합을 제공해야 하며 중복 code를 허용하지 않는다.
- BFF·backend는 HTML `lang`을 주장하지 않고 frontend가 렌더링 책임을 가진다.
- 내부 log·metric·protocol diagnostic은 user message와 분리한다.

`scripts/validate-fullstack-locale.mjs`는 계약의 구조와 cross-stack 일관성을 검증한다. 실제 번역의
품질·법률 문구·문화적 적합성은 해당 locale의 사람 reviewer가 별도로 승인하며 validator PASS가 이를
대체하지 않는다.
