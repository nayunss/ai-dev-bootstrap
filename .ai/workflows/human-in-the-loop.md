# Human-in-the-loop workflow

1. 저장소에서 답을 자동 감지할 수 있는지 확인한다.
2. 결과가 구현, 권한, 데이터, 비용, production 또는 보안을 바꾸는지 평가한다.
3. 저위험 read-only·승인 범위 안이면 진행한다.
4. 고위험 또는 결과를 크게 바꾸는 값이면 구조화된 질문을 제시한다.
5. 명시적 선택·승인·거절만 기록하고 모호한 답은 승인으로 해석하지 않는다.
6. 대상·명령·환경이 바뀌면 재승인을 요청한다.
7. 승인 범위 안에서 실행하고 diff·outcome·rollback을 검증한다.
8. 결정과 재승인 조건을 문서와 `HANDOFF.md`에 기록한다.

이미 설치된 package version 변경은 항상 4단계 질문 대상이다. 현재·목표 정확한 version, 변경
이유, code migration·호환성·lockfile·전이 dependency 영향, 검증과 rollback을 제시하고 승인 전에는
manifest·lockfile·override 또는 install 상태를 변경하지 않는다. 범위가 달라지면 재승인한다.

질문에는 결정 이유, 근거, 선택지·추천안, 정확한 대상, 영향, 검증, rollback, 유효 범위와
무응답 시 default-deny를 포함한다. 비밀 값은 질문하지 않는다.
