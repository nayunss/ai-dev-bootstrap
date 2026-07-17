# AI 생성 코드 라이선스와 출처 검증

상태: 후보 1차 심사 완료, 설치·외부 API 승인 대기
검토일: 2026-07-14

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
| OSS Review Toolkit(ORT) | dependency 분석, SBOM, policy, scanner orchestration | 보류; Apache-2.0, 87.3.0 확인. Java 21·권장 8 GiB/4 CPU와 외부 downloader·advisor·scanner별 network 심사 필요 |
| ScanCode Toolkit | local license·copyright·package 탐지 | 조건부 pilot 후보; Apache-2.0 core, 32.5.0 확인. reference data의 CC-BY-4.0·제3자 license, archive checksum·성능 검증 필요 |
| SCANOSS | 공개 corpus snippet matching | 기본 후보에서 제외; 외부 fingerprint service와 비공개 production 비용이 필요하므로 별도 유료·외부 서비스 승인이 있을 때만 재심사 |
| FOSSLight Scanner / Hub | local ScanCode·dependency 보고와 compliance workflow | 보류; Scanner 2.1.22 Apache-2.0, Hub AGPL-3.0. Scanner 자체는 true snippet corpus를 제공하지 않으며 Hub 운영비·권한 심사 필요 |

아직 어느 후보도 upstream 기본 설치로 승인하지 않았다. `latest` container나 원격 scanner를 CI에 바로
추가하지 않는다. `docs/supply-chain-security.md`의 설치 심사와 Human-in-the-loop 승인 후 exact
version·digest로 profile별 도입한다.

### 2026-07-14 1차 공급망·데이터·비용 심사

#### ORT

- 공식 배포는 Apache-2.0이고 확인 시점 최신 release는 `87.3.0`이다. 실행에는 Java 21 이상이 필요하고
  공식 권장치는 JVM 8 GiB와 CPU 4 core 이상이다.
- analyzer·downloader·scanner·advisor·reporter를 묶는 orchestration과 policy-as-code에는 적합하지만,
  downloader가 dependency source를 가져오고 advisor·scanner plugin이 별도 service를 호출할 수 있다.
  ORT 전체를 네트워크 허용으로 승인하지 않고 component별 host·method·credential을 분리해야 한다.
- 초기 changed-source gate에 비해 CI 자원·설정·운영 복잡도가 크다. dependency/SBOM 정책이 여러
  ecosystem으로 확장될 때 2단계 후보로 유지한다.

