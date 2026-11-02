# KORDOC 문서 가져오기 검토

검토 대상: [chrisryugj/kordoc](https://github.com/chrisryugj/kordoc), 2026-10-26 확인.

## 적용 내용

- KORDOC의 문서 → Markdown 변환과 표 좌표 보존 방식을 참고했다. 코드를 복사하거나 `kordoc` 패키지를 의존성에 추가하지 않았다.
- 기존 가져오기에는 HWP 5 파일용 파서만 있고 HWPX는 선택 대상에서 빠져 있었다. `hwpxImporter.ts`에서 HWPX ZIP의 `Contents/content.hpf` 목차 순서대로 본문 XML을 읽고, 문단·표·그림을 Markdown으로 옮기도록 구현했다.
- 이미지는 기존 저장 콜백을 사용한다. 표 셀은 `cellAddr`의 행·열 좌표에 놓아 빈 칸을 유지한다.
- 이 구현은 문서 내용 가져오기용이다. 원본 서식, 복잡한 병합 셀, 수식, 도형, OCR, HWP 3.x 파싱까지 보장하지 않는다. 기존 HWP 5 가져오기 경로는 그대로 사용한다.
- DOCX는 기존 `mammoth` 기반 가져오기가 이미 문단·표·그림을 처리하므로 그 경로를 유지하고 지원 형식 목록에서 계속 제공한다.
- 구형 Word 97–2003 DOC는 KORDOC 지원 목록에 없으므로 [Microsoft MS-DOC 형식 명세](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/)의 piece table을 바탕으로 별도의 본문 텍스트 가져오기를 추가했다. 압축된 8비트 조각과 UTF-16 조각을 순서대로 읽는다. DOC의 표 서식과 그림은 현재 가져오지 않는다. Word 97 이전 형식과 암호화된 파일은 명시적으로 거부한다.

## 상업적 사용

KORDOC 저장소의 [LICENSE](https://github.com/chrisryugj/kordoc/blob/main/LICENSE)는 MIT 라이선스이며 상업적 사용·수정·배포를 허용한다. KORDOC 코드나 패키지를 제품에 포함할 경우 저작권 표시와 MIT 허가문을 함께 배포해야 한다. [NOTICE](https://github.com/chrisryugj/kordoc/blob/main/NOTICE)에는 일부 코드가 Apache 2.0 라이선스의 제3자 작업을 바탕으로 작성되었다고 적혀 있으므로, 해당 부분까지 가져올 때는 그 고지와 라이선스도 확인해야 한다.

현재 변경은 KORDOC 코드를 포함하지 않으므로 KORDOC의 저작권 고지를 제품 배포물에 추가할 필요는 없다. 추후 KORDOC 패키지를 실제로 탑재하면 배포물의 오픈소스 고지를 갱신해야 한다.

## 후속 검토

KORDOC는 [HWP 3.x·5.x, HWPX와 여러 형식의 파싱](https://github.com/chrisryugj/kordoc#readme)을 제공하며 Node.js 20 이상을 요구한다. 오래된 HWP 3.x 지원이 필요하면 데스크톱/서버 측 실행 경로와 브라우저 실행 경로를 구분해 통합을 설계해야 한다. 현재의 브라우저 가져오기 코드에 KORDOC 전체를 바로 묶는 것은 패키지의 Node 의존성과 선택적 PDF/OCR 의존성 때문에 적절한지 별도 검증이 필요하다.
