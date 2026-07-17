# Upstream–Downstream 아키텍처와 upstream.lock

상태: 제안

이 문서는 세 가지 질문에 답한다. `upstream.lock`이 무슨 역할을 하는가, upstream에서 정의한
정책·설정이 downstream 프로젝트에 어떤 원리로 적용되는가, 두 계층 사이의 전체 아키텍처는
어떻게 생겼는가. 역할·책임의 상세는 [유지보수와 도입 모델](adoption-and-maintenance-model.md)을,
도입 절차는 [Downstream 시작 가이드](downstream-getting-started.md)를 따른다.

## 현재 구현 상태

이 문서의 pin → materialize → enforce → upgrade 흐름은 **목표 아키텍처**다. 현재 upstream에는
read-only application preview·downstream validator·security tool bootstrap과 pilot에서 수동으로
materialize한 검증 근거가 있지만, 범용 installer 전체가 구현된 것은 아니다.

| 항목 | 현재 상태 |
|---|---|
| release tag·archive checksum | v0.2.0~v0.2.2 pilot 발행 완료, v0.2.3 발행 준비 중 |
| application preview·validator | reference automation 적용, 지원 stack·profile 제한 존재 |
| `upstream.lock` schema·생성·parser | 목표 설계, 미구현 |
| 공통 코어 materialization | env-be 수동 pilot 근거만 존재, 범용 명령 미구현 |
| Codex·Claude Code 선택 adapter materialization | preview·명시 승인·hash drift·보존 uninstall reference 구현 |
| downstream security tool 설치 | 미구현; 현재 `security-tools`는 upstream `.tools/`에 설치 |
| stack별 dependency bootstrap | npm·pnpm root 경로만 부분 구현 |
| upgrade diff·migration·rollback 자동화 | 목표 설계, 미구현 |

미구현 항목은 실행 가능한 기능으로 완료 표시하지 않는다. 실제 환경 구축 단계에서 schema·generator·
validator·migration과 clean clone Eval을 함께 구현한다.

### 현재 선택형 adapter 명령

REQ-042 범위의 reference materializer는 논리적 source를 `adapters/codex/`와
`adapters/claude-code/`에 두고, 선택한 adapter만 target에 적용한다. 기본 동작은 read-only
preview이며 apply와 uninstall은 `--approve`가 없으면 종료 코드 2로 차단한다.

```sh
scripts/bootstrap adapters preview /absolute/path/to/project codex,claude-code
scripts/bootstrap adapters apply /absolute/path/to/project codex --approve
scripts/bootstrap adapters validate /absolute/path/to/project
scripts/bootstrap adapters uninstall /absolute/path/to/project codex --approve
```

적용 시 `.ai/manifests/adapters.lock.json`에 generator version, adapter source hash, 파일별 source·target
SHA-256과 생성 소유권을 기록한다. validator와 CI는 source·target·generator drift를 fail-closed한다.
uninstall은 이 작업이 생성했고 이후 수정되지 않은 파일만 제거한다. 적용 전에 존재했던 동일 파일과
적용 후 변경된 파일은 보존하며, 기존 파일이 source와 다르면 apply 전체를 쓰기 전에 차단한다.
이 lock은 선택 adapter의 생성 증적이며 아직 미구현인 release-level `upstream.lock`을 대신하지 않는다.

## upstream.lock의 역할

`upstream.lock`은 **downstream 저장소에 둘 목표 manifest**다. canonical 위치는
`.ai/manifests/upstream.lock.yaml` 하나로 정한다. 현재 generator·parser가 없으므로 pilot에서는 사람이
초안을 기록하고 `implementationStatus: proposed`로 표시한다.

| 필드 | 내용 | 출처 |
|---|---|---|
| source | upstream repository URL | 승인된 upstream |
| release tag 또는 commit | 도입한 upstream 버전 (예: `v0.2.2-pilot`, `bfe3ef0`) | release note 또는 Git |
| archive checksum | release archive의 SHA-256; commit-only trial은 `not-published` | [release note](releases/) |
| (선택) adapter version | materialize된 도구별 adapter 버전 | onboarding 시 선택한 도구 |

구조 배경은 [다중 AI 폴더 구조 검토](multi-ai-project-structure-review.md)의 downstream 구조를 따른다.
루트의 별도 `upstream.lock`을 함께 허용하면 두 파일이 drift하므로 canonical manifest를 중복하지 않는다.

`package-lock.json`이 npm dependency에 하는 일을 `upstream.lock`은 공통 환경 전체에 한다.

- **재현성**: 새 팀원이나 clean clone이 "어느 upstream 버전 기준인가"를 파일 하나로 확인한다.
- **무결성**: checksum 대조로 가져온 archive가 발행본과 동일함을 검증한다.
- **rollback 지점**: upgrade가 실패하면 upgrade commit을 revert해 이전 tag·checksum으로
  돌아간다. 파일별 부분 삭제로 되돌리지 않는다.
- **모드 판별 입력**: AI가 작업 시작 시 upstream 유지보수인지 downstream 도입인지 감지할 때
  읽는 신호 중 하나다(`.ai/workflows/change-mode.md`).

현재 이 파일을 파싱하거나 checksum을 집행하는 script는 없다. bootstrap·validate가 lock까지 검증한다는
주장은 해당 구현과 fixture가 추가된 뒤에만 적용한다.

## 적용 원리: 참조가 아니라 materialization

