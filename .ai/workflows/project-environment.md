# Project environment workflow

## 목적

AI 도구가 프로젝트별 기술 스택을 추측하지 않고 재현 가능한 개발환경 정의로 확정한다.

## 절차

1. `token-aware` 또는 `full` 실행 프로파일을 확인한다. 값이 없으면 짧게 질문한다.
2. `docs/development-environment.md`와 ADR의 존재 여부를 확인한다.
3. manifest, lockfile, runtime, build, container, CI와 deployment 설정에서 환경을 감지한다.
4. 감지값마다 근거 파일을 기록하고 문서와 충돌하는 값을 표시한다.
5. `token-aware`는 현재 구현에 필요한 누락값만, `full`은 관련 운영·장기 영향까지 질문한다.
6. 보안·개인정보·비용·운영 접근 결정은 사용자 확인 전 `TBD`로 유지한다.
   Supabase·Firebase를 선택하면 제품, key 경계, RLS·Rules, App Check, region과 environment
   분리를 추가 질문한다.
7. `latest` 요청을 안정 버전 정책과 검토 날짜로 해석하고 실제 사용 버전은 정확히 고정한다.
8. 확정 내용을 `docs/development-environment.md`에 작성하고 중요한 결정은 ADR로 분리한다.
9. 승인된 기술 스택에 맞는 품질 명령을 먼저 검증하고 그 뒤에만 Git hook adapter를 적용한다.
10. 문서, manifest, lockfile, hook, CI와 실제 명령의 일치를 검증한다.
11. 결과와 미결정 사항을 `HANDOFF.md`에 기록한다.

## 금지

- 기존 파일에서 확인 가능한 내용을 긴 설문으로 다시 요구하지 않는다.
- 사용자 확인이 필요한 값을 AI 선호만으로 선택하지 않는다.
- 비밀 값과 운영 접속 정보를 개발환경 문서에 저장하지 않는다.
- 의존성 공급망 심사 없이 추천 도구를 자동 설치하지 않는다.
