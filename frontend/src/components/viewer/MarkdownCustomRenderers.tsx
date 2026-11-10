// ====================================================================
// 🏷️ 파일명 : MarkdownCustomRenderers.tsx
// 🎭 역할(Role) : Core (ReactMarkdown 커스텀 태그 렌더러 팩토리)
// 🎯 주요기능 : img, video, source, iframe, a(폴더/문서/외부/앵커/유튜브/동영상 링크), table/tr/th, code(인라인/Mermaid/Math/CodeBlock), h1~h6, p, ul/ol/li, blockquote(GitHub/한글 Alert 콜아웃) 커스텀 렌더링
// 🚨 @PATCH : 2026-11-10 — [제한사용자 마크다운 뷰어 빈 불릿(◦) 유령 항목 방어]: li 렌더러에서 onrivi-empty-list-row 클래스 포함 요소를 정확히 감지하여 유령 불릿 기호 및 불필요한 공백을 완전히 소거
// 🚨 @PATCH : 2026-11-07 — [이미지 마크다운 꺽쇠(<...>) 정제 및 driveId 쿼리스트링 보존]: img 렌더러에서 URL 앞뒤 꺽쇠(<...>) 및 따옴표를 정제하여 AsyncImage로 전달
// 🚨 @PATCH : 2026-11-07 — [HTML 병합 표(colspan/rowspan) 자동 감지 및 유연한 레이아웃(table-auto) 지원]: colspan 또는 rowspan이 존재하는 표는 table-fixed로 인한 열 뭉개짐을 방지하고 table-auto min-w-full 레이아웃을 자동 적용하여 병합 셀이 온전히 렌더링되도록 개선
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 코어 엔진 모듈화]: 1,200줄의 ReactMarkdown 커스텀 엘리먼트 렌더러 맵을 독립 모듈로 분리
// 🔗 @CALLS : AsyncImage, AsyncVideo, TableWrapper, MermaidBlock, MathBlock, CodeBlock, isPathInsideWorkspace, resolveRelativeImagePath
// ====================================================================

import React from 'react';
import TableHeaderCell from '@/components/TableHeaderCell';
import { ratiosBeforeTable } from '@/lib/tableColumnRatios';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import VideoCard from '@/components/VideoCard';
import SocialVideoCard from '@/components/SocialVideoCard';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { getResourceSettings } from '@/lib/resourceSettings';
import { resolveDocumentLink } from '@/lib/nativeDocumentPath';
import { hasHeadingNumber, headingNodeText } from '@/lib/headingNumbering';
import TableWrapper from './TableWrapper';
import MathBlock from './MathBlock';
import MermaidBlock from './MermaidBlock';
import CodeBlock, { extractDataLine } from './CodeBlock';
import { AsyncImage, AsyncVideo } from './AsyncMedia';
import {
  getTextFromChildren,
  resolveRelativeImagePath,
  isPathInsideWorkspace,
} from './markdownViewerPipeline';

export interface CreateMarkdownCustomComponentsParams {
  dynamicPropsRef: React.MutableRefObject<{
    lineMap?: number[];
    onCheckboxToggle?: (lineNumber: number, checked: boolean, importedId?: string) => void;
    currentFilePath?: string;
    rootFolderPath?: string;
    onFileOpen?: (resolvedPath: string, hashPart?: string, strictLinkedDocument?: boolean) => void;
    rootFolder?: any;
    resourceFolderHandle?: any;
    resourceFolder?: string;
    workspaceType?: string;
    showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    onMediaEdit?: (kind: 'image' | 'video' | 'map', path: string, line: number) => void;
    mediaControlsManaged?: boolean;
  }>;
  originalContentRef: React.MutableRefObject<string | undefined>;
  contentRef: React.MutableRefObject<string>;
  processedContent: string;
  getIndentStyle: (node: any) => React.CSSProperties;
  onImageLoaded?: () => void;
  attachMediaActions: (
    kind: 'image' | 'video' | 'map',
    path: string,
    node: any,
    child: React.ReactNode
  ) => React.ReactNode;
  picturebookProfile?: import('@/types/cssProfile').CssProfile;
}

/**
 * ========================================================================================
 * [함수명] createMarkdownCustomComponents - ReactMarkdown에 주입되는 모든 HTML/Markdown 태그 커스텀 렌더러 맵을 생성합니다.
 *
 * @param {CreateMarkdownCustomComponentsParams} params - 동적 프로퍼티 Ref, 전처리된 마크다운, 들여쓰기/미디어 액션 헬퍼
 * @returns {Record<string, React.ComponentType<any>>} ReactMarkdown components 객체
 *
 * @example
 * const components = createMarkdownCustomComponents({ dynamicPropsRef, ... });
 * ==========================================================================================
 */
