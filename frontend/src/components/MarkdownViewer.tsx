// ====================================================================
// 🏷️ 파일명 : MarkdownViewer.tsx
// 🎭 역할(Role) : Core (마크다운 미리보기 코어 렌더러)
// 🎯 주요기능 : ReactMarkdown 기반 마크다운 AST 변환, 그림책(Picturebook) 레이아웃 분기 및 뷰어 서브모듈 오케스트레이션
// 🚨 @PATCH : 2026-11-13 — [미리보기 미디어(이미지·비디오·지도) 편집/복사 액션 버튼 소형 아이콘화]: attachMediaActions의 텍스트 버튼을 13x13 SVG 아이콘 전용 버튼으로 전환
// 🚨 @PATCH : 2026-11-04 — [Rule 3 코어 엔진 1순위: MarkdownViewer 2단계 모듈화 분리]:
//             1) 경로 보안 가드(isPathInsideWorkspace), 마크다운 원문 전처리(preprocessMarkdownContent), 줄 번호/개행 Rehype 플러그인 및 전용 CSS 시트를 markdownViewerPipeline.ts로 분리
//             2) 1,200줄의 ReactMarkdown 커스텀 엘리먼트 렌더러 맵을 MarkdownCustomRenderers.tsx로 전면 분리 (2,528줄 ➔ 245줄, -90% 슬림화)
// 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: MarkdownViewer 대형 뷰어 모듈화 분리]:
//             1) 4,032줄의 거대 MarkdownViewer.tsx에서 5대 핵심 렌더링 서브 컴포넌트(TableWrapper, MathBlock, MermaidBlock, CodeBlock, AsyncMedia)를 frontend/src/components/viewer/로 전면 분리
// ====================================================================

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import remarkExtendedTable, { extendedTableHandlers } from 'remark-extended-table';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'dompurify';
import { rehypeBibliography } from '@/lib/bibliography';
import BibliographySummary from '@/components/BibliographySummary';
import { remarkCodeBlockMetadata } from '../lib/codeBlockMetadata';
import { remarkKoreanStrong } from '@/lib/remarkKoreanStrong';
import { remarkQuoteIndent } from '@/lib/remarkQuoteIndent';
import { remarkPageBreak } from '@/lib/remarkPageBreak';
import { bulletNumbersAsText } from '@/lib/bulletNumberText';
import PicturebookPreview from './PicturebookPreview';
import { exportContentFingerprint } from '@/lib/exportPreparation';
import { rehypePreserveFootnotes } from '@/lib/rehypePreserveFootnotes';
import { copyMediaSource, copyImageToClipboard } from '@/lib/mediaMarkup';
import { mediaSourceRange } from '@/lib/mediaSourceRange';
import { useToast } from '@/components/ToastProvider';
import { extractFrontmatter } from '@/lib/frontmatter';
import { logError } from '@/lib/errorDiagnostics';
import {
  isPathInsideWorkspace,
  type WorkspaceGuardResult,
  remarkEmptyDocumentLinkLabels,
  remarkDisableIndentedCode,
  preprocessMarkdownContent,
  computeNodeIndentStyle,
  createRehypeSourceLinesPlugin,
  createRehypeBrRawPlugin,
  MARKDOWN_VIEWER_STYLES,
  createMarkdownCustomComponents,
} from '@/components/viewer';

export { isPathInsideWorkspace, type WorkspaceGuardResult };

export interface MarkdownViewerProps {
  picturebookProfile?: import('@/types/cssProfile').CssProfile;
  mediaControlsManaged?: boolean;
  onMediaEdit?: (kind: 'image' | 'video' | 'map', path: string, line: number) => void;
  onPicturebookChange?: (markdown: string) => void;
  onPicturebookImageEdit?: (index: number) => void;
  picturebookEditorOptions?: import('./PicturebookSceneInput').PicturebookEditorOptions;
  content: string;
  originalContent?: string;
  lineMap?: number[];
  onCheckboxToggle?: (lineNumber: number, checked: boolean, importedId?: string) => void;
  currentFilePath?: string;
  rootFolderPath?: string;
  onFileOpen?: (resolvedPath: string, hashPart?: string, strictLinkedDocument?: boolean) => void;
  listIndent?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  bibContent?: string;
  suppressBibliography?: boolean;
  rootFolder?: any;
  resourceFolderHandle?: any;
  resourceFolder?: string;
  workspaceType?: string;
  onImageLoaded?: () => void;
  activeLine?: number;
  customCss?: string;
}

/**
 * ========================================================================================
 * [컴포넌트명] MarkdownViewer - 마크다운 원문을 ReactMarkdown 및 커스텀 렌더러 파이프라인으로 렌더링하는 뷰어 컴포넌트
 *
 * @param {MarkdownViewerProps} props - 마크다운 원문, 줄 매핑, 서식 프로필 및 파일/미디어 콜백
 * @returns {JSX.Element} 렌더링된 마크다운 뷰어 DOM
 * ==========================================================================================
 */
