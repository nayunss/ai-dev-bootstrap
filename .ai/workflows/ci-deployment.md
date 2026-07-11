# CI and deployment profile workflow

1. Remote provider, repository visibility, default·protected branch와 기존 workflow를 읽기 전용 감지한다.
2. 개발환경 문서에서 runtime·package manager·lockfile·format·lint·typecheck·test·build·security·E2E
   실제 명령을 확인한다.
3. CI provider와 배포 provider가 미확정이면 선택지·권한·비용·공개 범위를 사용자에게 질문한다.
4. GitHub Actions가 선택되면 pinned action SHA, 최소 permission, exact runtime, scripts-off·strict peer,
   dependency approval·security·quality·build·E2E job의 preview를 만든다.
5. Vercel이 선택되면 Git integration을 우선하고 account·team·repository scope, Preview·Production
   branch, URL 보호, environment, telemetry·비용과 rollback을 preview한다.
6. 사용자가 정확한 CI 변경 범위와 provider 연결을 각각 승인하기 전에는 workflow를 push하거나
   GitHub App·Vercel project를 연결하지 않는다.
7. local deterministic gate 후 isolated branch를 push해 CI를 검증한다. 실패 시 required check나
   production deploy를 활성화하지 않는다.
8. Preview Deployment 검증 후 별도 production 승인이 있을 때만 production branch를 연결한다.
9. 결과, 외부 integration ID가 아닌 비민감 설정, 검증·rollback과 재승인 조건을 개발환경 문서와
   `HANDOFF.md`에 기록한다.
