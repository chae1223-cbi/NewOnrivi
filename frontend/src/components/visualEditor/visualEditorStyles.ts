// ====================================================================
// 🎨 [OMD-CORE-VisualEditorStyles-0001] visualEditorStyles.ts ➔ 시각 에디터 전용 격리 CSS 스타일
// 🎯 @KICK  : 시각 에디터 본문(.visual-document-surface), 제목 H1~H6 시각화 뱃지, 표 조판, 각주, 코드블록, 머메이드 서랍 등 위지윅 스타일 격리
// 🛡️ @GUARD : Rule 6(Content Document Scope) 준수 - .visual-document-surface 및 컴포넌트 하위로만 스코핑
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 2단계 모듈화 분리]: 인라인 360줄 스타일 문자열 독립 분리
// ====================================================================

export const VISUAL_EDITOR_STYLES = `
  .custom-preview-container:has(.visual-document-editor) { overflow-anchor:none!important; scroll-behavior:auto!important; }
  .visual-document-surface { caret-color:transparent; outline:none; min-height:360px; padding:28px; white-space:pre-wrap; overflow-wrap:anywhere; color:inherit; background:inherit; font-family:inherit; font-size:inherit; line-height:1.75; }
  .visual-document-surface > :first-child { margin-top:0!important; }
  .visual-document-surface a { color:#1d4ed8; text-decoration:underline; cursor:pointer; }
  .visual-citation { color:#1d4ed8; background:#eff6ff; border-radius:3px; }
  .visual-citation-missing { color:#b91c1c; text-decoration:underline wavy; }
  .visual-document-surface a:hover { color:#1e40af; text-decoration:underline; }
  .visual-document-surface ::selection,
  .visual-document-surface *::selection {
    background: #2563eb !important;
    color: #ffffff !important;
  }
  .dark .visual-document-surface ::selection,
  .dark .visual-document-surface *::selection {
    background: #3b82f6 !important;
    color: #ffffff !important;
  }
  .custom-preview-container .visual-document-surface :is(p,h1,h2,h3,h4,h5,h6,li > div),
  .onrivi-content-root .visual-document-surface :is(p,h1,h2,h3,h4,h5,h6,li > div),
  .visual-document-surface :is(p,h1,h2,h3,h4,h5,h6,li > div) { white-space:break-spaces!important; tab-size:inherit; }
  .visual-document-surface p { margin:0; }
  .visual-document-surface br.ProseMirror-trailingBreak { display:inline!important; content:normal!important; margin:0!important; height:auto!important; }
  .visual-document-surface > .visual-footnote-def + p:empty,
  .visual-document-surface > .visual-footnote-def ~ p:empty { display: none !important; }
  .visual-document-surface p:empty,
  .visual-document-surface p:has(>br.ProseMirror-trailingBreak:only-child) {
    min-height: 1em;
    cursor: text;
  }
  .visual-document-surface li { margin-top:0!important; margin-bottom: var(--li-margin-bottom, 6px); padding-top:0!important; padding-bottom:0!important; }
  .visual-document-surface li p { margin-top:0!important; margin-bottom:0!important; }
  .custom-preview-container .visual-document-surface li ul, .custom-preview-container .visual-document-surface li ol, .visual-document-surface li ul, .visual-document-surface li ol { margin-top:0!important; margin-bottom:0!important; padding-top:0!important; padding-bottom:0!important; }
  .visual-document-surface h1 { font-size:2em; font-weight:700; }
  .visual-document-surface h2 { font-size:1.5em; font-weight:700; }
  .visual-document-surface h3 { font-size:1.25em; font-weight:700; }
  .visual-document-surface h4 { font-size:1.1em; font-weight:700; }
  .visual-document-surface h5 { font-size:1em; font-weight:700; }
  .visual-document-surface h6 { font-size:0.9em; font-weight:700; }

  /* 🏷️ [문서보기 제목(H1~H6) 태그 시각화 뱃지 (Plan 2)] */
  .visual-document-surface[contenteditable="true"] :is(h1,h2,h3,h4,h5,h6) {
    position: relative;
  }
  .visual-document-surface[contenteditable="true"] :is(h1,h2,h3,h4,h5,h6)::after {
    position: absolute;
    left: -34px;
    top: 0.15em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 19px;
    box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    padding: 0 4px;
    border-radius: 4px;
    user-select: none;
    pointer-events: none;
    opacity: 0.92;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: opacity 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease;
  }
  .visual-document-surface[contenteditable="true"] :is(h1,h2,h3,h4,h5,h6):hover::after,
  .visual-document-surface[contenteditable="true"] :is(h1,h2,h3,h4,h5,h6):focus-within::after {
    opacity: 1;
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  .visual-document-surface[contenteditable="true"] h1::after { content: 'H1'; color: #1e40af; background: #dbeafe; border: 1.5px solid #60a5fa; }
  .visual-document-surface[contenteditable="true"] h2::after { content: 'H2'; color: #0f766e; background: #ccfbf1; border: 1.5px solid #2dd4bf; }
  .visual-document-surface[contenteditable="true"] h3::after { content: 'H3'; color: #6d28d9; background: #ede9fe; border: 1.5px solid #a78bfa; }
  .visual-document-surface[contenteditable="true"] h4::after { content: 'H4'; color: #92400e; background: #fef3c7; border: 1.5px solid #f59e0b; }
  .visual-document-surface[contenteditable="true"] h5::after { content: 'H5'; color: #334155; background: #e2e8f0; border: 1.5px solid #94a3b8; }
  .visual-document-surface[contenteditable="true"] h6::after { content: 'H6'; color: #475569; background: #f1f5f9; border: 1.5px solid #cbd5e1; }

  .dark .visual-document-surface[contenteditable="true"] h1::after { color: #dbeafe; background: #1e3a8a; border: 1.5px solid #3b82f6; }
  .dark .visual-document-surface[contenteditable="true"] h2::after { color: #ccfbf1; background: #134e4a; border: 1.5px solid #14b8a6; }
  .dark .visual-document-surface[contenteditable="true"] h3::after { color: #ede9fe; background: #4c1d95; border: 1.5px solid #8b5cf6; }
  .dark .visual-document-surface[contenteditable="true"] h4::after { color: #fef3c7; background: #78350f; border: 1.5px solid #d97706; }
  .dark .visual-document-surface[contenteditable="true"] h5::after { color: #f1f5f9; background: #334155; border: 1.5px solid #64748b; }
  .dark .visual-document-surface[contenteditable="true"] h6::after { color: #f8fafc; background: #1e293b; border: 1.5px solid #475569; }

  /* 인쇄 및 PDF 내보내기 시 완전 비표시 (100% 무결성 삼중 방어) */
  @media print {
    .visual-document-surface :is(h1,h2,h3,h4,h5,h6)::after,
    :is(h1,h2,h3,h4,h5,h6)::after {
      display: none !important;
      content: none !important;
      visibility: hidden !important;
    }
  }
  .picturebook-root .visual-document-surface :is(h1,h2,h3,h4,h5,h6)::after {
    display: none !important;
    content: none !important;
    visibility: hidden !important;
  }
  .visual-document-surface ul { padding-left:2em; list-style:disc; }
  .visual-document-surface ul, .visual-document-surface ol { padding-left: var(--list-indent, 2em); margin-top:0!important; margin-bottom:0!important; }
  /* Keep separate lists at the same gap as a normal list block. */
  .custom-preview-container .visual-document-surface > :is(ul,ol) + :is(ul,ol),
  .visual-document-surface > :is(ul,ol) + :is(ul,ol) { margin-top:4px!important; }

  .visual-document-surface ol { padding-left:2em; list-style:decimal; }
  .visual-document-surface blockquote { border-left:3px solid #93c5fd; padding-left:1em; }
  .visual-document-surface pre { background:#f4f4f5; padding:12px; white-space:pre-wrap; }
  .visual-document-surface .visual-code-block { margin-top:24px!important; margin-bottom:20px!important; min-width:0; max-width:100%; box-sizing:border-box; }
  .visual-document-surface .visual-code-editor-panel { min-width:0; max-width:100%; }
  .visual-document-surface .visual-code-block pre { display:block!important; max-width:100%!important; box-sizing:border-box!important; overflow-x:auto!important; white-space:pre!important; overflow-wrap:normal!important; word-break:normal!important; }
  .visual-document-surface .visual-code-block pre code { display:block!important; width:max-content!important; min-width:100%; white-space:pre!important; overflow:visible!important; overflow-wrap:normal!important; word-break:normal!important; }
  .visual-code-editor-panel > summary { width:max-content; margin:8px 12px; cursor:pointer; }
  .visual-code-editor-panel > summary[hidden] { display:none!important; }
  .visual-code-language button[aria-label="코드 내용 복사"] { margin-left:auto; }
  .visual-code-language button[hidden] { display:none!important; }
  .visual-document-surface .visual-code-language { display:flex!important; gap:10px; align-items:center; padding:10px 16px!important; margin:0!important; background:#eef2f7!important; border-bottom:1px solid #dbe2ea; font-family:system-ui,sans-serif!important; font-size:11px!important; line-height:1.4!important; font-weight:700; letter-spacing:.06em; color:#475569!important; }
  .visual-document-surface .visual-code-language input { background:#fff!important; color:#334155!important; border:1px solid #cbd5e1; border-radius:6px; padding:4px 8px!important; width:120px!important; max-width:60%; height:28px; box-sizing:border-box; font-family:system-ui,sans-serif!important; font-size:12px!important; line-height:18px!important; letter-spacing:0; }
  .visual-code-language input:focus { outline:2px solid #93c5fd; outline-offset:2px; }
  .visual-document-surface code { background:#f4f4f5; font-family:monospace; }
  .visual-document-surface .visual-code-block { background:#1e293b; color:#e2e8f0; border:1px solid #dbe2ea; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(15,23,42,.04); }
  .custom-preview-container .visual-document-surface .visual-code-block pre, .visual-document-surface .visual-code-block pre { background:transparent!important; color:inherit; margin:0!important; padding:18px 20px!important; white-space:pre; overflow-x:auto; line-height:1.65!important; }
  .custom-preview-container .visual-document-surface .visual-code-block code, .visual-document-surface .visual-code-block code { background:transparent!important; color:inherit; opacity:1; white-space:inherit; padding:0!important; font-family:"D2Coding","Cascadia Code",Consolas,monospace!important; line-height:inherit!important; letter-spacing:0!important; }
  .visual-image-block { position:relative; margin:16px 0; }
  .visual-media-controls { position:absolute; right:12px; top:12px; display:flex; gap:6px; z-index:20; opacity:0; pointer-events:none; }
  .visual-image-block:has([data-caption-position="top"]) .visual-media-controls,
  .visual-image-block:has(figcaption[data-position="top"]) .visual-media-controls { top:34px; }
  .visual-image-block:hover .visual-media-controls, .visual-image-block:focus-within .visual-media-controls { opacity:1; pointer-events:auto; }
  .visual-document-surface .onrivi-image-figure[data-caption-position="top"] img { margin-top:0!important; }
  .visual-document-surface .onrivi-image-figure[data-caption-position="bottom"] img { margin-bottom:0!important; }
  .visual-document-surface[contenteditable="false"] .visual-image-edit { display:none; }
  @media print { .visual-media-controls { display:none; } }
  @media (hover:none) { .visual-media-controls { opacity:1; pointer-events:auto; } }
  .visual-document-surface .visual-editable-table { border-collapse:collapse!important; width:100%!important; max-width:100%!important; table-layout:fixed!important; margin:16px 0!important; }
  .visual-document-surface .visual-editable-table :is(th, td) { position:relative; }
  .visual-document-surface .visual-editable-table :is(th, td):not(:last-child)::after,
  .visual-document-surface .visual-editable-table :is(th, td):not(:first-child)::before {
    content:'↔'; position:absolute; top:0; width:20px; height:100%; z-index:3;
    cursor:col-resize!important; opacity:0; color:#1d4ed8; font-size:18px; font-weight:700;
    display:flex; align-items:center; justify-content:center; text-shadow:0 1px #fff,0 -1px #fff;
  }
  .visual-document-surface .visual-editable-table :is(th, td):not(:last-child)::after { right:-10px; }
  .visual-document-surface .visual-editable-table :is(th, td):not(:first-child)::before { left:-10px; }
  .visual-document-surface .visual-editable-table :is(th, td):not(:last-child):hover::after,
  .visual-document-surface .visual-editable-table :is(th, td):not(:first-child):hover::before { opacity:1; }
  .visual-document-surface .visual-editable-table th, .visual-document-surface .visual-editable-table td { border:1px solid #cbd5e1!important; padding:8px 10px!important; min-width:0!important; vertical-align:top!important; overflow-wrap:anywhere!important; word-break:break-word!important; box-sizing:border-box!important; }
  .visual-document-surface table th p, .visual-document-surface table td p { margin:0!important; padding:0!important; overflow-wrap:anywhere!important; word-break:break-word!important; white-space:pre-wrap!important; }
  .visual-document-surface .visual-editable-table th { background:#f1f5f9!important; text-align:center!important; }
  .visual-document-surface .visual-editable-table :is(th, td) code { white-space:pre-wrap!important; overflow-wrap:anywhere!important; word-break:break-all!important; display:inline!important; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
  .dark .visual-document-surface .visual-editable-table th { background:#1e293b!important; color:#f1f5f9!important; border-color:#334155!important; }
  .dark .visual-document-surface .visual-editable-table td { border-color:#334155!important; }
  .custom-preview-container .visual-document-surface blockquote[data-alert-type], .onrivi-content-root .visual-document-surface blockquote[data-alert-type], .visual-document-surface blockquote[data-alert-type] { background:var(--alert-bg,#eff6ff)!important; border-left:4px solid var(--alert-border,#3b82f6)!important; padding:12px!important; border-radius:0 10px 10px 0; }
  .visual-document-surface blockquote[data-alert-type]::before { content:attr(data-alert-type); display:block; font-weight:700; color:inherit!important; margin-bottom:8px; }
  .visual-document-surface [data-alert-type="NOTE" i], .visual-document-surface [data-alert-type="참고" i], .visual-document-surface [data-alert-type="참조" i], .visual-document-surface [data-alert-type="메모" i], .visual-document-surface [data-alert-type="알림" i] { --alert-bg:#eff6ff; --alert-border:#3b82f6; --alert-text:#1d4ed8; }
  .visual-document-surface [data-alert-type="TIP" i], .visual-document-surface [data-alert-type="팁" i], .visual-document-surface [data-alert-type="도움말" i] { --alert-bg:#ecfdf5; --alert-border:#10b981; --alert-text:#047857; }
  .visual-document-surface [data-alert-type="IMPORTANT" i], .visual-document-surface [data-alert-type="중요" i], .visual-document-surface [data-alert-type="필독" i] { --alert-bg:#faf5ff; --alert-border:#a855f7; --alert-text:#7e22ce; }
  .visual-document-surface [data-alert-type="WARNING" i], .visual-document-surface [data-alert-type="주의" i] { --alert-bg:#fffbeb; --alert-border:#f59e0b; --alert-text:#b45309; }
  .visual-document-surface [data-alert-type="CAUTION" i], .visual-document-surface [data-alert-type="경고" i], .visual-document-surface [data-alert-type="위험" i] { --alert-bg:#fff1f2; --alert-border:#f43f5e; --alert-text:#be123c; }
  .visual-document-surface s { text-decoration:line-through; }
  .visual-source-block { position:relative; margin:12px 0; color:inherit; font-size:inherit; }
  .visual-source-block:hover .visual-media-controls, .visual-source-block:focus-within .visual-media-controls { opacity:1; pointer-events:auto; }
  .visual-source-block pre { max-height:none; overflow:auto; }
  .visual-source-block.visual-mermaid-container {
    margin: 1.5rem 0 !important;
    border: 1px solid rgba(228, 228, 231, 0.8) !important;
    border-radius: 0.5rem !important;
    overflow: hidden !important;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    background-color: #ffffff !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .dark .visual-source-block.visual-mermaid-container {
    border-color: rgba(51, 65, 85, 0.8) !important;
    background-color: #0f172a !important;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3) !important;
  }
  .visual-source-block.visual-mermaid-container .onrivi-media-actions-frame {
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background-color: transparent !important;
  }
  .visual-mermaid-editor {
    margin: 0 !important;
    border: none !important;
    border-top: 1px solid rgba(228, 228, 231, 0.8) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background-color: transparent !important;
  }
  .dark .visual-mermaid-editor {
    border-top-color: rgba(51, 65, 85, 0.8) !important;
  }
  .visual-mermaid-editor summary {
    list-style: none !important;
  }
  .visual-mermaid-editor summary::-webkit-details-marker {
    display: none !important;
  }
  .visual-mermaid-editor[open] .mermaid-chevron {
    transform: rotate(180deg);
  }
  @media print {
    .visual-mermaid-editor {
      display: none !important;
    }
  }
  .visual-mermaid-code-input {
    caret-color: #2563eb !important;
  }
  .dark .visual-mermaid-code-input {
    caret-color: #60a5fa !important;
  }
  .visual-document-surface textarea,
  .visual-document-surface input {
    caret-color: #2563eb !important;
  }
  .dark .visual-document-surface textarea,
  .dark .visual-document-surface input {
    caret-color: #60a5fa !important;
  }
  .visual-footnote-ref { color: #2563eb; font-weight: 600; text-decoration: none; cursor: pointer; }
  .visual-footnote-ref:hover { text-decoration: underline; }
  .visual-footnote-area-header {
    margin-top: 18px !important;
    margin-bottom: 6px !important;
    padding: 0 !important;
    user-select: none;
    white-space: normal !important;
  }
  .visual-footnote-area-header .visual-footnote-area-badge {
    display: inline-flex !important;
    align-items: center !important;
    gap: 3.5px !important;
    font-size: 11.5px !important;
    line-height: 1 !important;
    padding: 2.5px 7px !important;
    height: auto !important;
    min-height: 0 !important;
    white-space: nowrap !important;
  }
  .visual-footnote-area-header .visual-footnote-area-badge svg {
    width: 13px !important;
    height: 13px !important;
    min-width: 13px !important;
    margin: 0 !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
  }
  .visual-footnote-area-header .visual-footnote-area-title {
    font-size: 11.5px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    margin: 0 !important;
    padding: 0 !important;
    letter-spacing: -0.01em;
  }
  .visual-footnote-def-container,
  .visual-footnote-def {
    font-size: 12.5px !important;
    line-height: 1.55 !important;
    color: #475569;
    margin: 3px 0 !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .dark .visual-footnote-def { color: #94a3b8; }
  .visual-footnote-text { font-size: 12.5px !important; line-height: 1.55 !important; cursor: text; caret-color: #2563eb !important; }
  .dark .visual-footnote-text { caret-color: #60a5fa !important; }
  .visual-footnote-text:empty::before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
  .dark .visual-footnote-text:empty::before { color: #64748b; }
  .visual-footnote-badge { font-size: 12px !important; }
  .visual-footnote-jump-btn:hover { color: #2563eb; }
  .visual-footnote-delete-btn:hover { color: #ef4444; }
  .visual-readonly-content table { border-collapse:collapse; width:100%; }
  .visual-readonly-content th, .visual-readonly-content td { border:1px solid #d4d4d8; padding:8px; }
  .visual-readonly-content pre { max-height:none; overflow:auto; }
  .visual-readonly-callout { border-left:4px solid var(--alert-border,#3b82f6)!important; background:var(--alert-bg,#eff6ff)!important; padding:12px; }
  .visual-readonly-callout > strong { color:inherit; display:block; margin-bottom:8px; }
  .visual-readonly-caption { margin-top:8px; color:#71717a; font-size:11px; }
  .visual-document-surface .ProseMirror-selectednode { outline:2px solid #93c5fd; }
  .visual-document-surface hr { cursor: text; position: relative; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .visual-document-surface hr:hover { box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14); border-radius: 2px; }
  .visual-math-preview { margin: 8px 0; overflow-x: auto; display: flex; justify-content: center; }
  .visual-math-preview .visual-readonly-content pre,
  .visual-math-preview pre { display: none !important; }
  .visual-document-surface .onrivi-drop-line-highlight {
    background-color: rgba(29, 78, 216, 0.1) !important;
    outline: 2px dashed #1d4ed8 !important;
    outline-offset: 3px !important;
    border-radius: 6px !important;
    transition: background-color 0.08s ease, outline-color 0.08s ease !important;
  }
  .dark .visual-document-surface .onrivi-drop-line-highlight {
    background-color: rgba(56, 189, 248, 0.15) !important;
    outline: 2px dashed #38bdf8 !important;
  }
  @keyframes omd-visual-caret-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.18; }
  }
  .visual-drag-drop-caret {
    animation: omd-visual-caret-blink 0.85s infinite ease-in-out !important;
  }
  .visual-drag-drop-caret::before,
  .visual-drag-drop-caret::after {
    content: '';
    position: absolute;
    left: -4px;
    width: 11.5px;
    height: 2.5px;
    background: inherit;
    border-radius: 1.5px;
    box-shadow: inherit;
  }
  .visual-drag-drop-caret::before {
    top: -1.5px;
  }
  .visual-drag-drop-caret::after {
    bottom: -1.5px;
  }
  @keyframes omd-badge-pop {
    from { transform: translateX(-50%) translateY(0) scale(0.92); opacity: 0; }
    to { opacity: 1; }
  }
  .visual-drag-drop-badge {
    animation: omd-badge-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  .onrivi-inline-syntax-tag {
    font-family: var(--font-mono, 'JetBrains Mono', 'D2Coding', Consolas, monospace);
    font-size: 0.88em;
    font-weight: 700;
    color: #3b82f6;
    opacity: 0.85;
    user-select: none;
    pointer-events: none;
    display: inline;
    letter-spacing: -0.02em;
    margin: 0 1px;
    vertical-align: baseline;
  }
  .dark .onrivi-inline-syntax-tag {
    color: #60a5fa;
    opacity: 0.9;
  }
  @media print {
    .onrivi-inline-syntax-tag {
      display: none !important;
    }
  }
`;