공식 근거: [ORT repository·system requirements](https://github.com/oss-review-toolkit/ort),
[ORT Scanner](https://oss-review-toolkit.org/ort/docs/tools/scanner),
[license classifications](https://oss-review-toolkit.org/ort/docs/configuration/license-classifications).

#### ScanCode Toolkit

- 확인 시점 최신 release는 `32.5.0`이다. core는 Apache-2.0이고 reference dataset에는 CC-BY-4.0,
  배포물에는 여러 제3자 license가 포함되므로 NOTICE·`.ABOUT` 자료를 함께 보존해야 한다.
- CLI는 local source를 대상으로 license text·copyright·package 정보를 출력할 수 있어 code 외부 전송
  없는 1차 license detector 후보로 적합하다. `--license-text`와 top-level detection을 evidence에
  포함해야 unknown·generic LicenseRef의 근거를 검토할 수 있다.
- license text DB와의 탐지는 공개 repository source corpus의 exact·near snippet provenance 검색과
  다르다. 따라서 ScanCode PASS를 “외부 source match 없음”으로 해석하지 않는다.
- 설치 승인 전 official release archive의 플랫폼별 SHA-256, bundled dependency, install network,
  cold/warm runtime과 changed-file 상한을 격리 fixture로 검증해야 한다.

공식 근거: [ScanCode Toolkit repository](https://github.com/aboutcode-org/scancode-toolkit),
[ScanCode documentation](https://scancode-toolkit.readthedocs.io/).

#### SCANOSS

- true snippet matching 후보 중 기능 적합도가 가장 높다. CLI는 local에서 WFP fingerprint를 생성할 수
  있으나 기본 scan endpoint는 외부 `api.osskb.org`/`api.scanoss.com`이며 match 판정을 위해 fingerprint를
  전송한다. vendor는 source code 자체는 업로드하지 않는다고 설명하지만 fingerprint와 SBOM·metadata도
  기밀 파생 데이터이므로 “외부 전송 없음”으로 취급하지 않는다.
- CLI에는 path obfuscation이 있지만 이것만으로 repository·algorithm·code 구조 재식별 위험이
  제거됐다고 보지 않는다. 전송 field, TLS, tenant isolation, 처리 region, log·backup retention, 삭제,
  subprocessor, breach 통지와 model 학습 미사용을 계약으로 확인해야 한다.
- 무료 anonymous API가 안내돼 있으나 enterprise 가격·quota·SLA·corpus snapshot 고정 방식은 공개
  자료만으로 확정할 수 없다. 비용 상한과 outage/429 동작이 정해지기 전 필수 CI gate로 승인하지 않는다.
- self-hosted engine·corpus의 실제 제공 범위, license, 저장공간·갱신비가 확인되면 외부 전송 없는 대안으로
  재심사한다.

공식 근거: [SCANOSS CLI commands](https://docs.scanoss.com/en/latest/cli/scanoss-js/commands-and-arguments),
[SCANOSS license dataset](https://scanoss.com/license-dataset/),
[open-source mission](https://scanoss.com/our-open-source-mission/).

#### FOSSLight

- FOSSLight Scanner `2.1.22`는 Apache-2.0이며 local path를 ScanCode 기반으로 분석하고 dependency·binary
  report를 묶는다. URL 입력 mode는 `git`/`wget` network를 발생시키므로 허용하지 않는다.
- Scanner 자체 source mode는 ScanCode 기반 license·copyright 탐지이며 true public-source snippet
  corpus match를 독립 제공하지 않는다. ScanCode와 기능이 겹치므로 초기 CLI gate에 추가할 이점이 작다.
- FOSSLight Hub는 AGPL-3.0 self-hosted compliance workflow다. 계정·DB·backup·patching과 운영 인력이
  필요하므로 단일 repository CI 도구가 아니라 조직 차원의 OSS review system 후보로 분리한다.

공식 근거: [FOSSLight Scanner repository](https://github.com/fosslight/fosslight_scanner),
[FOSSLight Hub guide](https://fosslight.org/hub-guide-en/).

### 현재 권고와 승인 경계

1. dependency/SBOM과 source license text 검사는 snippet provenance와 별도 check로 유지한다.
2. local-only license detector pilot은 ScanCode Toolkit `32.5.0`을 우선 후보로 삼되 아직 설치 승인하지
   않는다. release checksum·bundle·runtime fixture와 정확한 설치 명령 preview가 다음 승인 입력이다.
3. SCANOSS는 기본 도입·후속 검증 대상에서 제외한다. 사용자가 유료·외부 fingerprint service를 별도로
   요청하고 DPA·전송 schema·retention·region·가격·quota·corpus version을 승인할 때만 재심사한다.
4. ORT는 다중 ecosystem policy orchestration이 실제로 필요해질 때, FOSSLight Hub는 조직 review
   workflow가 필요해질 때 별도 심사한다.
5. scanner 미설치·outage·quota 초과·empty corpus는 PASS가 아니다. 도입 전에는 수동 provenance
   review를 유지하고, 도입 후에는 `BLOCKED` 또는 `MANUAL_REVIEW`로 fail-closed한다.

### ScanCode Toolkit 32.5.0 설치 전 archive preview

검토 대상은 CI용 Linux x86_64·Python 3.12 application archive다. 현재 개발 host는 Apple Silicon
`arm64`이고 공식 macOS archive는 x86_64/Rosetta 경로를 사용하므로 로컬 성능 기준으로 채택하지 않는다.

| 항목 | 확인 결과 |
|---|---|
| asset | `scancode-toolkit-v32.5.0_py3.12-linux.tar.gz` |
| size | 234,482,714 bytes |
| GitHub release digest | `sha256:638adcd0af576d1f4d5b64dde228724b3ca4fdee2c4de20d88e4356be353f027` |
| downloaded archive SHA-256 | 공식 digest와 일치 |
| archive structure | 364 entries; absolute/parent traversal, symlink, setuid·setgid 없음 |
| bundled dependency | 117 artifacts: 107 wheels, 10 source archives |
| provenance sidecar | 117/117 artifact에 `.ABOUT` 존재; 28 `.NOTICE` sidecar |
| top-level license | Apache-2.0 software, CC-BY-4.0 data, third-party permissive·limited/strong copyleft 포함 |
| runtime install network | bundled `virtualenv.pyz`와 `thirdparty/`가 있으면 `pip --no-index`; 누락 시 `bootstrap.pypa.io` fallback 존재 |
| runtime version check | CLI 기본값이 PyPI `https://pypi.org/pypi/scancode-toolkit/json`을 조회하고 cache를 기록하므로 모든 pilot에서 `--no-check-version` 필수 |
| destructive path | `configure --clean`은 install root의 venv·cache·build와 Python cache를 삭제하므로 pilot 금지 |
| local compatibility | Linux x86_64 artifact라 Apple Silicon host에서 실행하지 않음 |

archive는 project-local ignored 경로 `.tools/review-cache/scancode-32.5.0/`에 checksum 검증 목적으로만
보관했다. 압축 해제, configure, executable 호출과 source scan은 수행하지 않았다.

공식 release API가 제공한 다른 플랫폼 digest도 승인 시 해당 target별로 별도 고정한다. `latest`,
source build, PyPI install과 Docker build는 이번 승인 후보가 아니다. release archive 방식은 third-party
wheel을 포함해 표준 구성 시 package index가 필요 없지만, bundled file 존재와 `--no-index` 적용을
runtime에서 독립 검증한다. 공식 문서도 application archive가 third-party dependency를 포함하고
configuration에 network가 필요하지 않아야 한다고 명시한다.

공식 근거: [release archive 설치](https://scancode-toolkit.readthedocs.io/en/stable/getting-started/installation/install-scancode-from-release-archives.html),
[bundled dependency 관리](https://scancode-toolkit.readthedocs.io/en/stable/getting-started/contribute/contributing-code.html),
[v32.5.0 release](https://github.com/aboutcode-org/scancode-toolkit/releases/tag/v32.5.0).

### 제안 runtime fixture와 별도 승인 범위

승인 대상은 Podman의 Linux x86_64·Python 3.12 disposable container를 이용한 project-local pilot 1회다.
실제 project source, 비밀, home credential과 외부 network를 제공하지 않고 synthetic license fixture만
사용한다. host의 Podman VM은 ARM64이므로 x86_64 emulation 결과는 기능·격리 검증에만 사용하고 CI 성능
baseline으로 채택하지 않는다.

container base는 `docker.io/library/python:3.12.11-slim-bookworm`의 Linux amd64 manifest digest
`sha256:c00fc7b44d844b6da22861ec24af43968a5200eac4ec607b4725d585165d6b49`로 고정한다. tag만으로 pull하지
않으며 image pull도 별도 승인 전에는 수행하지 않는다. 실행 시 `--platform linux/amd64`,
`--network none`, `--read-only`, `--cap-drop all`, `--security-opt no-new-privileges`를 적용하고 필요한
install·cache·output만 project-local tmpfs 또는 승인된 경로로 제공한다.

실행 전 hard gate:

1. archive SHA-256을 위 값과 대조한다.
2. archive path traversal·link·setuid를 다시 거부한다.
3. bundled `etc/thirdparty/virtualenv.pyz`, application wheel, `thirdparty/`와 모든 artifact의 `.ABOUT`을
   확인한다.
4. runner architecture가 `x86_64`, Python이 `3.12.x`인지 확인한다.
5. install·HOME·cache·input·output을 승인된 project-local `.tools/scancode-pilot/32.5.0/` 아래로 제한한다.
6. outbound network를 차단하고 network attempt가 관찰되면 즉시 FAIL한다.
7. 모든 ScanCode 호출에 `--no-check-version`을 지정하고 version-check cache 생성도 FAIL로 처리한다.

승인 후 실행할 논리 단계:

```text
verify image digest and archive checksum → extract into approved install root
→ cold `scancode --no-check-version --help` → warm synthetic license scan #1
→ identical warm scan #2 → output equivalence check
```

측정값:

- cold configure wall time·max RSS·install 전후 disk와 install root 밖 write
- warm scan 1·2 wall time·max RSS·output SHA-256
- process tree, DNS/socket attempt와 package-index access
- exit code, warning, detected license·copyright evidence

중단 조건:

- hash·architecture·Python·sidecar 불일치, network 또는 승인 경로 밖 write
- lifecycle 중 shell download·package index access
- cold 10분, warm scan 2분, max RSS 8 GiB 또는 추가 disk 2 GiB 초과
- 동일 input의 두 warm output이 정규화 가능한 timestamp 외에 달라짐
- empty result, crash, warning을 숨긴 exit 0 또는 fixture license 미탐지

rollback은 pilot process를 종료하고 승인된 `.tools/scancode-pilot/32.5.0/`과 synthetic output만 제거하는
것이다. 사용자 source, global Python, Homebrew, Rosetta와 project dependency는 변경하지 않는다.
Podman image 제거는 대상 digest와 다른 container의 참조 여부를 preview한 뒤 별도 파괴적 명령 승인을
따른다.

#### 2026-07-14 Podman synthetic pilot 결과

승인된 image digest와 archive checksum으로 network-none pilot을 실행했다. host project bind mount는
기존 Podman VM에 공유되지 않아 VM 설정을 변경하지 않고 전용 named volume
`scancode-32-5-0-pilot`에 archive와 synthetic Apache-2.0·MIT fixture만 복사했다.

- image digest·`amd64/linux`, archive SHA-256과 Python `3.12.11` 확인: PASS
- read-only root, capability 제거, `no-new-privileges`, network none: 적용
- `tar --no-same-owner`로 archive UID/GID 복원 금지: 적용
- bundled dependency configure: network-none 환경에서 완료
- ScanCode CLI 시작: BLOCKED — bundled `libarchive.so` 로딩 중 base image에 `libgomp.so.1`이 없어 종료
- synthetic license detection·warm reproducibility: NOT-RUN — CLI 시작 실패 이후 실행하지 않음
- 외부 source·project source·credential 제공: 없음

현재 판정은 `runtime dependency 보완 승인 대기`다. `libgomp.so.1`을 제공하려면 OS package가 포함된
새 base image를 고정하거나 정확한 Debian package·repository·checksum·설치 network를 추가 심사해야
한다. 이번 승인 범위에 없으므로 package 설치, 다른 image pull과 read-only project pilot은 수행하지
않았다. 기존 ARM64 Podman VM의 2 CPU·4 GiB와 x86_64 emulation 결과는 성능 baseline이 아니다.

다음 보완 후보는 별도 `apt` network·package 설치가 필요 없는 공식
`docker.io/library/python:3.12.11-bookworm` Linux amd64 image다. pull 전 manifest digest는
`sha256:1b48a1b13ec678be8d84974541cc007d4367aaf01f985231daad1a940106efc0`, base
`buildpack-deps:bookworm` digest는
`sha256:41c644e872153a1e42417ae8e006b9a3ee6e0f59c74777cb35a2ab741284ed03`이다. image가 실제로
`libgomp.so.1`을 제공하는지는 고정 digest pull 후 scanner 실행 전에 read-only probe로 먼저 확인한다.

#### 2026-07-14 bookworm 보완 pilot 결과

별도 승인 후 위 Linux amd64 digest를 pull해 실제 digest·architecture를 대조하고, network-none·read-only
probe에서 `/lib/x86_64-linux-gnu/libgomp.so.1`을 확인했다. 새 named volume
`scancode-32-5-0-bookworm-pilot`에서 archive와 synthetic fixture만 사용해 pilot을 처음부터 재실행했다.

| 항목 | 결과 |
|---|---|
| image·archive integrity | image digest와 archive SHA-256 일치, Python 3.12.11·x86_64 확인 |
| confinement | network none, read-only root, all capabilities drop, no-new-privileges 적용 |
| cold configure·help | PASS, 146초, exit 0, stderr·version-check cache 없음 |
| warm scan #1·#2 | PASS, 각각 34초 host wall time, exit 0 |
| detection | synthetic `apache-2.0`, `mit` 탐지; header/file error·warning 0 |
| reproducibility | raw JSON은 timestamp·duration·output path만 다름; 정규화 SHA-256 양쪽 모두 `49a3d11e4827bc6844d70eb1ebd87185be07f986fbaebe4e7bda437baeaf9357` |
| footprint | install 963 MiB, HOME 2.9 MiB, cache 0, output 72 KiB |
| source exposure | synthetic 2 files만 제공; 실제 project source·credential·외부 API 없음 |

synthetic security pilot 판정은 `PASS`다. 이 결과는 ScanCode가 외부 public-source snippet provenance를
찾는다는 의미가 아니며, ARM64 VM의 x86_64 emulation 수치를 native CI 성능으로 일반화하지 않는다.
다음 단계인 실제 project의 read-only license scan은 대상 path·출력·보존·rollback을 preview하고 별도
승인을 받은 뒤에만 수행한다. CI 도입은 그 project pilot의 보안·결과 검토 이후에도 별도 조건부 승인이다.

#### 2026-07-14 read-only project pilot 결과

별도 승인 후 현재 working tree의 Git tracked 파일 목록을 고정해 검사했다. `.git`, `.tools`, `.env*`,
untracked 파일과 사용자 JPEG는 대상에 포함하지 않았다. macOS가 최초 archive에 provenance xattr를
`._*` AppleDouble 항목으로 추가한 것을 gate가 탐지해 ScanCode 실행 전에 중단했고,
`COPYFILE_DISABLE=1`과 `tar --no-xattrs`로 만든 111-file clean archive만 재승인 범위에서 사용했다.

| 항목 | 결과 |
|---|---|
| input manifest | tracked 111개, manifest SHA-256 `5a5c8f1d27dfcbb08f016224631fd46d6170dbfe39c4cf02cb9f846b87114b4b` |
| clean archive | SHA-256 `f7265a9221312fa29a70690777b2b2fa4e7d60e269340f46b7a263dabbb98b0a`, AppleDouble·제외 대상 0 |
| confinement | 검증된 runtime read-only, project 전용 volume, network none, capability drop, no-new-privileges |
| runtime | exit 0, host wall 232초, ScanCode reported total 216.23초, error·warning 0 |
| inventory | 110 non-empty file; empty `.gitignore`은 ScanCode file inventory에서 생략, scan error 없음 |
| version check | `--no-check-version`, version-check cache 0 |
| external exposure | 외부 API·SCANOSS 호출, credential·untracked 파일 전송 없음 |

탐지는 5개 파일에서 발생했다. `HANDOFF.md`, 이 검토 문서와 `docs/supply-chain-security.md`는 정책 문서가
license 이름·예제·scanner 결과를 설명한 문맥이고, `.ai/manifests/security-tools.yaml`은 승인 도구의
license metadata, `package-lock.json`은 dependency metadata다. 표현식에는 `apache-2.0`, `mit`,
`lgpl-2.0`, `lgpl-2.1`, `agpl-3.0`, `cc-by-4.0`의 단독·결합이 포함됐다. 이는 source snippet provenance
match나 project 전체 license 판정이 아니며 자동 suppression하지 않는다. project pilot의 격리·실행
판정은 `PASS`, finding disposition은 `MANUAL_REVIEW`다. CI 조건부 도입에는 documentation·manifest·lockfile
결과의 baseline 처리, 실제 source finding의 fail-closed 기준과 evidence 보존을 별도 승인해야 한다.

#### 조건부 CI 도입 계약

사용자의 조건부 승인에 따라 `.github/workflows/security.yml`에 독립 `license-provenance` job을 추가했다.
이 job은 `ubuntu-24.04` runner의 기본 Podman `4.9.3`만 사용하며 package manager로 Podman이나 scanner를
설치하지 않는다. runner의 Podman version이 달라지면 자동 upgrade하지 않고 FAIL해 재심사를 요구한다.

- ScanCode archive URL·32.5.0 SHA-256과 Python bookworm Linux amd64 image digest를 pilot 값으로 고정한다.
- Git tracked 파일만 staging하고 `.env*`, `.git`, `.tools`와 untracked 파일을 제외한다. macOS xattr도
  archive에 포함하지 않는다.
- archive 다운로드·image pull까지만 runner network를 사용한다. scanner container는 network none,
  read-only root, capability drop, no-new-privileges와 `--no-check-version`으로 실행한다.
- scanner error·warning·file error, empty/incomplete result, checksum·runtime version 불일치는 FAIL이다.
- review-only 분류는 Markdown, `package-lock.json`, `.ai/manifests/*.{json,yaml,yml}`로 닫혀 있다. 이
  범위의 finding은 PR job summary에 `MANUAL_REVIEW`로 표시하지만 gate를 자동 실패시키지 않는다.
- 위 allowlist 밖의 모든 license finding은 언어·확장자를 추측하지 않고 기본 `BLOCKED`로 CI를 실패시켜
  사람 disposition을 요구한다. wildcard suppression과 AI 자기 승인은 없다.
- raw `--license-text` JSON은 ephemeral runner에만 두고 upload하지 않는다. path·license expression·오류
  수만 포함한 sanitized summary를 official `actions/upload-artifact` v4 commit 고정으로 14일 보존한다.
- evaluator의 clean, review-only, source-block, scanner-warning, empty-report regression을 CI에서 먼저
  실행한다.

14일 보존은 이 조건부 pilot evidence에만 적용한다. 조직의 법률·retention 책임자가 다른 기간을 정하면
해당 결정과 파기 검증을 반영해 재승인한다. 현재 구현은 local evaluator와 기존 project pilot report로
검증했으며 새 GitHub Actions job 자체의 hosted-runner 실행은 commit·push 전이라 아직 `NOT-RUN`이다.
ScanCode는 계속 license detector일 뿐 public corpus source snippet matcher가 아니므로 REQ-043 전체 완료나
provenance 보장을 선언하지 않는다.

커밋 예정 114-file local CI preview에서 최초 evaluator test fixture의 실제 라이선스 문자열이 source
finding으로 차단되는 것을 확인했다. 경로 예외나 suppression을 추가하지 않고 fixture를 중립 expression으로
바꿔 전체를 다시 검사했다. 최종 preview는 113 non-empty file, 233초, error·version cache 0,
review-only finding 5, source·unclassified finding 0으로 evaluator PASS했다. 이는 fail-closed negative와
수정 후 positive를 모두 재현한 local 증거이며 hosted runner PASS를 대체하지 않는다.

### 비용 계약

도입 승인은 다음 비용 evidence가 모두 있어야 한다.

- license/subscription 가격, 무료 API quota와 초과 단가, 최소 계약 기간
- CI runner의 cold/warm CPU·memory·wall time·artifact storage·egress 추정치
- corpus mirror 또는 self-hosted DB의 저장공간·갱신 traffic·backup·운영 인력
- 월별 hard cap·80% alert, 예상치 초과 시 fail-closed 동작과 비용 없는 rollback
- 가격·quota·과금 단위 변경 시 승인 만료와 재심사

공개 가격이 없는 후보는 `비용 미확정`이며 production 필수 gate로 승인하지 않는다.

### Suppression 계약

suppression은 결과를 삭제하지 않고 특정 finding에 대한 만료 가능한 사람 결정을 덧붙인다. 각 record는
다음 필드를 모두 가져야 한다.

```json
{
  "id": "SUP-0001",
  "scanner": "name@exact-version",
  "corpus": "provider@snapshot-or-digest",
  "findingFingerprint": "sha256:<canonical-finding>",
  "match": {
    "projectPath": "relative/path",
    "lineStart": 1,
    "lineEnd": 10,
    "sourceRepository": "https://example.invalid/repository",
    "sourceCommit": "full-commit-sha",
    "license": "SPDX-or-LicenseRef",
    "score": 100
  },
  "disposition": "false-positive|approved-use|clean-room-reimplemented",
  "rationale": "evidence-based reason",
  "reviewer": "approved-human-identity",
  "approvedAt": "YYYY-MM-DDTHH:mm:ssZ",
  "expiresAt": "YYYY-MM-DDTHH:mm:ssZ",
  "scope": "exact-file-and-finding",
  "evidence": ["repository-relative-or-approved-record-reference"]
}
```

- `scanner`, `corpus`, finding fingerprint, path/range, source commit, license, reviewer, rationale, evidence와
  expiry가 없으면 거부한다.
- global path·repository·license ignore, wildcard, 영구 suppression과 AI 자기 승인을 금지한다.
- source·finding·scanner·corpus·project license·배포 방식이 바뀌거나 expiry가 지나면 자동 무효다.
- strong-copyleft·unknown·no-license는 법률·OSS 책임자의 compatibility 결론 없이 suppress할 수 없다.
- scanner outage·empty result·전송 실패·quota 초과는 suppress 대상이 아니며 gate 자체를 BLOCKED로 둔다.

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
