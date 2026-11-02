# [통합 디자인 시스템 및 아키텍처 명세서]
## Onrivi Author — Modern Technical Editorial Edition

**문서 ID:** `ONRIVI-DS-SYSTEM-003`  
**버전:** `v6.0 (Modern Technical Editorial Edition)`  
**상태:** Official Development Specification  
**적용 범위:** Public SaaS Surface (Landing, Auth, Marketing), Document Author Canvas (Editor, Toolbar, Live Preview), Knowledge Engine Hub (KUI-001 ~ KUI-012), Markdown Content Isolation

---

# 1. Brand & Style

This design system synthesizes institutional trust, developer-first editorial clarity, and high-velocity SaaS execution into a unified product language. It powers three distinct surfaces under a single coherent identity:
1. **Public SaaS Surface**: Conversion-oriented, authoritative, and welcoming.
2. **Document Author Canvas**: Distraction-free, cognitively quiet, where chrome recedes and documents are hero objects.
3. **Knowledge Engine Hub**: Data-dense, engineered precision with hairline dividers and tabular alignment.

### Personality & Tone
- **Authoritative yet Approachable**: The visual foundation projects the rock-solid reliability of an enterprise knowledge repository, tempered by human, tactile editorial touches.
- **Cognitively Quiet**: The interface recedes to let authoring, reading, and structured thinking take center stage. Chrome is quiet; documents are hero objects.
- **Engineered Precision**: Every hairline divider, tabular data point, and code segment communicates mathematical rigor and zero visual debt.

---

# 2. 3대 책임 영역 분리 철학

```
+-------------------------------------------------------------------------+
| 1. Application UI Scope (Modern Technical Editorial Standard)            |
|    - Landing Page, Editor Shell, Sidebar (LNB), MenuBar (GNB), Modals  |
|    - Tokens: Cobalt Authority (#1d4ed8), Teal (#0d9488), Coral (#f97316)|
|    - 4/8/12/16/9999px Radii, 4-tier Elevation                          |
+-------------------------------------------------------------------------+
| 2. Content Document Scope (.onrivi-content-root, .custom-preview-container)|
|    - h1~h6, p, ul, ol, table, img, code, blockquote                     |
|    - Pure CSS Profile & User Custom CSS Isolation                       |
|    - Strict Prohibition: globals.css 직접 마크다운 스타일링 절대 금지   |
+-------------------------------------------------------------------------+
| 3. Editor <-> Preview Sync Engine (Geometry-based)                      |
|    - Line Height & DOM Geometry Only                                    |
|    - Safe Zone (Top 40px, Bottom 140px), Minimal Delta, Scroll Clamp   |
|    - Single Entry Point: syncPreviewInterpolated()                      |
+-------------------------------------------------------------------------+
```

---

# 3. Color Palette Architecture

| Role | Color Name | Hex Token | RGB Token | Semantic Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | **Cobalt Authority** | `#1d4ed8` | `29 78 216` | Core navigation bars, primary interactive triggers, focused outlines, verified product claims. Hover: `#1e40af`, glow `0 4px 12px rgba(29,78,216,0.2)`. Active highlight in dense data: `#2563eb` (Cobalt 600). |
| **Secondary** | **Intelligence Teal** | `#0d9488` | `13 148 136` | AI processing signals, autonomous summarization flags, vector search nodes, knowledge graph links. BG tint: `#f0fdfa`, border: `#99f6e4`, text: `#0f766e`, badge: `#ccfbf1`. |
| **Tertiary** | **Kinetic Coral** | `#f97316` | `249 115 22` | Real-time collaborative cursors, primary conversion CTAs, break-glass alerts, version diff highlights. Badge: `#ffedd5` bg, `#c2410c` text. |
| **Canvas Base** | Editorial Light / Dark | `#f8fafc` / `#f1f5f9` (Light)<br>`#090d16` / `#0f172a` (Dark) | Soft non-glare editorial base that eliminates eye strain during multi-hour writing/reading sessions. |
| **Document Card** | Pure White / Deep Slate | `#ffffff` (Light)<br>`#0f172a` (Dark) | Crisp pure-white surfaces elevated slightly above the base canvas to establish primary cognitive focus. |
| **Deep Stage** | Dark Containers | `#0f172a` / `#1e293b` | Code blocks, terminal outputs, persistent navigation shells, marketing footer. |
| **Hairline Borders** | Sub-pixel dividers | `#e2e8f0` / `#cbd5e1` (Light)<br>`#334155` / `rgba(255,255,255,0.08)` (Dark) | Sub-pixel border clarity maintaining dense institutional legibility. |
| **Functional States** | Success / Warn / Error | Success `#059669`<br>Warning `#d97706`<br>Error `#dc2626` | Stable/auto-saved, conflict/unindexed, syntax/network errors. |

