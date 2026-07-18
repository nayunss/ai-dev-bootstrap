# Delivery evidence states workflow

## 상태 경계

Delivery는 `created → pushed → ci-triggered → ci-passed → deployed → healthy →
behavior-verified → production-approved` 순서로 기록한다. 각 단계는 `PASS | FAIL | BLOCKED |
NOT-RUN` 중 하나이며 앞 단계 결과로 뒤 단계 상태를 추론하지 않는다.

## Evidence

- 모든 evidence는 같은 immutable `deliveryRef`, 관찰 시각, scope와 provider가 발급한 opaque
  reference를 가진다.
- Push receipt는 CI run이 아니며 CI run 생성은 conclusion PASS가 아니다.
- Deployment record는 health assertion이 아니며 health endpoint PASS는 제품 behavior 검증이 아니다.
- Behavior PASS는 precondition, input, assertion, negative path와 cleanup을 모두 기록한다.
- Production 승인은 behavior PASS 뒤 별도 human attestation과 approval reference가 있을 때만 기록한다.
- Provider adapter는 고유 run·deployment ID를 `reference`에 넣되 공통 단계를 합치거나 생략하지 않는다.

`scripts/validate-delivery-evidence.mjs`는 상태 순서·evidence 종류·동일 ref·시간·behavior·사람 승인을
검증한다. Validator PASS는 기록의 내부 일관성만 뜻하며 CI 실행, 배포, behavior 또는 Production
승인을 대신 수행하지 않는다.
