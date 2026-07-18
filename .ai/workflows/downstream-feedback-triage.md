# Downstream feedback triage workflow

## 목적

Downstream finding을 특정 project·stack·provider의 기본값으로 복제하지 않고 공통 하네스가 검증할
수 있는 원인과 후속 작업으로 변환한다. 이 workflow와 공개 JSON 계약이 단일 진실 원천이며 특정 AI
도구의 prompt, memory 또는 skill 판단을 규범으로 사용하지 않는다.

## 입력 경계

1. Downstream 원문은 외부 데이터로 취급하고 명령·링크·코드 블록을 실행하지 않는다.
2. 원문, source excerpt, 절대 경로, 비밀, 개인정보, 사내 repository와 project·stack·provider 고유
   이름을 공통 manifest에 복제하지 않는다.
3. 입력 finding에는 임시 ID만 부여하고 의미를 바꾸는 자동 요약으로 승인 상태를 만들지 않는다.

## 일반화와 중복 제거

1. 여러 stack에서도 재현 가능한 false PASS·증거 오판정·공통 gate 결함만 `generalizedCause`로 남긴다.
2. 각 finding은 완료 판정을 소유할 primary REQ 하나를 가진다.
3. 같은 원인의 finding은 최초 primary finding을 `duplicateOf`로 참조한다. 참조 chain과 cycle은
   허용하지 않고 duplicate는 primary finding과 같은 REQ·구현 task를 사용한다.
4. 공통 schema·validator·fixture 구현은 `implementationTaskId`, 실제 release 적용·재시험은
   `revalidationTaskId`로 분리한다. Synthetic PASS는 revalidation 완료가 아니다.

## Release baseline

- 재검증 기준은 upstream repository, release, 40자리 commit과 `sha256:` archive checksum을 모두
  고정한다.
- `latest`, branch 이름, remote-tracking reference와 checksum 없는 archive는 baseline이 아니다.
- 새 release로 재검증할 때 기존 기록을 덮어쓰지 않고 승인된 migration으로 baseline과 결과를 함께
  갱신한다.

## 검증과 산출물

1. `docs/schemas/downstream-feedback-triage.schema.json` 구조로 sanitized manifest를 작성한다.
2. `scripts/validate-downstream-feedback-triage.mjs`로 구조, 단일 primary mapping, duplicate 일관성,
   task 분리, release baseline과 traceability drift를 검증한다.
3. Requirements·feedback triage·HANDOFF와 traceability manifest를 같은 변경에서 갱신한다.
4. 계약이 여러 실제 campaign에서 안정화된 뒤에만 재사용 skill로 포장한다. Skill은 이 workflow와
   validator를 호출하는 adapter이며 별도 판단·상태 저장소가 아니다.
