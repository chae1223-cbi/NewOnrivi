import { htmlToImportMarkdown, importHtmlWithImages } from '@/lib/importHtmlMarkdown';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { getSavedDriveToken, getSavedWorkspaceInfo, uploadDriveImage } from '@/lib/gdrive/googleDriveClient';
/**
 * ====================================================================
 * 📊 [OMD-HOOK-useEditorPaste] useEditorPaste.ts
 * 🎯 @KICK  : 에디터 클립보드 붙여넣기(HTML 표, 리치 텍스트, 이미지 파일/Blob) 및 리소스/R2 저장 파이프라인
 * 🛡️ @GUARD : 비동기 DataTransferItem 즉시 추출, CSP connect-src 대응 base64 변환, 동일 이미지 반복 삽입 보장
 * 🚨 @PATCH : 2026-11-04 - [isImageLikeFile 반환 추가] EditorCore 이미지 필터링에 필요한 isImageLikeFile 헬퍼 반환 및 미정의 런타임 크래시 방지
 * 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] MainEditorApp에서 450여 줄의 붙여넣기 및 이미지 업로드 파이프라인을 독립 훅으로 분리
 * 🔗 @CALLS : resolveClipboardImage, handlePasteImageFile, insertWithR2Fallback, webUploadImage, utilsEditorActions
 * ====================================================================
 */

import { useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { saveResourceMedia } from '@/lib/resourceMedia';
import { imageResourceName } from '@/lib/imageResourceName';
import * as utilsEditorActions from '@/utils/editorActions';

export interface UseEditorPasteOptions {
  editorRef: React.MutableRefObject<any>;
  lastSelectionRef: React.MutableRefObject<any>;
  contentRef: React.MutableRefObject<string>;
  rootFolderRef: React.MutableRefObject<any>;
  activeTabIdRef: React.MutableRefObject<string>;
  currentFileNodeRef: React.MutableRefObject<any>;
  currentFileNode: any;
  tabsRef: React.MutableRefObject<any[]>;
  resourceFolderHandle: any;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  updateContent: (content: string, skipHistory?: boolean) => void;
  insertAtCursor: (text: string) => any;
  sanitizePastedText: (text: string, skipTsvConversion?: boolean) => string;
  parseHtmlTableToMarkdown: (html: string) => string;
  fixMarkdownTable: (text: string) => string;
}

export interface UseEditorPasteReturn {
  handlePasteImageFile: (fileOrBlob: Blob, onSaved?: (path: string) => void) => Promise<void>;
  handleEditorPaste: (e: any) => Promise<void>;
  insertImageMarkdown: (path: string) => void;
  handlePasteImageFileRef: React.MutableRefObject<(fileOrBlob: Blob, onSaved?: (path: string) => void) => Promise<void>>;
  isImageLikeFile: (file: File) => boolean;
}

export function useEditorPaste({
  editorRef,
  lastSelectionRef,
  contentRef,
  rootFolderRef,
  activeTabIdRef,
  currentFileNodeRef,
  currentFileNode,
  tabsRef,
  resourceFolderHandle,
  showToast,
  updateContent,
  insertAtCursor,
  sanitizePastedText,
  parseHtmlTableToMarkdown,
  fixMarkdownTable,
}: UseEditorPasteOptions): UseEditorPasteReturn {
  const insertImageMarkdown = (path: string) => {
    if (!editorRef.current) {
      showToast('에디터를 찾을 수 없어 이미지를 삽입할 수 없습니다.', 'error');
      return;
    }
    const textToInsert = `![](${path})`;
    try {
      utilsEditorActions.insertMediaAtCursor(editorRef, lastSelectionRef, textToInsert, updateContent);
    } catch (err) {
      console.warn('[insertImageMarkdown] insertMediaAtCursor fallback to insertAtCursor:', err);
      insertAtCursor(`\n${textToInsert}\n\n`);
      if (editorRef.current) {
        updateContent(editorRef.current.getValue(), true);
      }
    }
  };


  // ====================================================================
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const isImageLikeFile = (file: File): boolean => {
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = file.name ? file.name.toLowerCase().split('.').pop() : '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff'].includes(ext || '');
  };

  const resolveClipboardImage = async (e: any, imageItemOrFile: any): Promise<Blob | null> => {
      // 0) 이미 File/Blob 객체인 경우
      if (imageItemOrFile instanceof Blob || (typeof File !== 'undefined' && imageItemOrFile instanceof File)) {
        if (imageItemOrFile.size > 0) return imageItemOrFile;
      }

      // 1) 비동기 호출 이전에 동기적으로 브라우저 DataTransferItem 객체에서 File을 즉시 추출
      let syncFile = null;
      if (imageItemOrFile && typeof imageItemOrFile.getAsFile === 'function') {
        try {
          syncFile = imageItemOrFile.getAsFile();
        } catch (_) {}
      }
      if (syncFile && syncFile.size > 0) return syncFile;

      // 2) clipboardData.files 검사 (탐색기 파일 복사 및 드롭 시 MIME 누락 파일명 확장자 지원)
      if (e.clipboardData?.files?.length > 0) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const f = e.clipboardData.files[i];
          if (isImageLikeFile(f) && f.size > 0) {
            return f;
          }
        }
      }

      // 3) [Electron] 네이티브 클립보드 이미지 읽기 우선 시도 (윈도우 캡처/PrtScn 스크린샷 직접 복원)
      try {
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
        if (api && api.readClipboardImage) {
          const dataUrl = await api.readClipboardImage();
          if (dataUrl) {
            return dataUrlToBlob(dataUrl);
          }
        }
      } catch (err) {
        console.warn('[Clipboard] Native read fallback', err);
      }
  
      // 4) navigator.clipboard.read() (Async Clipboard API, 권한 필요)
      try {
        if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
          const clipboardItems = await navigator.clipboard.read();
          for (const ci of clipboardItems) {
            for (const type of ci.types) {
              if (type.startsWith('image/')) {
                return await ci.getType(type);
              }
            }
          }
        }
      } catch { }

      // 5) HTML 데이터 내 <img src="..."> 추출 폴백
      try {
        const html = e.clipboardData?.getData('text/html');
        if (html) {
          const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            const src = imgMatch[1];
            if (src.startsWith('data:image/')) {
              return dataUrlToBlob(src);
            } else if (src.startsWith('http://') || src.startsWith('https://')) {
              try {
                const res = await fetch(src);
                if (res.ok) {
                  return await res.blob();
                }
              } catch (_) {}
            }
          }
        }
      } catch { }

      return null;
    };

    // ====================================================================
    // 💡 [OMD-EDIT-MainEditorApp-0065] MainEditorApp.tsx 의 handleEditorPaste
    // 📝 @KICK  : 붙여넣기 이벤트 처리: 이미지 업로드, HTML 표/복합 AI 문서 변환, 텍스트 정제
    // 🛡️ @GUARD : AI 마크다운 복사 및 웹 문서(표+본문) 붙여넣기 시 표 외 텍스트 유실 원천 방어, 단일 표(엑셀) vs 복합 문서 분기
    // 🚨 @PATCH : **2026-10-07** — AI 응답 및 웹 문서 마크다운 붙여넣기 시 표 외 텍스트 누락 결함 해결 (htmlToImportMarkdown 연동 및 단일 표/복합 문서 지능형 분기)
    // 🔄 @CALLS : fetch, FileReader, htmlToImportMarkdown, parseHtmlTableToMarkdown, sanitizePastedText, fixMarkdownTable, insertAtCursor, updateContent, showToast
    // ====================================================================
    const handleEditorPaste = async (e: any) => {
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;
    let hasText = false;
    let hasHtml = false;
    let imageItem = null;
    let imageFile: File | null = null;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type && it.type.startsWith('image/')) {
          imageItem = it;
        } else if (it.kind === 'file') {
          try {
            const f = it.getAsFile();
            if (f && isImageLikeFile(f)) {
              imageFile = f;
            }
          } catch (_) {}
        }
        if (it.type === 'text/plain') hasText = true;
        if (it.type === 'text/html') hasHtml = true;
      }
    }

    if (files && files.length > 0 && !imageFile) {
      for (let i = 0; i < files.length; i++) {
        if (isImageLikeFile(files[i])) {
          imageFile = files[i];
          break;
        }
      }
    }

    // 💡 [긴급 수정] async 함수 특성상 await를 만나면 이벤트 루프가 양보되어 브라우저/모나코의 
    // 기본 붙여넣기 동작이 실행되어 버립니다. 따라서 await 이전에 동기적으로 데이터를 검사하고 
    // 우리가 처리할 대상이면 e.preventDefault()를 즉시 호출해야 합니다.

    const htmlData = hasHtml ? e.clipboardData.getData('text/html') : '';
    if (htmlData && /<img\b[^>]*src=["']data:image\//i.test(htmlData) && (e.clipboardData.getData('text/plain') || '').trim()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        showToast('붙여넣은 문서의 이미지를 리소스 폴더에 저장하는 중입니다.', 'info');
        const markdown = await importHtmlWithImages(htmlData, async (base64: string, mime: string) => {
          const settings = requireResourceSettings();
          const extension = mime.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
          const fileName = `paste_${crypto.randomUUID()}.${extension}`;
          const blob = dataUrlToBlob(`data:${mime};base64,${base64}`);
          if (getResourceSettings()?.kind === 'drive') {
            const token = getSavedDriveToken();
            const mediaFolderId = getResourceSettings('cloud')?.mediaFolderId || getSavedWorkspaceInfo()?.mediaFolderId;
            if (!token || !mediaFolderId) throw new Error('드라이브 리소스 폴더 연결을 확인해 주세요.');
            const uploaded = await uploadDriveImage(token, mediaFolderId, blob, fileName);
            if (!uploaded?.id) throw new Error('이미지 저장에 실패했습니다.');
            return `media/${encodeURIComponent(uploaded.name)}?driveId=${encodeURIComponent(uploaded.id)}`;
          }
          const api = (window as any).electronAPI;
          if (api) {
            const result = await api.saveImage(`${settings.path}${settings.path.includes('\\') ? '\\' : '/'}media`, base64, fileName);
            if (!result?.success) throw new Error('이미지 저장에 실패했습니다.');
            return result.mediaPath || `media://local/serve?url=${encodeURIComponent(result.absolutePath)}`;
          }
          if (!resourceFolderHandle) throw new Error('리소스 폴더 접근 권한을 확인해 주세요.');
          const media = await resourceFolderHandle.getDirectoryHandle('media', { create: true });
          const file = await media.getFileHandle(fileName, { create: true });
          const writable = await file.createWritable();
          await writable.write(blob);
          await writable.close();
          return `/media/${fileName}`;
        });
        if (!insertAtCursor(markdown)) throw new Error('편집영역에 내용을 삽입하지 못했습니다.');
        if (editorRef.current) updateContent(editorRef.current.getValue(), true);
        showToast('문서와 이미지를 붙여넣었습니다.', 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : '문서 붙여넣기에 실패했습니다.', 'error');
      }
      return;
    }
    const hasTable = !!htmlData && htmlData.includes('<table');
    const textData = hasText ? e.clipboardData.getData('text/plain') : '';
    const htmlImgMatch = htmlData ? htmlData.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
    const isDirectImgUrl = /^(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg|bmp))(\?[^\s]*)?$/i.test(textData ? textData.trim() : '');

    let processedText = textData;
    let textChanged = false;
    if (textData) {
      processedText = sanitizePastedText(textData);
      if (processedText.includes('|')) {
        processedText = fixMarkdownTable(processedText);
      }
      if (processedText !== textData) {
        textChanged = true;
      }
    }

    // 💡 [HTML Table 및 AI 마크다운 복사 분석]
    // AI(ChatGPT, Claude, Gemini 등)나 웹페이지에서 표가 포함된 마크다운/본문을 복사한 경우:
    // 1) 순수 단일 표(엑셀/스프레드시트 셀 복사 또는 표 하나만 복사)인지
    // 2) 표 외에 제목, 본문, 목록, 코드 등이 포함된 복합 문서/AI 응답인지 구분
    let isStandaloneTable = false;
    let isRichDocumentWithTable = false;
    let convertedRichMarkdown = '';

    if (hasTable && htmlData) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const tables = doc.querySelectorAll('table');

        let tableTextLen = 0;
        tables.forEach(t => { tableTextLen += (t.textContent || '').trim().length; });
        const totalTextLen = (doc.body.textContent || '').trim().length;
        const nonTableTextLen = Math.max(0, totalTextLen - tableTextLen);
        const nonTableBlocks = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, article, section');

        if (tables.length === 1 && nonTableBlocks.length === 0 && nonTableTextLen < 20) {
          isStandaloneTable = true;
        } else {
          isRichDocumentWithTable = true;
          convertedRichMarkdown = htmlToImportMarkdown(htmlData);
        }
      } catch (err) {
        console.warn('HTML table parsing check failed:', err);
      }
    }

    // textData가 이미 마크다운 표(|---|) 및 구조를 지닌 마크다운 원문인지 검사 (AI 복사 버튼 등)
    const hasMarkdownTableInText = !!textData && textData.includes('|') && /\|[\s\t]*:?---*:?[\s\t]*\|/.test(textData);

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    const isImagePasting = !!imageItem || !!imageFile || !!htmlImgMatch || isDirectImgUrl || (isElectron && !hasTable && !textData);

    const shouldHandleCustomPaste = isImagePasting || isStandaloneTable || isRichDocumentWithTable || textChanged;

    // 대상이 하나라도 있으면 즉시 기본 동작 차단
    if (shouldHandleCustomPaste) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation?.();
      (e as any).stopImmediatePropagation?.();
    }

    // 1. 다중 이미지 파일 붙여넣기 일괄 처리
    if (files && files.length > 1) {
      const allImageFiles = Array.from(files).filter((f: any) => isImageLikeFile(f));
      if (allImageFiles.length > 1) {
        for (const f of allImageFiles) {
          await handlePasteImageFile(f as Blob);
        }
        return;
      }
    }

    // 2. 단일 이미지 처리 (스크린샷, 탐색기 파일 복사, Electron 네이티브 등)
    const resolvedBlob = await resolveClipboardImage(e, imageItem || imageFile);
    if (resolvedBlob) {
      if (e.cancelable && !e.defaultPrevented) e.preventDefault();
      await handlePasteImageFile(resolvedBlob);
      return;
    }

    // 2-1. 웹 이미지 URL (<img src="http...">) 직접 삽입 폴백
    if (htmlImgMatch && htmlImgMatch[1]) {
      const imgSrc = htmlImgMatch[1];
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        if (e.cancelable && !e.defaultPrevented) e.preventDefault();
        insertImageMarkdown(imgSrc);
        showToast('웹 이미지가 마크다운 링크로 삽입되었습니다.', 'success');
        return;
      }
    }

    // 2-2. 순수 이미지 URL 텍스트 붙여넣기 시 마크다운 이미지 삽입
    if (isDirectImgUrl) {
      if (e.cancelable && !e.defaultPrevented) e.preventDefault();
      insertImageMarkdown(textData.trim());
      showToast('이미지 링크가 마크다운으로 삽입되었습니다.', 'success');
      return;
    }

    // 3. 복합 문서(AI 응답, 본문 + 표 포함) 처리: 표뿐만 아니라 본문 전체를 마크다운으로 완벽 보존
    if (isRichDocumentWithTable) {
      // 3-1. textData가 이미 마크다운 표(|---|) 및 구조를 가진 순수 마크다운인 경우 (AI 복사 버튼 클릭 시)
      if (hasMarkdownTableInText && processedText) {
        insertAtCursor(processedText);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("마크다운 문서(본문 및 표 전체)가 완벽하게 삽입되었습니다.", "success");
        return;
      }

      // 3-2. 웹 화면 드래그 복사 등: HTML 전체를 마크다운(표+제목+본문+코드+리스트)으로 변환한 결과물 삽입
      if (convertedRichMarkdown && convertedRichMarkdown.trim()) {
        const cleanedMd = sanitizePastedText(convertedRichMarkdown);
        insertAtCursor(cleanedMd);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("AI 응답 문서(본문 및 표 전체)가 마크다운으로 완벽하게 변환되었습니다.", "success");
        return;
      }

      // 3-3. 폴백: 정제된 텍스트
      if (processedText) {
        insertAtCursor(processedText);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("텍스트 데이터가 삽입되었습니다.", "success");
        return;
      }
    }

    // 4. 순수 단일 HTML Table 처리 (엑셀, 스프레드시트 셀 복사 또는 표 단독 복사)
    if (isStandaloneTable) {
      const mdTable = parseHtmlTableToMarkdown(htmlData);
      if (mdTable) {
        insertAtCursor(mdTable);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("웹 표 데이터가 마크다운으로 완벽하게 변환되었습니다.", "success");
        return;
      }
    }

    // 5. 일반 텍스트 처리 (정제가 필요한 경우에만)
    if (textChanged) {
      const safeText=processedText.trim() ? processedText : textData;
      if (!insertAtCursor(safeText)) {
        showToast("텍스트를 삽입하지 못했습니다. 편집영역을 클릭한 뒤 다시 붙여넣어 주세요.", "error");
        return;
      }
      if (editorRef.current) {
        updateContent(editorRef.current.getValue(), true);
      }
      showToast("붙여넣은 텍스트가 자동으로 정제(교정)되었습니다.", "success");
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0065] MainEditorApp.tsx ➔ handlePasteImageFile
  // 🎯 @KICK  : 이미지 Blob/File을 받아 로컬(데스크탑) 또는 R2(웹)에 저장 후 에디터 커서 위치에 삽입
  // 🛡️ @GUARD : FileReader onload/onerror 처리, 데스크탑/웹 분기, 동일 이미지 반복 삽입 100% 보장
  // 🚨 @PATCH : **2026-10-02** 동일 이미지 반복 붙여넣기/드래그 차단 결함 완전 해결(해시 검사 및 타임스탬프 락 완전 소거)
  // 🔗 @CALLS : fetch, FileReader, showToast
  // ====================================================================
  const handlePasteImageFile = async (fileOrBlob: Blob, onSaved: (path: string) => void = insertImageMarkdown): Promise<void> => {
    try {
      const name = await imageResourceName(fileOrBlob);
      const path = await saveResourceMedia(fileOrBlob,name,resourceFolderHandle);
      onSaved(path);
      showToast('현재 리소스 폴더에 안전하게 저장했습니다.','success');
    } catch(error) { showToast(error instanceof Error ? error.message : '이미지 저장 실패','error'); }
  };
  const handlePasteImageFileRef = useRef(handlePasteImageFile);
  handlePasteImageFileRef.current = handlePasteImageFile;

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0066] MainEditorApp.tsx ➔ insertWithR2Fallback
  // 🎯 @KICK  : 데스크탑: 우선 R2 클라우드 업로드 시도, 실패 시 로컬 파일 시스템(assets/)에 fallback 저장
  // 🛡️ @GUARD : R2 실패 시 api.saveImage 호출
  // 🚨 @PATCH : 2026-07-06 우선 R2 클라우드 업로드 시도 후 실패 시 api.saveImage로 로컬 assets에 저장하도록 재설계
  // 🔗 @CALLS : fetch, api.saveImage, showToast
  // ====================================================================
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0031] MainEditorApp ➔ insertWithLocalSave
  // 🎯 @KICK  : 데스크탑 이미지 붙여넣기 시 무조건 로컬(resourceFolder) 저장
  // 🛡️ @GUARD : api.saveImage 실패 시 toast 안내
  // 🚨 @PATCH : 2026-07-30 — R2 업로드 제거, 무조건 로컬 저장으로 단순화
  // 🔗 @CALLS : api.saveImage, showToast
  // ====================================================================
  const insertWithR2Fallback = async (base64DataClean: string, targetFolder: string, fileName: string, onSaved: (path: string) => void = insertImageMarkdown) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const saveResult = await api.saveImage(targetFolder, base64DataClean, fileName);
    if (saveResult && saveResult.success) {
      const finalPath = saveResult.mediaPath
        ? saveResult.mediaPath
        : `media://local/serve?url=${encodeURIComponent(saveResult.absolutePath)}`;
      onSaved(finalPath);
      showToast('이미지가 로컬 폴더에 저장되었습니다.', 'success');
    } else {
      showToast('이미지 로컬 저장에 실패했습니다.', 'error');
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0067] MainEditorApp.tsx ➔ webUploadImage
  // 🎯 @KICK  : 웹 브라우저: API를 통해 R2(또는 dev 로컬)에 이미지 업로드 후 에디터 삽입
  // 🛡️ @GUARD : dev/production 엔드포인트 분기, JWT 인증
  // 🔗 @CALLS : fetch, showToast
  // ====================================================================
  const webUploadImage = async (base64Data: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const isDev = process.env.NODE_ENV === 'development';
      const uploadEndpoint = isDev ? getApiUrl('/api/upload-pasted-image') : '/api/upload-image';
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const activeFilePath = currentFileNode?.path || currentFileNodeRef.current?.path || tabsRef.current?.find(t => t.id === activeTabIdRef.current)?.path || '';
      const response = await fetch(uploadEndpoint, {
        method: 'POST', headers,
        body: JSON.stringify({ base64Data, targetFolder: activeFilePath || rootFolderRef.current?.name || '' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.relativePath) {
          insertImageMarkdown(data.relativePath);
          showToast(isDev ? '개발 환경: 로컬 assets 폴더에 저장되었습니다.' : '웹 환경: 클라우드 서버(R2)에 성공적으로 업로드되었습니다.', 'success');
        } else {
          showToast('이미지 업로드 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } else {
        showToast(`서버 오류 발생 (${response.status})`, 'error');
      }
    } catch (err) {
      console.error('[Web Upload Error]', err);
      showToast('이미지 업로드 전송 중 네트워크 오류가 발생했습니다.', 'error');
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0068] MainEditorApp.tsx ➔ insertImageMarkdown
  // 🎯 @KICK  : 에디터 커서 위치에 마크다운 이미지 문법 삽입 후 빈 줄 2행 추가 및 커서 이동
  // 🛡️ @GUARD : editorRef.current null 체크, readOnly 우회
  // 🚨 @PATCH : **2026-10-02** - insertMediaAtCursor에 updateContent 전달 및 insertAtCursor 안전 폴백 추가
  // 🔗 @CALLS : insertMediaAtCursor(editorActions), updateContent
  // ====================================================================

  return {
    handlePasteImageFile,
    handleEditorPaste,
    insertImageMarkdown,
    handlePasteImageFileRef,
    isImageLikeFile,
  };
}
