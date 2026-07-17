# Human-in-the-loop 계약

상태: 설계 승인

## 역할

- **Upstream**: 언제 무엇을 어떤 형식으로 질문할지와 무응답 시 default-deny를 정의한다.
- **Downstream AI**: 자동 감지 후 실제 결정을 바꾸는 최소 질문을 제시한다.
- **Downstream 사용자**: 영향과 대안을 확인하고 선택·승인·거절한다.
- **Harness**: 답변을 설정·ADR·승인 기록으로 고정하고 범위를 집행한다.

## 반드시 질문하는 경우

| 영역 | 질문 대상 |
|---|---|
| 요구사항 충돌 | 우선할 사용자 흐름·인수 조건 |
| 개발환경 | 언어·framework·DB·provider·지원 범위 |
| 의존성·plugin | 기존·신규 package의 source·현재/목표 version·코드 영향·권한·network 변경 |
| 설치 스크립트 | package·정확한 version·script·필요성·network·filesystem 영향·허용 여부 |
| 데이터·개인정보 | 저장·전송 위치, 목적과 보존 기간 |
| 인증·권한 | user·tenant·admin의 허용 작업 |
| 비용 | 유료 API, cloud resource와 quota |
| Production | 정확한 환경·resource의 배포·migration |
| 파괴적 작업 | preview 영향, backup·rollback과 실행 승인 |
| 보안 통제 | Rules, scanner, hook, sandbox와 IAM 변경 |

## 질문 형식

```text
결정할 사항 / 필요한 이유 / 감지된 근거
선택지·추천안·trade-off
정확한 대상·명령·환경
보안·데이터·비용 영향
검증·rollback·승인 유효 범위
답이 없을 때의 안전한 상태
```

비밀 값을 답변으로 요구하지 않고 secret manager의 key 이름과 설정 완료 여부만 확인한다.

MCP server의 최초 설정·활성화, version·integrity·publisher·tool·host·credential scope 변경과
만료된 심사 갱신은 Human-in-the-loop 대상이다. 사용자는 비밀 값을 제공하지 않고 manifest diff,
요청 권한, 데이터 흐름, 제거·rollback과 공급망 심사 결과를 확인해 활성화 여부만 결정한다.

이미 설치된 package version 변경도 Human-in-the-loop 대상이다. patch나 security update라도 현재·
목표 version, peer·runtime 호환성, 필요한 code migration, lockfile·전이 dependency 변화, 검증과
rollback을 먼저 제시한다. 승인 전에 manifest·lockfile·override를 수정하거나 update 명령을
실행하지 않으며 적용 중 preview 범위가 달라지면 재승인한다.

GitHub·Vercel 연결 전 commit author identity, account·team·repository scope와 동일 repository의 기존
project를 확인한다. 중복 Vercel project의 연결 해제·삭제, main 병합과 Production 배포는 대상과
rollback을 제시한 뒤 별도 승인받는다. verified email로 바꾸기 위해 기존 commit을 재작성하거나 force
push하지 않는다.

## 질문 없이 진행 가능한 경우

- repository 범위 read-only 조사
- 이미 승인된 명령·파일 범위의 결정론적 검사
- 작업 파일에 한정된 안전한 format·lint fix
- 승인 계획 안의 작은 되돌릴 수 있는 project-local 변경
- 외부 상태를 바꾸지 않는 문서·diff 작성

새 외부 전송, 권한, 비용, 삭제 또는 production 영향이 나타나면 질문 단계로 전환한다.

## Downstream 응답 계약

- 선택: 특정 option과 적용 범위
- 승인: 제시된 정확한 명령·환경·resource·시간
- 거절: 실행하지 않고 대안 또는 `TBD` 유지
- 수정 요청: 범위·명령·rollback 변경 후 재-preview
- 정보 요청: 결정 전 추가 근거 요구

“알아서”, “적당히”, 과거 승인과 침묵은 고위험 승인으로 해석하지 않는다. 승인 후 대상이나
명령이 바뀌면 다시 질문한다.

## 기록·Eval

- 기술 선택은 요구사항·개발환경 문서·ADR에, 일회성 고위험 승인은 제한된 audit record에 둔다.
- `HANDOFF.md`에는 결정과 `TBD`를 요약하되 비밀과 포괄 승인을 넣지 않는다.
- Eval은 질문 누락, 과도한 질문, 모호한 답의 승인 오해, 대상 변경 후 재승인 누락과 비밀 질문을
  positive·negative case로 검사한다.

## 추적성

- 관련 요구사항: REQ-004, REQ-007, REQ-015, REQ-016, REQ-019–REQ-023, REQ-026–REQ-030, REQ-034–REQ-036
