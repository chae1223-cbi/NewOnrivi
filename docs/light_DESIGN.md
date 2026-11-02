---
name: Technical Editor System
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#414755'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#9e3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c64f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  editor-main:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  ui-body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  ui-label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
  ui-label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  sidebar-width: 260px
  editor-max-width: 800px
---

## Brand & Style

The design system is engineered for high-performance writing and technical documentation. It targets developers and technical writers who require a distraction-free environment that prioritizes content structure and legibility.

The style is **Corporate/Modern** with a focus on functional minimalism. It avoids decorative elements in favor of structural clarity. By utilizing a high-contrast palette and a rigid adherence to a grid, the design system evokes a sense of reliability and professional precision. The emotional response is one of "focused calm"—providing a digital space where the tools recede and the user's thought process takes center stage.

## Colors

The color palette is strictly functional. The **Primary Blue (#007AFF)** is reserved for active states, primary actions, and syntax highlights that require immediate attention. 

The neutral palette utilizes **Deep Charcoal (#212529)** for primary text to ensure maximum contrast against the **Pure White (#FFFFFF)** editor surface. **Light Slate Gray (#F1F3F5)** is used to define the boundaries of the workspace, specifically for sidebars and toolbars, creating a clear mental model of "Navigation vs. Creation" areas. Accent borders in **#DEE2E6** provide structural definition without adding visual weight.

## Typography

The typography strategy employs a dual-font approach. **Inter** is used for all UI elements (menus, labels, buttons) to ensure a modern, clean interface. **JetBrains Mono** is utilized exclusively for the Markdown editor to provide the necessary monospaced precision for technical writing and code blocks.

For the Korean interface, line heights are slightly increased (1.5x to 1.6x) to ensure Hangul characters maintain clarity and don't appear cramped. All UI labels must be in Korean (e.g., "새 파일", "설정", "미리보기"). Placeholder text should follow a polite but direct tone (e.g., "여기에 내용을 입력하세요").

## Layout & Spacing

The layout follows a **Fixed-Fluid model**. A fixed left sidebar (260px) manages file navigation and global actions, while the main editor surface is fluid but constrained to a maximum content width of 800px to maintain optimal line lengths for reading.

A strictly linear 8px (0.5rem) grid governs all spacing. Margins and gutters are consistently applied at 16px (md) or 24px (lg) intervals. On mobile devices, the sidebar collapses into a hidden drawer, and the editor expands to fill the full viewport width with a minimum horizontal margin of 16px.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to convey depth. 

The editor surface is the highest conceptual layer, appearing white and crisp. Sidebars and toolbars are "recessed" using the slate gray background. Overlays, such as command palettes or context menus, use a single, soft ambient shadow (0px 4px 12px rgba(0,0,0,0.08)) and a 1px border (#DEE2E6) to separate them from the workspace. This approach keeps the interface flat and lightweight, reducing cognitive load.

## Shapes

The shape language is defined as **Soft (0.25rem)**. This subtle rounding of buttons, input fields, and panel corners humanizes the technical environment without compromising its professional, structured feel. 

Larger containers like modals may use a `rounded-lg` (0.5rem) treatment to emphasize their separation from the main grid, while small UI tags or chips utilize the same 0.25rem radius for consistency.

## Components

### Buttons
- **Primary:** Background #007AFF, Text #FFFFFF. Label: "저장하기" (Save) or "게시" (Publish).
- **Secondary/Ghost:** Background transparent, Border #DEE2E6, Text #212529. Label: "취소" (Cancel).

### Input Fields
- UI inputs use a #F8F9FA background with a #DEE2E6 border. On focus, the border transitions to #007AFF with a subtle 2px glow.
- Placeholder text in Korean: "검색어를 입력하세요..." (Enter search term...).

### Sidebars & Lists
- File list items use a #212529 text color. Active items receive a #007AFF left-border indicator (3px width) and a subtle #E9ECEF background highlight.

### Markdown Editor
- The editor must support syntax highlighting using the Primary Blue for links and bold text. 
- The line numbers and gutter area use #ADB5BD (muted gray) to stay unobtrusive.

### Tooltips
- Small, dark tooltips (#212529) with white Korean text for icon-only actions (e.g., "굵게", "기울임꼴").