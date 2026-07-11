# GitHub Actions CI와 Vercel 배포 프로파일

상태: 제안

## 원칙

CI·배포 provider는 공통 하네스의 고정값이 아니다. 프로젝트 remote, 기술 스택, 운영 환경,
권한·비용·공개 범위를 자동 감지하고 사용자가 GitHub Actions 또는 Vercel을 선택한 경우에만 해당
프로파일을 적용한다. CI 적용과 외부 provider 연결·production 배포 승인은 분리한다.

## GitHub Actions 기본 CI

GitHub remote와 GitHub Actions 사용이 승인되면 프로젝트의 실제 명령을 기준으로 다음 gate를
구성한다.

1. 최소 `contents: read` 권한과 필요한 event·branch만 선언한다.
2. 모든 third-party action을 tag가 아니라 검토한 commit SHA로 고정한다.
3. runtime·package manager를 개발환경 문서와 같은 정확한 version으로 설정한다.
4. lockfile frozen mode, lifecycle scripts 비활성화와 strict peer 검사를 적용한다.
5. dependency version 승인 record, upstream validate, secret scan·SAST와 vulnerability audit을 실행한다.
6. formatter check, lint warning 0, typecheck, unit·integration test와 production build를 실행한다.
7. E2E는 필요한 browser·system dependency와 network를 별도 job·timeout으로 격리한다.
8. artifact는 실패 조사에 필요한 최소 파일만 짧게 보관하고 secret·개인정보를 포함하지 않는다.
9. concurrency와 cancel-in-progress로 낡은 실행을 취소하며 fork PR의 secret 접근을 금지한다.
10. local hook 우회를 허용하지 않고 protected branch의 required check로 연결한다.

실제 명령이 없는 placeholder CI를 만들지 않는다. JavaScript·Java·Python 등 stack에 따라 install,
cache, build와 test 명령을 profile에서 선택하고, package·action version 변경은 별도 사용자 승인을
요구한다.

## Vercel 배포

Vercel이 승인된 provider이고 framework가 공식 지원되는 경우 Git integration을 기본 경로로
사용한다. Next.js는 Vercel이 자동 감지하므로 고급 설정이 필요하지 않으면 `vercel.json`, Vercel
CLI와 token 기반 CI deploy를 추가하지 않는다.

- feature branch와 pull request는 Preview Deployment로 제한한다.
- production branch, account·team, repository access와 URL 공개·보호 정책을 사람이 확정한다.
- Preview·Production environment variable과 credential을 분리하고 `.env*`를 AI에 노출하지 않는다.
- analytics, observability, build log, telemetry, region, domain과 spending limit을 별도로 검토한다.
- deployment promotion, custom domain, production rollback과 GitHub App 권한 변경은 Human-in-the-loop
  대상이다.
- CI 성공을 production deploy 승인으로 간주하지 않는다.
- 배포 실패 시 검증된 이전 deployment rollback과 Git revert를 각각 확인한다.

GitHub repository가 private여도 Vercel deployment URL이 자동으로 private인 것은 아니므로 URL
접근 정책을 명시적으로 확인한다. Server·database·authentication이 추가되면 region, secret,
data retention과 incident response를 다시 위협 모델링한다.

## 적용 Preview

적용 전 다음을 사용자에게 제시한다.

- 생성·수정할 workflow·provider 파일
- action source·commit, runtime·package manager·browser download
- job별 network, permission, cache, artifact와 예상 시간·비용
- GitHub repository·branch protection·required check 변화
- Vercel account·team·repository scope, Preview·Production branch와 URL 공개 범위
- secret 이름만 포함한 environment mapping과 값 입력 주체
- 제거·rollback과 integration 권한 회수 방법

## 출처

- [Vercel의 Next.js Git 배포](https://vercel.com/kb/guide/nextjs-on-vercel-vs-netlify)
- [Playwright CI](https://playwright.dev/docs/ci)
- [Playwright browser 관리](https://playwright.dev/docs/browsers)
- [GitHub setup-node](https://github.com/actions/setup-node)