---

# 4. Typography Cascade & Fallback

The typographic hierarchy is engineered to excel across both Latin and Hangul (Korean) scripts. Plus Jakarta Sans handles expressive display headings and landing page narratives, lending warm geometric precision. Inter serves as the workhorse for dense document paragraphs, UI labels, and administrative tables.

### Unified Cascade Rule
- **Headlines & Expressive Display**:
  `"Plus Jakarta Sans", "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
- **Body, UI Labels & Administrative Tables**:
  `"Inter", "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`
- **Code & Monospace**:
  `"JetBrains Mono", Consolas, monospace` at 13px/20px with subtle slate-900 background tint.

### Editorial Document Rhythms
- **Paragraph Spacing**: Document body copy (body-lg) maintains a relaxed line-height of `26px` with a `16px` bottom margin to foster immersive, long-form reading.
- **Tabular Figures**: Data tables, document metadata counters, word/character tallies, and timestamps enforce `font-feature-settings: "tnum" 1` for rigid vertical alignment.
- **Code Blocks**: Monospace fragments use JetBrains Mono at 13px/20px with a subtle slate-900 background tint for zero syntax ambiguity.

---

# 5. Layout & Spacing (Dual-Canvas System)

The layout model uses an adaptable dual-canvas system:
- **Public & Dashboard Canvas**: Standard 12-column fluid grid. Max container boundary caps at `1280px` for high-density administrative monitors. Gutter sizes scale from `1rem` on mobile (<768px) to `1.5rem` on desktop (>=1024px).
- **Document Reading Canvas (Onrivi Author)**: Bound strictly to a calibrated measure of `768px` (`48rem`) centered on screen. Preserves the 65–75 character-per-line typographic standard, eliminating visual drift across wide displays.
- **Sidebar Stage**: Collapsible multi-tier navigation fixed at `260px` (primary library tree) and optional `320px` (contextual AI inspector / Table of Contents).

### Breakpoint Strategy
- **Mobile (< 768px)**: Single column. Margins compress to 1rem. Sidebars collapse into sliding off-canvas drawers. Action bars dock to the bottom viewport.
- **Tablet (768px – 1023px)**: 8-column layout. Workspace sidebars default to icon-only rail modes (64px).
- **Desktop (>= 1024px)**: Full 12-column grid. Split-pane Markdown editor supports side-by-side raw source and rendered live-preview without horizontal scrollbars.

---

# 6. Elevation & Depth (4-Tier Architectural Layering)

- **Tier 0 (Backdrop Canvas)**: Base environment (`#f8fafc` in light mode, `#090d16` in dark mode). Non-elevated, absorbs secondary noise.
- **Tier 1 (Surface Cards & Canvas)**: Pure white `#ffffff` with a crisp structural hairline (`border: 1px solid #e2e8f0`) and subtle ambient settling shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
- **Tier 2 (Floating Modals, Flyouts & Menus)**: Elevated popovers and markdown command palettes (Cmd+K) use high-diffusion ambient elevation: `0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` paired with an ultra-fine border (`#cbd5e1`).
- **Tier 3 (AI Insight Sheets & Floating Toolbars)**: Micro-frosted glass backdrop blur (`backdrop-filter: blur(12px)`) at `rgba(255, 255, 255, 0.85)` with a delicate brand-tinted border (`rgba(37, 99, 235, 0.15)`), visually signaling ambient machine assistance hovering above the document layer.

---

# 7. Dimensional Geometry

- **Micro & Dense Controls (4px - Sharp)**: Checkboxes, table cell status tags, inline code badges, and split-pane divider drag handles. Reflects mathematical rigor and operational efficiency.
- **Standard UI Elements (8px - Rounded)**: Text inputs, select dropdowns, standard buttons, context menus, and list hover states.
- **Containers & Surfaces (12px to 16px - Soft Structural)**: Document preview panels, knowledge graph cards, dashboard metric widgets, and modal dialogues.
- **Status & Categorical Badges (9999px - Full Pill)**: Metadata tags, version status indicators, document stage badges ("Draft", "Published", "Archived"), and marketing promotional chips.

---

# 8. Component Specifications

### 8.1 Buttons & Action Controls
- **Primary Action**: Solid cobalt background (`#1d4ed8`), crisp white text, 8px radius, height 40px (desktop) / 44px (mobile). Hover state transitions to `#1e40af` with an ambient glow (`0 4px 12px rgba(29, 78, 216, 0.2)`).
- **Secondary Action**: Transparent base, 1px hairline border (`#cbd5e1`), dark slate text (`#0f172a`). Hover shifts background to `#f1f5f9`.
- **Kinetic Action (Conversion/Highlight)**: Solid coral accent (`#f97316`) for primary marketing triggers and real-time publish commands.
- **AI Assist Action**: Soft teal tint background (`#f0fdfa`), border 1px solid `#99f6e4`, text `#0f766e`. Displays a subtle sparkle icon (16px) prefix.

