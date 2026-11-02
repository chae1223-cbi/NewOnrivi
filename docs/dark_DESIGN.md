---
name: MiniMD
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8b90a0'
  outline-variant: '#414755'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e69'
  primary-container: '#4b8eff'
  on-primary-container: '#00285c'
  inverse-primary: '#005bc1'
  secondary: '#b7c8e1'
  on-secondary: '#213145'
  secondary-container: '#3a4a5f'
  on-secondary-container: '#a9bad3'
  tertiary: '#ffb595'
  on-tertiary: '#571e00'
  tertiary-container: '#ef6719'
  on-tertiary-container: '#4c1a00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  ui-header:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  ui-body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  ui-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  editor-main:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  editor-code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  panel-title:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  sidebar-width: 260px
  toolbar-height: 48px
  gutter: 12px
---

## Brand & Style

The design system is engineered for deep focus and high-performance writing. It targets professionals who require a distraction-free environment without sacrificing powerful utility. The brand personality is rooted in technical excellence and aesthetic restraint, prioritizing content over chrome.

The design style is a refined **Minimalism** with a "Modern Utility" edge. It utilizes generous whitespace, crisp monochromatic tones, and precise structural alignment to create a sense of order. The UI recedes to the background, emerging only when the user needs to interact with specific tools, ensuring the Markdown content remains the primary focus.

## Colors

The palette is bifurcated into a high-contrast Light mode and a deep, low-eye-strain Dark mode. 

- **Primary (Action Blue):** Used sparingly for active states, primary buttons, and cursor accents to provide a singular point of focus.
- **Neutrals (Slate & Charcoal):** Form the structural foundation. In dark mode, surfaces use deep charcoals to minimize glow, while light mode uses crisp whites and subtle grays to maintain a "paper-like" feel.
- **Accents:** Secondary slate tones are used for metadata, line numbers, and non-active UI elements to maintain a strict visual hierarchy.

## Typography

The system utilizes a dual-font strategy to distinguish between the "Control Plane" (UI) and the "Content Plane" (Editor).

- **UI Interface:** **Inter** provides a highly legible, systematic feel for menus, sidebars, and settings. Use tight tracking for headers and slightly wider tracking for small labels to ensure clarity at small sizes.
- **The Editor:** **JetBrains Mono** is the standard for the writing pane. Its increased x-height and distinct character shapes reduce cognitive load during long writing sessions.
- **Scaling:** On desktop, the editor font defaults to 15px to balance information density with readability.

## Layout & Spacing

This design system employs a **Fluid Grid** for the main editor viewport, flanked by fixed-width utility panels.

- **The Work Area:** The central editor utilizes a maximum content width (e.g., 800px) centered within the fluid viewport to prevent line lengths from becoming unreadable.
- **Rhythm:** An 8px linear scale (with a 4px half-step for tight UI) governs all padding and margins. 
- **Sidebars:** Left-hand navigation and right-hand inspectors are fixed at 260px and can be toggled to a collapsed "icon-only" state to maximize writing space.
- **Margins:** Outer window margins are kept at a consistent 16px to give the interface room to breathe.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Subtle Low-Contrast Outlines** rather than aggressive shadows.

1. **Floor (Level 0):** The primary editor background. No shadow, flat.
2. **Sidebars (Level 1):** Differentiated by a 1px border (`border_dark` or `border_light`) on the inner edge. No shadow.
3. **Floating Panels (Level 2):** Components like the Table Generator or Map Picker use a slightly lighter surface color than the background and a soft, diffused shadow (12px blur, 10% opacity) to denote they are temporary and interactive.
4. **Modals (Level 3):** Highest elevation. These use a 1px border and a more pronounced ambient shadow (24px blur, 15% opacity) to pull focus entirely.

## Shapes

The shape language is disciplined and geometric. 

- **Base Radius:** A consistent 4px radius is applied to buttons, input fields, and panels. This "Soft" setting maintains a professional, engineered appearance without the playfulness of larger radii.
- **Containers:** Large floating panels use a slightly larger 8px radius (`rounded-lg`) to distinguish them from inline UI elements.
- **Active Indicators:** Selection highlights and tabs use 0px radius on the connecting edge to emphasize structural integration with the panels they belong to.

## Components

- **Buttons:** Primary buttons use `primary_color_hex` with white text. Secondary buttons are ghost-style with a subtle 1px border that brightens on hover. 
- **Toolbars:** Contextual toolbars appear at the top of the editor or floating near the cursor. They feature icon-only buttons with a 4px radius hover state in a slightly lighter/darker gray.
- **Floating Panels:** Specifically for the Table Generator and Map Picker, use a "Glass-lite" effect (95% opacity with a 4px backdrop blur) to maintain context of the text underneath while providing a clear workspace.
- **Input Fields:** Minimalist design with only a bottom border in the default state, shifting to a full 1px `Action Blue` border when focused.
- **Editor Chips:** Used for tags or Markdown metadata. These are pill-shaped with a subtle background tint and no border to avoid visual clutter within the text stream.
- **Checkboxes:** Square with a 2px radius. When checked, they fill with `Action Blue` and a white checkmark.