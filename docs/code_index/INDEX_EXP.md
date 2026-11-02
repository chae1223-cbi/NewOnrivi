# 문서 내보내기 영역 세부 코드 인덱스 (INDEX_EXP)

## 1. 내보내기 핵심 코드 인덱스 테이블 (클래스/메소드 상세)

| 인덱스 ID | 소속 파일 | 소속 모듈 | 소속 함수 및 메소드 | 핵심 로직 및 기능 설명 | 연관 ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[ONR-EXP-001]`** | [exportHandlers.ts](file:///d:/developer/OnriviMarkDown/frontend/src/lib/exportHandlers.ts) | 내보내기 비즈니스 모듈 | `exportToHTML` / `exportToPDF` | 작성 완료된 에디터 문서를 HTML, PDF 파일로 클라이언트 측에서 빌드하고 다운로드 트리거 | - |
| **`[ONR-EXP-002]`** | [epubGenerator.ts](file:///d:/developer/OnriviMarkDown/frontend/src/lib/epubGenerator.ts) | EPUB 포맷 변환 모듈 | `generateEpub` | ZIP 압축 라이브러리(JSZip)를 사용해 마크다운 결과물을 표준 EPUB 전자책 구조로 조합하는 기능 | - |

---

## 2. 세부 분석 및 메소드 명세

### `[ONR-EXP-001]` 로컬 PDF / HTML 파일 출력 처리
* **구조적 위치**:
  * 모듈: `exportHandlers`
  * 대상 메소드:
    * `exportToHTML = async (options: ExportOptions): Promise<void>`
    * `exportToPDF = async (options: ExportOptions): Promise<void>`
* **호출 흐름**:
  ```
  [PDF 내보내기 개시]
       └─> exportHandlers.ts: flushIME() 실행 (입력조합 즉시 커밋)
       └─> exportHandlers.ts: exportToPDF(options) 호출
       └─> exportHandlers.ts: options.previewEl.cloneNode(true) 복제
       └─> exportHandlers.ts: applyExportInlineStyles(clone) 등 이미지/지도 교정 적용
       └─> exportHandlers.ts: 가상 iframe을 띄워 인쇄 스타일 시트 동적 로딩 및 window.print() 유도
  ```

### `[ONR-EXP-002]` EPUB 규격 파일 어셈블링
* **구조적 위치**:
  * 모듈: `epubGenerator`
  * 대상 메소드: `generateEpub = async (title: string, author: string, markdownContent: string, customCss?: string): Promise<Blob>`
* **호출 흐름**:
  ```
  [EPUB 빌드 버튼 클릭]
       └─> epubGenerator.ts: generateEpub(title, author, content) 실행
       └─> epubGenerator.ts: sanitizeToXHTML(html) 호출 (XHTML 엄격 모드 마크업 교정)
       └─> epubGenerator.ts: JSZip을 이용하여 mimetype, META-INF/container.xml 패키징
       └─> epubGenerator.ts: content.opf 및 toc.ncx XML 명세 동적 생성 및 바인딩
       └─> epubGenerator.ts: zip.generateAsync({ type: 'blob' }) 실행하여 다운로드 준비 완료
  ```
