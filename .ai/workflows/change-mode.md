# Change mode workflow

## 목적

공통 환경 자체의 upstream 변경과 회사·프로젝트의 downstream 적용을 섞지 않는다.

## 시작 절차

1. 저장소 manifest, upstream lock, organization·project profile과 Git remote를 읽기 전용으로
   확인한다.
2. 변경 목적과 대상 계층이 명확하면 해당 모드를 적용한다.
3. 불명확하고 변경 위치가 달라질 때만 upstream 유지보수인지 downstream 도입인지 질문한다.

## Upstream maintenance

- 공통성, backward compatibility와 다중 AI 도구 지원을 검토한다.
- 새 skill·plugin·도구는 공급망 심사 후 정확한 버전과 해시를 고정한다.
- 공통 regression, compatibility와 security Eval을 실행한다.
- changelog, migration, rollback과 지원 범위를 작성한다.

## Downstream adoption

- upstream release·commit·checksum을 고정하고 검증한다.
- 조직 policy와 project profile은 upstream core 밖의 확장 계층에 둔다.
- 조직 비밀과 proprietary skill을 public upstream에 전송하지 않는다.
- 공통 gate와 조직·제품 regression을 모두 실행하고 diff를 승인받는다.

## 제품 개발

승인된 downstream 환경에서 제품 코드를 개발한다. 제품 기능 구현을 위해 upstream 하네스나
grader를 임의로 약화하지 않는다. 공통 환경 결함은 재현 case와 함께 별도 upstream 후보로
기록한다.
