# Repository state invariants workflow

## Generated artifact

1. Commit 대상 source와 artifact는 먼저 Git index에 명시적으로 stage한다. 관련 없는 working-tree
   변경을 자동 stage하지 않는다.
2. Generator는 working tree가 아니라 staged blob을 입력으로 사용하고 artifact profile에 각 staged
   source SHA-256, artifact SHA-256과 `tree: staged`를 기록한다.
3. `scripts/validate-repository-state.mjs`가 profile과 실제 index blob을 비교한다. Working tree를
   읽어 staged 결과를 추정하거나 source hash가 다른 partial commit을 허용하지 않는다.

## Check-only

1. 실행 전 `checkOnlySourcePaths`의 tracked working-tree byte hash를
   `captureTrackedState`로 기록한다.
2. Project가 별도로 승인한 formatter·linter·typecheck·test·build check 명령을 실행한다. 이
   validator는 command를 실행하거나 dependency·network 권한을 부여하지 않는다.
3. 실행 후 같은 path를 다시 capture하고 `compareCheckOnlyState`를 적용한다. 추가·삭제·byte 변경이
   하나라도 있으면 실패하고 write mode 변경으로 별도 처리한다.
4. `.env*`, parent traversal, absolute path, repository 밖 symlink는 profile과 capture에서 차단한다.

Generated staged consistency PASS와 check-only source 보존 PASS는 각각의 invariant일 뿐 CI·배포·
Production 승인이나 생성물 의미 정확성을 자동 증명하지 않는다.
