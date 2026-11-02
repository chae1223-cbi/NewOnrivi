/** Scroll and inline-block wrappers are atomic during printing: allow table fragmentation. */
export const PRINT_TABLE_FLOW_CSS = `
@media print {
  .custom-preview-container .markdown-viewer-root .table-wrapper-area,
  .custom-preview-container .table-wrapper-area,
  .onrivi-content-root .table-wrapper-area,
  .markdown-viewer-root .table-wrapper-area {
    display: block !important;
    overflow: visible !important;
    overflow-x: visible !important;
    overflow-y: visible !important;
    height: auto !important;
    max-height: none !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  .custom-preview-container table, .onrivi-content-root table {
    display: table !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  .custom-preview-container tbody, .onrivi-content-root tbody {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  .custom-preview-container tr, .onrivi-content-root tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .custom-preview-container thead, .onrivi-content-root thead {
    display: table-header-group !important;
  }
}
`;

/** Remove atomic scroll wrappers only from the detached print snapshot. */
export function unwrapPrintTables(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.table-wrapper-area').forEach(wrapper => {
    if (!wrapper.querySelector('table')) return;
    let outer = wrapper;
    const ancestors: HTMLElement[] = [];
    while (outer.parentElement && outer.parentElement !== root && outer.parentElement.tagName === 'DIV' &&
      outer.parentElement.children.length === 1 && !Array.from(outer.parentElement.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim())) {
      outer = outer.parentElement;
      ancestors.push(outer);
    }
    wrapper.replaceWith(...Array.from(wrapper.childNodes));
    // Preserve every child (including captions), removing only single-child layout ancestors.
    ancestors.forEach(ancestor => ancestor.replaceWith(...Array.from(ancestor.childNodes)));
  });
}
