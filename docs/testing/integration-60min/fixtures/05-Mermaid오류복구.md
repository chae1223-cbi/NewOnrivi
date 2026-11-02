# QA Mermaid 오류와 복구

```mermaid
flowchart LR
  A[닫히지 않은 노드 --> B[결과]
```

위 오류를 코드 편집에서 다음 내용으로 교체하세요.

```text
flowchart LR
  A[복구] --> B[정상 표시]
```

ERROR-OUTSIDE 오류 블록 밖의 본문은 계속 입력할 수 있어야 합니다.
