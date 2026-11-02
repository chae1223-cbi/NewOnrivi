// @ts-nocheck
// ====================================================================
// 📊 [OMD-HOOK-useEditorHandlers-0001] useEditorHandlers.ts ➔ 에디터 액션 핸들러 훅
// 🚨 @PATCH : **2026-10-31** — [제목(H1~H6) 버튼 동일 클릭 시 취소(토글 해제) 지원]:
//             1) h1~h6 핸들러를 applyLinePrefix('h1~h6')로 연결하여 동일 제목 레벨 재클릭 시 제목 태그를 제거하고 일반 문단으로 복귀하도록 토글 취소 연동
// 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 전용 분할 출력 핸들러(exportSNS) 연동]: 내보내기 모달에서 'SNS 카드뉴스 출력' 선택 시 카드 비율(1:1 / 4:5 / 16:9), 분할 기준, 저장 방식(낱장 PNG / ZIP)을 exportSNSCardNews로 전달하여 일괄 사출 지원
// 🚨 @PATCH : **2026-10-24** — [마크다운 전체 복사(copyAll) 다중 Fallback 강화]: Electron copyTextToClipboard 및 writeText 안전 연동
// 🚨 @PATCH : **2026-10-20** — [문서 서식 정리(cleanDoc) 실행 시 readOnly 모나코 에디터 및 분할 화면 즉각 100% 동기화]:
//             1) 나란히 보기(both) 등 readOnly 상태에서 editor.executeEdits가 무시되던 결함을 model.pushEditOperations 및 setValue 강제 동기화로 해결
//             2) 서식 정리 후 contentRef, updateContent, setTabs를 즉시 호출하여 React 상태 및 우측 뷰어까지 완벽 동기화
// 🚨 @PATCH : **2026-10-20** — [문서 메타영역(Frontmatter) 사용자 수동 삭제 시 재주입 방어]: 기본 서식(system-1) 상태에서 사용자가 에디터 상단의 Frontmatter를 삭제한 경우 저장 시 강제 재생성(persistDefault)을 배제하여 순수 마크다운 상태 영구 보존
// ====================================================================
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { reportClientLog } from '@/lib/clientLogs';
import { browserPickerStartIn } from '@/lib/browserPickerStartIn';
import { useCallback } from 'react';
import { waitForExportContent } from '@/lib/exportPreparation';
import { exportPDF, exportHTML, exportEPUB, exportPNG, exportSNSCardNews, exportDOCX, exportHWPX } from '@/lib/exportHandlers';
import { DEFAULT_PROFILE } from "@/constants/cssProfile";
import { readPrintSettings, writePrintSettings, readEffectivePrintSettings, compactLegacyPrintMetadata, DocumentPrintSettings } from '@/lib/documentPrintSettings';
import { writePaginationSettings, type DocumentPaginationSettings } from '@/lib/documentPaginationSettings';
import { vfsWriteFile } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { stripFrontmatter } from "@/lib/editorUtils";
import { extractFrontmatter, updateCssProfileInFrontmatter } from '@/lib/frontmatter';
import { documentBookProfile } from '@/lib/picturebook';
import { supabase } from '@/lib/supabaseClient';
import { clearAuthSessionStorage } from '@/lib/authSessionHelper';
import { logoutCurrentWebSession } from '@/lib/logoutWebSession';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { triggerKnowledgeAutoSyncOnSave } from '@/lib/knowledge/knowledgeAutoSync';
import { cleanMarkdownDocument } from '@/utils/markdownCleaner';
import { openAndFocusFindWidget } from '@/utils/findWidgetHelper';
import {
  getSavedDriveToken,
  saveDriveFileContent,
  saveEmergencyDriveDrafts,
  getSavedWorkspaceInfo
} from '@/lib/gdrive/googleDriveClient';
import { organizeMarkdownFootnotes } from '@/lib/footnoteOrganizer';

/**
 * [ONR-16-004] useEditorHandlers 커스텀 훅
 * @description 에디터의 주요 액션 핸들러(파일 저장, 내보내기, 서식 삽입 등)를 분리 관리합니다.
 */
