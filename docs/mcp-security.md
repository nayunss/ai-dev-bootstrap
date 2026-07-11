# MCP 보안과 승인 절차

상태: 기본 차단
조사 기준일: 2026-07-11

## 결론

검증되지 않은 MCP server는 프로젝트에 설정하거나 실행하지 않는다. MCP는 AI에 새로운 텍스트
context만 주는 것이 아니라 로컬 프로세스, 파일, credential, 외부 API와 쓰기 작업을 연결할 수
있다. 따라서 package 이름이나 marketplace 표시, 유명 publisher와 정상적인 tool 이름만으로
신뢰하지 않는다.

프로젝트 기본 manifest인 `.ai/manifests/approved-mcp.json`은 빈 allowlist와 default-deny로
시작한다. 공급망·권한·통신·도구 의미를 심사하고 사람이 승인한 정확한 버전만 `approved`와
`enabled`를 모두 `true`로 설정할 수 있다. 공통 pre-tool hook은 manifest에 활성화되지 않은 MCP
호출을 거부한다.

## 확인된 위험

| 위험 | 영향 | 기본 통제 |
|---|---|---|
| tool poisoning·간접 prompt injection | tool description·응답이 모델에게 비밀 읽기나 다른 tool 호출을 지시 | tool metadata 검토·hash, 출력은 불신 데이터, 민감 경로 차단 |
| rug pull·업데이트 변조 | 승인 후 version이나 tool 설명·행동이 변경 | 정확한 version·integrity 고정, 자동 업데이트 금지, 변경 시 재심사 |
| tool shadowing·cross-server 공격 | 정상 tool과 유사한 이름으로 호출을 가로채거나 다른 MCP 권한과 결합 | server·tool allowlist, tool 이름 충돌 검사, 서버 간 데이터 전달 금지 |
| 과도한 로컬 권한 | home, `.env*`, SSH·cloud credential·소스 쓰기 또는 임의 명령 실행 | 별도 OS 사용자·sandbox, filesystem allowlist, credential 비상속 |
| confused deputy·token passthrough | 다른 resource용 token을 재사용해 권한 우회 | audience·resource 검증, MCP client token 전달 금지, 서버별 최소 scope token |
| 원격 server·노출 endpoint | 인증 우회, 중간자, SSRF, 데이터 외부 전송 | HTTPS, 인증, host·egress allowlist, private bind, 요청·응답 크기 제한 |
| 취약한 구현·dependency | path traversal, command injection, RCE, credential theft | SAST·dependency/CVE audit, 고위험 미패치 finding 시 거부 |
| sampling·roots·elicitation 오용 | server가 추가 모델 호출, 광범위한 root 또는 사용자 입력을 요구 | 필요 기능만 허용, 민감 입력 금지, 매 호출 Human-in-the-loop |

MCP 공식 보안 지침은 token passthrough를 금지하며 token audience와 target resource 검증을
요구한다. OWASP는 MCP가 prompt injection, 공급망 공격과 confused deputy를 결합하며 로컬 MCP가
호스트 권한으로 파일과 credential을 탈취할 수 있다고 설명한다. AAAI에 발표된 MCPTox는 실제
MCP server의 tool poisoning을 여러 agent에서 평가해 공격이 현실적인 client-side 위험임을
보였다. NSA의 보안 설계 지침도 prompt injection, data exfiltration과 MCP Inspector 취약점 같은
구현 위험을 별도로 다룬다.

## 설치 전 공급망 심사

다음을 모두 증명하지 못하면 설치하지 않는다.

1. 공식 source repository와 publisher identity를 확인한다.
2. package·container·binary의 정확한 version, commit과 SHA-256 또는 registry integrity를 고정한다.
3. license, maintainer 변경, release history, 서명·provenance와 최근 보안 대응을 검토한다.
4. install lifecycle, postinstall, shell 실행, dynamic download와 bundled binary를 source에서 찾는다.
5. dependency·SAST·secret·malware·known CVE를 검사하고 high·critical 미패치 finding은 거부한다.
6. 실제 tool·resource·prompt description을 열거하고 숨은 Unicode·외부 지시·과도한 권한을 검토한다.
7. 실행 중 telemetry, DNS·HTTP destination, update check와 필요한 inbound port를 확인한다.
8. filesystem, network, environment, credential, API scope와 데이터 보존·삭제 정책을 기록한다.
9. sandbox에서 정상·악성 입력, path traversal, command injection, tool poisoning과 권한 우회를
   시험한다.