### 8.2 Markdown Authoring Canvas (Onrivi Author)
- **Editor Chrome**: Stripped of unnecessary borders. Gutter displays muted line numbers (`#94a3b8`) with active line highlight (`#f8fafc`).
- **Inline Floating Markdown Toolbar**: Appears on text selection. Features a frosted background (`rgba(15, 23, 42, 0.9)`), bright white icons, 8px border-radius, offering instant formatting: H1, H2, Bold, Italic, Code, AI Elaborate.
- **Blockquote**: Left-hand 3px solid cobalt accent (`#2563eb`), background `#f8fafc`, padding 12px 16px, italicized gray typography.

### 8.3 Input Fields & Search Bars
- **Height & Padding**: Standard 40px height with 12px horizontal padding. Typography set to body-md (14px).
- **States**: Default border `#cbd5e1`. Focus invokes a sharp 2px ring in primary cobalt (`rgba(37, 99, 235, 0.2)`) with border color `#2563eb`. Placeholder text locked at `#94a3b8`.
- **Global Search (Cmd+K)**: Expands to an ambient elevated overlay with deep filter pills (All, Documents, Markdown Blocks, Authors, AI Summaries).

### 8.4 Cards & Knowledge Grid Tiles
- **Structure**: Solid white background (`#ffffff`), 12px radius, 1px border (`#e2e8f0`), padding space-lg (24px).
- **Header Section**: Houses document title, last synced timestamp (tabular numerals), and a full-pill status badge.
- **Hover Micro-interaction**: Subtle 2px upward visual float coupled with shadow elevation transition (`0 12px 24px -8px rgba(15, 23, 42, 0.06)`).

### 8.5 Badges & Category Chips
- **Geometry**: Height 22px, full pill radius (9999px), horizontal padding 8px, typography label-xs (11px, weight 600).
- **Taxonomy Tints**:
  - **AI Synthetic**: `#ccfbf1` background, `#0f766e` text.
  - **Active/Live**: `#ffedd5` background, `#c2410c` text.
  - **Institutional Trust**: `#dbeafe` background, `#1e40af` text.
  - **Neutral Metadata**: `#f1f5f9` background, `#475569` text.

### 8.6 Selection Controls (Checkbox & Radio)
- **Checkbox**: 16px x 16px box, 4px radius. Unchecked has a 1.5px solid border (`#cbd5e1`). Checked fills with `#1d4ed8` and displays a centered sharp white checkmark.
- **Radio**: 16px x 16px circle with concentric white ring and centered cobalt dot on selection. High keyboard focus visibility (`outline: 2px solid #2563eb; outline-offset: 2px`).

### 8.7 LNB 사이드바 메뉴 및 트리 아이템 하이라이트 표준 규칙
- **좌측 세로선 일체 금지**: 세로 인디케이터 바(`border-l`, `span.absolute`)는 사용하지 않습니다.
- **선택(Active) 상태**: 고대비 굵은 글씨 (`text-[#1d4ed8] dark:text-blue-400 font-extrabold`), 코발트 음영 라운드 칩 (`bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 shadow-xs rounded-lg`).
- **마우스 호버(Hover) 상태**: 볼드 텍스트 (`hover:text-black dark:hover:text-white font-bold`), 부드러운 그레이 음영 (`hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60 rounded-lg`).

### 8.8 조회 결과 데이터 및 파일 경로 고대비(High-Contrast) 시인성 표준
- **조회 결과 데이터 선명도 보장**: 시스템에서 조회된 모든 결과 데이터는 흐릿한 저대비 색상(`text-zinc-400`, `opacity-50` 이하)을 일체 사용하지 않고, 고대비 및 가독성이 확보된 색상(Light: `text-zinc-700` 이상 / Dark: `text-zinc-300` 이상, `font-medium` 또는 `font-bold`)으로 진하고 선명하게 렌더링합니다.
- **파일 경로(Path) 시인성 강화**: 파일 경로(`doc.filePath` 등)는 `text-zinc-700 dark:text-zinc-300 font-bold font-mono` 등 뚜렷한 명도 대비를 주어 가독성을 확보합니다.

### 8.9 미리보기 영역 사용자 정의 CSS 지원 (Content Document Scope)
- 마크다운 미리보기 영역(`.onrivi-content-root`, `.custom-preview-container`)은 CSS Profile 및 사용자가 직접 작성한 Custom CSS(서식 프로필의 `customCss`, 문서 Frontmatter의 `custom_css`, 마크다운 내부 `<style>`)가 실시간 격리 반영됩니다.


