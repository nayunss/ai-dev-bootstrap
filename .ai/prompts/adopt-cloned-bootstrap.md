# Clone·ZIP 사용자용 AI 도입 시작 프롬프트

아래 `<대상 프로젝트 절대 경로>`만 실제 경로로 바꾼 뒤, clone하거나 ZIP을 푼 AI Dev Bootstrap
루트에서 AI 코딩 도구에 입력한다. 아직 적용할 프로젝트가 없다면 `<대상 프로젝트 절대 경로>`를
`미정`으로 둔다.

```text
이 폴더는 AI Dev Bootstrap 저장소를 clone했거나 공식 release ZIP을 푼 루트입니다.
목표는 공통 AI 개발환경을 <대상 프로젝트 절대 경로>에 안전하게 도입할 준비를 하는 것입니다.
대상 경로가 `미정`이면 적용하지 말고, 이 폴더에서 할 수 있는 일과 다음에 필요한 경로 한 가지만
질문해 주세요.

먼저 루트 AGENTS.md 또는 현재 AI 도구의 진입 파일을 읽고, 그 파일이 안내하는 공통 정책,
HANDOFF.md, CodeSight index, change-mode와 관련 사용 문서를 실제 파일에서 확인하세요.

그 다음 아래 순서만 수행하세요.
1. 이 폴더가 Git clone인지 release archive인지 구분하고, 확인 가능한 release tag·commit·checksum을
   보고하세요. moving branch나 출처를 확인할 수 없는 ZIP이면 적용을 중단하세요.
2. 작업 모드를 `upstream-maintenance`와 `downstream-adoption` 중 하나로 판정하세요. 대상 프로젝트에
   도입하려는 요청이면 반드시 `downstream-adoption`을 사용하세요.
3. 대상 경로가 확정되면 기존 사용자 변경과 untracked 파일을 보존한 채 읽기 전용 진단만 하세요.
   지원되는 경우 `scripts/bootstrap preview <대상 경로>`와 `scripts/validate <대상 경로>`를 사용하세요.
4. 감지한 stack·AI 도구·누락 결정, 예상 변경, 필요한 별도 승인을 쉬운 말로 정리하세요.

첫 응답에는 다음만 포함하세요.
- 확인한 source 버전과 무결성 상태
- 선택한 작업 모드와 대상 경로
- 읽기 전용 진단 결과 또는 진단을 막는 한 가지 질문
- 변경 0건인지 여부
- 다음 한 단계와 그 단계에 필요한 승인

이 첫 단계에서는 파일 생성·수정, dependency 설치, lifecycle script, 외부 업로드, credential 접근,
Git commit·push·PR·merge, DB migration, provider 변경과 배포를 하지 마세요. `.env*`를 읽지 말고,
`apply`, `--approve` 또는 destructive command를 실행하지 마세요. 실제 변경은 preview 결과와 정확한
대상·명령을 보여준 뒤 제가 별도로 승인한 경우에만 진행하세요. Reference·synthetic PASS를 현재
프로젝트 지원 완료나 Production 승인으로 확대하지 마세요.
```

이 프롬프트는 설치 승인 자체가 아니다. 첫 응답을 확인한 뒤 필요한 단계만 별도 승인한다. AI 도구가
명령을 실행할 수 없으면 실행한 것처럼 답하지 않고, 사용자가 직접 실행할 정확한 읽기 전용 명령과
예상 산출물을 안내해야 한다.
