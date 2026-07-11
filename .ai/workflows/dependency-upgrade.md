# Existing dependency version change workflow

1. Manifest와 lockfile에서 현재 package 이름·version·source와 직접·전이 여부를 확인한다.
2. 목표 version을 정확히 고정하고 release note, migration guide, peer·runtime·framework 호환성,
   security advisory, license, maintainer·provenance, lifecycle과 telemetry 변화를 조사한다.
3. 코드·타입·설정·build·runtime·브라우저·데이터·배포에 필요한 변경과 영향 범위를 preview한다.
4. 현재/목표 version, 변경 이유, 대안, 예상 diff, migration, 검증, rollback과 lockfile 변화를
   사용자에게 제시한다.
5. 사용자가 정확한 package·version·범위를 승인하기 전에는 manifest, lockfile, vendored artifact와
   package manager override를 수정하지 않는다. 무응답은 default-deny다.
6. 승인 후 scripts-off·strict peer mode와 정확한 package manager로 격리 branch에서 적용한다.
7. formatter·linter·typecheck·관련 unit·integration·E2E·build·security·dependency audit를 실행한다.
8. 예상하지 못한 code migration, dependency, 권한, network 또는 lifecycle 변화가 나타나면 중단하고
   새 preview로 재승인을 요청한다.
9. 승인·적용 version, code migration, 검증, local override와 rollback 기준을 개발환경 문서,
   lockfile, ADR 또는 upgrade record와 `HANDOFF.md`에 기록한다.

같은 version의 lockfile 재생성도 전이 dependency나 integrity가 달라질 수 있으므로 diff를 먼저
검토한다. 자동 보안 update bot의 PR도 사용자 승인과 동일한 gate를 통과해야 한다.

## 자동 gate

- 승인 기록: `.ai/approvals/dependency-upgrades.json`
- staged 검사: `node scripts/validate-dependency-upgrades.mjs staged`
- PR 검사: `node scripts/validate-dependency-upgrades.mjs range <base-sha>`
- direct version 변경은 package·manifest·from·to가 정확히 일치하는 유효 승인 record를 요구한다.
- direct version 변경 없는 lockfile-only diff는 이전·새 파일의 SHA-256이 일치하는
  `__lockfile__` 승인을 요구한다.
- 승인에는 reason, migration, validation, rollback, approver, 승인·만료일과 `approved` 상태가
  필요하다.

이 validator는 승인자의 실제 신원을 암호학적으로 증명하지 않는다. protected approval file,
CODEOWNERS·branch protection과 사람 review가 승인자 신뢰 경계를 담당해야 한다.
