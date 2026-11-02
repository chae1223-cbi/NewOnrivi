# 빌드 및 배포 영역 세부 코드 인덱스 (INDEX_BLD)

## 1. 빌드 핵심 코드 인덱스 테이블

| 인덱스 ID | 소속 파일 | 클래스 / 컴포넌트 / 함수 | 핵심 로직 및 기능 설명 | 연관 ID |
| :--- | :--- | :--- | :--- | :--- |
| **`[ONR-BLD-001]`**| [fix-extension.js](file:///d:/developer/OnriviMarkDown/frontend/fix-extension.js) | `copyDocsHelp` 함수 | 빌드 시 docs 디렉토리 하위의 리소스들(가이드 문서 및 명세서)을 out/ 빌드 경로에 재귀적으로 복사하는 로직 | `[ONR-IO-001]` |

---

## 2. 세부 분석 명세

### `[ONR-BLD-001]` docs 폴더 빌드 패키징 복사
* **파일 위치**: `frontend/fix-extension.js` (라인 187 부근)
* **소속 함수/컴포넌트**: 전역 빌드 유틸리티 함수 `copyDocsHelp()`
* **호출 흐름 (Call Flow)**:
  ```
  [npm run build:extension 실행] 
       └─> Next.js 정적 빌드 완료 (out/ 생성)
       └─> fix-extension.js 구동 
       └─> copyDocsHelp() 호출
       └─> 로컬 docs 폴더 검증 후 copyRecursive(src, dest) 동작 (하위 디렉토리 생성 및 복사)
  ```
* **동작 상세**: 
  크롬 확장프로그램 빌드 산출물(`out/`) 내부로 사용 가이드라인 및 필수 참조 파일(`CSS_PROFILE_SPEC.md` 등)이 누락 없이 자동 배포되도록 보장합니다.
