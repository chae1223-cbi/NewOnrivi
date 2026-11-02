import type { Node as DocumentNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import { closeHistory } from 'prosemirror-history';

export type TextMatch = { from: number; to: number };
export type DocumentMatch = TextMatch & { range: Range; view?: EditorView; doc?: DocumentNode };
export type SearchEditorHost = HTMLElement & { onriviSearchView?: EditorView };

const literalPattern = (query: string, matchCase: boolean) => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'gu' : 'giu');

/** Search displayed text across marks, without matching Markdown or metadata attributes. */
export function findDocumentText(doc: DocumentNode, query: string, matchCase = false): TextMatch[] {
  if (!query) return [];
  const results: TextMatch[] = [];
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return true;
    let text = '';
    block.forEach(child => { text += child.isText ? child.text : '\ufffc'.repeat(child.nodeSize); });
    for (const match of Array.from(text.matchAll(literalPattern(query, matchCase)))) {
      if (!match[0].includes('\ufffc')) results.push({ from: pos + 1 + match.index!, to: pos + 1 + match.index! + match[0].length });
    }
    return false;
  });
  return results;
}

export function collectDocumentMatches(container: HTMLElement, query: string, matchCase = false): DocumentMatch[] {
  if (!query) return [];
  const matches: DocumentMatch[] = [];
  container.querySelectorAll<SearchEditorHost>('[data-onrivi-search-editor]').forEach(host => {
    const view = host.onriviSearchView;
    if (!view || view.isDestroyed) return;
    for (const match of findDocumentText(view.state.doc, query, matchCase)) {
      try {
        const start = view.domAtPos(match.from, 1), end = view.domAtPos(match.to, -1);
        const range = document.createRange();
        range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset);
        matches.push({ ...match, range, view, doc: view.state.doc });
      } catch { /* An opaque rendered node has no editable text range. */ }
    }
  });
  // Read-only rendered documents remain searchable. Their DOM is never rewritten.
  const groups = new Map<Element, Text[]>();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, { acceptNode(node) {
    const parent = node.parentElement;
    if (!node.textContent || !parent || parent.closest('[data-onrivi-search-editor],script,style,button,input,textarea,select,.no-search,.preview-toolbar-root,.preview-find-widget,.katex,.frontmatter')) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  } });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const block = node.parentElement!.closest('p,h1,h2,h3,h4,h5,h6,li,td,th,pre,figcaption') || node.parentElement!;
    groups.set(block, [...(groups.get(block) || []), node]);
  }
  for (const nodes of Array.from(groups.values())) {
    const text = nodes.map(node => node.data).join('');
    for (const match of Array.from(text.matchAll(literalPattern(query, matchCase)))) {
      let offset = 0, start: { node: Text; offset: number } | undefined, end: { node: Text; offset: number } | undefined;
      const from = match.index!, to = from + match[0].length;
      for (const node of nodes) {
        if (!start && from < offset + node.length) start = { node, offset: from - offset };
        if (to > offset && to <= offset + node.length) end = { node, offset: to - offset };
        offset += node.length;
      }
      if (start && end) {
        const range = document.createRange(); range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset);
        matches.push({ range, from, to });
      }
    }
  }
  return matches.sort((a, b) => a.range.compareBoundaryPoints(Range.START_TO_START, b.range));
}

/** Dispatch one transaction per editor, preserving schema, marks and undo history. */
export function replaceDocumentMatches(matches: DocumentMatch[], replacement: string): number {
  if (matches.some(match => !match.view?.editable || match.view.isDestroyed || match.doc !== match.view.state.doc)) return 0;
  const grouped = new Map<EditorView, DocumentMatch[]>();
  matches.forEach(match => grouped.set(match.view!, [...(grouped.get(match.view!) || []), match]));
  for (const [view, entries] of Array.from(grouped.entries())) {
    let transaction = closeHistory(view.state.tr).setMeta('onrivi:preserve-viewport', true);
    for (const match of entries.sort((a, b) => b.from - a.from)) {
      const start = view.state.doc.resolve(match.from);
      const marks = start.nodeAfter?.marks || start.marks();
      transaction = replacement
        ? transaction.replaceWith(match.from, match.to, view.state.schema.text(replacement, marks))
        : transaction.delete(match.from, match.to);
    }
    view.dispatch(transaction);
    view.dispatch(closeHistory(view.state.tr).setMeta('addToHistory', false).setMeta('onrivi:preserve-viewport', true));
  }
  return matches.length;
}
