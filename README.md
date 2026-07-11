# Common Project

각 사용자가 이 저장소를 clone한 뒤, 서로 다른 Codex·Claude Code 등의 개인 환경을 동일한
프로젝트 규칙, 승인된 도구 버전, 스킬, hook과 검증 절차로 맞춘 다음 개발을 시작하도록 돕는
AI 개발 환경 표준화 프로젝트입니다.

## 목표

- Codex, Claude Code 등 특정 AI 도구에 종속되지 않는 공통 규칙을 정의합니다.
- 개발자마다 다른 스킬과 플러그인 구성을 재현 가능한 형태로 관리합니다.
- 프로젝트 폴더 구조와 AI 관련 설정의 기준을 제공합니다.
- 새로운 프로젝트와 기존 프로젝트에 적용할 수 있는 설치·검증 절차를 만듭니다.
- 개인 전역 설정을 강제로 덮어쓰지 않고 프로젝트 로컬 환경을 우선합니다.

## clone 후 목표 흐름

```text
git clone
   ↓
읽기 전용 환경 진단
   ↓
승인된 버전·해시로 프로젝트 로컬 bootstrap
   ↓
Codex·Claude Code 등 도구별 얇은 어댑터 연결
   ↓
validate + 필수 security/Eval gate
   ↓
프로젝트 개발 시작
```

현재는 이 흐름의 문서와 일부 보안·CodeSight 자동화를 구현하는 단계다. 완성 전까지 전역 AI
설정이 자동으로 동일해졌다고 가정하지 않는다.

## 두 가지 사용 방식

- 공통 환경 유지보수: maintainer와 contributor가 skill, plugin, adapter, 보안과 Eval을 개선해
  versioned upstream release를 만든다.
- 프로젝트 도입: 회사·팀·개인이 검증된 release를 고정하고 조직 정책과 기술 스택을 확장해
  구성원들이 같은 AI 환경에서 제품을 개발하게 한다.

Husky 같은 기술 스택별 hook manager는 clone 직후 설치하지 않습니다. downstream의 개발환경과
실제 format·lint·test 명령이 승인된 뒤 해당 프로파일에서 적용합니다.

회사·프로젝트의 비밀과 전용 규칙은 public upstream과 분리한다. 자세한 책임과 업데이트 흐름은
[`docs/adoption-and-maintenance-model.md`](docs/adoption-and-maintenance-model.md)를 따른다.

## 현재 상태

요구사항과 지원 범위를 정의하는 초기 단계입니다.

설계 문서와 요구사항은 [`docs/`](docs/README.md)에서 관리합니다.

## 문서 원칙

- 특정 AI 제품에 종속되지 않는 규칙을 먼저 정의합니다.
- `AGENTS.md`, `CLAUDE.md` 같은 도구별 파일은 공통 규칙을 연결하는 어댑터로 취급합니다.
- 제안과 확정된 요구사항을 구분하고, 중요한 결정은 근거와 함께 기록합니다.
