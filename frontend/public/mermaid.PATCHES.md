# Local Mermaid bundle patch

The bundled ELK flowchart renderer eagerly called `JSON.stringify(v, null, 2)`
for a diagnostic log before layout. Its graph contains D3 selections whose
parents include the document root. React Fiber properties on that root are
circular, so rendering failed before ELK layout even with valid Mermaid code.

Replace that diagnostic argument with a plain summary containing `id`,
`nodeCount`, and `edgeCount`. Layout data and rendering behavior are unchanged.
Keep this fix when replacing the bundle unless the upstream version has removed
the eager graph serialization.

Regression: `node scripts/check-visual-editor.cjs --visual --mermaid` attaches a
circular React-like reference to the document root and renders the real bundle.
