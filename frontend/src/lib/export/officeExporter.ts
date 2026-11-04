// ====================================================================
// 📊 [OMD-IO-export-office-0001] frontend/src/lib/export/officeExporter.ts
// 🎯 @KICK  : 미리보기 DOM 기반 MS Word(.docx) 및 한글(.hwpx) 오피스 문서 변환 내보내기
// 🛡️ @GUARD : 미리보기 계산 스타일(Computed Style) 보존, 미디어/다이어그램 임베딩, Electron/Web 분기
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리]: exportHandlers.ts에서 Word/한글 오피스 내보내기 전용 모듈 분리
// 🔗 @CALLS : generateDocx, generateHwpx, extractMediaFromElements, clonePreview
// ====================================================================
import { startExportProgress } from '../exportProgress';
import { getExportDocumentRoot, prepareExportPreview } from '../exportPreparation';
import { msg } from '@/lib/systemMessages';
import { clonePreview, inlineLocalImages } from './common';
import type { ExportOptions } from './types';

// ====================================================================
// 📊 [OMD-IO-exportHandlers-0014] exportHandlers.ts ➔ exportDOCX
// 🎯 @KICK  : 미리보기 DOM을 MS Word(.docx) 문서로 변환하여 내보내기
// 🛡️ @GUARD : Electron saveFileAs 및 브라우저 다운로드 분기 지원
// 🚨 @PATCH : **2026-09-30** — MS Word (.docx) 내보내기 파이프라인 신설
// 🔗 @CALLS : clonePreview, generateDocx, downloadBlob, saveToDownloads
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0014] exportHandlers.ts ➔ exportDOCX
// 🎯 @KICK  : 미리보기 렌더링 DOM을 MS Word(.docx) 문서로 변환하여 내보내기
// 🛡️ @GUARD : Electron saveFileAs 및 브라우저 다운로드 분기 지원, 유니코드 불릿/인라인 태그 누출 차단
// 🚨 @PATCH : **2026-10-01** — 미리보기 DOM 직접 조판 기반으로 전환하여 마크다운 태그 누출을 완전 방지하고 깨끗한 Word 문서 사출 지원
// 🚨 @PATCH : **2026-09-30** — MS Word (.docx) 내보내기 파이프라인 신설
// 🔗 @CALLS : clonePreview, generateDocx, downloadBlob, saveToDownloads
// ====================================================================
export async function exportHWPX({ previewEl, currentFileName, showToast, activeProfile }: ExportOptions) {
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    const api = (window as any).electronAPI;
    const title = currentFileName.replace(/\.[^/.]+$/, '') || 'document';
    const filename = `${title}.hwpx`;
    let destination: string | undefined;
    if (api?.showSaveDialog && api?.saveBinaryFile) {
      const selection = await api.showSaveDialog({ title: '한글 문서 저장 위치 선택', defaultPath: filename, filters: [{ name: '한글 문서', extensions: ['hwpx'] }] });
      if (selection.canceled || !selection.filePath) return;
      destination = selection.filePath;
    }
    progress = startExportProgress('HWPX');
    progress.update('미리보기 확인 중');
    await prepareExportPreview(previewEl);
    const target = getExportDocumentRoot(previewEl);
    const clone = clonePreview(target, true);
    progress.update('이미지 준비 중');
    await inlineLocalImages(clone);
    const { extractMediaFromElements } = await import('../exportMediaHelper');
    const images = await extractMediaFromElements(target, clone);
    progress.update('한글 문서 생성 중');
    const { generateHwpx } = await import('../hwpxGenerator');
    const blob = await generateHwpx(clone, { title, images, defaultFont: activeProfile?.pageStyle.fontFamily });
    progress.update('파일 저장 중');
    if (destination) {
      await api.saveBinaryFile(destination, new Uint8Array(await blob.arrayBuffer()));
    } else if (api?.saveFileAs) {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('한글 문서 저장 데이터를 읽지 못했습니다.'));
        reader.readAsDataURL(blob);
      });
      if (!await api.saveFileAs(data, filename, '', [{ name: '한글 문서', extensions: ['hwpx'] }])) return;
    } else {
      const { downloadBlob } = await import('../docxGenerator');
      downloadBlob(blob, filename);
    }
    showToast('한글 문서(.hwpx) 내보내기가 완료되었습니다.', 'success');
  } catch (error: any) {
    msg.error('HWPX export error', error);
    showToast('한글 문서 내보내기 실패: ' + error.message, 'error');
  } finally { progress?.finish(); }
}

export async function exportDOCX({ previewEl, currentFileName, showToast, activeProfile }: ExportOptions) {
  try {
    showToast('Word 문서 (.docx) 생성 중...', 'info');

    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl, true);
    const tableSelector = 'table, th, td, th p, td p, th li, td li, th span, td span';
    const liveTableElements = Array.from(targetEl.querySelectorAll(tableSelector));
    Array.from(clone.querySelectorAll(tableSelector)).forEach((element, index) => {
      const live = liveTableElements[index];
      if (!live) return;
      const style = window.getComputedStyle(live);
      for (const property of ['font-size', 'line-height', 'margin-top', 'margin-bottom', 'text-align']) {
        (element as HTMLElement).style.setProperty(property, style.getPropertyValue(property));
      }
    });
    // 목록마다 실제 미리보기 간격을 저장한다. 일반 문단 여백을 상속하지 않는다.
    const liveListItems = Array.from(targetEl.querySelectorAll('li'));
    Array.from(clone.querySelectorAll('li')).forEach((item, index) => {
      const live = liveListItems[index];
      if (!live) return;
      const style = window.getComputedStyle(live);
      for (const property of ['font-size', 'line-height', 'margin-top', 'margin-bottom']) {
        (item as HTMLElement).style.setProperty(property, style.getPropertyValue(property));
      }
    });
    await inlineLocalImages(clone);

    // 🖼️ 라이브 DOM과 클론 DOM으로부터 이미지 및 Mermaid 다이어그램 추출 및 래스터라이즈
    const { extractMediaFromElements } = await import('@/lib/exportMediaHelper');
    const images = await extractMediaFromElements(targetEl, clone);

    const docTitle = currentFileName.replace(/\.[^/.]+$/, '') || 'document';
    const filename = `${docTitle}.docx`;

    const { generateDocx, downloadBlob } = await import('@/lib/docxGenerator');
    const docxBlob = await generateDocx(clone, { title: docTitle, images, profile: activeProfile });

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const arrayBuffer = await docxBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const dataUri = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
      const result = await (window as any).electronAPI.saveFileAs(
        dataUri,
        filename,
        '',
        [{ name: 'Word Document', extensions: ['docx'] }]
      );
      if (result) {
        showToast('Word 문서(.docx)가 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('내보내기가 취소되었습니다.', 'info');
      }
    } else {
      downloadBlob(docxBlob, filename);
      showToast('Word 문서(.docx) 내보내기가 완료되었습니다.', 'success');
    }
  } catch (err: any) {
    msg.error('DOCX export error', err);
    showToast('Word 내보내기 실패: ' + err.message, 'error');
  }
}

