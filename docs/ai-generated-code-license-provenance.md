# AI 생성 코드 라이선스와 출처 검증

상태: 검토 완료, 자동화 후보 공급망 심사 대기
검토일: 2026-07-12

이 문서는 법률 자문이 아니다. 실제 배포·판매·소스 공개 의무가 걸린 판단은 조직의 open-source
정책과 법률 전문가의 검토를 따른다.

## 결론

AI가 만든 코드는 “새 코드”라고 가정하지 않고 사람이 제출한 외부 기여와 같은 provenance review를
적용한다. 언어와 AI 도구에 관계없이 다음 세 층을 함께 사용한다.

1. AI 도구가 제공하는 public-code match·code referencing을 활성화한다.
2. dependency·container license inventory와 source snippet scanning을 CI에서 분리 실행한다.
3. 출처가 불명확하거나 project 정책과 충돌하는 match는 merge하지 않고 격리·재구현·법률 검토한다.

어떤 한 도구도 “저작권·라이선스 문제 없음”을 증명하지 못한다. 탐지되지 않았다는 사실은 provenance
증명이 아니며, 사람이 review 책임을 진다.

## Copilot code referencing 검토

GitHub Copilot을 사용하는 downstream은 `Suggestions matching public code` 정책을 block하거나,
허용하는 경우 code referencing을 표시하도록 설정하는 것을 권장한다. match가 나오면 source
repository, 동일 code가 발견된 repository 수, license와 attribution 의무를 확인한다.

그러나 다음 한계 때문에 공통 하네스의 유일한 gate로 사용할 수 없다.

- inline referencing은 수락한 원본 suggestion을 대상으로 하며 사용자가 수정한 suggestion이나 직접
  작성한 code는 검사하지 않는다.
- GitHub는 public-code match가 전체 suggestion 중 통상 1% 미만이라고 안내한다. 낮은 탐지 빈도는
  위험이 없다는 뜻이 아니다.
- Copilot CLI는 public-code block 정책이 설정돼도 match 또는 near-match를 생성할 수 있고 reference를
  제공하지 않을 수 있다고 GitHub가 명시한다.
- Codex, Claude Code 등 다른 AI 도구에는 동일한 control이 없거나 동작 범위가 다르다.

따라서 upstream은 Copilot 설정을 선택 adapter의 defense-in-depth로 다루고, 공통 policy는 도구
중립 CI·review gate로 유지한다.

공식 근거:

- [GitHub Copilot code referencing](https://docs.github.com/en/copilot/concepts/completions/code-referencing)
- [Copilot agent·CLI responsible use](https://docs.github.com/en/enterprise-cloud@latest/copilot/responsible-use/agents)

## 두 종류의 라이선스 검사

### Dependency·artifact 검사

package manager manifest와 lockfile, transitive dependency, vendored package, container와 binary의
license·copyright·notice를 inventory한다. Maven·Gradle·npm·pnpm·pip 등 실제 stack adapter가 SBOM과
license report를 만들고 조직 allow·review·deny policy로 판정한다.

이 검사는 dependency로 선언된 component에는 강하지만 AI가 source file 안에 직접 생성한 code의
원본 match를 찾는 검사는 아니다.

### Source·snippet 검사

새로 추가·수정된 source를 알려진 open-source corpus와 비교해 exact·near match, license와 copyright
header를 찾는다. 알고리즘, codec, parser, protocol, cryptography, compression, numerical method와
generated table처럼 구현 선택지가 제한되거나 긴 구조가 재현되는 부분은 강화 review 대상으로 둔다.

scanner 결과는 다음 evidence를 포함해야 한다.

- scanner source, exact version, checksum, license와 telemetry·network 정책
- corpus source·version·갱신 시각과 private code 전송 여부
- matched file·line·score, candidate repository·commit·license
- false-positive disposition, reviewer와 만료 또는 재검토 조건

source를 외부 SaaS corpus로 전송하는 scanner는 code 유출 위험이 있으므로 기본 허용하지 않는다.
local/offline corpus 또는 조직이 승인한 처리 계약·region·retention이 있는 service만 사용한다.

## 도구 후보와 현재 결정

| 후보 | 역할 | 현재 결정 |
|---|---|---|
| OSS Review Toolkit(ORT) | dependency 분석, SBOM, policy, scanner orchestration | 후보; Java 21·권장 8 GiB 등 운영 비용과 image·telemetry 심사 필요 |
| ScanCode Toolkit | source의 license·copyright·package 탐지 | 후보; exact release·checksum·성능 심사 필요 |
| SCANOSS | snippet matching | 후보; corpus·network·code 전송·license 심사 필요 |
| FOSSLight Hub | dependency·license·snippet·vulnerability | 후보; 배포 형태와 권한·운영비 심사 필요 |

아직 어느 후보도 upstream 기본 설치로 승인하지 않았다. `latest` container나 원격 scanner를 CI에 바로
추가하지 않는다. `docs/supply-chain-security.md`의 설치 심사와 Human-in-the-loop 승인 후 exact
version·digest로 profile별 도입한다.

공식 프로젝트:

- [OSS Review Toolkit](https://github.com/oss-review-toolkit/ort)
- [ScanCode Toolkit](https://github.com/aboutcode-org/scancode-toolkit)
- [ORT scanner·유사 도구 목록](https://github.com/oss-review-toolkit/ort/wiki/Similar-Tools)

## GPL·AGPL 의심 match 처리

GPL·AGPL이라는 이름만으로 모든 사용이 금지되거나 침해가 확정되는 것은 아니다. 실제 code match,
license version·exception, linking·distribution·network interaction, project 배포 방식과 의무 이행
가능성을 함께 검토해야 한다. 반대로 “AI가 생성했다”거나 변수명을 바꿨다는 이유로 의무가 사라진다고
가정하지 않는다.

의심 match가 나오면 다음 순서로 처리한다.

1. 해당 change를 merge·배포하지 않고 provenance review 상태로 격리한다.
2. match source·commit·license와 생성 prompt·도구·model version을 비밀 없이 기록한다.
3. project license policy와 호환되고 attribution·source 제공 의무를 이행할지 사람이 판단한다.
4. 사용할 근거가 없으면 의심 code를 제거하고, 원본 구현을 보지 않는 담당자가 공개 specification·
   표준·test vector만으로 clean-room 재구현한다.
5. superficial rename·format 변경, AI에게 “다르게 다시 써줘”라고만 요청하는 방식은 독립 재구현의
   evidence로 인정하지 않는다.
6. 위험도가 높은 배포·상업·copyleft 판단은 법률 검토를 받고 결정과 notice·SBOM을 release evidence에
   남긴다.

단순 CRUD boilerplate보다 알고리즘 구현이 항상 법적으로 더 위험하다고 단정할 수는 없다. 다만 길고
특징적인 control flow·상수·주석·오류까지 함께 일치하는 구현은 exact reproduction 가능성이 높으므로
scanner threshold와 사람 review를 강화한다.

## Tim Davis 사례의 정확한 의미

2022년 `Doe v. GitHub` complaint는 Texas A&M의 Tim Davis가 Copilot prompt를 통해 자신의 CSparse
sparse-matrix code가 attribution·license 없이 재현될 수 있다고 제시한 사례를 인용했다. 이는
수치·희소행렬 알고리즘처럼 특징적인 구현이 축자 출력될 수 있다는 위험 신호다.

그러나 complaint의 주장은 법원의 최종 사실 인정이나 “Davis code에 대한 GPL 침해 확정 판결”이
아니다. 사건의 여러 청구는 이후 일부 기각·변경됐으므로 이 사례를 판례 결론으로 표현하지 않는다.
upstream이 차용하는 것은 `고유한 알고리즘 구현 → provenance 강화 review`라는 engineering control이다.

근거:

- [Doe v. GitHub complaint, Case 3:22-cv-07074](https://githubcopilotlitigation.com/pdf/07074/1-0-github_complaint.pdf)
- [2023년 법원 결정 요약](https://caselaw.findlaw.com/court/us-dis-crt-n-d-cal/2200493.html)

## SDLC gate

### 개발 중

- AI public-code reference가 표시되면 무시하거나 제거하지 않고 provenance record를 만든다.
- 긴 algorithm·parser·protocol code는 출처 없는 대량 생성을 피하고 public specification과 test를
  먼저 고정한다.
- 외부 code를 참고했다면 원 source·license·notice를 명시하고 “AI 생성”으로 출처를 덮지 않는다.

### Pull Request

- dependency license·SBOM 검사와 changed-source snippet scan을 별도 check로 표시한다.
- 새 dependency, vendored code, generated code와 AI reference match는 사람 reviewer가 확인한다.
- scanner 미실행·corpus unavailable·결과 미확정은 성공이 아니라 blocked 또는 manual-review 상태다.
- suppression에는 match, 근거, reviewer, scope와 만료일을 요구하고 global ignore를 금지한다.

### Release

- license policy report, SBOM, notices와 source-offer 등 필요한 의무 evidence를 묶는다.
- unresolved strong-copyleft·unknown-license·no-license match가 있으면 release를 중단한다.
- source·model·scanner·corpus version 변경 시 baseline을 다시 만들고 이전 suppression을 재검토한다.

## Eval 요구사항

- permissive dependency·GPL dependency·unknown license를 구분하는 fixture
- dependency scan은 통과하지만 source snippet scan이 GPL match를 찾는 fixture
- exact match, near match, generic boilerplate false positive와 renamed copy fixture
- Copilot reference가 없는 output도 CI scanner가 판정하는 negative case
- scanner outage·empty result·corpus unavailable을 fail-open하지 않는 case
- suppression scope·reviewer·expiry 누락을 거부하는 case
- `token-aware`와 `full` 모두 unresolved match에서 merge를 차단하는 case

법률 판단 자체를 model grader에 맡기지 않는다. deterministic match evidence와 policy 판정 뒤 최종
compatibility·의무 판단은 승인된 사람 reviewer가 수행한다.