// ====================================================================
// 📊 [OMD-EDIT-USEEDITORHANDLERS-0014] useEditorHandlers.ts ➔ useEditorHandlers
// 🎯 @KICK  : 에디터 주요 액션 핸들러(저장, 내보내기, 서식 삽입 등)를 통합 관리
// 🚨 @PATCH : **2026-10-19** — [브라우저 모드 수동 저장 시 작업장 핸들 자동 바인딩 및 저장 대화상자 불필요 팝업 차단]: save 실행 시 fileNode.handle 누락 시 rootFolder.handle에서 대상 파일 핸들을 자동 바인딩하여 showSaveFilePicker 팝업 없이 원본 파일 직접 저장 보장, 플레이스홀더 안내문 덮어쓰기 방어
// 🚨 @PATCH : **2026-10-17** — [문서 저장 시 물리 파일 바인딩 보존 및 새 이름 저장 시 탭 메타데이터 100% 동기화]:
//             1) handlers.save 시 activeTab에 유효한 path가 존재할 경우 fileNode를 자동 복원하고 currentFileNode/currentFileName을 즉시 동기화하여 불필요한 '저장 공통 다이얼로그(saveFileAs)' 팝업 결함 해결
//             2) fileName이 '새 파일.md'이더라도 fileNode.path가 존재하면 실제 디스크 파일명을 역추출하여 직접 저장하도록 방어
//             3) saveFileAs 및 saveAs 완료 시 tabs 배열의 활성 탭에 name, path, node를 온전히 갱신하고, 활성 탭이 없을 경우 신규 탭을 추가하여 탭 상태 유실 및 자동저장 무력화 방어
// 🚨 @PATCH : **2026-10-17** — [빠른 표(quickTable) 생성 시 하단 빈 행 자동 추가]: quickTable 생성 마크다운 끝에 빈 줄(\n\n)을 추가하여 마우스 클릭으로 다음 작업을 이어갈 수 있도록 개선
// 🚨 @PATCH : **2026-10-16** — [전역 검색(globalSearch) 호출 시 사이드바 오픈 및 검색 입력창 포커스 강제 연동]:
//             globalSearch 실행 시 setIsSidebarOpen(true), setIsSearchOpen(true) 및 onrivi:focus-global-search 이벤트를 발송하여 어느 상태에서든 즉시 검색 탭이 열리고 포커스되도록 개선
// 🚨 @PATCH : **2026-10-15** — [편집 에디터 글자 크기 확대/축소 핸들러 제거]:
//             에디터 폰트 크기 변경 방식의 zoomIn/zoomOut 핸들러를 제거하여 문서보기 줌 체계와 분리
// 🚨 @PATCH : **2026-10-15** — [다른 이름으로 저장(saveAs) 시 작업장 변경 차단]:
//             문서 다른 이름으로 저장 시 기존 열려있던 작업장(rootFolder, workspaceType)이 변경되던 결함을 수정하여 현재 작업장 독립성 100% 보장
// 🚨 @PATCH : **2026-10-14** — [각주 정리(organizeFootnotes) 엔진 전면 고도화 및 본문 순서 기반 1번부터 순차 재정렬 연동]:
//             1) 구버전의 단순 하단 정렬 방식을 탈피하여 본문 등장 순서대로 1, 2, 3... 순차 재번호 부여(organizeMarkdownFootnotes) 연동
//             2) 영문/한글/기호 등 비정규 각주 라벨의 표준 번호화 및 본문 흩어진 각주 정의 일괄 수집
//             3) 정리 완료/미변경/각주없음 상태별 명확한 토스트 알림 안내 제공
// 🚨 @PATCH : **2026-10-15** — [서명/발신인 서식 왼쪽 정렬 기본 전환]: 기본 템플릿 및 감싸기 태그를 <div align="left">로 변경하고 양방향 unwrap 지원
// 🚨 @PATCH : **2026-10-14** — [간편 표(quickTable) 생성 시 첫 번째 열 헤더("구분") 자동 선택 연동]: quickTable 호출 시 첫 번째 헤더 셀로 커서 및 선택 영역을 자동 안착시켜 즉시 편집 가능하도록 개선
// 🚨 @PATCH : **2026-10-11** — [구글 드라이브 토큰 만료 시 비상 로컬 백업 연동 및 작성 글 100% 보존]:
//             구글 드라이브 저장 시 토큰 만료(401)나 네트워크 실패 시에도 작성 중이던 최신 에디터 본문을 onrivi_emergency_gdrive_drafts 로컬 스냅샷으로 즉시 대피 백업하여 데이터 유실 원천 방어
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 저장 시 브라우저 showSaveFilePicker 다이얼로그 오작동 차단 & 클라우드 직결 무음 저장 지원]: driveFileId/driveId 또는 workspaceType === 'cloud' 환경에서 브라우저 파일 다이얼로그로 누락 떨어지던 결함을 차단하고 saveDriveFileContent 직결 무음 저장 및 새 문서 프롬프트 연동
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 붉은색 인감도장 태그 적용]: 기본 템플릿의 도장 표식을 붉은색 원형 인감도장 태그(<span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">인</span>)로 업그레이드
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 핸들러 추가]: 선택 영역 우측 정렬 감싸기/토글 및 미선택 시 오늘 날짜 기반 기본 서명 템플릿 삽입(작성자명 자동 선택) 구현 (handlers.signature)
// 🚨 @PATCH : **2026-10-01** — [DOCX 내보내기 시 미리보기 DOM 직결 연동]: 마크다운 태그 누출을 원천 방지하기 위해 렌더링된 previewRef DOM을 기반으로 exportDOCX를 호출하도록 연동
// 🚨 @PATCH : **2026-10-01** — [한글(.hwpx) 내보내기 핸들러 제거]: handlers.exportHWPX 액션 및 exportHWPX 임포트 완전 삭제
// 🚨 @PATCH : **2026-09-30** — [Word(.docx) 및 한글(.hwpx) 내보내기 핸들러 연동]: handlers.exportDOCX 및 handlers.exportHWPX 액션 등록
// 🚨 @PATCH : **2026-09-30** — [에디터 종료 로그아웃 방어 로직 강화]: 서버 세션 해제 실패 시에도 로컬 인증 세션이 정상 정리되도록 보강
// 🚨 @PATCH : **2026-09-23** — [플로팅 툴바 toggleFloatingToolbar safeLeft 정규화] 880px 하드코딩 클램프 제거 및 커서 x좌표 기반 전달로 뷰포트 클램퍼 연동
// 🚨 @PATCH : **2026-09-11** — 코드 블록(code) 삽입 시 기본 언어를 markdown(```markdown)으로 변경 연동
//             **2026-09-11** — 찾기/바꾸기(find/replace) 실행 시 openAndFocusFindWidget 연동(다중 타이머 강제 포커스 및 Enter 키 다음 찾기 100% 보장), 인용구(quote) 핸들러에 alertType 매개변수 연동
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 에디터 수동 저장(save) 시 지식 보관함 등록 문서 로컬 비동기 자동 재색인(triggerKnowledgeAutoSyncOnSave) 일원화 연동
//             **2026-08-12** — 저장(save) 시 단순 만료 외에 동시접속 제한 및 제한 사용자 플랜 여부(isRestrictedUser)를 검사하여 문서를 저장하지 못하도록 권한 가드 보완 적용
//             **2026-07-16** — PDF 내보내기 시 머리글/바닥글 및 표지 페이지 제외 옵션을 exportPDF 파라미터 구조체에 매핑하여 전달하도록 패치.
//             **2026-06-19** — 인쇄/PDF 기능 통합 처리: print 핸들러 실행 시 window.print() 인쇄 팝업 대신 직접 PDF 파일 저장 기능(exportPDF)을 다이렉트로 수행하도록 패치; exportPDF 호출 시 누락되었던 dynamicCssString(활성 CSS 프로필) 매개변수를 추가 전달하도록 패치; previewRef/setIsSettingsModalOpen 누락 복원 등
//             **2026-06-20** — 내보내기(PDF/HTML/PNG/EPUB) 서식 및 배경색 완벽 동기화를 위해 activeProfile 서식 프로필 매개변수를 추가로 전달하도록 패치
//             **2026-08-05** — 저장(save, saveAs) 시 현재 적용 중인 서식을 Frontmatter(css_profile)에 자동 주입 및 에디터 동기화 처리 패치
// 🔗 @CALLS : exportPDF, exportHTML, exportEPUB, exportPNG, vfsWriteFile, stripFrontmatter, sanitizePastedText, previewRef, setIsSettingsModalOpen, updateCssProfileInFrontmatter, triggerKnowledgeAutoSyncOnSave
// ====================================================================
export const useEditorHandlers = ({
  editorRef,
  previewModeRef,
  contentRef,
  currentFileNameRef,
  currentFileNodeRef,
  workspaceTypeRef,
  rootFolderRef,
  lastSavedContentRef,
  currentFileParentHandleRef,
  profiles,
  activeProfileId,
  isDarkMode,
  dynamicCssString,
  preferLiveProfile,
  setSaveStatus,
  setCurrentFileName,
  setCurrentFileNode,
  setRootFolder,
  setWorkspaceType,
  setIsSidebarOpen,
  setIsExportModalOpen,
  setIsYoutubeModalOpen,
  setIsMapModalOpen,
  setIsTableModalOpen,
  setIsFormulaModalOpen,
  setIsSearchOpen,
  setIsLicenseModalOpen,
  setIsSettingsModalOpen,
  setIsImageModalOpen,
  setIsReferenceModalOpen,
  setEditingImageInfo,
  setSettingsModalInitialTab,
  setFontSize,
  setHelpTitle,
  setHelpContent,
  setIsHelpModalOpen,
  setFloatingToolbar,
  setPromptConfig,
  showToast,
  refreshFileList,
  updateContent,
  wrapSelection,
  insertAtCursor,
  applyLinePrefix,
  removePrefix,
  insertLink,
  quickWrap,
  insertBlockTag,
  setShowDocLinkPicker,
  sanitizePastedText,
  isComposingRef,
  previewRef,
    createNewTab,
    switchTab,
    setTabs,
    activeTabIdRef,
    licenseStatusRef,
    lastSelectionRef,
    tabsRef,
    saveFile
  }: any) => {

  const prepareEditorForExport = async () => {
    try {
      // The mounted visual editor owns the latest document; Monaco may still hold
      // the source from before a manual page-break edit. Never copy that back.
      const visualEditor = previewRef.current?.querySelector('.visual-document-editor');
      const sourceEditorActive = editorRef.current && previewModeRef?.current !== 'preview' && !visualEditor;
      if (sourceEditorActive || visualEditor) {
        // Moving focus commits Korean IME before reading the editor model.
        const input = document.createElement('input');
        input.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(input);
        try { input.focus({ preventScroll: true }); input.blur(); } finally { input.remove(); }
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (visualEditor) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          return true;
        }
        const value = editorRef.current.getValue();
        if (value !== contentRef.current) updateContent(value);
        if (previewRef.current) await waitForExportContent(previewRef.current, value);
      }
      if (!visualEditor && previewRef.current) {
        await waitForExportContent(previewRef.current, contentRef.current);
      }
      return true;
    } catch (error: any) {
      showToast('내보내기 준비 실패: ' + error.message, 'error');
      return false;
    }
  };

  // 날짜/시간 형식 토큰: YYYY(연), MM(월), DD(일), HH(24시), mm(분), ss(초)
  const formatCurrentDateTime = (format = 'YYYY-MM-DD HH:mm:ss') => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const values: Record<string, string> = {
      YYYY: String(now.getFullYear()),
      YY: String(now.getFullYear()).slice(-2),
      MM: pad(now.getMonth() + 1),
      M: String(now.getMonth() + 1),
      DD: pad(now.getDate()),
      D: String(now.getDate()),
      HH: pad(now.getHours()),
      H: String(now.getHours()),
      mm: pad(now.getMinutes()),
      m: String(now.getMinutes()),
      ss: pad(now.getSeconds()),
      s: String(now.getSeconds()),
    };
    return format.replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g, token => values[token]);
  };

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003] 등록된 문서 저장 시 지식 베이스 로컬 비동기 자동 재색인 트리거
  const triggerKnowledgeAutoSync = (filePath: string, fileContent: string) => {
    if (typeof window === 'undefined' || !filePath || !fileContent) return;
    triggerKnowledgeAutoSyncOnSave({ filePath, fileContent }).catch(() => {});
  };

  const handlers = {
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0013] useEditorHandlers.ts ➔ footnote
    // 🎯 @KICK  : 각주 참조 및 정의를 문서 끝에 자동 생성하여 삽입
    // 🛡️ @GUARD : editorRef, monaco, model, selection, position 존재 여부 확인
    // 🚨 @PATCH : 없음
    // 🔗 @CALLS : showToast
    // ====================================================================
    footnote: () => {
        if (!editorRef.current || typeof window === 'undefined' || !(window as any).monaco) return;
        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return;
  
        const selection = editor.getSelection();
        const position = editor.getPosition();
        if (!position || !selection) return;
  
        const fullText = model.getValue();
        const startOffset = model.getOffsetAt(selection.getStartPosition());
        const endOffset = model.getOffsetAt(selection.getEndPosition());
        
        // 1. 최대 번호 추출
        const footnoteRegex = /\[\^(\d+)\]/g;
        let maxNumber = 0;
        let match;
        while ((match = footnoteRegex.exec(fullText)) !== null) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
        const nextNumber = maxNumber + 1;
        const footnoteRef = `[^${nextNumber}]`;
  
        // 2. 인라인 각주 문자열 병합
        const textWithRef = fullText.substring(0, startOffset) + footnoteRef + fullText.substring(endOffset);
  
        // 3. 전체 문서 파싱 및 각주 수집
        const lines = textWithRef.split('\n');
        let newLines: string[] = [];
        let footnotes: { num: number, lines: string[] }[] = [];
        let currentFootnote: { num: number, lines: string[] } | null = null;
  
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const fnMatch = line.match(/^\[\^(\d+)\]:(.*)/);
          
          if (fnMatch) {
            if (currentFootnote) {
              footnotes.push(currentFootnote);
            }
            const num = parseInt(fnMatch[1], 10);
            currentFootnote = { num, lines: [line] };
          } else if (currentFootnote) {
            // 빈 줄이거나 들여쓰기된 줄은 각주 내용으로 간주
            if (line.trim() === '' || /^[ \t]+/.test(line)) {
              currentFootnote.lines.push(line);
            } else {
              footnotes.push(currentFootnote);
              currentFootnote = null;
              newLines.push(line);
            }
          } else {
            newLines.push(line);
          }
        }
        if (currentFootnote) {
          footnotes.push(currentFootnote);
        }
  
        // 새 각주 정의 추가
        footnotes.push({ num: nextNumber, lines: [`[^${nextNumber}]: `] });
  
        // 각주 블록 내의 불필요한 후행 빈 줄 제거
        footnotes.forEach(f => {
          while (f.lines.length > 1 && f.lines[f.lines.length - 1].trim() === '') {
            f.lines.pop();
          }
        });
  
        // 본문 하단의 불필요한 후행 빈 줄 제거
        while (newLines.length > 0 && newLines[newLines.length - 1].trim() === '') {
          newLines.pop();
        }
  
        // 각주 번호순 정렬
        footnotes.sort((a, b) => a.num - b.num);
  
        // 본문 하단에 각주 블록 결합 (빈 줄 하나로 구분)
        if (footnotes.length > 0) {
          if (newLines.length > 0) newLines.push('');
          footnotes.forEach(f => {
            newLines.push(...f.lines);
          });
        }
  
        const finalString = newLines.join('\n');
  
        // 4. 에디터에 일괄 적용
        editor.pushUndoStop();
        const Range = (window as any).monaco.Range;
        editor.executeEdits("gatherFootnotes", [{
          range: model.getFullModelRange(),
          text: finalString,
          forceMoveMarkers: true
        }]);
        editor.pushUndoStop();
  
        // 5. 커서를 맨 마지막으로 이동시켜 입력 대기
        setTimeout(() => {
          const newLineCount = model.getLineCount();
          const newLastLineLength = model.getLineLength(newLineCount);
          editor.setPosition({
            lineNumber: newLineCount,
            column: newLastLineLength + 1
          });
          editor.focus();
        }, 20);
      },
  
      // ====================================================================
      // 💡 [OMD-EDIT-USEEDITORHANDLERS-CITATION] useEditorHandlers.ts 의 citation
      // 📝 @KICK  : 에디터 본문에 참조문헌(인용) 구문 삽입
      // ====================================================================
      organizeFootnotes: () => {
        if (!editorRef.current || typeof window === 'undefined' || !(window as any).monaco) return;
        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return;

        const fullText = model.getValue();
        const result = organizeMarkdownFootnotes(fullText);

        if (result.count === 0) {
          showToast('정리할 각주가 본문에 없습니다.', 'info');
          return;
        }

        if (!result.changed) {
          showToast('모든 각주가 이미 본문 순서대로 완벽히 정렬되어 있습니다.', 'info');
          return;
        }

        editor.pushUndoStop();
        const Range = (window as any).monaco.Range;
        editor.executeEdits("organizeFootnotes", [{
          range: model.getFullModelRange(),
          text: result.text,
          forceMoveMarkers: true
        }]);
        editor.pushUndoStop();

        showToast(`총 ${result.count}개의 각주를 본문 순서에 맞추어 1번부터 순차적으로 재정렬했습니다.`, 'success');
      },

      citation: () => {
      if (!editorRef.current || typeof window === 'undefined' || !(window as any).monaco) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      const selection = editor.getSelection();
      if (!selection) return;

      editor.executeEdits('citation', [{ range: selection, text: '[@]', forceMoveMarkers: true }]);
      
      const position = editor.getPosition();
      if (position) {
        editor.setPosition({ lineNumber: position.lineNumber, column: position.column - 1 });
      }
      editor.focus();
    },

    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0012] useEditorHandlers.ts ➔ insertText
    // 🎯 @KICK  : 커서 위치에 임의 텍스트를 삽입 (슬래시 명령어 등에서 호출)
    // 🛡️ @GUARD : editorRef 존재 여부 확인
    // 🚨 @PATCH : 없음
    // 🔗 @CALLS : 없음
    // ====================================================================
    insertText: (text: string) => {
      if (!editorRef.current) return;
      const position = editorRef.current.getPosition();
      editorRef.current.executeEdits("insertText", [{
        range: new (window as any).monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: text,
        forceMoveMarkers: true
      }]);
      editorRef.current.focus();
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0011 ✅ FIXED] useEditorHandlers.ts ➔ cleanDoc
    // 🎯 @KICK  : 문서 내 마크다운 서식(코드/수식 마스킹, 표 정렬, 헤딩/인용구 공백, HTML 변환) 지능형 일괄 정리
    // 🛡️ @GUARD : editorRef 존재 여부, 드래그 선택 영역(Selection) 부분 정리 분기, 정리할 내용이 없으면 안내
    // 🚨 @PATCH : **2026-10-20** — cleanMarkdownDocument 전면 연동 고도화:
    //             1) readOnly 에디터(both 모드 등)에서 executeEdits 무시 방어를 위해 model.pushEditOperations 및 setValue 강제 동기화
    //             2) 서식 정리 즉시 contentRef, updateContent, setTabs 갱신으로 좌우 분할 뷰 및 React 상위 상태 100% 동기화
    //             **2026-09-11** — cleanMarkdownDocument 전면 연동: 코드/수식/Frontmatter 마스킹 보호, 표 수직 줄맞춤(Pretty Table), 헤딩/인용구 공백 교정, HTML 마크다운 변환, 드래그 선택 영역 부분 정리 및 상세 통계 토스트 안내 탑재
    // 🔗 @CALLS : cleanMarkdownDocument, showToast
    // ====================================================================
    cleanDoc: () => {
      if (!editorRef.current) return;
      const editor = editorRef.current;

      const textarea = editor.getDomNode()?.querySelector('textarea');
      if (textarea) {
        textarea.blur();
        textarea.focus();
      }
      isComposingRef.current = false;

      const model = editor.getModel();
      if (!model) return;

      const selection = editor.getSelection();
      const isRangeSelected = selection && !selection.isEmpty();

      if (isRangeSelected) {
        const text = model.getValueInRange(selection);
        const result = cleanMarkdownDocument(text);

        if (result.isModified) {
          editor.pushUndoStop();
          if (typeof model.pushEditOperations === 'function') {
            model.pushEditOperations([], [{
              range: selection,
              text: result.cleanedText,
              forceMoveMarkers: true
            }], () => null);
          } else {
            editor.executeEdits("cleanDoc", [{
              range: selection,
              text: result.cleanedText
            }]);
          }
          editor.pushUndoStop();

          const nextFull = model.getValue();
          contentRef.current = nextFull;
          if (typeof updateContent === 'function') updateContent(nextFull, false, true);
          if (typeof setTabs === 'function') {
            setTabs((prev: any[]) => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: nextFull, isModified: true } : t));
          }

          showToast(`선택 영역 ${result.summaryMessage}`, "success");
        } else {
          showToast("선택 영역에 정리할 서식이 없습니다.", "info");
        }
      } else {
        const text = editor.getValue();
        const result = cleanMarkdownDocument(text);

        if (result.isModified) {
          editor.pushUndoStop();
          const fullRange = model.getFullModelRange();
          if (typeof model.pushEditOperations === 'function') {
            model.pushEditOperations([], [{
              range: fullRange,
              text: result.cleanedText,
              forceMoveMarkers: true
            }], () => null);
          }
          if (model.getValue() !== result.cleanedText) {
            model.setValue(result.cleanedText);
          }
          editor.pushUndoStop();

          contentRef.current = result.cleanedText;
          if (typeof updateContent === 'function') updateContent(result.cleanedText, false, true);
          if (typeof setTabs === 'function') {
            setTabs((prev: any[]) => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: result.cleanedText, isModified: true } : t));
          }

          showToast(result.summaryMessage, "success");
        } else {
          showToast("정리할 서식이 없습니다.", "info");
        }
      }
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0010] useEditorHandlers.ts ➔ copyAll
    // 🎯 @KICK  : 에디터 전체 마크다운 내용을 클립보드에 복사
    // 🛡️ @GUARD : contentRef 존재 여부, Electron copyTextToClipboard 및 Clipboard API 다중 Fallback
    // 🚨 @PATCH : **2026-10-24** — [마크다운 복사 다중 Fallback 지원]: Electron IPC 및 navigator.clipboard writeText 연동
    // 🔗 @CALLS : showToast
    // ====================================================================
    copyAll: async () => {
      const rawMarkdown = contentRef.current || "";
      if (rawMarkdown) {
        try {
          const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
          if (api?.copyTextToClipboard) {
            const result = await api.copyTextToClipboard(rawMarkdown);
            if (result !== true && result?.success !== true) await navigator.clipboard.writeText(rawMarkdown);
          } else {
            await navigator.clipboard.writeText(rawMarkdown);
          }
          showToast("에디터의 원본 마크다운 전체 내용이 클립보드에 복사되었습니다.", "success");
        } catch (err) {
          showToast("마크다운 복사에 실패했습니다.", "error");
          throw err;
        }
      } else {
        showToast("복사할 마크다운 내용이 없습니다.", "info");
      }
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0009] useEditorHandlers.ts ➔ newFile
    // 🎯 @KICK  : 새 빈 문서를 생성하고 워크스페이스 사이드바를 활성화
    // 🛡️ @GUARD : 없음
    // 🚨 @PATCH : 없음
    // 🔗 @CALLS : updateContent, showToast
    // ====================================================================
    newFile: () => {
      updateContent('');
      setCurrentFileName('새 파일.md');
      setCurrentFileNode(null);
      lastSavedContentRef.current = '';
      setIsSidebarOpen(true);
      showToast("새 문서를 시작합니다.", "info");
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0008] useEditorHandlers.ts ➔ save
    // 🎯 @KICK  : 현재 문서를 Electron/웹/브라우저 환경에 맞게 저장
    // 🛡️ @GUARD : fileNode 경로/핸들 존재 여부, 저장 실패 시 fallback 처리
    // 🚨 @PATCH : **2026-08-05** — 저장 시 현재 활성화된 서식을 문서 Frontmatter(css_profile)에 자동 주입/갱신 및 에디터 텍스트 동기화
    // 🔗 @CALLS : refreshFileList, showToast, vfsWriteFile, setPromptConfig, updateCssProfileInFrontmatter
    // ====================================================================
    save: async () => {
      const isRestrictedUser = licenseStatusRef?.current?.isExpired ||
        licenseStatusRef?.current?.isRestricted ||
        licenseStatusRef?.current?.planName?.includes('미인증') ||
        licenseStatusRef?.current?.planName?.includes('제한사용자');

      if (isRestrictedUser) {
        showToast("🔒 라이선스가 만료되었거나 제한 사용자 상태이므로 저장할 수 없습니다. 라이선스를 확인해 주세요.", "error");
        return;
      }
      const api = (window as any).electronAPI;
      setSaveStatus('saving');

      const activeTab = tabsRef?.current?.find((t: any) => t.id === activeTabIdRef?.current);
      let fileNode = activeTab ? (activeTab.node || (activeTab.path ? { name: activeTab.name, path: activeTab.path, kind: 'file' } : null)) : currentFileNodeRef.current;
      if (activeTab?.isBundledHelp || isBundledDocumentPath(fileNode?.path)) fileNode = null;
      let fileName = (fileNode && fileNode.name) || activeTab?.name || currentFileNameRef.current || '새 파일.md';

      if (fileNode) {
        if (!currentFileNodeRef.current) {
          currentFileNodeRef.current = fileNode;
          setCurrentFileNode(fileNode);
        }
        if (fileName === '새 파일.md' && fileNode.name && fileNode.name !== '새 파일.md') {
          fileName = fileNode.name;
        } else if (fileName === '새 파일.md' && fileNode.path) {
          const extracted = fileNode.path.replace(/\\/g, '/').split('/').filter(Boolean).pop();
          if (extracted) {
            fileName = extracted;
            fileNode.name = extracted;
          }
        }
        if (fileName !== '새 파일.md' && currentFileNameRef.current !== fileName) {
          currentFileNameRef.current = fileName;
          setCurrentFileName(fileName);
        }
      }
      const wType = workspaceTypeRef.current;
      // 💡 [치명적 데이터 유실 방어] React 상태 디바운스로 인한 타이핑 직후 저장 시 최신 본문 누락 완전 방지
      let currentVal = editorRef?.current ? editorRef.current.getValue() : contentRef.current;
      contentRef.current = currentVal;

      if (currentVal.includes('작업장 외부 문서 안내') || currentVal.includes('작업장 외부 문서')) {
        showToast("⚠️ 작업장 안내 문서는 실제 파일에 덮어쓸 수 없습니다. 원본 문서를 연결해 주세요.", "warning");
        setSaveStatus('unsaved');
        return;
      }

      // [서식 자동 주입 패치] 사용자가 메타영역을 지웠거나 기본 서식 사용 시 불필요한 Frontmatter 강제 주입 배제
      {
        const profile = profiles?.find((p: any) => p.id === activeProfileId) || DEFAULT_PROFILE;
        const compacted = compactLegacyPrintMetadata(currentVal);
        const hasExistingProfile = Boolean(extractFrontmatter(compacted).data.css_profile);
        const isCustomProfile = profile.id !== 'system-1' && profile.id !== 'default';
        const nextVal = updateCssProfileInFrontmatter(compacted, profile.id, profile.name, { persistDefault: hasExistingProfile || isCustomProfile });
        if (nextVal !== currentVal) {
          currentVal = nextVal;
          contentRef.current = nextVal;
          updateContent(nextVal, false, true);
        }
      }

      // ☁️ [Google Drive 클라우드 저장 분기]
      // activeTab은 상단 L507에서 이미 취득됨
      const driveFileId = fileNode?.driveFileId || 
        fileNode?.driveId || 
        (activeTab as any)?.driveFileId || 
        (activeTab as any)?.driveId;
      const isCloudWorkspace = wType === 'cloud' || rootFolderRef.current?.type === 'GDRIVE';

      if (isCloudWorkspace || driveFileId) {
        if (driveFileId) {
          const token = getSavedDriveToken();
          if (token) {
            try {
              await saveDriveFileContent(token, driveFileId, currentVal);
              lastSavedContentRef.current = currentVal;
              setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
              setTimeout(() => {
                setTabs(prev => {
                  const activeT = prev.find(t => t.id === activeTabIdRef.current);
                  if (activeT && !activeT.isModified && activeT.content === currentVal) return prev;
                  return prev.map(t => {
                    const tDriveId = (t as any).driveFileId || (t as any).driveId;
                    const isMatch = (tDriveId && String(tDriveId) === String(driveFileId)) || t.id === activeTabIdRef.current;
                    return isMatch ? { ...t, isModified: false, content: currentVal } : t;
                  });
                });
              }, 150);
              showToast("구글 드라이브에 안전하게 저장되었습니다.", "success");
              triggerKnowledgeAutoSync(fileNode?.path || fileName, currentVal);
              return;
            } catch (driveErr: any) {
              setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
              // 🛡️ [데이터 보존 안전망] 저장 실패 시 최신 에디터 버퍼를 로컬에 긴급 백업
              saveEmergencyDriveDrafts({
                timestamp: Date.now(),
                activeTabId: activeTabIdRef?.current,
                drafts: (tabsRef?.current || []).map((t: any) => ({
                  tabId: t.id,
                  driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
                  name: t.name,
                  path: t.path,
                  content: t.id === activeTabIdRef?.current ? currentVal : t.content,
                  isModified: true,
                  savedAt: new Date().toISOString()
                }))
              });
              showToast("구글 드라이브 저장 실패: " + (driveErr.message || driveErr), 'error');
              return;
            }
          } else {
            setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
            saveEmergencyDriveDrafts({
              timestamp: Date.now(),
              activeTabId: activeTabIdRef?.current,
              drafts: (tabsRef?.current || []).map((t: any) => ({
                tabId: t.id,
                driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
                name: t.name,
                path: t.path,
                content: t.id === activeTabIdRef?.current ? currentVal : t.content,
                isModified: true,
                savedAt: new Date().toISOString()
              }))
            });
            showToast("구글 드라이브 인증 토큰이 필요합니다. 다시 연결해 주세요.", 'error');
            return;
          }
        } else if (fileName === '새 파일.md' || !driveFileId) {
          // 구글 드라이브 작업장에서 새 파일 저장 시 파일명 입력 프롬프트 모달 호출
          setPromptConfig({
            isOpen: true,
            title: '구글 드라이브 새 문서 저장',
            defaultValue: fileName === '새 파일.md' ? '새 문서.md' : fileName,
            type: 'createFile',
            error: ""
          });
          setSaveStatus('unsaved');
          return;
        }
      }

      const hasPathOrHandle = fileNode && (fileNode.path || fileNode.handle);
      if (hasPathOrHandle && fileName !== '새 파일.md') {
        if (api) {
          try {
            const success = await api.saveFile(fileNode.path, currentVal);
            if (success) {
              lastSavedContentRef.current = currentVal;
              setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
              setTimeout(() => {
                setTabs(prev => {
                  const target = prev.find(t => t.id === activeTabIdRef.current);
                  if (target && !target.isModified && target.content === currentVal) return prev;
                  return prev.map(t => t.id === activeTabIdRef.current ? { ...t, isModified: false, content: currentVal } : t);
                });
              }, 150);
              showToast("현재 파일에 안전하게 저장되었습니다.", "success");
              triggerKnowledgeAutoSync(fileNode.path, currentVal);
              return;
            }
          } catch (e) {
            setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
            showToast("저장 실패: " + e, 'error');
            return;
          }
        } else if (wType === 'local') {
          try {
            const res = await fetch(getApiUrl('/api/save'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: fileNode.path, content: currentVal })
            });
            if (res.ok) {
              lastSavedContentRef.current = currentVal;
              setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
              setTimeout(() => {
                setTabs(prev => {
                  const target = prev.find(t => t.id === activeTabIdRef.current);
                  if (target && !target.isModified && target.content === currentVal) return prev;
                  return prev.map(t => t.id === activeTabIdRef.current ? { ...t, isModified: false, content: currentVal } : t);
                });
              }, 150);
              showToast("현재 파일에 안전하게 저장되었습니다.", "success");
              triggerKnowledgeAutoSync(fileNode.path, currentVal);
              return;
            }
          } catch (e: any) {
            setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
            showToast("저장 실패: " + e.message, 'error');
            return;
          }
        } else if (wType === 'browser') {
          if (!fileNode.handle && rootFolderRef.current?.handle) {
            const targetBaseName = fileName || fileNode.name || fileNode.path?.replace(/\\/g, '/').split('/').pop() || '';
            if (targetBaseName && targetBaseName !== '새 파일.md') {
              try {
                const rf = rootFolderRef.current.handle;
                const targetNorm = targetBaseName.toLowerCase().normalize('NFC');
                for await (const entry of rf.values()) {
                  if (entry.kind === 'file' && entry.name.toLowerCase().normalize('NFC') === targetNorm) {
                    fileNode.handle = entry;
                    currentFileParentHandleRef.current = rf;
                    break;
                  }
                }
                const activeTabId = activeTabIdRef.current;
                if (fileNode.handle && activeTabId) {
                  setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, handle: fileNode.handle, node: { ...t.node, handle: fileNode.handle } } : t));
                }
              } catch {}
            }
          }

          if (fileNode.handle) {
            try {
              const writable = await fileNode.handle.createWritable();
              await writable.write(currentVal);
              await writable.close();
              lastSavedContentRef.current = currentVal;
              setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
              setTimeout(() => {
                setTabs(prev => {
                  const target = prev.find(t => t.id === activeTabIdRef.current);
                  if (target && !target.isModified && target.content === currentVal) return prev;
                  return prev.map(t => t.id === activeTabIdRef.current ? { ...t, isModified: false, content: currentVal } : t);
                });
              }, 150);
              showToast("현재 파일에 안전하게 저장되었습니다.", "success");
              triggerKnowledgeAutoSync(fileNode.path || fileName, currentVal);
              return;
            } catch (e: any) {
              setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
              showToast("저장 실패: " + e.message, 'error');
              return;
            }
          } else {
            vfsWriteFile(fileNode.path, currentVal);
            lastSavedContentRef.current = currentVal;
            setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
            setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, isModified: false } : t));
            showToast("현재 파일에 안전하게 저장되었습니다.", "success");
            triggerKnowledgeAutoSync(fileNode.path, currentVal);
            return;
          }
        }
      }

      if (api) {
        try {
          const suggestedName = fileName !== '새 파일.md' ? fileName : undefined;
          const defaultDir = rootFolderRef.current?.name && rootFolderRef.current.name !== BROWSER_STORAGE_NAME ? rootFolderRef.current.name : undefined;
          const file = await api.saveFileAs(currentVal, suggestedName, defaultDir);
          if (file) {
            const newNode: FileNode = { name: file.name, kind: 'file', path: file.path };
            setCurrentFileName(file.name);
            setCurrentFileNode(newNode);
            currentFileNameRef.current = file.name;
            currentFileNodeRef.current = newNode;
            lastSavedContentRef.current = currentVal;
            setSaveStatus('saved');
            reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
            setTabs(prev => {
              const hasActive = prev.some(t => t.id === activeTabIdRef.current);
              if (hasActive) {
                return prev.map(t => t.id === activeTabIdRef.current ? { ...t, name: file.name, path: file.path, node: newNode, isBundledHelp: false, isModified: false, content: currentVal } : t);
              }
              const newTabId = file.path || ('tab-' + Date.now());
              setActiveTabId(newTabId);
              return [...prev, {
                id: newTabId,
                name: file.name,
                path: file.path,
                node: newNode,
                content: currentVal,
                isModified: false
              }];
            });
            if (rootFolderRef.current?.path && file.path && file.path.startsWith(rootFolderRef.current.path)) {
              await refreshFileList();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
            showToast(`'${file.name}' 저장 완료`, 'success');
            triggerKnowledgeAutoSync(file.path, currentVal);
          } else {
            setSaveStatus('unsaved');
          }
        } catch (e) {
          setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
          showToast("저장 실패: " + e, 'error');
        }
      } else if (typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const suggestedName = fileName !== '새 파일.md' ? fileName : 'untitled.md';

          let startIn: any = undefined;
          if (currentFileParentHandleRef.current) {
            startIn = currentFileParentHandleRef.current;
          } else if (fileNode?.handle) {
            startIn = fileNode.handle;
          } else if (rootFolderRef.current?.handle) {
            startIn = rootFolderRef.current.handle;
          }

          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName,
            excludeAcceptAllOption: true,
            startIn: await browserPickerStartIn(startIn),
            types: [{
              description: 'Markdown Files (*.md)',
              accept: {
                'text/markdown': ['.md', '.markdown'],
                'text/plain': ['.md', '.markdown']
              }
            }]
          });

          const writable = await fileHandle.createWritable();
          await writable.write(currentVal);
          await writable.close();

          setCurrentFileName(fileHandle.name);
          setCurrentFileNode({ name: fileHandle.name, kind: 'file', handle: fileHandle });
          lastSavedContentRef.current = currentVal;
          setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
          setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, isModified: false } : t));
          await refreshFileList();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
          showToast(`'${fileHandle.name}' 파일이 저장되었습니다.`, 'success');
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
            showToast("저장 실패: " + e.message, 'error');
          } else {
            setSaveStatus('unsaved');
          }
        }
      } else if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          const targetName = window.prompt('저장할 파일 이름을 입력해 주세요:', fileName !== '새 파일.md' ? fileName : 'untitled.md');
          if (targetName) {
            const finalName = targetName.endsWith('.md') ? targetName : `${targetName}.md`;
            const fileHandle = await dirHandle.getFileHandle(finalName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(currentVal);
            await writable.close();
            setCurrentFileName(fileHandle.name);
            setCurrentFileNode({ name: fileHandle.name, kind: 'file', handle: fileHandle });
            lastSavedContentRef.current = currentVal;
            setSaveStatus('saved');
            showToast(`'${fileHandle.name}' 파일이 저장되었습니다.`, 'success');
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            setSaveStatus('unsaved');
            showToast("폴더 선택 실패", 'error');
          } else {
            setSaveStatus('unsaved');
          }
        }
      } else {
        setPromptConfig({
          isOpen: true,
          title: '새 파일 생성',
          defaultValue: fileName,
          type: 'createFile',
          error: ""
        });
        setSaveStatus('unsaved');
      }
    },

    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0007] useEditorHandlers.ts ➔ saveAs
    // 🎯 @KICK  : 새 경로/파일명으로 문서를 다른 이름으로 저장
    // 🛡️ @GUARD : Electron/File System Access/폴더 선택 각 환경별 예외 처리
    // 🚨 @PATCH : **2026-08-05** — 저장 시 현재 활성화된 서식을 문서 Frontmatter(css_profile)에 자동 주입/갱신 및 에디터 텍스트 동기화
    // 🔗 @CALLS : refreshFileList, showToast, setPromptConfig, updateCssProfileInFrontmatter
    // ====================================================================
    saveAs: async () => {
      const api = (window as any).electronAPI;
      const fileName = currentFileNameRef.current;
      const fileNode = currentFileNodeRef.current;
      const rootFld = rootFolderRef.current;
      let currentVal = contentRef.current;

      // [서식 자동 주입 패치] 사용자가 메타영역을 지웠거나 기본 서식 사용 시 불필요한 Frontmatter 강제 주입 배제
      {
        const profile = profiles?.find((p: any) => p.id === activeProfileId) || DEFAULT_PROFILE;
        const compacted = compactLegacyPrintMetadata(currentVal);
        const hasExistingProfile = Boolean(extractFrontmatter(compacted).data.css_profile);
        const isCustomProfile = profile.id !== 'system-1' && profile.id !== 'default';
        const nextVal = updateCssProfileInFrontmatter(compacted, profile.id, profile.name, { persistDefault: hasExistingProfile || isCustomProfile });
        if (nextVal !== currentVal) {
          currentVal = nextVal;
          contentRef.current = nextVal;
          updateContent(nextVal, false, true);
        }
      }

      const suggestedName = fileName !== '새 파일.md' ? fileName : undefined;
      const defaultDir = rootFld?.name && rootFld.name !== BROWSER_STORAGE_NAME ? rootFld.name : undefined;

      const wType = workspaceTypeRef.current;
      const isCloudWorkspace = wType === 'cloud' || rootFld?.type === 'GDRIVE';
      if (isCloudWorkspace) {
        window.dispatchEvent(new CustomEvent('onrivi:save-as-target', { detail: 'upload' }));
        return;
      }

      setSaveStatus('saving');

      if (api) {
        try {
          const file = await api.saveFileAs(currentVal, suggestedName, defaultDir);
          if (file) {
            // ⚠️ [사용자 규칙] 다른 이름으로 저장은 절대 작업장 폴더(rootFolder)를 변경하지 않는다!
            const newNode: FileNode = { name: file.name, kind: 'file', path: file.path };
            setCurrentFileName(file.name);
            setCurrentFileNode(newNode);
            currentFileNameRef.current = file.name;
            currentFileNodeRef.current = newNode;
            lastSavedContentRef.current = currentVal;
            setSaveStatus('saved');
            reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
            setTabs(prev => {
              const hasActive = prev.some(t => t.id === activeTabIdRef.current);
              if (hasActive) {
                return prev.map(t => t.id === activeTabIdRef.current ? { ...t, name: file.name, path: file.path, node: newNode, isBundledHelp: false, isModified: false, content: currentVal } : t);
              }
              const newTabId = file.path || ('tab-' + Date.now());
              setActiveTabId(newTabId);
              return [...prev, {
                id: newTabId,
                name: file.name,
                path: file.path,
                node: newNode,
                content: currentVal,
                isModified: false
              }];
            });
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            showToast(`'${file.name}' 저장 완료`, 'success');
            triggerKnowledgeAutoSync(file.path, currentVal);
          } else {
            setSaveStatus('unsaved');
          }
        } catch (e) {
          setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
          showToast("저장 실패: " + e, 'error');
        }
      } else if (typeof (window as any).showSaveFilePicker === 'function') {
        try {
          let startIn: any = undefined;
          if (currentFileParentHandleRef.current) {
            startIn = currentFileParentHandleRef.current;
          } else if (fileNode?.handle) {
            startIn = fileNode.handle;
          } else if (rootFld?.handle) {
            startIn = rootFld.handle;
          }

          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: suggestedName || 'untitled.md',
            excludeAcceptAllOption: true,
            startIn: await browserPickerStartIn(startIn),
            types: [{
              description: 'Markdown Files (*.md)',
              accept: {
                'text/markdown': ['.md', '.markdown'],
                'text/plain': ['.md', '.markdown']
              }
            }]
          });

          const writable = await fileHandle.createWritable();
          await writable.write(currentVal);
          await writable.close();

          setCurrentFileName(fileHandle.name);
          setCurrentFileNode({ name: fileHandle.name, kind: 'file', handle: fileHandle });
            lastSavedContentRef.current = currentVal;
            setSaveStatus('saved');
              reportClientLog('문서 저장 완료', 'INFO', 'DOCUMENT_SAVE');
            setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, isModified: false } : t));
            await refreshFileList();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
          showToast(`'${fileHandle.name}' 파일이 저장되었습니다.`, 'success');
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
            showToast("저장 실패: " + e.message, 'error');
          } else {
            setSaveStatus('unsaved');
          }
        }
      } else if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          // ⚠️ [사용자 규칙] 다른 이름으로 저장은 절대 작업장 폴더(rootFolder)를 변경하지 않는다!
          setPromptConfig({
            isOpen: true,
            title: '파일명 입력',
            defaultValue: suggestedName || '',
            type: 'createFile',
            error: ""
          });
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            setSaveStatus('unsaved');
            reportClientLog('문서 저장 실패 또는 저장 권한·연결 확인 필요', 'ERROR', 'DOCUMENT_SAVE');
            showToast("저장 실패: " + (e.message || e), 'error');
          } else {
            setSaveStatus('unsaved');
          }
        }
      } else {
        setPromptConfig({
          isOpen: true,
          title: "다른 이름으로 저장",
          defaultValue: fileName,
          type: 'createFile',
          error: ""
        });
        setSaveStatus('unsaved');
      }
    },
    openExport: () => setIsExportModalOpen(true),
    setPrintSettings:(settings:DocumentPrintSettings)=>{
      const source=contentRef.current,next=writePrintSettings(source,settings);
      if(next===source)return;
      contentRef.current=next;updateContent(next,false,true);
      setTabs(previous=>previous.map(t=>t.id===activeTabIdRef.current?{...t,content:next,isModified:true}:t));
    },
    setPaginationSettings:(settings:DocumentPaginationSettings)=>{
      const source=contentRef.current,next=writePaginationSettings(source,settings);
      if(next===source)return;
      contentRef.current=next;updateContent(next,false,true);
      setTabs(previous=>previous.map(t=>t.id===activeTabIdRef.current?{...t,content:next,isModified:true}:t));
    },
    print: async (previewOnly=false,settings?:DocumentPrintSettings,signal?:AbortSignal,paginationSettings?:DocumentPaginationSettings) => {
      if (!previewOnly && !await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      const activeProfile = documentBookProfile(contentRef.current, profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE, preferLiveProfile);
      const orientation = activeProfile.pageStyle.orientation as 'portrait' | 'landscape';
      const { marginTop, marginBottom, marginLeft, marginRight, backgroundColor, paperSize } = activeProfile.pageStyle;
      return await exportPDF({ previewEl: previewRef.current, currentFileName: currentFileNameRef.current, isDarkMode, showToast, orientation, paperSize, dynamicCssString, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, activeProfile,previewOnly,printSettings:settings || readEffectivePrintSettings(contentRef.current),signal,markdownContent:contentRef.current,paginationSettings });
    },
    exportPDF: async () => {
      if (!await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      const activeProfile = documentBookProfile(contentRef.current, profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE, preferLiveProfile);
      const orientation = activeProfile.pageStyle.orientation as 'portrait' | 'landscape';
      const { marginTop, marginBottom, marginLeft, marginRight, backgroundColor, paperSize } = activeProfile.pageStyle;
      await exportPDF({ previewEl: previewRef.current, currentFileName: currentFileNameRef.current, isDarkMode, showToast, orientation, paperSize, dynamicCssString, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, activeProfile,printSettings:readEffectivePrintSettings(contentRef.current),markdownContent:contentRef.current });
    },
    exportHTML: async () => {
      if (!await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      const activeProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE;
      const orientation = activeProfile.pageStyle.orientation as 'portrait' | 'landscape';
      const { marginTop, marginBottom, marginLeft, marginRight, backgroundColor, paperSize } = activeProfile.pageStyle;
      await exportHTML({ 
        previewEl: previewRef.current, 
        currentFileName: currentFileNameRef.current, 
        isDarkMode, 
        showToast, 
        orientation, 
        paperSize, 
        dynamicCssString, 
        marginTop, 
        marginBottom, 
        marginLeft, 
        marginRight, 
        backgroundColor,
        activeProfile
      });
    },
    exportEPUB: async () => {
      if (!await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      const activeProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE;
      await exportEPUB({ previewEl: previewRef.current, currentFileName: currentFileNameRef.current, isDarkMode, showToast, dynamicCssString, backgroundColor: activeProfile.pageStyle.backgroundColor, activeProfile, printSettings: readEffectivePrintSettings(contentRef.current), markdownContent: contentRef.current });
    },
    exportHWPX: async () => {
      if (profiles.find(p => p.id === activeProfileId)?.layout?.type === 'picturebook') { showToast('그림책은 PDF 또는 EPUB으로 내보내 주세요.', 'warning'); return; }
      if (!await prepareEditorForExport() || !previewRef.current) return;
      await exportHWPX({ previewEl: previewRef.current, currentFileName: currentFileNameRef.current, isDarkMode, showToast, activeProfile: profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE });
    },
    exportDOCX: async () => {
      if (profiles.find(p => p.id === activeProfileId)?.layout?.type === 'picturebook') { showToast('그림책은 PDF 또는 EPUB으로 내보내 주세요.', 'warning'); return; }
      if (!await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      await exportDOCX({ previewEl: previewRef.current, currentFileName: currentFileNameRef.current, isDarkMode, showToast, activeProfile: profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE });
    },
    exportSNS: async (snsOptions?: any) => {
      if (!await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      const activeProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE;
      const orientation = activeProfile.pageStyle.orientation as 'portrait' | 'landscape';
      const { marginTop, marginBottom, marginLeft, marginRight, backgroundColor, paperSize } = activeProfile.pageStyle;
      await exportSNSCardNews({
        previewEl: previewRef.current,
        currentFileName: currentFileNameRef.current,
        isDarkMode,
        showToast,
        orientation,
        paperSize,
        dynamicCssString,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        backgroundColor,
        activeProfile,
        snsOptions,
      });
    },
    exportPNG: async () => {
      if (!await prepareEditorForExport()) return;
      if (!previewRef.current) return;
      const activeProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE;
      const orientation = activeProfile.pageStyle.orientation as 'portrait' | 'landscape';
      const { marginTop, marginBottom, marginLeft, marginRight, backgroundColor, paperSize } = activeProfile.pageStyle;
      await exportPNG({ 
        previewEl: previewRef.current, 
        currentFileName: currentFileNameRef.current, 
        isDarkMode, 
        showToast, 
        orientation, 
        paperSize, 
        dynamicCssString, 
        marginTop, 
        marginBottom, 
        marginLeft, 
        marginRight, 
        backgroundColor,
        activeProfile
      });
    },
    exit: async () => {
      const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
      if (isDesktop) {
        window.location.href = '/';
        return;
      }
      try {
        await logoutCurrentWebSession();
      } catch (error) {
        console.warn('[useEditorHandlers] 웹 세션 서버 해제 건너뜀:', error);
      }
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } finally {
        clearAuthSessionStorage();
      }
      window.location.href = '/';
    },
    undo: () => editorRef.current?.trigger('keyboard', 'undo', null),
    redo: () => editorRef.current?.trigger('keyboard', 'redo', null),
    find: () => {
      openAndFocusFindWidget(editorRef.current, false);
    },
    replace: () => {
      openAndFocusFindWidget(editorRef.current, true);
    },
    bold: () => wrapSelection('**', '**', '텍스트'),
    italic: () => wrapSelection('*', '*', '텍스트'),
    inlineCode: () => wrapSelection('`', '`', '코드'),
    underline: () => wrapSelection('<u>', '</u>', '텍스트'),
    strikethrough: () => wrapSelection('~~', '~~', '텍스트'),
    h1: () => wrapSelection('# ', '', '제목'),
    h2: () => wrapSelection('## ', '', '제목'),
    h3: () => wrapSelection('### ', '', '제목'),
    h4: () => wrapSelection('#### ', '', '제목'),
    h5: () => wrapSelection('##### ', '', '제목'),
    h6: () => wrapSelection('###### ', '', '제목'),
    hr: () => insertAtCursor('\n---\n'),
    orderedList: () => applyLinePrefix('orderedList'),
    list: () => applyLinePrefix('list'),
    quote: (alertType?: string) => applyLinePrefix('quote', alertType),
    check: () => applyLinePrefix('check'),
    removePrefix: () => removePrefix(),
    link: () => insertLink(),
    doclink: () => setShowDocLinkPicker(prev => !prev),
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0006] useEditorHandlers.ts ➔ image
    // 🎯 @KICK  : 이미지 마크다운 구문을 파싱하여 이미지 편집 모달 열기
    // 🛡️ @GUARD : editorRef, selection, model 존재 여부 확인
    // 🚨 @PATCH : setEditingImageInfo, setIsImageModalOpen 매개변수 누락으로 이미지 모달 미오픈 수정
    // 🔗 @CALLS : setEditingImageInfo, setIsImageModalOpen
    // ====================================================================
    image: () => {
      const editor = editorRef.current;
      if (editor) {
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (selection && model) {
          let text = model.getValueInRange(selection);
          let range = selection;

          if (!text.trim()) {
            const lineNumber = selection.startLineNumber;
            const lineContent = model.getLineContent(lineNumber);
            const match = lineContent.match(/!\[([^\]]*)\]\(([^)]*)\)/);
            if (match) {
              const startCol = lineContent.indexOf(match[0]) + 1;
              const endCol = startCol + match[0].length;
              range = new (window as any).monaco.Range(lineNumber, startCol, lineNumber, endCol);
              text = match[0];
            }
          }

          const match = text.match(/!\[([^\]]*)\]\(([^)]*)\)/);
          if (match) {
            const alt = match[1];
            const fullPath = match[2];
            let path = fullPath;
            let width = '';
            let height = '';

            const widthMatch = fullPath.match(/[\?&]width=([^&]*)/);
            if (widthMatch) {
              width = decodeURIComponent(widthMatch[1]);
            }
            const heightMatch = fullPath.match(/[\?&]height=([^&]*)/);
            if (heightMatch) {
              height = decodeURIComponent(heightMatch[1]);
            }
            const alignMatch = fullPath.match(/[\?&]align=([^&]*)/);
            const align = alignMatch ? decodeURIComponent(alignMatch[1]) : 'center';
            path = fullPath.replace(/[\?&](?:width|height|align)=[^&]*/g, '');

            setEditingImageInfo({
              range,
              alt,
              path,
              width,
              height,
              align
            });
            setIsImageModalOpen(true);
            return;
          }
        }
      }

      setEditingImageInfo(null);
      setIsImageModalOpen(true);
    },
    video: () => setIsYoutubeModalOpen(true),
    vidio: () => setIsYoutubeModalOpen(true),
    youtube: () => setIsYoutubeModalOpen(true),
    now: (format?: string) => insertAtCursor(formatCurrentDateTime(format)),
    map: () => setIsMapModalOpen(true),
    table: () => {
      const editor = editorRef.current;
      if (!editor) {
        setIsTableModalOpen(true);
        return;
      }
      const model = editor.getModel();
      const pos = editor.getPosition();
      if (!model || !pos) {
        setIsTableModalOpen(true);
        return;
      }

      // 🛡️ 커서가 이미 표 안에 있는 경우 사용자가 만든 표가 망가지지 않도록 조기 종료(No-op)
      const lineText = model.getLineContent(pos.lineNumber).trim();
      if (lineText.startsWith('|') || (lineText.match(/\|/g) || []).length >= 2) {
        return;
      }

      // 표 밖일 때만 신규 표 생성 모달 열기
      setIsTableModalOpen(true);
    },
    quickTable: () => {
      const editor = editorRef?.current;
      if (!editor) {
        insertAtCursor('| 구분 | 데이터 1 | 데이터 2 |\n| --- | --- | --- |\n| 항목A | 100 | 200 |\n| 항목B | 300 | 400 |\n\n');
        return;
      }
      const model = editor.getModel();
      if (!model) return;
      let selection = editor.getSelection();
      if (!selection || (selection.isEmpty() && lastSelectionRef?.current && !lastSelectionRef.current.isEmpty())) {
        selection = lastSelectionRef.current;
      }
      if (!selection) {
        const pos = editor.getPosition?.() || { lineNumber: 1, column: 1 };
        selection = { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column };
      }
      const currentLineContent = model.getLineContent(selection.startLineNumber);
      const prefix = currentLineContent.trim().length > 0 ? '\n' : '';
      const text = `${prefix}| 구분 | 데이터 1 | 데이터 2 |\n| --- | --- | --- |\n| 항목A | 100 | 200 |\n| 항목B | 300 | 400 |\n\n`;
      const monaco = (window as any).monaco;
      const range = monaco?.Range
        ? new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn)
        : selection;
      editor.pushUndoStop();
      editor.executeEdits("quickTable", [{ range, text, forceMoveMarkers: true }]);
      editor.pushUndoStop();

      let targetHeaderLine = selection.startLineNumber;
      for (let l = selection.startLineNumber; l <= Math.min(selection.startLineNumber + 3, model.getLineCount()); l++) {
        if (model.getLineContent(l).trim().startsWith('|')) {
          targetHeaderLine = l;
          break;
        }
      }

      const applyQuickTableSelection = () => {
        if (!editorRef?.current) return;
        const ed = editorRef.current;
        ed.focus();
        const sel = monaco?.Selection
          ? new monaco.Selection(targetHeaderLine, 3, targetHeaderLine, 5)
          : { selectionStartLineNumber: targetHeaderLine, selectionStartColumn: 3, positionLineNumber: targetHeaderLine, positionColumn: 5 };
        ed.setSelection(sel);
        if (lastSelectionRef) lastSelectionRef.current = sel;
        ed.revealLineInCenterIfOutsideViewport(targetHeaderLine);
      };

      applyQuickTableSelection();
      setTimeout(applyQuickTableSelection, 40);
      setTimeout(applyQuickTableSelection, 120);

      if (typeof updateContent === 'function') {
        updateContent(model.getValue(), true);
      }
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0005] useEditorHandlers.ts ➔ insertTableRow
    // 🎯 @KICK  : 편집 중인 표 아래에 새 행을 추가하여 데이터 입력 공간 확보
    // 🛡️ @GUARD : editorRef, position, model 존재 여부 및 표 행 여부 확인
    // 🚨 @PATCH : 없음
    // 🔗 @CALLS : showToast
    // ====================================================================
    insertTableRow: () => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const position = editor.getPosition();
      if (!position) return;
      const model = editor.getModel();
      if (!model) return;

      const lineText = model.getLineContent(position.lineNumber);
      const trimmed = lineText.trim();
      if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        showToast("커서가 표 행에 위치해야 행을 추가할 수 있습니다.", "warning");
        return;
      }

      const cells = trimmed.split(/(?<!\\)\|/);
      const cellCount = cells.length - 2;

      if (cellCount < 1) return;

      const newRowText = '\n|' + '  |'.repeat(cellCount);
      const lineMaxColumn = model.getLineMaxColumn(position.lineNumber);
      const Range = (window as any).monaco.Range;
      const Selection = (window as any).monaco.Selection;

      editor.executeEdits("insertTableRow", [{
        range: new Range(position.lineNumber, lineMaxColumn, position.lineNumber, lineMaxColumn),
        text: newRowText,
        forceMoveMarkers: true
      }]);

      const nextLineNumber = position.lineNumber + 1;
      editor.setSelection(new Selection(
        nextLineNumber, 3,
        nextLineNumber, 3
      ));
      editor.focus();
      showToast("표 행이 추가되었습니다.", "info");
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0004] useEditorHandlers.ts ➔ deleteTableRow
    // 🎯 @KICK  : 편집 중인 표에서 현재 커서가 위치한 행을 삭제
    // 🛡️ @GUARD : editorRef, position, model 존재 여부 및 표 행 여부 확인
    // 🚨 @PATCH : 없음
    // 🔗 @CALLS : showToast
    // ====================================================================
    deleteTableRow: () => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const position = editor.getPosition();
      if (!position) return;
      const model = editor.getModel();
      if (!model) return;

      const lineText = model.getLineContent(position.lineNumber);
      const trimmed = lineText.trim();
      if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        showToast("커서가 표 행에 위치해야 행을 삭제할 수 있습니다.", "warning");
        return;
      }

      const maxColumn = model.getLineMaxColumn(position.lineNumber);
      let startLine = position.lineNumber;
      let startColumn = 1;
      let endLine = position.lineNumber;
      let endColumn = maxColumn;

      if (position.lineNumber < model.getLineCount()) {
        endLine = position.lineNumber + 1;
        endColumn = 1;
      } else if (position.lineNumber > 1) {
        startLine = position.lineNumber - 1;
        startColumn = model.getLineMaxColumn(startLine);
      }

      const Range = (window as any).monaco.Range;
      editor.executeEdits("deleteTableRow", [{
        range: new Range(startLine, startColumn, endLine, endColumn),
        text: "",
        forceMoveMarkers: true
      }]);

      editor.focus();
      showToast("표 행이 삭제되었습니다.", "info");
    },
    code: () => insertBlockTag('```markdown', '```', '코드'),
    chart: () => insertBlockTag('```mermaid', '```', '그래프'),
    math: () => setIsFormulaModalOpen(true),
    latex: () => setIsFormulaModalOpen(true),
    zoomIn: () => {},
    zoomOut: () => {},
    globalSearch: () => {
      setIsSidebarOpen(true);
      setIsSearchOpen(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('onrivi:focus-global-search'));
      }
    },
    settings: (tab: 'editor' | 'app' | 'shortcuts' = 'editor') => {
      setSettingsModalInitialTab(tab);
      setIsSettingsModalOpen(true);
    },
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0003] useEditorHandlers.ts ➔ help
    // 🎯 @KICK  : 도움말 문서를 Electron/웹 환경에서 읽어와 별도 탭으로 표시
    // 🛡️ @GUARD : api.readFromPath / fetch 실패 시 오류 메시지 표시
    // 🚨 @PATCH : helpContent 오버레이 대신 createNewTab으로 별도 탭 생성 (2026-06-17)
    // 🔗 @CALLS : stripFrontmatter, createNewTab
    // ====================================================================
    help: async () => {
      // 🚨 @PATCH : 기존 fetch 데이터 로직 삭제 -> HelpModal.tsx의 2-Pane 레이아웃으로 이관 (2026-07-05)
      if (setIsHelpModalOpen) setIsHelpModalOpen(true);
    },
    license: () => setIsLicenseModalOpen(true),
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0002] useEditorHandlers.ts ➔ toggleFloatingToolbar
    // 🎯 @KICK  : 플로팅 툴바의 표시/숨김을 토글하고 커서 위치에 배치
    // 🛡️ @GUARD : editorRef, position, visiblePos 존재 여부 확인
    // 🚨 @PATCH : 2026-09-02 - 커서가 에디터 우측 끝에 있을 때 플로팅 툴바가 화면 밖으로 짤리지 않도록 safeLeft 화면 이탈 방지 클램핑 적용
    // 🔗 @CALLS : 없음
    // ====================================================================
    toggleFloatingToolbar: () => {
      setFloatingToolbar(prev => {
        if (prev.visible) return {
    setTabs, ...prev, visible: false };
        if (editorRef.current) {
          const editor = editorRef.current;
          editor.focus();
          const position = editor.getPosition();
          if (position) {
            const visiblePos = editor.getScrolledVisiblePosition(position);
            if (visiblePos) {
              const safeLeft = Math.max(10, visiblePos.left);
              return { visible: true, top: Math.max(0, visiblePos.top - 10), left: safeLeft };
            }
          }
        }
        return { visible: true, top: 100, left: 100 };
      });
    },
    quickWrap: (format: 'h1' | 'h2' | 'h3' | 'quote' | 'code') => quickWrap(format),
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORHANDLERS-0015] useEditorHandlers.ts ➔ signature
    // 🎯 @KICK  : 서명/발신인 우측 정렬 삽입 및 선택 영역 우측 정렬 감싸기/토글
    // 🛡️ @GUARD : editorRef, model, selection 존재 여부 확인
    // 🚨 @PATCH : **2026-10-01** — 신규 추가
    // 🔗 @CALLS : editor.pushUndoStop, editor.executeEdits, editor.setSelection
    // ====================================================================
    signature: () => {
      if (!editorRef.current || typeof window === 'undefined' || !(window as any).monaco) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      let selection = editor.getSelection();
      if ((!selection || selection.isEmpty()) && lastSelectionRef?.current && !lastSelectionRef.current.isEmpty()) {
        selection = lastSelectionRef.current;
      }
      if (!selection) return;

      const rawSelectedText = model.getValueInRange(selection);
      const trimmedText = rawSelectedText.trim();

      // 1. 이미 <div align="right|left">...</div> 로 감싸져 있는 경우 토글 해제(Unwrap)
      const divRegex = /^<div\s+align=["'](right|left)["'][^>]*>([\s\S]*?)<\/div>$/i;
      const match = trimmedText.match(divRegex);
      if (match) {
        const unwrapped = match[2].trim();
        editor.pushUndoStop();
        editor.executeEdits('signature-unwrap', [{
          range: selection,
          text: unwrapped,
          forceMoveMarkers: true
        }]);
        editor.pushUndoStop();
        editor.focus();
        return;
      }

      // 2. 텍스트가 선택되어 있는 경우: 각 줄의 마크다운 줄바꿈(공백 2개) 보존하며 감싸기
      if (trimmedText) {
        const lines = trimmedText.split('\n');
        const processedLines = lines.map((line: string) => {
          const rTrimmed = line.trimEnd();
          if (rTrimmed.length > 0 && !rTrimmed.endsWith('  ') && !rTrimmed.endsWith('<br>') && !rTrimmed.endsWith('<br/>')) {
            return rTrimmed + '  ';
          }
          return line;
        });
        const contentText = processedLines.join('\n');
        const newText = `<div align="left">\n\n${contentText}\n\n</div>\n`;

        editor.pushUndoStop();
        editor.executeEdits('signature-wrap', [{
          range: selection,
          text: newText,
          forceMoveMarkers: true
        }]);
        editor.pushUndoStop();
        editor.focus();
        return;
      }

      // 3. 선택 영역이 없는 경우: 오늘 날짜 기반 기본 서명 템플릿 삽입 및 작성자 성명 자동 선택
      const now = new Date();
      const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
      const template = `<div align="left">\n\n${dateStr}  \n**작성자: 홍길동** <span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">인</span>\n\n</div>\n`;

      const startLine = selection.startLineNumber;
      editor.pushUndoStop();
      editor.executeEdits('signature-insert', [{
        range: selection,
        text: template,
        forceMoveMarkers: true
      }]);
      editor.pushUndoStop();

      // 💡 [UX 최적화] 작성자 이름('홍길동') 부분을 자동 선택하여 곧바로 실제 성명 입력 가능하도록 편의 제공
      setTimeout(() => {
        try {
          const targetLineNumber = startLine + 3;
          const targetLineText = model.getLineContent(targetLineNumber) || '';
          const nameKeyword = '홍길동';
          const nameIndex = targetLineText.indexOf(nameKeyword);
          if (nameIndex !== -1) {
            const startCol = nameIndex + 1; // Monaco 1-indexed column
            const endCol = startCol + nameKeyword.length;
            editor.setSelection(new (window as any).monaco.Selection(
              targetLineNumber,
              startCol,
              targetLineNumber,
              endCol
            ));
          }
          editor.focus();
        } catch (_) {}
      }, 20);
    },
  };

  return handlers;
};