function MarkdownViewer({
  content,
  originalContent,
  lineMap,
  onCheckboxToggle,
  currentFilePath,
  rootFolderPath,
  onFileOpen,
  listIndent,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  bibContent,
  rootFolder,
  resourceFolderHandle,
  resourceFolder,
  workspaceType,
  onImageLoaded,
  customCss,
  picturebookProfile,
  onMediaEdit,
  mediaControlsManaged,
  suppressBibliography,
}: MarkdownViewerProps) {
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const originalContentRef = useRef(originalContent);
  const dynamicPropsRef = useRef({
    lineMap,
    onCheckboxToggle,
    currentFilePath,
    rootFolderPath,
    onFileOpen,
    rootFolder,
    resourceFolderHandle,
    resourceFolder,
    workspaceType,
    showToast,
    onMediaEdit,
    mediaControlsManaged,
  });
  dynamicPropsRef.current = {
    lineMap,
    onCheckboxToggle,
    currentFilePath,
    rootFolderPath,
    onFileOpen,
    rootFolder,
    resourceFolderHandle,
    resourceFolder,
    workspaceType,
    showToast,
    onMediaEdit,
    mediaControlsManaged,
  };

  const attachMediaActions = useCallback(
    (kind: 'image' | 'video' | 'map', path: string, node: any, child: React.ReactNode) => {
      if (!dynamicPropsRef.current.onMediaEdit) return child;
      const line = dynamicPropsRef.current.lineMap?.[node?.position?.start?.line || 0] || node?.position?.start?.line || 1;
      return (
        <div className="relative group onrivi-media-actions-frame" style={{ maxWidth: '100%' }}>
          {child}
          <div
            className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 no-print"
            data-editor-controls
            contentEditable={false}
          >
            <button
              type="button"
              className="onrivi-media-control"
              title={kind === 'image' ? '이미지 편집' : kind === 'map' ? '지도 편집' : '동영상 편집'}
              aria-label="편집"
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                e.stopPropagation();
                dynamicPropsRef.current.onMediaEdit?.(kind, path, line);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </button>
            <button
              type="button"
              className="onrivi-media-control"
              title={kind === 'image' ? '이미지 복사' : '미디어 참조 복사'}
              aria-label="복사"
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                e.stopPropagation();
                const match = mediaSourceRange(originalContentRef.current || contentRef.current, kind, path, line);
                if (kind === 'image') {
                  const target = path || match?.source || '';
                  if (!target) {
                    showToast('복사할 이미지 정보를 찾지 못했습니다.', 'warning');
                    return;
                  }
                  void copyImageToClipboard(target)
                    .then(ok => {
                      if (ok) showToast('이미지를 클립보드에 복사했습니다.', 'success');
                      else showToast('이미지 복사에 실패했습니다.', 'error');
                    })
                    .catch(err => {
                      logError({
                        file: 'frontend/src/components/MarkdownViewer.tsx',
                        func: 'attachMediaActions',
                        doing: '미리보기 이미지 클립보드 복사 중',
                        target,
                        error: err,
                      });
                      showToast('클립보드 복사 실패', 'error');
                    });
                } else {
                  if (!match) {
                    showToast('원본 미디어 위치를 찾지 못했습니다.', 'warning');
                    return;
                  }
                  void copyMediaSource(match.source)
                    .then(() => showToast('미디어 참조를 복사했습니다.', 'success'))
                    .catch(err => {
                      logError({
                        file: 'frontend/src/components/MarkdownViewer.tsx',
                        func: 'attachMediaActions',
                        doing: '미리보기 미디어 참조 마크다운 클립보드 복사 중',
                        target: path,
                        error: err,
                      });
                      showToast('클립보드 복사 실패', 'error');
                    });
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
          </div>
        </div>
      );
    },
    [showToast]
  );

  const frontmatterCustomCss = useMemo(() => {
    if (!content) return '';
    try {
      const { data } = extractFrontmatter(content);
      return data.custom_css || data.customCss || data.css || '';
    } catch {
      return '';
    }
  }, [content]);

  useEffect(() => {
    contentRef.current = content;
    originalContentRef.current = originalContent;
  }, [content, originalContent]);

  const cleanContent = useMemo(() => preprocessMarkdownContent(content), [content]);

  const getIndentStyle = useCallback(
    (node: any) =>
      computeNodeIndentStyle(
        node,
        dynamicPropsRef.current.lineMap,
        originalContentRef.current || contentRef.current,
        listIndent
      ),
    [listIndent]
  );

  const rehypeSourceLinesPlugin = useMemo(
    () => createRehypeSourceLinesPlugin(dynamicPropsRef, originalContentRef, contentRef),
    []
  );
  const rehypeBrRaw = useMemo(() => createRehypeBrRawPlugin(), []);

  const processedContent = useMemo(() => bulletNumbersAsText(cleanContent), [cleanContent]);

  const markdownComponents = useMemo(
    () =>
      createMarkdownCustomComponents({
        dynamicPropsRef,
        originalContentRef,
        contentRef,
        processedContent,
        getIndentStyle,
        onImageLoaded,
        attachMediaActions,
        picturebookProfile,
      }),
    [processedContent, getIndentStyle, onImageLoaded, attachMediaActions, picturebookProfile]
  );

  return (
    <div
      ref={containerRef}
      className="markdown-viewer-root onrivi-content-root bg-transparent mx-auto relative"
      data-export-content={exportContentFingerprint(originalContent ?? content)}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        minHeight: '100%',
        boxShadow: 'none',
        borderRadius: '0px',
        paddingTop: marginTop || '0',
        paddingBottom: marginBottom || '0',
        paddingLeft: marginLeft || '0',
        paddingRight: marginRight || '0',
        ['--list-indent' as any]: listIndent || '28px',
        ['--li-marker-gap' as any]:
          picturebookProfile?.rules?.li?.['padding-inline-start'] ||
          picturebookProfile?.rules?.li?.['padding-left'] ||
          '0px',
        ['--li-margin-bottom' as any]: picturebookProfile?.rules?.li?.['margin-bottom'] || '6px',
      }}
    >
      <style>{MARKDOWN_VIEWER_STYLES}</style>
      {(customCss || frontmatterCustomCss) && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          ${customCss ? `/* === [User Custom CSS - Prop] === */\n${customCss}\n` : ''}
          ${frontmatterCustomCss ? `/* === [Frontmatter Custom CSS] === */\n${frontmatterCustomCss}\n` : ''}
        `,
          }}
        />
      )}
      <div className="print:!block">
        <ReactMarkdown
          urlTransform={uri => {
            const cleanUri = DOMPurify.sanitize(uri);
            if (cleanUri.trim().toLowerCase().startsWith('javascript:')) return '';
            return cleanUri;
          }}
          remarkPlugins={[
            [remarkGfm, { singleTilde: false }],
            remarkExtendedTable,
            remarkBreaks,
            remarkMath,
            remarkDisableIndentedCode,
            remarkCodeBlockMetadata,
            remarkKoreanStrong,
            remarkPageBreak,
            remarkQuoteIndent,
            remarkEmptyDocumentLinkLabels,
          ]}
          rehypePlugins={[
            [rehypeKatex, { strict: false }],
            rehypeBrRaw,
            rehypeRaw,
            rehypeHighlight,
            rehypeSourceLinesPlugin,
            rehypePreserveFootnotes,
            [rehypeBibliography, { content: bibContent || '', suppressList: suppressBibliography }],
          ]}
          remarkRehypeOptions={{ handlers: extendedTableHandlers }}
          components={markdownComponents}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * ========================================================================================
 * [컴포넌트명] LayoutAwareViewer - 그림책(Picturebook) 레이아웃 프로필 여부에 따라 전용 뷰어 또는 일반 MarkdownViewer로 분기하는 메모이제이션 래퍼 컴포넌트
 *
 * @param {MarkdownViewerProps} props - 마크다운 뷰어 프로퍼티
 * @returns {JSX.Element} 레이아웃 분기된 뷰어 컴포넌트
 * ==========================================================================================
 */
function LayoutAwareViewer(props: MarkdownViewerProps) {
  const original = props.originalContent ?? props.content;
  const { data, content: body } = extractFrontmatter(original);
  const requestedId = data.css_profile?.replace(/^["']|["']$/g, '');
  if (requestedId?.startsWith('profile-book-') && requestedId !== props.picturebookProfile?.id) {
    return (
      <div className="p-6 text-sm text-slate-500" role="status">
        그림책 서식을 불러오는 중입니다. 계속 표시되면 리소스 폴더의 서식 연결을 확인해 주세요.
      </div>
    );
  }
  if (props.picturebookProfile?.layout?.type !== 'picturebook') return <MarkdownViewer {...props} />;
  return (
    <>
      <PicturebookPreview
        content={body.replace(/\r\n/g, '\n')}
        profile={props.picturebookProfile}
        onImageEdit={props.onPicturebookImageEdit}
        editorOptions={props.onPicturebookChange ? props.picturebookEditorOptions : undefined}
        sourceLineOffset={(original.slice(0, original.length - body.length).match(/\n/g) || []).length}
        onChange={
          props.onPicturebookChange
            ? next => props.onPicturebookChange!(original.slice(0, original.length - body.length) + next)
            : undefined
        }
        fingerprint={exportContentFingerprint(original)}
        renderMarkdown={part => (
          <MarkdownViewer
            {...props}
            content={part}
            originalContent={undefined}
            lineMap={undefined}
            picturebookProfile={undefined}
            onPicturebookChange={undefined}
            onCheckboxToggle={undefined}
            suppressBibliography
          />
        )}
      />
      <BibliographySummary source={original} content={props.bibContent || ''} />
    </>
  );
}

export default React.memo(LayoutAwareViewer);