10. 제거·credential rotation·rollback 방법과 review 만료일을 기록한다.

검사는 민감하지 않은 격리 fixture에서 수행한다. 실제 `.env*`, 개인 home, 회사 source,
production credential과 고객 데이터를 MCP 심사 환경에 제공하지 않는다.

## 즉시 거부 조건

- `latest`, floating Git branch, checksum 없는 원격 script·binary 또는 설치 중 추가 다운로드
- source와 배포 artifact 불일치, publisher·license·ownership을 확인할 수 없음
- telemetry·update check·외부 host를 끌 수 없거나 목적보다 넓은 network egress 요구
- 전체 home·workspace write, `.env*`·SSH·cloud credential 접근 또는 ambient credential 상속
- 임의 shell·code execution을 핵심 기능과 무관하게 제공
- tool description에 모델 지시, 다른 tool 호출, 비밀 수집 또는 사용자에게 숨기는 동작 포함
- OAuth token passthrough, audience 미검증, 평문 HTTP 또는 인증 없는 non-loopback bind
- high·critical 취약점, 알려진 악성 package·maintainer 또는 보안 문제 은폐
- tool 목록·설명·권한이 실행 중 바뀌지만 변경 탐지와 재승인 방법이 없음

## 승인 manifest

승인 항목에는 최소한 다음을 기록한다.

```json
{
  "name": "reviewed-server",
  "version": "1.2.3",
  "source": "https://github.com/example/repository/tree/commit",
  "integrity": "sha256:...",
  "reviewedAt": "YYYY-MM-DD",
  "reviewExpiresAt": "YYYY-MM-DD",
  "approvedBy": "security-owner",
  "allowedTools": ["read_public_issue"],
  "allowedHosts": ["api.example.com"],
  "filesystemRead": ["docs/public"],
  "filesystemWrite": [],
  "credentialScopes": ["issues:read"],
  "telemetry": "disabled",
  "approved": true,
  "enabled": false
}
```

심사 승인과 실제 활성화를 분리한다. downstream 사용자가 프로젝트 목적과 scope를 확인한 후에만
`enabled`를 `true`로 바꾼다. 승인자, version, integrity, host, tool 또는 권한이 바뀌면 기존
승인은 무효다.

## Downstream 적용

- 전역 MCP 설정을 자동 수정하지 않고 project-local 설정만 생성한다.
- 설정 diff, 실행 command, network host, filesystem·credential scope와 제거 방법을 먼저 보여준다.
- local stdio server는 project-local exact dependency로 설치하고 lifecycle script를 기본 끈다.
- server 프로세스에는 필요한 환경 변수만 명시적으로 전달하며 parent process environment 전체를
  상속하지 않는다.
- `.env*`, home, SSH, cloud credential과 다른 repository는 OS·sandbox 권한에서도 숨긴다.
- 읽기 tool과 쓰기·삭제·배포 tool을 분리하고 후자는 매 호출 Human-in-the-loop 승인을 요구한다.
- 여러 MCP server의 출력을 다른 server로 전달하지 않으며 필요한 경우 목적·필드·수신자를 승인한다.
- CI는 manifest schema, 고정 version·integrity, review 만료와 설정 drift를 검사한다.

공통 hook은 명시적인 미승인 호출을 차단하는 보조 통제다. tool 이름 위장, client bug, MCP 외부의
직접 process 실행과 이미 탈취된 credential을 완전히 막지 못하므로 sandbox·egress·IAM이 실제
권한 경계여야 한다.

## 출처

- [MCP 공식 Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- [OWASP MCP Tool Poisoning](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning)
- [MCPTox, AAAI Proceedings](https://ojs.aaai.org/index.php/AAAI/article/view/40895)
- [NSA MCP Security Design Considerations](https://www.nsa.gov/Portals/75/documents/Cybersecurity/CSI_MCP_SECURITY.pdf)