export function createMarkdownCustomComponents({
  dynamicPropsRef,
  originalContentRef,
  contentRef,
  processedContent,
  getIndentStyle,
  onImageLoaded,
  attachMediaActions,
  picturebookProfile,
}: CreateMarkdownCustomComponentsParams): Record<string, any> {
  return {
    source: ({ node: _node, src, ...props }: any) => {
      if (!src) return <source {...props} />;

      let actualSrc = src;
      try {
        if (actualSrc) actualSrc = decodeURI(actualSrc);
      } catch {}

      let absolutePath = actualSrc;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

      if (
        actualSrc &&
        (actualSrc.startsWith('/media/') || actualSrc.startsWith('./media/') || actualSrc.startsWith('media/'))
      ) {
        const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
        if (freshRF) {
          const sep = freshRF.includes('\\') ? '\\' : '/';
          const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
          const strippedSrc = actualSrc.startsWith('./')
            ? actualSrc.substring(1)
            : actualSrc.startsWith('/')
              ? actualSrc
              : '/' + actualSrc;
          const normalizedSrc = sep === '\\' ? strippedSrc.replace(/\//g, '\\') : strippedSrc;
          absolutePath = cleanRoot + normalizedSrc;
        } else {
          absolutePath = '';
        }
      }

      let finalSrc = actualSrc;
      if (api) {
        const isHttp = actualSrc.startsWith('http://') || actualSrc.startsWith('https://');
        if (isHttp) {
          finalSrc = `media://?url=${encodeURIComponent(actualSrc)}`;
        } else if (absolutePath && absolutePath !== actualSrc) {
          finalSrc = `media-local://serve?url=${encodeURIComponent(absolutePath)}`;
        } else {
          finalSrc = absolutePath;
        }
      }

      return <source src={finalSrc} {...props} />;
    },

    video: ({ node, src, children, ...props }: any) => {
      let actualSrc = src;
      if (!actualSrc && children) {
        React.Children.forEach(children, (child: any) => {
          if (child && child.type === 'source' && child.props && child.props.src) {
            actualSrc = child.props.src;
          }
        });
      }

      if (!actualSrc) return <video {...props}>{children}</video>;
      try {
        if (actualSrc) actualSrc = decodeURI(actualSrc);
      } catch {}
      if (actualSrc && actualSrc.startsWith('onrivi/')) {
        actualSrc = '/' + actualSrc;
      }

      let absolutePath = actualSrc;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

      if (
        actualSrc &&
        (actualSrc.startsWith('/media/') || actualSrc.startsWith('./media/') || actualSrc.startsWith('media/'))
      ) {
        const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
        if (freshRF) {
          const sep = freshRF.includes('\\') ? '\\' : '/';
          const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
          const strippedSrc = actualSrc.startsWith('./')
            ? actualSrc.substring(1)
            : actualSrc.startsWith('/')
              ? actualSrc
              : '/' + actualSrc;
          const normalizedSrc = sep === '\\' ? strippedSrc.replace(/\//g, '\\') : strippedSrc;
          absolutePath = cleanRoot + normalizedSrc;
        } else {
          absolutePath = '';
        }
      }

      let finalSrc = api ? absolutePath : actualSrc;
      const isHttp = actualSrc.startsWith('http://') || actualSrc.startsWith('https://');
      if (isHttp && api) {
        finalSrc = `media://?url=${encodeURIComponent(actualSrc)}`;
      }

      const videoAlign = props['data-align'] || node?.properties?.dataAlign || 'center';
      const alignItems = videoAlign === 'left' ? 'flex-start' : videoAlign === 'right' ? 'flex-end' : 'center';
      return attachMediaActions(
        'video',
        src || actualSrc,
        node,
        <figure
          data-line={extractDataLine(props, node)}
          className="onrivi-video-figure"
          style={{ display: 'flex', flexDirection: 'column', alignItems, width: '100%', clear: 'both' }}
        >
          <div
            className="relative flex flex-col onrivi-video-wrapper"
            style={{ display: 'flex', flexDirection: 'column', alignItems, width: '100%', maxWidth: '100%' }}
          >
            <AsyncVideo
              src={finalSrc}
              absolutePath={absolutePath}
              rootFolder={dynamicPropsRef.current.rootFolder}
              resourceFolderHandle={dynamicPropsRef.current.resourceFolderHandle}
              workspaceType={dynamicPropsRef.current.workspaceType}
              api={api}
              {...props}
            />
          </div>
        </figure>
      );
    },

    img: ({ node, src, alt, style, ...props }: any) => {
      if (!src) return <img alt={alt} {...props} />;

      let cleanRawSrc = String(src).trim();
      if (cleanRawSrc.startsWith('<') && cleanRawSrc.endsWith('>')) {
        cleanRawSrc = cleanRawSrc.slice(1, -1).trim();
      }
      cleanRawSrc = cleanRawSrc.replace(/^[<"']|[>"']$/g, '').trim();

      let pureSrc = cleanRawSrc;
      let queryString = '';
      const qIndex = cleanRawSrc.indexOf('?');
      if (qIndex !== -1) {
        pureSrc = cleanRawSrc.substring(0, qIndex);
        queryString = cleanRawSrc.substring(qIndex);
      }
      try {
        if (pureSrc) pureSrc = decodeURI(pureSrc);
      } catch {}

      let finalSrc = cleanRawSrc;
      let absolutePath = pureSrc;
      const isHttp = pureSrc.startsWith('http://') || pureSrc.startsWith('https://');
      const isBlobOrData = pureSrc.startsWith('data:') || pureSrc.startsWith('blob:');
      const isExternal = isHttp || isBlobOrData;
      const isR2ApiPath = pureSrc.startsWith('/api/image/');

      const isMediaServe = pureSrc === 'media://local/serve';
      let mediaFilePath = '';
      if (isMediaServe && queryString) {
        const urlMatch = queryString.match(/[?&]url=([^&]+)/);
        if (urlMatch) mediaFilePath = decodeURIComponent(urlMatch[1]);
      }

      if (isR2ApiPath) {
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
        if (api || process.env.NODE_ENV === 'development') {
          finalSrc = `https://onrivi.com${pureSrc}`;
        } else {
          finalSrc = pureSrc;
        }
        if (queryString) {
          finalSrc += finalSrc.includes('?') ? '&' + queryString.substring(1) : queryString;
        }
      } else if (isMediaServe && mediaFilePath) {
        const api = (window as any).electronAPI;
        if (api) {
          finalSrc = `media://local/serve?url=${encodeURIComponent(mediaFilePath)}`;
        } else if (process.env.NODE_ENV === 'development') {
          finalSrc = `/api/view?filePath=${encodeURIComponent(mediaFilePath)}`;
        } else {
          finalSrc = mediaFilePath;
        }
        if (queryString && !finalSrc.includes('?')) {
          const otherParams = queryString.replace(/[?&]url=[^&]*/, '');
          if (otherParams) finalSrc += otherParams;
        }
      } else if (!isExternal && typeof window !== 'undefined') {
        const api = (window as any).electronAPI;
        const isDriveWorkspace = getResourceSettings()?.kind === 'drive';
        const isAbsoluteWin = /^[a-zA-Z]:[\\/]/.test(pureSrc);
        const isRootRelative = pureSrc.startsWith('/');

        const isWelcomePage =
          dynamicPropsRef.current.currentFilePath &&
          (dynamicPropsRef.current.currentFilePath.endsWith('Welcome.md') ||
            dynamicPropsRef.current.currentFilePath.endsWith('Welcome.markdown') ||
            dynamicPropsRef.current.currentFilePath === 'Welcome.md');

        const isWelcomeAsset = (pureSrc === './hero.png' || pureSrc === 'hero.png') && isWelcomePage;

        const isHelpAsset =
          pureSrc.startsWith('/help/assets/') ||
          pureSrc.startsWith('help/assets/') ||
          pureSrc.startsWith('./assets/') ||
          pureSrc.startsWith('assets/') ||
          pureSrc.includes('help/assets/');

        const isMediaPrefix =
          pureSrc.startsWith('/media/') ||
          pureSrc.startsWith('media/') ||
          pureSrc.startsWith('./media/') ||
          pureSrc.includes('/media/') ||
          pureSrc.includes('\\media\\');
        const hasSubdir = pureSrc.includes('/') || pureSrc.includes('\\');

        const isLocalMedia =
          !isExternal &&
          !isWelcomeAsset &&
          !isHelpAsset &&
          (isMediaPrefix ||
            (!hasSubdir &&
              (pureSrc.endsWith('.png') ||
                pureSrc.endsWith('.jpg') ||
                pureSrc.endsWith('.jpeg') ||
                pureSrc.endsWith('.gif') ||
                pureSrc.endsWith('.webp') ||
                pureSrc.endsWith('.svg'))));

        if (isHelpAsset) {
          const fileName = pureSrc.split('/').pop()?.split('?')[0] || '';
          finalSrc = `/help/assets/${fileName}`;
          absolutePath = `/help/assets/${fileName}`;
          if (queryString) {
            finalSrc += queryString;
          }
        } else if (isDriveWorkspace) {
          absolutePath = pureSrc;
        } else if (
          isLocalMedia &&
          (api ||
            (dynamicPropsRef.current.rootFolderPath &&
              dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME))
        ) {
          const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
          const hasRFHandle =
            !!dynamicPropsRef.current.resourceFolderHandle ||
            (typeof window !== 'undefined' && !!(window as any).__resourceFolderHandle);

          if (!freshRF && !hasRFHandle && !dynamicPropsRef.current.rootFolder?.handle) {
            return (
              <span className="inline-flex items-center gap-2 px-3.5 py-2 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold shadow-xs select-none">
                <span className="text-sm">⚠️</span>
                <span>[리소스 폴더 미지정] 환경설정에서 공통 자원 폴더를 지정해야 이미지가 표시됩니다.</span>
              </span>
            );
          }

          if (freshRF && freshRF !== BROWSER_STORAGE_NAME) {
            const sep = freshRF.includes('\\') ? '\\' : '/';
            const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;

            let cleanSrc = pureSrc;
            if (cleanSrc.startsWith('./')) cleanSrc = cleanSrc.substring(2);
            if (cleanSrc.startsWith('/')) cleanSrc = cleanSrc.substring(1);

            const hasInnerSubdir = cleanSrc.includes('/') || cleanSrc.includes('\\');
            let normalizedRelative = cleanSrc;
            if (!hasInnerSubdir && !cleanSrc.startsWith('media/') && !cleanSrc.startsWith('media\\')) {
              normalizedRelative = 'media' + sep + cleanSrc;
            }

            const normalizedSrc =
              sep === '\\' ? normalizedRelative.replace(/\//g, '\\') : normalizedRelative.replace(/\\/g, '/');
            absolutePath = cleanRoot + sep + normalizedSrc;
          }
        } else if (
          isRootRelative &&
          dynamicPropsRef.current.rootFolderPath &&
          dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME &&
          !isWelcomeAsset
        ) {
          const sep = dynamicPropsRef.current.rootFolderPath.includes('\\') ? '\\' : '/';
          const cleanRoot = dynamicPropsRef.current.rootFolderPath.endsWith(sep)
            ? dynamicPropsRef.current.rootFolderPath.slice(0, -1)
            : dynamicPropsRef.current.rootFolderPath;
          const normalizedSrc = sep === '\\' ? pureSrc.replace(/\//g, '\\') : pureSrc;
          absolutePath = cleanRoot + normalizedSrc;
        } else if (
          isRootRelative &&
          (!dynamicPropsRef.current.rootFolderPath ||
            dynamicPropsRef.current.rootFolderPath === BROWSER_STORAGE_NAME) &&
          dynamicPropsRef.current.currentFilePath &&
          !isWelcomeAsset
        ) {
          const srcWithoutSlash = pureSrc.startsWith('/') ? pureSrc.substring(1) : pureSrc;
          absolutePath = resolveRelativeImagePath(srcWithoutSlash, dynamicPropsRef.current.currentFilePath);
        } else if (!isAbsoluteWin && !isRootRelative && dynamicPropsRef.current.currentFilePath && !isWelcomeAsset) {
          absolutePath = resolveRelativeImagePath(pureSrc, dynamicPropsRef.current.currentFilePath);
        } else if (
          !isAbsoluteWin &&
          !isRootRelative &&
          dynamicPropsRef.current.rootFolderPath &&
          dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME &&
          !isWelcomeAsset
        ) {
          const sep = dynamicPropsRef.current.rootFolderPath.includes('/') ? '/' : '\\';
          const folder = dynamicPropsRef.current.rootFolderPath.endsWith(sep)
            ? dynamicPropsRef.current.rootFolderPath
            : dynamicPropsRef.current.rootFolderPath + sep;
          absolutePath = folder + pureSrc;
        } else if (isWelcomeAsset) {
          absolutePath = pureSrc.startsWith('./')
            ? pureSrc.slice(2)
            : pureSrc.startsWith('/')
              ? pureSrc.slice(1)
              : pureSrc;
        }

        if (api) {
          finalSrc = absolutePath;
        } else {
          finalSrc = pureSrc;
        }

        if (queryString) {
          const cleanQuery = queryString
            .replace(/([?&])(?:width|w)=[^&]*/gi, '')
            .replace(/([?&])(?:height|h)=[^&]*/gi, '')
            .replace(/([?&])(?:align|a)=[^&]*/gi, '')
            .replace(/&&+/g, '&')
            .replace(/\?&/, '?')
            .replace(/[?&]$/, '');

          if (cleanQuery && cleanQuery !== '?') {
            if (finalSrc.includes('?')) {
              finalSrc += '&' + cleanQuery.substring(1);
            } else {
              finalSrc += cleanQuery.startsWith('?') ? cleanQuery : '?' + cleanQuery;
            }
          }
        }
      }

      if (finalSrc.startsWith('https://github.com/') && finalSrc.includes('/blob/')) {
        finalSrc = finalSrc
          .replace('https://github.com/', 'https://raw.githubusercontent.com/')
          .replace('/blob/', '/');
      }

      if (finalSrc.startsWith('frontend/public/')) {
        finalSrc = finalSrc.replace('frontend/public/', '/');
      } else if (finalSrc.startsWith('public/')) {
        finalSrc = finalSrc.replace('public/', '/');
      }

      if (isHttp && typeof window !== 'undefined') {
        const api = (window as any).electronAPI;
        if (api) {
          finalSrc = `media://?url=${encodeURIComponent(finalSrc)}`;
        }
      }

      let width: string | undefined;
      let height: string | undefined;
      let align: string | undefined;
      let urlCaptionPos: 'top' | 'bottom' | undefined;
      try {
        const wMatch = src.match(/[?&](?:width|w)=([^&#]+)/);
        const hMatch = src.match(/[?&](?:height|h)=([^&#]+)/);
        const aMatch = src.match(/[?&](?:align|a)=([^&#]+)/);
        const cMatch = src.match(/[?&](?:caption|captionPos|captionPosition)=([^&#]+)/);
        if (wMatch) width = decodeURIComponent(wMatch[1]);
        if (hMatch) height = decodeURIComponent(hMatch[1]);
        if (aMatch) align = decodeURIComponent(aMatch[1]);
        if (cMatch) {
          const cVal = decodeURIComponent(cMatch[1]).toLowerCase();
          if (cVal === 'top' || cVal === 'bottom') urlCaptionPos = cVal;
        }
      } catch {}

      if (width && /^\d+$/.test(width)) width = `${width}px`;
      if (height && /^\d+$/.test(height)) height = `${height}px`;

      const imgStyle: React.CSSProperties = {
        ...style,
        maxWidth: '100%',
      };
      if (width) imgStyle.width = width;
      if (height) imgStyle.height = height;

      const figureStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        clear: 'both',
        marginTop: '0.75rem',
        marginBottom: '1.25rem',
      };

      let forceAlignClass = '';
      if (align === 'left') {
        figureStyle.alignItems = 'flex-start';
        figureStyle.textAlign = 'left';
        imgStyle.alignSelf = 'flex-start';
        imgStyle.marginLeft = '0px';
        imgStyle.marginRight = 'auto';
        forceAlignClass = 'force-align-left';
      } else if (align === 'right') {
        figureStyle.alignItems = 'flex-end';
        figureStyle.textAlign = 'right';
        imgStyle.alignSelf = 'flex-end';
        imgStyle.marginLeft = 'auto';
        imgStyle.marginRight = '0px';
        forceAlignClass = 'force-align-right';
      } else if (align === 'center') {
        figureStyle.alignItems = 'center';
        figureStyle.textAlign = 'center';
        imgStyle.alignSelf = 'center';
        imgStyle.marginLeft = 'auto';
        imgStyle.marginRight = 'auto';
        forceAlignClass = 'force-align-center';
      }

      const imgElement = attachMediaActions(
        'image',
        src,
        node,
        <AsyncImage
          showCopyControl={!dynamicPropsRef.current.onMediaEdit && !dynamicPropsRef.current.mediaControlsManaged}
          src={finalSrc}
          alt={alt}
          absolutePath={absolutePath}
          rootFolder={dynamicPropsRef.current.rootFolder}
          resourceFolderHandle={dynamicPropsRef.current.resourceFolderHandle}
          resourceFolder={dynamicPropsRef.current.resourceFolder}
          workspaceType={dynamicPropsRef.current.workspaceType}
          api={typeof window !== 'undefined' ? (window as any).electronAPI : null}
          queryString={queryString}
          style={imgStyle}
          className={`rounded-lg shadow-sm border border-zinc-200/30 ${forceAlignClass}`}
          onImageLoaded={onImageLoaded}
          {...props}
        />
      );

      const line = extractDataLine(props, node);
      const profileCaptionPos =
        picturebookProfile?.mediaCaptionStructure?.kindOverrides?.image?.position ||
        picturebookProfile?.mediaCaptionStructure?.position ||
        'top';
      const captionPos = urlCaptionPos || profileCaptionPos;
      const hasValidCaption = Boolean(alt && alt.trim() !== '' && !/^[\\\[\]\s]+$/.test(alt));
      if (hasValidCaption) {
        const displayCaption = (alt || '').replace(/\\([\\\[\]])/g, '$1');
        return (
          <figure
            data-line={line}
            data-caption-position={captionPos}
            className={`onrivi-image-figure caption-${captionPos}`}
            style={figureStyle}
          >
            {captionPos === 'top' && (
              <figcaption
                data-position="top"
                className="text-[0.88em] tracking-tight text-zinc-600 dark:text-zinc-300 mb-1 mt-0 font-medium"
                style={{
                  order: -1,
                  ...(align ? { textAlign: align as any, alignSelf: figureStyle.alignItems } : {}),
                }}
              >
                {displayCaption}
              </figcaption>
            )}
            {imgElement}
            {captionPos === 'bottom' && (
              <figcaption
                data-position="bottom"
                className="text-[0.88em] tracking-tight text-zinc-500 dark:text-zinc-400 mt-1 mb-0 font-medium"
                style={{
                  order: 1,
                  ...(align ? { textAlign: align as any, alignSelf: figureStyle.alignItems } : {}),
                }}
              >
                {displayCaption}
              </figcaption>
            )}
          </figure>
        );
      }
      return (
        <div data-line={line} className="onrivi-image-figure" style={figureStyle}>
          {imgElement}
        </div>
      );
    },

    a: ({ node, href, children, ...props }: any) => {
      const isWebLink =
        href &&
        (href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('www.'));
      const isAnchor = href && (href.startsWith('#') || href.startsWith('.#'));

      if (isAnchor) {
        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault();
          const targetId = decodeURIComponent(href.startsWith('.#') ? href.slice(2) : href.slice(1));
          let targetEl = document.getElementById(targetId);

          if (!targetEl && targetId.includes('fnref-')) {
            const fnId = targetId.replace('fnref-', 'fn-');
            targetEl =
              document.querySelector(`a[href="#${fnId}"]`) ||
              document.getElementById(fnId.replace('user-content-', ''));
          }

          if (!targetEl) {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const cleanTarget = targetId.toLowerCase().replace(/\s+/g, '').normalize('NFC');
            for (const h of Array.from(headings)) {
              const headingText = h.textContent?.trim() || '';
              const cleanHeading = headingText.toLowerCase().replace(/\s+/g, '').normalize('NFC');
              if (
                cleanHeading === cleanTarget ||
                h.id === targetId ||
                (cleanTarget.length > 2 && cleanHeading.includes(cleanTarget))
              ) {
                targetEl = h as HTMLElement;
                break;
              }
            }
          }

          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };
        return (
          <a href={href} onClick={handleClick} {...props}>
            {children}
          </a>
        );
      }

      let rawHref = (href || '').trim();
      if (rawHref.startsWith('<') && rawHref.endsWith('>')) {
        rawHref = rawHref.slice(1, -1).trim();
      }
      rawHref = rawHref.replace(/^[<"']|[>"']$/g, '').trim();
      try {
        rawHref = decodeURIComponent(rawHref);
      } catch {}

      const isKnowledgeLink = rawHref && rawHref.startsWith('knowledge://');
      const isFileLink = rawHref && (rawHref.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(rawHref));
      const isMdFile = rawHref && /\.(md|markdown)(?:[?#]|$)/i.test(rawHref);
      const isFolderLink =
        rawHref &&
        !isWebLink &&
        !isKnowledgeLink &&
        !isMdFile &&
        (rawHref.startsWith('./') ||
          rawHref.startsWith('../') ||
          rawHref.startsWith('/') ||
          rawHref.endsWith('/') ||
          !rawHref.split(/[#?]/)[0].split(/[/\\]/).pop()?.includes('.'));

      if (rawHref && !isWebLink && isFolderLink) {
        const cleanHref = rawHref.split('#')[0].replace(/^[<"']|[>"']$/g, '').trim();

        let resolved = cleanHref;
        if (cleanHref.startsWith('file:///')) {
          resolved = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
        } else {
          resolved = resolveDocumentLink(cleanHref, dynamicPropsRef.current.currentFilePath);
        }

        const folderName = cleanHref.replace(/\/+$/, '').split(/[/\\]/).filter(Boolean).pop() || '폴더';
        const electronApi =
          typeof window !== 'undefined' ? (window as any).electronAPI || (window as any).api : null;

        const handleFolderClick = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          const guard = isPathInsideWorkspace(
            cleanHref,
            dynamicPropsRef.current.currentFilePath,
            dynamicPropsRef.current.rootFolderPath || dynamicPropsRef.current.rootFolder?.path,
            dynamicPropsRef.current.rootFolder?.name
          );
          if (!guard.isInside) {
            dynamicPropsRef.current.showToast?.(
              `⚠️ ${guard.reason || '작업장 실폴더 외부에 있는 폴더는 연결할 수 없습니다.'}`,
              'warning'
            );
            return;
          }
          resolved = guard.resolvedPath || resolved;

          const isCmdOrCtrl = e.ctrlKey || e.metaKey;
          if (isCmdOrCtrl && electronApi?.openPath) {
            try {
              electronApi.openPath(resolved);
              dynamicPropsRef.current.showToast?.(`'📁 ${folderName}' 시스템 폴더 창을 열었습니다.`, 'info');
              return;
            } catch {}
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('app:focus-tree-folder', {
                detail: { folderPath: resolved, folderName },
              })
            );
          }
        };

        const folderTitle = electronApi?.openPath
          ? `📁 탐색기에서 '${folderName}' 열기 (Ctrl+클릭 시 시스템 폴더 열기)`
          : `📁 탐색기에서 '${folderName}' 열기`;

        return (
          <a
            href={href}
            onClick={handleFolderClick}
            title={folderTitle}
            className="onrivi-folder-link inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
            {...props}
          >
            <span className="opacity-75 text-[0.9em] select-none">📁</span>
            {children}
          </a>
        );
      }

      if (href && !isWebLink && (isMdFile || isKnowledgeLink || isFileLink)) {
        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault();
          if (dynamicPropsRef.current.onFileOpen) {
            let unbracketed = (href || '').trim();
            if (unbracketed.startsWith('<') && unbracketed.endsWith('>')) {
              unbracketed = unbracketed.slice(1, -1).trim();
            }
            unbracketed = unbracketed.replace(/^[<"']|[>"']$/g, '').trim();
            try {
              unbracketed = decodeURIComponent(unbracketed);
            } catch {}

            if (isKnowledgeLink) {
              const hashPart = unbracketed.includes('#')
                ? unbracketed.split('#')[1].replace(/^[<"']|[>"']$/g, '').trim()
                : undefined;
              dynamicPropsRef.current.onFileOpen(unbracketed, hashPart || undefined);
              return;
            }

            const cleanHref = unbracketed.split('#')[0].replace(/^[<"']|[>"']$/g, '').trim();
            const hashPart = unbracketed.includes('#')
              ? unbracketed.split('#')[1].replace(/^[<"']|[>"']$/g, '').trim()
              : undefined;

            const guard = isPathInsideWorkspace(
              cleanHref,
              dynamicPropsRef.current.currentFilePath,
              dynamicPropsRef.current.rootFolderPath || dynamicPropsRef.current.rootFolder?.path,
              dynamicPropsRef.current.rootFolder?.name
            );
            if (!guard.isInside) {
              dynamicPropsRef.current.showToast?.(
                `⚠️ ${guard.reason || '작업장 실폴더 외부에 있는 문서는 연결할 수 없습니다.'}`,
                'warning'
              );
              return;
            }

            let resolved = guard.resolvedPath || cleanHref;
            if (cleanHref.startsWith('file:///')) {
              if (!guard.resolvedPath) resolved = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
            } else if (!guard.resolvedPath) {
              resolved = resolveDocumentLink(cleanHref, dynamicPropsRef.current.currentFilePath);
            }

            const normalizePath = (p: string | undefined) =>
              (p || '').replace(/\\/g, '/').toLowerCase().normalize('NFC').trim();
            const normResolved = normalizePath(resolved);
            const normCurrent = normalizePath(dynamicPropsRef.current.currentFilePath);
            const isSameFile = Boolean(
              normCurrent &&
                (normResolved === normCurrent ||
                  normResolved.endsWith('/' + normCurrent) ||
                  normCurrent.endsWith('/' + normResolved))
            );

            if (isSameFile) {
              if (hashPart) {
                const lineMatch = hashPart.match(/^L?(\d+)/i);
                if (lineMatch) {
                  const lineNum = parseInt(lineMatch[1], 10);
                  const lineEl = document.querySelector(`[data-line="${lineNum}"]`) as HTMLElement;
                  if (lineEl) {
                    lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    lineEl.classList.add('preview-highlight-line');
                    setTimeout(() => lineEl.classList.remove('preview-highlight-line'), 2500);
                  }
                } else {
                  const targetId = decodeURIComponent(hashPart);
                  let targetEl = document.getElementById(targetId);
                  if (!targetEl) {
                    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    const cleanTarget = targetId.toLowerCase().replace(/\s+/g, '').normalize('NFC');
                    for (const h of Array.from(headings)) {
                      const headingText = h.textContent?.trim() || '';
                      const cleanHeading = headingText.toLowerCase().replace(/\s+/g, '').normalize('NFC');
                      if (
                        cleanHeading === cleanTarget ||
                        h.id === targetId ||
                        (cleanTarget.length > 2 && cleanHeading.includes(cleanTarget))
                      ) {
                        targetEl = h as HTMLElement;
                        break;
                      }
                    }
                  }
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetEl.classList.add('preview-highlight-line');
                    setTimeout(() => targetEl.classList.remove('preview-highlight-line'), 2500);
                  }
                }
              }
              dynamicPropsRef.current.onFileOpen(resolved, hashPart || undefined, true);
            } else {
              dynamicPropsRef.current.onFileOpen(resolved, hashPart || undefined, true);
            }
          }
        };
        return (
          <a href={href} onClick={handleClick} {...props}>
            {children}
          </a>
        );
      }

      const apiHref =
        href && href.startsWith('/api/image/')
          ? `https://onrivi.com${href}`
          : href && (href.startsWith('/api/') || href.match(/^https?:\/\/localhost:/))
            ? getApiUrl(href.replace(/^https?:\/\/localhost:\d+/, ''))
            : href;

      const displayName = getTextFromChildren(children);
      const videoDataLine = extractDataLine(props, node);
      const youtubeMatch =
        href && href.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/);
      if (youtubeMatch && youtubeMatch[2] && youtubeMatch[2].length === 11) {
        return (
          <VideoCard
            src={`https://img.youtube.com/vi/${youtubeMatch[2]}/maxresdefault.jpg`}
            href={`https://www.youtube.com/watch?v=${youtubeMatch[2]}`}
            displayName={displayName || 'YouTube 동영상'}
            isYoutube
            youtubeId={youtubeMatch[2]}
            dataLine={videoDataLine}
            data-line={videoDataLine}
          />
        );
      }

      const isSocialVideo =
        href &&
        !youtubeMatch &&
        /(tiktok\.com|instagram\.com\/(p|reel|tv)\/|vimeo\.com|twitch\.tv|dailymotion\.com)/i.test(href);
      if (isSocialVideo) {
        return (
          <SocialVideoCard
            url={href}
            displayName={displayName || '동영상'}
            dataLine={videoDataLine}
            data-line={videoDataLine}
          />
        );
      }

      const isVideo = apiHref && /\.(mp4|webm|ogg|mov|avi|mkv)(\?|#|$)/i.test(apiHref);
      if (isVideo) {
        let rawApiHref = apiHref;
        try {
          if (rawApiHref) rawApiHref = decodeURI(rawApiHref);
        } catch {}
        let pureSrc = rawApiHref;
        let queryString = '';
        const qIndex = apiHref.indexOf('?');
        if (qIndex !== -1) {
          pureSrc = apiHref.substring(0, qIndex);
          queryString = apiHref.substring(qIndex);
        }

        let absolutePath = pureSrc;
        const isAbsoluteWin = /^[a-zA-Z]:[\\/]/.test(pureSrc);
        const isRootRelative = pureSrc.startsWith('/');
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

        const isMediaServe = pureSrc === 'media://local/serve';
        let mediaFilePath = '';
        if (isMediaServe && queryString) {
          const urlMatch = queryString.match(/[?&]url=([^&]+)/);
          if (urlMatch) mediaFilePath = decodeURIComponent(urlMatch[1]);
        }

        if (isMediaServe && mediaFilePath) {
          absolutePath = mediaFilePath;
          pureSrc = `media://local/serve?url=${encodeURIComponent(mediaFilePath)}`;
        } else if (
          (pureSrc.startsWith('/media/') || pureSrc.startsWith('./media/') || pureSrc.startsWith('media/')) &&
          api
        ) {
          const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
          if (freshRF) {
            const sep = freshRF.includes('\\') ? '\\' : '/';
            const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
            const strippedSrc = pureSrc.startsWith('./')
              ? pureSrc.substring(1)
              : pureSrc.startsWith('/')
                ? pureSrc
                : '/' + pureSrc;
            const normalizedSrc = sep === '\\' ? strippedSrc.replace(/\//g, '\\') : strippedSrc;
            absolutePath = cleanRoot + normalizedSrc;
          } else {
            absolutePath = '';
          }
        } else if (
          isRootRelative &&
          dynamicPropsRef.current.rootFolderPath &&
          dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME
        ) {
          const sep = dynamicPropsRef.current.rootFolderPath.includes('\\') ? '\\' : '/';
          const cleanRoot = dynamicPropsRef.current.rootFolderPath.endsWith(sep)
            ? dynamicPropsRef.current.rootFolderPath.slice(0, -1)
            : dynamicPropsRef.current.rootFolderPath;
          const normalizedSrc = sep === '\\' ? pureSrc.replace(/\//g, '\\') : pureSrc;
          absolutePath = cleanRoot + normalizedSrc;
        } else if (
          isRootRelative &&
          (!dynamicPropsRef.current.rootFolderPath ||
            dynamicPropsRef.current.rootFolderPath === BROWSER_STORAGE_NAME) &&
          dynamicPropsRef.current.currentFilePath
        ) {
          const srcWithoutSlash = pureSrc.startsWith('/') ? pureSrc.substring(1) : pureSrc;
          absolutePath = resolveRelativeImagePath(srcWithoutSlash, dynamicPropsRef.current.currentFilePath);
        } else if (!isAbsoluteWin && !isRootRelative && dynamicPropsRef.current.currentFilePath) {
          absolutePath = resolveRelativeImagePath(pureSrc, dynamicPropsRef.current.currentFilePath);
        } else if (
          !isAbsoluteWin &&
          !isRootRelative &&
          dynamicPropsRef.current.rootFolderPath &&
          dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME
        ) {
          const sep = dynamicPropsRef.current.rootFolderPath.includes('/') ? '/' : '\\';
          const folder = dynamicPropsRef.current.rootFolderPath.endsWith(sep)
            ? dynamicPropsRef.current.rootFolderPath
            : dynamicPropsRef.current.rootFolderPath + sep;
          absolutePath = folder + pureSrc;
        }

        let finalSrc = api ? absolutePath : pureSrc;
        if (pureSrc.startsWith('/api/image/')) {
          if (api || process.env.NODE_ENV === 'development') {
            finalSrc = `https://onrivi.com${pureSrc}`;
          } else {
            finalSrc = pureSrc;
          }
          if (queryString) {
            finalSrc += finalSrc.includes('?') ? '&' + queryString.substring(1) : queryString;
          }
        }

        let finalDisplayName = displayName || apiHref.split('/').pop()?.split('?')[0] || '동영상';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-zA-Z0-9]+)?$/i;
        if (uuidRegex.test(finalDisplayName)) {
          finalDisplayName = '로컬 첨부 동영상';
        }

        return (
          <figure
            data-line={videoDataLine}
            className="onrivi-video-figure"
            style={{ display: 'flex', flexDirection: 'column', width: '100%', clear: 'both' }}
          >
            <AsyncVideo
              src={finalSrc}
              absolutePath={absolutePath}
              rootFolder={dynamicPropsRef.current.rootFolder}
              resourceFolderHandle={dynamicPropsRef.current.resourceFolderHandle}
              workspaceType={dynamicPropsRef.current.workspaceType}
              api={api}
              queryString={queryString}
            />
            <figcaption
              className="text-[0.88em] text-zinc-500 mt-1 font-medium text-center"
              style={{ textAlign: 'center', alignSelf: 'center' }}
            >
              {finalDisplayName}
            </figcaption>
          </figure>
        );
      }

      const handleExternalLinkClick = (e: React.MouseEvent) => {
        let targetUrl = apiHref || href || '';
        if (targetUrl.startsWith('www.')) {
          targetUrl = `https://${targetUrl}`;
        }
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
        if (
          api?.openExternal &&
          targetUrl &&
          (targetUrl.startsWith('http://') ||
            targetUrl.startsWith('https://') ||
            targetUrl.startsWith('mailto:') ||
            targetUrl.startsWith('tel:'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          api.openExternal(targetUrl);
        } else if (
          api?.openPath &&
          targetUrl &&
          (targetUrl.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(targetUrl))
        ) {
          e.preventDefault();
          e.stopPropagation();
          const cleanLocalPath = targetUrl.startsWith('file:///')
            ? decodeURIComponent(targetUrl.replace(/^file:\/\/\//, ''))
            : targetUrl;
          api.openPath(cleanLocalPath);
        }
      };

      return (
        <a
          href={apiHref?.startsWith('www.') ? `https://${apiHref}` : apiHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleExternalLinkClick}
          {...props}
        >
          {children}
        </a>
      );
    },

    th: TableHeaderCell,

    table: ({ node, children, className, ...props }: any) => {
      const hasMerge = node?.children?.some((child: any) => {
        const checkRows = (rows: any[]) => rows?.some((tr: any) =>
          tr?.children?.some((cell: any) => {
            const props = cell?.properties || {};
            return props.colSpan || props.rowSpan || props.colspan || props.rowspan;
          })
        );
        if (child.tagName === 'tr') return checkRows([child]);
        if (child.tagName === 'tbody' || child.tagName === 'thead') return checkRows(child.children);
        return false;
      });
      const layoutClass = hasMerge ? 'table-auto min-w-full' : 'table-fixed w-full';
      return (
        <TableWrapper
          widths={hasMerge ? null : ratiosBeforeTable(
            processedContent,
            node?.position?.start?.offset,
            node?.children?.[0]?.children?.[0]?.children?.length || node?.children?.[0]?.children?.length || 0
          )}
        >
          <table className={`${layoutClass} !m-0 !mt-0 !mb-0 ${className || ''}`} {...props}>
            {children}
          </table>
        </TableWrapper>
      );
    },

    tr: ({ node, children, className, ...props }: any) => {
      const line = extractDataLine(props, node);
      return (
        <tr data-line={line} className={className} {...props}>
          {children}
        </tr>
      );
    },

    div: ({ node, className, children, align, style, ...props }: any) => {
      const alignVal = align || (node?.properties && node.properties.align);
      const alignStyle = alignVal ? { textAlign: alignVal as any } : undefined;
      return (
        <div className={className} align={alignVal} style={{ ...alignStyle, ...style }} {...props}>
          {children}
        </div>
      );
    },

    style: ({ node: _node, children, ...props }: any) => {
      const cssText = getTextFromChildren(children);
      return <style dangerouslySetInnerHTML={{ __html: cssText }} {...props} />;
    },

    br: ({ node: _node, ...props }: any) => <span className="onrivi-sentence-br" {...props} />,
    pre: ({ node: _node, children }: any) => <div className="not-prose">{children}</div>,

    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\S+)/.exec(className || '');
      const lang = match ? match[1] : '';
      const properties = node?.properties || {};
      const isBlock = properties['data-code-block'] === 'true' || properties.dataCodeBlock === 'true';
      const rawInfo = String(properties['data-code-info'] ?? properties.dataCodeInfo ?? lang);
      const title = String(properties['data-code-title'] ?? properties.dataCodeTitle ?? rawInfo);
      const codeContent = String(
        properties['data-code-text'] ?? properties.dataCodeText ?? getTextFromChildren(children).replace(/\n$/, '')
      );
      const isInline = !isBlock && (inline || (!match && !codeContent.includes('\n')));
      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[0.9em] bg-zinc-200/80 dark:bg-zinc-700/90 text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            {...props}
          >
            {children}
          </code>
        );
      }
      if (lang === 'mermaid') {
        return <MermaidBlock code={codeContent} dataLine={extractDataLine(props, node)} />;
      }
      if (lang === 'math' || lang === 'latex') {
        return <MathBlock code={codeContent} dataLine={extractDataLine(props, node)} />;
      }
      return (
        <CodeBlock
          lang={lang}
          title={title}
          rawInfo={rawInfo}
          code={codeContent}
          className={className}
          node={node}
          lineMap={dynamicPropsRef.current.lineMap}
          {...props}
        >
          {children}
        </CodeBlock>
      );
    },

    h1: ({ node, children, style, ...props }: any) => {
      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      return (
        <h1
          data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? 'true' : undefined}
          id={origLine ? `toc-line-${origLine}` : undefined}
          style={{ ...style, ...getIndentStyle(node) }}
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ node, children, style, ...props }: any) => {
      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      return (
        <h2
          data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? 'true' : undefined}
          id={origLine ? `toc-line-${origLine}` : undefined}
          style={{ ...style, ...getIndentStyle(node) }}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ node, children, style, ...props }: any) => {
      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      return (
        <h3
          data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? 'true' : undefined}
          id={origLine ? `toc-line-${origLine}` : undefined}
          style={{ ...style, ...getIndentStyle(node) }}
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ node, children, style, ...props }: any) => {
      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      return (
        <h4
          data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? 'true' : undefined}
          id={origLine ? `toc-line-${origLine}` : undefined}
          style={{ ...style, ...getIndentStyle(node) }}
          {...props}
        >
          {children}
        </h4>
      );
    },
    h5: ({ node, children, style, ...props }: any) => {
      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      return (
        <h5
          data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? 'true' : undefined}
          id={origLine ? `toc-line-${origLine}` : undefined}
          style={{ ...style, ...getIndentStyle(node) }}
          {...props}
        >
          {children}
        </h5>
      );
    },
    h6: ({ node, children, style, ...props }: any) => {
      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      return (
        <h6
          data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? 'true' : undefined}
          id={origLine ? `toc-line-${origLine}` : undefined}
          style={{ ...style, ...getIndentStyle(node) }}
          {...props}
        >
          {children}
        </h6>
      );
    },

    iframe: ({ node, style, className, ...props }: any) => {
      const line = extractDataLine(props, node);
      const align = props['data-align'] || (node?.properties && (node.properties['data-align'] || node.properties.dataAlign));
      const alignStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        clear: 'both',
        marginTop: '0.75rem',
        marginBottom: '1.25rem',
      };
      if (align === 'left') {
        alignStyle.alignItems = 'flex-start';
      } else if (align === 'right') {
        alignStyle.alignItems = 'flex-end';
      } else if (align === 'center') {
        alignStyle.alignItems = 'center';
      }
      const src = props.src || (node?.properties && node.properties.src) || '';
      const isMap = typeof src === 'string' && (src.includes('map') || src.includes('google.com/maps'));
      const wrapperClass = isMap ? 'onrivi-map-wrapper map-embed-wrapper' : 'onrivi-iframe-wrapper';
      const figureClass = isMap ? 'onrivi-map-figure' : 'onrivi-iframe-figure';

      return attachMediaActions(
        isMap ? 'map' : 'video',
        src,
        node,
        <figure data-line={line} style={alignStyle} className={figureClass}>
          <div
            className={`relative flex flex-col ${wrapperClass}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: alignStyle.alignItems,
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <iframe
              {...props}
              className={`rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 max-w-full ${className || ''}`}
              style={{ ...style, maxWidth: '100%' }}
              loading="lazy"
            />
          </div>
        </figure>
      );
    },

    input: ({ node: _node, ...props }: any) => {
      const importedId = props['data-import-checkbox'];
      if (!importedId) return <input {...props} />;
      return (
        <input
          {...props}
          disabled={false}
          checked={!!props.checked}
          onChange={e => dynamicPropsRef.current.onCheckboxToggle?.(0, e.target.checked, importedId)}
          style={{ ...props.style, cursor: 'pointer', verticalAlign: 'middle', marginRight: '0.25em' }}
        />
      );
    },

    p: ({ node, children, style, align, ...props }: any) => {
      if (!children) return <p />;
      const alignVal = align || (node?.properties && node.properties.align);
      const alignStyle = alignVal ? { textAlign: alignVal as any } : undefined;
      const combinedStyle = alignStyle ? { ...alignStyle, ...style } : style;
      const hasBlockMedia = (function check(n: any): boolean {
        if (!n) return false;
        if (n.tagName === 'img' || n.tagName === 'video' || n.tagName === 'iframe') return true;
        if (n.tagName === 'a') {
          const href = n.properties?.href;
          if (
            typeof href === 'string' &&
            (href.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/) ||
              /(tiktok\.com|instagram\.com\/(p|reel|tv)\/|vimeo\.com|twitch\.tv|dailymotion\.com)/i.test(href) ||
              /\.(mp4|webm|ogg|mov|avi|mkv)(\?|#|$)/i.test(href))
          ) {
            return true;
          }
        }
        if (!n.children) return false;
        return n.children.some(check);
      })(node);

      if (hasBlockMedia) {
        return (
          <div style={combinedStyle} align={alignVal} {...props} className="my-2">
            {children}
          </div>
        );
      }
      return (
        <p style={combinedStyle} align={alignVal} {...props}>
          {children}
        </p>
      );
    },

    ul: ({ node, children, style, ...props }: any) => {
      const line = extractDataLine(props, node);
      const storedIndent = (props as any)['data-onrivi-list-indent'];
      const listIndentStyle =
        storedIndent === undefined ? {} : { marginLeft: Math.max(0, Math.min(4096, Number(storedIndent) || 0)) };
      return (
        <ul data-line={line} style={{ ...style, ...listIndentStyle }} {...props}>
          {children}
        </ul>
      );
    },

    ol: ({ node, children, style, start, ...props }: any) => {
      const line = extractDataLine(props, node);
      const storedIndent = (props as any)['data-onrivi-list-indent'];
      const listIndentStyle =
        storedIndent === undefined ? {} : { marginLeft: Math.max(0, Math.min(4096, Number(storedIndent) || 0)) };
      return (
        <ol start={start} data-line={line} style={{ ...style, ...listIndentStyle }} {...props}>
          {children}
        </ol>
      );
    },

    li: ({ node, children, style, ...props }: any) => {
      const textContent = getTextFromChildren(children).trim();
      const hasChildList =
        node.children && node.children.some((c: any) => c.type === 'element' && (c.tagName === 'ul' || c.tagName === 'ol'));
      const hasEmptyRowSpan = Boolean(
        (typeof props.className === 'string' && props.className.includes('onrivi-empty-list-row')) ||
        (node.children && node.children.some((c: any) =>
          c.tagName === 'span' && (
            (typeof c.properties?.className === 'string' && c.properties.className.includes('onrivi-empty-list-row')) ||
            (Array.isArray(c.properties?.className) && c.properties.className.includes('onrivi-empty-list-row'))
          )
        ))
      );
      const isEmptyRow = !hasChildList && (textContent.replace(/\s+/g, '') === 'onrivi-empty-row' || hasEmptyRowSpan);

      if (isEmptyRow) {
        const liStyle = {
          ...style,
          listStyleType: 'none',
          listStyle: 'none',
          height: '0',
          maxHeight: '0',
          lineHeight: '0',
          overflow: 'hidden',
          background: 'transparent',
          margin: '0',
          padding: '0',
          display: 'none',
          pointerEvents: 'none',
        } as React.CSSProperties;

        return <li style={liStyle} className="onrivi-empty-list-row" aria-hidden="true" {...props} />;
      }

      const line = node?.position?.start?.line;
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const origLine = line ? currentLineMap[line - 1] || line : undefined;
      const dataLineVal = extractDataLine(props, node) || origLine;

      let explicitValue = props.value ?? (node?.properties?.value ? Number(node.properties.value) : undefined);
      if (explicitValue === undefined && dataLineVal) {
        const targetContent = originalContentRef.current || contentRef.current;
        if (targetContent && typeof targetContent === 'string') {
          const lines = targetContent.split(/\r?\n/);
          const lineText = lines[dataLineVal - 1] || '';
          const match = lineText.match(/^(?:[ \t]*>+[ \t]?)*[ \t]*(\d+)\.(?:\s+|$)/);
          if (match) {
            explicitValue = parseInt(match[1], 10);
          }
        }
      }

      const modifiedChildren = React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === 'input' && (child.props as any).type === 'checkbox') {
          return React.cloneElement(child as React.ReactElement<any>, {
            disabled: false,
            className:
              'w-4 h-4 rounded border-emerald-500/20 text-emerald-600 focus:ring-emerald-500 cursor-pointer mr-2 align-middle',
            onChange: (e: any) => {
              if (dataLineVal && dynamicPropsRef.current.onCheckboxToggle) {
                dynamicPropsRef.current.onCheckboxToggle(dataLineVal, e.target.checked);
              }
            },
          });
        }
        return child;
      });

      const { value: _discardedValue, ...restProps } = props;
      const listDepth = Number(node?.properties?.['data-list-depth'] || (props as any)['data-list-depth'] || 1);
      const indentStyle = listDepth >= 2 ? {} : getIndentStyle(node);
      return (
        <li
          data-line={dataLineVal}
          value={explicitValue}
          style={{ ...style, ...indentStyle }}
          className={props.className}
          {...restProps}
        >
          {modifiedChildren}
        </li>
      );
    },

    blockquote: ({ node, children, style, ...props }: any) => {
      const storedIndent = (props as any)['data-onrivi-quote-indent'];
      const quoteIndentStyle =
        storedIndent === undefined ? {} : { marginLeft: Math.max(0, Math.min(4096, Number(storedIndent) || 0)) };

      let alertType: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION' | null = null;
      let rawTagString = '';
      let processedChildren = children;

      const KOREAN_ALERT_MAP: Record<string, 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'> = {
        NOTE: 'NOTE',
        참고: 'NOTE',
        참조: 'NOTE',
        메모: 'NOTE',
        알림: 'NOTE',
        TIP: 'TIP',
        팁: 'TIP',
        도움말: 'TIP',
        IMPORTANT: 'IMPORTANT',
        중요: 'IMPORTANT',
        필독: 'IMPORTANT',
        WARNING: 'WARNING',
        주의: 'WARNING',
        CAUTION: 'CAUTION',
        경고: 'CAUTION',
        위험: 'CAUTION',
      };

      const ALERT_TAG_PATTERN =
        '(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)';
      const alertRegex = new RegExp(`^\\[!(${ALERT_TAG_PATTERN})\\]`, 'i');
      const removeRegex = new RegExp(`\\[!(${ALERT_TAG_PATTERN})\\]`, 'i');

      const findFirstText = (n: any): string | null => {
        if (!n) return null;
        if (typeof n === 'string') {
          const cleaned = n.replace(/^[\s\u00a0\u200b]+|^(?:&nbsp;)+/g, '').trim();
          return cleaned.length > 0 ? cleaned : null;
        }
        if (Array.isArray(n)) {
          for (const c of n) {
            const t = findFirstText(c);
            if (t) return t;
          }
          return null;
        }
        if (React.isValidElement(n)) {
          return findFirstText((n.props as any)?.children);
        }
        return null;
      };

      const firstText = findFirstText(children);
      if (firstText) {
        const match = firstText.match(alertRegex);
        if (match) {
          rawTagString = match[1];
          const upperKey = rawTagString.toUpperCase();
          alertType = KOREAN_ALERT_MAP[upperKey] || KOREAN_ALERT_MAP[rawTagString] || null;

          let tagRemoved = false;
          const removeTag = (n: any): any => {
            if (tagRemoved || !n) return n;
            if (typeof n === 'string') {
              const tagMatch = n.match(removeRegex);
              if (tagMatch) {
                tagRemoved = true;
                const idx = n.indexOf(tagMatch[0]);
                const before = n.substring(0, idx);
                const after = n
                  .substring(idx + tagMatch[0].length)
                  .replace(/^[\s\u00a0\u200b]+|^(?:&nbsp;)+/g, '')
                  .trimStart();
                return (before.trim() ? before : '') + after;
              }
              return n;
            }
            if (Array.isArray(n)) {
              return n.map(c => removeTag(c));
            }
            if (React.isValidElement(n)) {
              const ch: any = (n.props as any)?.children;
              if (ch === undefined || ch === null) return n;
              const newChild = removeTag(ch);
              return React.cloneElement(n, {}, ...(Array.isArray(newChild) ? newChild : [newChild]));
            }
            return n;
          };

          const isNodeEmpty = (n: any): boolean => {
            if (n === null || n === undefined || n === false) return true;
            if (typeof n === 'string') {
              const cleaned = n.replace(/[\s\u00a0\u200b]+/g, '').replace(/^(?:&nbsp;)+/g, '');
              return cleaned.length === 0;
            }
            if (Array.isArray(n)) {
              return n.length === 0 || n.every(isNodeEmpty);
            }
            if (React.isValidElement(n)) {
              if (n.type === 'br' || (n.props as any)?.tagName === 'br') return true;
              return isNodeEmpty((n.props as any)?.children);
            }
            return false;
          };

          const pruneLeadingEmptyNodes = (n: any): any => {
            if (!n) return n;
            if (Array.isArray(n)) {
              let firstNonEmpty = -1;
              for (let i = 0; i < n.length; i++) {
                if (!isNodeEmpty(n[i])) {
                  firstNonEmpty = i;
                  break;
                }
              }
              if (firstNonEmpty === -1) return [];
              const prunedFirst = pruneLeadingEmptyNodes(n[firstNonEmpty]);
              const rest = n.slice(firstNonEmpty + 1);
              return [prunedFirst, ...rest];
            }
            if (React.isValidElement(n)) {
              const ch: any = (n.props as any)?.children;
              if (ch === undefined || ch === null) return n;
              const pruned = pruneLeadingEmptyNodes(ch);
              return React.cloneElement(n, {}, ...(Array.isArray(pruned) ? pruned : [pruned]));
            }
            return n;
          };

          const rawCleaned = removeTag(children);
          processedChildren = pruneLeadingEmptyNodes(rawCleaned);
        }
      }

      if (alertType) {
        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawTagString);
        const titleMap: Record<'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION', string> = {
          NOTE: isKorean ? rawTagString : 'Note',
          TIP: isKorean ? rawTagString : 'Tip',
          IMPORTANT: isKorean ? rawTagString : 'Important',
          WARNING: isKorean ? rawTagString : 'Warning',
          CAUTION: isKorean ? rawTagString : 'Caution',
        };
        const alertStyles = {
          NOTE: {
            border: 'border-blue-500 dark:border-blue-400',
            bg: 'bg-blue-50/90 dark:bg-blue-950/40',
            text: 'text-blue-700 dark:text-blue-300',
            icon: 'ℹ️',
            title: titleMap.NOTE,
          },
          TIP: {
            border: 'border-emerald-500 dark:border-emerald-400',
            bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
            text: 'text-emerald-700 dark:text-emerald-300',
            icon: '💡',
            title: titleMap.TIP,
          },
          IMPORTANT: {
            border: 'border-purple-500 dark:border-purple-400',
            bg: 'bg-purple-50/90 dark:bg-purple-950/40',
            text: 'text-purple-700 dark:text-purple-300',
            icon: '📢',
            title: titleMap.IMPORTANT,
          },
          WARNING: {
            border: 'border-amber-500 dark:border-amber-400',
            bg: 'bg-amber-50/90 dark:bg-amber-950/40',
            text: 'text-amber-700 dark:text-amber-300',
            icon: '⚠️',
            title: titleMap.WARNING,
          },
          CAUTION: {
            border: 'border-rose-500 dark:border-rose-400',
            bg: 'bg-rose-50/90 dark:bg-rose-950/40',
            text: 'text-rose-700 dark:text-rose-300',
            icon: '🛑',
            title: titleMap.CAUTION,
          },
        }[alertType];

        return (
          <div
            style={{ ...style, ...getIndentStyle(node), ...quoteIndentStyle }}
            ref={element => {
              if (!element) return;
              if (storedIndent !== undefined) {
                element.style.setProperty('margin-left', quoteIndentStyle.marginLeft + 'px', 'important');
              }
              const backgrounds = {
                NOTE: '#eff6ff',
                TIP: '#ecfdf5',
                IMPORTANT: '#faf5ff',
                WARNING: '#fffbeb',
                CAUTION: '#fff1f2',
              };
              element.style.setProperty('background-color', backgrounds[alertType], 'important');
            }}
            className={`onrivi-alert-box my-4 border-l-4 rounded-r-lg ${alertStyles.border} ${alertStyles.bg} p-4 shadow-xs`}
            {...(props as any)}
          >
            <div className="onrivi-alert-title flex items-center gap-2 font-bold mb-1.5 text-sm tracking-wide uppercase text-inherit">
              <span className="text-base">{alertStyles.icon}</span>
              <span>{alertStyles.title}</span>
            </div>
            <div className="onrivi-alert-content text-zinc-800 dark:text-zinc-100 font-medium text-[0.95em] leading-relaxed [&>p:first-child]:!mt-0 [&>p:last-child]:!mb-0">
              {processedChildren}
            </div>
          </div>
        );
      }

      return (
        <blockquote
          ref={element => {
            if (element && storedIndent !== undefined) {
              element.style.setProperty('margin-left', quoteIndentStyle.marginLeft + 'px', 'important');
            }
          }}
          style={{ ...style, ...getIndentStyle(node), ...quoteIndentStyle }}
          className="p-4 rounded-r-lg border-l-4 border-zinc-500 dark:border-zinc-600 bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 font-normal not-italic"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
  };
}
