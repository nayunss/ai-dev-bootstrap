# 프로젝트 유지관리 기록

상태: 운영 메모

프로젝트 진행 중 실제로 발견한 재발 가능한 버그 패턴, 환경 함정과 예방책을 대화 기억 대신 여기에
기록한다. 모든 downstream의 필수 파일은 아니며, 팀이 유지관리 기록을 운영하거나 반복 문제가 생겼을
때 생성한다. 일회성 실패 로그나 전체 세션 요약은 `HANDOFF.md`에 두고 여러 작업에서 다시 발생할
패턴만 남긴다.

요구사항·ADR·개발환경 정의와 내용을 중복하지 않는다. 장기 정책으로 승격할 내용은 해당 원문으로
옮기고 이 문서에는 링크와 운영상 주의점만 유지한다.

각 항목은 다음 형식을 사용한다.

```markdown
## 짧은 이름

- 증상:
- 원인:
- 탐지:
- 예방:
- 관련 요구사항·검증:
```

## CI scripts-off와 provider install의 차이

- 증상: CI install은 통과하지만 Vercel install이 `ERR_PNPM_IGNORED_BUILDS`로 실패한다.
- 원인: CI는 lifecycle script를 끄지만 배포 provider는 실제 install에서 script 정책을 평가한다.
- 탐지: 승인된 allowlist로 provider-equivalent clean install을 별도 실행한다.
- 예방: pnpm 11의 `strictDepBuilds`와 exact-version `allowBuilds`를 유지한다.
- 관련 요구사항·검증: REQ-036, downstream build-policy validator fixture.

## 배포 provider의 commit author 확인

- 증상: GitHub push는 성공하지만 Vercel Preview가 commit account를 확인하지 못해 차단된다.
- 원인: commit email이 GitHub verified 또는 noreply identity와 연결되지 않았다.
- 탐지: 외부 push 전 project-local Git author와 provider identity를 확인한다.
- 예방: 이후 commit에 verified/noreply email을 사용하고 기존 history는 승인 없이 재작성하지 않는다.
- 관련 요구사항·검증: REQ-036, CI·배포 workflow.
