# AI 개발 위협 모델

고위험 기능, 새 외부 통합, AI tool·plugin·MCP 변경, 인증·결제·개인정보·파일 업로드,
데이터 migration과 배포 권한 변경 전에 작성한다.

## 변경 정보

- 관련 요구사항:
- 변경 소유자:
- AI 도구와 모델:
- 대상 환경:
- 데이터 분류:

## 자산

- 보호할 코드, 데이터, credential, 고객 정보와 운영 가용성:
- 삭제되거나 변조되면 복구하기 어려운 항목:
- agent가 접근할 필요가 없는 항목:

## 신뢰 경계

- 사용자 입력:
- 웹·문서·이슈·PR·로그 등 외부 콘텐츠:
- repository instructions와 dependency scripts:
- MCP·plugin·language server:
- 개발·CI·staging·production:
- agent 간 메시지와 memory:

## 공격 경로

| 경로 | 가능한 영향 | 기존 통제 | 남은 위험 |
|---|---|---|---|
| 간접 prompt injection → tool call | | | |
| 외부 문서 → 명령 실행 | | | |
| 과도한 file permission → 삭제 | | | |
| DB credential → destructive query | | | |
| network + secret → data exfiltration | | | |
| 악성 dependency·plugin·MCP | | | |
| memory poisoning → 다음 세션 영향 | | | |
| multi-agent 권한 연쇄 | | | |
| 무한 retry·resource 생성 → 비용 증가 | | | |

## 고위험 작업

- 정확한 작업과 대상:
- 사람 승인 위치:
- 실행 주체와 승인 주체 분리:
- dry-run 또는 preview:
- backup과 restore rehearsal:
- rollback과 중단 조건:

## 검증

- [ ] agent에 production write credential이 없음
- [ ] 기본 네트워크 차단 또는 정확한 allowlist 적용
- [ ] workspace 밖 쓰기 차단
- [ ] prompt injection 회귀 시나리오 통과
- [ ] destructive action approval bypass 테스트 통과
- [ ] secret exfiltration 테스트 통과
- [ ] backup restore 검증 완료
- [ ] audit log와 incident owner 지정

## 승인

- 보안 검토자:
- 승인된 잔여 위험:
- 재검토 조건:
