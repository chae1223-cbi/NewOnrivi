# 도움말 현행화 확인 기록

확인일: 2026-10-22. 기준은 현재 작업 트리의 실행 코드이며 과거 변경 주석이나 이전 대화의 설명만으로 기능을 확정하지 않았다. 도움말 목차와 32개 챕터, 총 33개 문서를 전면 재작성했다.

## 반영 위치

- 원본: `docs/help/*.md`
- 앱 공개 자료: `frontend/public/help/*.md` — 원본과 동일한 내용
- 등록 정보: `frontend/src/lib/helpAssets.json` — 파일명·식별자는 유지하고 문서 표시 제목을 갱신
- 기존 진입점: `HelpModal.tsx`, `app/docs/page.tsx` — 기존 파일명을 유지하여 목록·링크를 보존
- 기존 assets는 유지했다. 예전 화면 이미지를 현재 화면의 근거로 재사용하지 않았다.

이번 작업은 로컬 도움말 원본과 배포용 정적 자료의 갱신이다. 운영 서버의 도움말 DB 게시, 앱 빌드·배포는 수행하지 않았다.

## 소스 확인 범위와 도움말 연결

| 챕터 | 확인한 주요 실행 경로 |
| --- | --- |
| 01~02 시작·보기 | `components/MainEditorApp.tsx`의 초기 보기·편집 조건·Monaco readOnly, `MenuBar.tsx`, `StatusBar.tsx`, `hooks/useEditorTabs.ts` |
| 03 저장·복구 | `hooks/useEditorTabs.ts`, `hooks/useEditorHandlers.ts`, `hooks/useEditorSettings.ts`, MainEditorApp 저장·초안·autoSave 경로 |
| 04 작업장 | `lib/resourceSettings.ts`, `resourceMedia.ts`, MainEditorApp 리소스 폴더 변경 처리, MenuBar 로컬/Drive 메뉴 |
| 05~08 본문·목록·인용 | `VisualDocumentEditor.tsx`, `lib/visualMarkdownInputRules.ts`, `visualMarkdownPaste.ts`, `visualDocumentCodec.ts`, `visualListCommands.ts` |
| 09 표 | `TableModal.tsx`, `lib/visualTableCommands.ts`, `VisualDocumentEditor.tsx`, `lib/aiFriendlyReport.ts` |
| 10 미디어 | `ImageModal.tsx`, `YoutubeModal.tsx`, `MarkdownViewer.tsx`, 미디어 크기·정렬·설명 컴포넌트, `lib/resourceMedia.ts` |
| 11~14 서식 | `CssStyleForm.tsx`, `constants/cssProfile.ts`, `lib/headingNumbering.ts`, `reportNumbering.ts`, MainEditorApp 원문 번호 동기화 |
| 15 AI 요청 | `components/ai/InlineAIAssistant.tsx`, MainEditorApp readDocument·capture·그림책 제한 분기, `lib/ai/documentBatch.ts` |
| 16 연결·템플릿 | `AIConnectionSettings.tsx`, `PromptStudioModal.tsx`, `lib/ai/client.ts`, `resourceAICredentials.ts`, `recommendedModels.ts`, `attachments.ts`, `templates.ts` |
| 17 지식보관함 | `components/knowledge`의 가져오기·근거·설정 화면, `lib/knowledge`의 검색·색인·클라이언트 경로 |
| 18 수식 | `FormulaModal.tsx`, MarkdownViewer 수식 렌더러, VisualDocumentEditor 수식 입력·블록 나가기 |
| 19 도식 | MarkdownViewer Mermaid 코드 분기, 내보내기 렌더링 경로 |
| 20 각주·참고문헌 | `ReferenceManagerModal.tsx`, `lib/bibliography.ts`, `footnoteOrganizer.ts`, VisualDocumentEditor 인용 처리 |
| 21~24 출력·가져오기 | `ExportModal.tsx`, `lib/exportHandlers.ts`, `epubGenerator.ts`, `paginatedPrint.ts`, `documentPrintSettings.ts`, `importFormats.ts`, `fileImporter.ts` |
| 25~26 도구·단축키 | `lib/toolbarConfig.ts`, `visualCommandCatalog.ts`, `SettingsModal.tsx`, VisualDocumentEditor 명령과 키 처리 |
| 27 설정 | `SettingsModal.tsx`, `hooks/useEditorSettings.ts`, 계정·리소스·워터마크 화면 |
| 28 권한 | MainEditorApp 제한 사용자·동시 접속·도움말 읽기 전용 조건, `LicenseModal.tsx` |
| 29 문제 해결 | 위 기능들의 오류 처리, `lib/previewHighlight.ts`, MainEditorApp 위치 강조 처리 |
| 30 코드 | `VisualDocumentEditor.tsx`의 코드 NodeView·복사·언어·키 처리, `visualMarkdownInputRules.ts` |
| 31 그림책 | `lib/picturebook.ts`, `PicturebookPreview.tsx`, MainEditorApp picturebookEditorOptions와 AI 제한, `picturebookEpub.ts` |
| 32 부가 작업 | `LinkModal.tsx`, `CalendarModal.tsx`, `DateTimeInsertPicker.tsx`, `ReferenceManagerModal.tsx`, MainEditorApp 문서 병합·이모지·서명 분기 |