upstream 설정은 downstream에 **실시간으로 반영되지 않는다**. symlink, git submodule,
`latest` 자동 동기화를 모두 금지하고, 대신 "고정 → 복사 생성(materialize) → 검증 → 명시적
upgrade" 네 단계로 적용한다.

```text
① Pin          release tag + checksum 선택, upstream.lock에 기록
      │
      ▼
② Materialize  .ai 공통 코어와 선택한 도구 adapter만 downstream에 생성 (목표)
      │         (모든 adapter가 아니라 onboarding에서 선택한 AI 도구만)
      ▼
③ Enforce      materialize된 validate · security hook · CI가
      │         downstream 안에서 같은 gate를 로컬로 집행
      ▼
④ Upgrade      새 release 발행 시 자동 반영 없음 —
                checksum 검증 → 격리 환경 평가 → diff 승인 → upgrade commit
```

원리를 요약하면:

1. **정책은 파일로 전달된다.** 실제 구현 단계에서는 upstream의 `.ai/standards`, `.ai/workflows`와 scripts가
   승인된 release 시점의 스냅샷으로 downstream에 복사된다. downstream의 AI 도구는
   자기 저장소 안의 `CLAUDE.md`/`AGENTS.md` → `.ai` 경로로 읽으므로, upstream 원본이
   바뀌어도 downstream 동작은 바뀌지 않는다.
2. **집행은 코드로 전달된다.** 목표 구현은 규칙 문서뿐 아니라 `bootstrap`(preview 우선, network 승인
   분리), `validate`(exact version·lockfile·manifest 검사), security hook(비밀 파일 접근
   차단, 파괴적 명령 차단)이 함께 materialize되어 downstream 로컬과 CI에서 같은 gate를 돌린다.
3. **변경은 pull 방식이다.** upstream이 push하지 않는다. downstream이
   [업데이트 흐름](adoption-and-maintenance-model.md#업데이트-흐름)에 따라 새 release를
   평가하고, 통과한 경우에만 upstream.lock을 갱신하는 upgrade commit을 만든다.
4. **확장은 계층 분리로 한다.** 조직 정책·proprietary skill·프로젝트 스택은 upstream 코어
   파일을 수정하지 않고 승인된 organization/project override 계층에 얹는다. 정확한 경로 schema는
   실제 구현 전에 확정한다. 그래야
   다음 upgrade에서 코어 diff가 깨끗하게 유지된다.

## 전체 아키텍처

```text
┌─ Upstream (이 저장소) ────────────────────────────────┐
│  .ai 공통 코어 (standards·workflows·agents·manifests) │
│  scripts — bootstrap·validate·security hook           │
│  evals — 공통 regression·compatibility Eval           │
│  docs/releases — versioned release + SHA-256          │
└──────────────┬────────────────────────────────────────┘
               │ ① pin + checksum 검증 (자동 동기화 없음)
               ▼
┌─ Company baseline (선택 계층) ────────────────────────┐
│  upstream lock reference / organization 정책 / profiles│
│  사내 adapter / 조직 고유 Eval                         │
└──────────────┬────────────────────────────────────────┘
               │ ② materialize (선택한 도구 adapter만)
               ▼
┌─ Downstream application 저장소 ───────────────────────┐
│  AGENTS.md·CLAUDE.md (얇은 진입점)                     │
│  .ai (release 스냅샷 + project override)               │
│  .ai/manifests/upstream.lock.yaml ← 버전·checksum      │
│  scripts + hook + CI               ← 같은 gate 집행    │
│  <application source>                                  │
└───────────────────────────────────────────────────────┘
               │ ③ 결함·개선은 코드가 아니라
               ▼    재현 case로 역방향 제출
        upstream 후보 (익명화된 regression·일반화된 원칙만)
```

회사 baseline 계층은 조직이 있을 때만 존재한다. 개인 프로젝트는 실제 materializer가 구현·검증된 뒤
upstream에서 바로 downstream으로 적용하고 canonical lock manifest를 자기 저장소에 둔다.

역방향 흐름에도 경계가 있다: downstream의 비밀·내부 endpoint·proprietary skill은 upstream으로
보내지 않고, 일반화 가능한 결함만 synthetic fixture로 익명화해 제출한다
([변경 소유권](adoption-and-maintenance-model.md#변경-소유권)).

## 이 구조를 선택한 이유

| 대안 | 기각 사유 |
|---|---|
| git submodule 참조 | 사용 복잡도가 높고 upstream 변경이 암묵적으로 유입된다 |
| 공통 파일 무조건 복사 | 버전·checksum 기록이 없어 drift와 rollback 불능이 생긴다 |
| `main`/`latest` 자동 동기화 | 검증되지 않은 변경이 production 개발환경에 직접 도달한다 |

세 대안의 공통 결함은 "지금 어떤 버전을 쓰고 있고, 어떻게 되돌리는가"에 답할 수 없다는
것이다. `upstream.lock`은 정확히 그 답을 저장하는 자리다.

## 추적성

- 관련 요구사항: REQ-001~008, REQ-019, REQ-027, REQ-038, REQ-042, REQ-045~046
- 관련 문서: [권장 아키텍처](architecture.md),
  [유지보수와 도입 모델](adoption-and-maintenance-model.md),
  [Downstream 시작 가이드](downstream-getting-started.md),
  [다중 AI 폴더 구조 검토](multi-ai-project-structure-review.md),
  [공급망 보안](supply-chain-security.md)