## 이번에 바로잡은 내용

1. AI는 현재 이름인 질문 / 문서 정리 / 문구 수정으로 안내한다. 일반 질문에 문서 전체가 자동 전송된다고 설명하지 않는다.
2. 문서 정리는 파일 첨부 없이 열린 문서 전체를 보내기 시점에 읽는다. 결과가 생성되었다고 원문이 자동 교체된 것은 아니다.
3. 문구 수정의 11개 선택 작업, 복수 작업의 한 요청 전달, 입력창 자동 프롬프트 생성, 직접 입력 유지와 직접 요청의 선택 해제를 설명한다.
4. 제목 1~6은 해시 뒤 공백으로 변환한다. 해시만 입력한 상태의 성급한 제목 전환 안내를 제거했다.
5. 제목 번호·사용자 지정 기호는 원문에도 기록한다. 목록 마커와 구분하고, 번호 변경·해제 시 원문 표시가 갱신될 수 있음을 안내한다.
6. 이미지 가로 %는 본문 너비 기준이다. 표·그림 설명의 위치·형식은 현재 서식과 삽입 설정에 따라 확인하도록 안내한다.
7. 그림책 AI 전체 차단이라는 옛 설명을 제거하고 질문·문서 정리와 장면 문구 수정의 지원 차이를 명시한다. 다음 장면 추가 버튼의 현재 구현을 반영했다.
8. 예상 페이지 안내와 수동 구분, 실제 인쇄 결과를 구분한다. 빈 줄로 쪽을 고정하는 방법을 권장하지 않는다.
9. 가져오기 목록에 없는 HWPX·XLSX·PPTX를 지원한다고 쓰지 않는다. 일반 문서 HWPX 출력과 그림책의 DOCX/HWPX 제외를 구분한다.
10. PDF OCR 미지원, AI 첨부 형식·용량·PDF 분량 제한, API 비용·권한·모델 목록과 실제 생성의 차이를 명시한다.
11. 판형·여백·글꼴을 정부 공식 출판 규격으로 제시하지 않는다. 법령 준수·서점 접수·보안·외부 프로그램의 완벽 호환을 보장하지 않는다.
12. 메타데이터를 정상 YAML 형식으로 재작성했다. 기존 문서 파일명과 링크는 보존했다.

## 실행 코드에서 확인한 별도 제약

- `lib/ai/client.ts`의 현재 `readConnections()`는 Google 활성 리소스 키를 중심으로 목록을 재구성한다. 제공사별 자격정보 저장 코드·카드가 존재하는 것과 모든 제공사의 목록 복원이 동일하게 완성되었다는 주장은 구분해야 한다. 도움말에는 모든 제공사에서 자동 복원이 보장된다고 쓰지 않았다.
- `recommendedModels.ts`에는 넓은 ID 조건과 추천 목록 폴백이 있다. 현재 도움말은 목록 노출을 실제 사용 권한의 보장으로 설명하지 않는다.
- 나란히 보기의 Monaco readOnly 조건과 그림책 선택 편집 조건은 실행 분기를 기준으로 적었다. 편집할 수 없는 화면에서 타이핑하라고 단정하지 않았다.
- 지식 검색 데이터의 로컬 보관과 외부 AI 호출은 다르다. 지식 기능 전체가 무조건 오프라인 또는 외부 전송 없음이라고 설명하지 않는다.

위 항목은 도움말 작성 중 확인한 범위이며, 이번 작업에서 해당 앱 기능을 임의로 개편하지 않았다.

## 검증 결과

- `node scripts/check-help-docs.cjs`: 33개 문서의 날짜·메타데이터·문법 예시·등록 목록·공개 자료 일치 및 내부 링크 64개 통과.
- `node scripts/check-visual-editor.cjs --visual --current-help-only`: 실제 편집기에서 도움말 33개 표시, 전체 도움말 붙여넣기 원문 유지, 표·코드·콜아웃, 실행 취소·다시 실행 통과.
- Windows 파일 줄바꿈과 브라우저 textarea의 LF 표현 차이는 검증 입력에서 정규화했다. 실제 문서 내용 차이로 숨기지 않았다.

검증은 도움말과 해당 편집 표시 경로에 한정한다. 모든 외부 API·웹드라이브·프린터·서점 제출을 다시 실사용 검증했다는 의미는 아니다.

## 도움말 전용 서식 추가

`onrivi-help` / 온리비 도움말을 시스템 서식으로 등록했다. 도움말 33개의 메타데이터와 공개 사본에 지정하고 `HelpDocument.tsx`로 도움말 모달과 웹 도움말의 표현을 통일했다. 제목 자동 번호 없음, 읽기용 본문, 표·코드, 밝은/어두운 화면 색을 별도 적용한다. 일반 원고 기본 서식은 바꾸지 않았다. 타입 검사·ESLint·도움말 33개 및 링크 64개 검증을 통과했다.
