/** Render punctuation-ending strong text followed by a Korean particle. */
export function remarkKoreanStrong() {
  const punctuation = new RegExp('[\\p{Pe}\\p{Pf}\x27":;.!?%…]$', 'u');
  return (tree: any, file: any) => {
    const source = String(file.value || '');
    const walk = (parent: any) => {
      if (!Array.isArray(parent.children) || ['code', 'inlineCode', 'html', 'math', 'inlineMath'].includes(parent.type)) return;
      // Inline code is a separate mdast node. Match delimiters across those
      // nodes without interpreting the code's contents as Markdown.
      const joined: any[] = [];
      const children = parent.children.slice();
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        const start = node.type === 'text' ? node.value.lastIndexOf('**') : -1;
        const raw = source.slice(node.position?.start?.offset, node.position?.end?.offset);
        if (start < 0 || /\\\*/.test(raw) || /[*\n]/.test(node.value.slice(start + 2))) {
          joined.push(node); continue;
        }
        let end = -1;
        for (let j = i + 1; j < children.length; j++) {
          const next = children[j];
          if (next.type === 'text' && next.value.includes('**')) {
            const closingRaw = source.slice(next.position?.start?.offset, next.position?.end?.offset);
            if (children[j - 1].type === 'inlineCode' && /^\*\*(?=\u200B*[가-힣A-Za-z0-9])/.test(next.value) && !/\\\*/.test(closingRaw)) end = j;
            break;
          }
          if (!['text', 'inlineCode'].includes(next.type)) break;
        }
        if (end < 0) { joined.push(node); continue; }
        if (start) joined.push({ type: 'text', value: node.value.slice(0, start) });
        const inner = children.slice(i + 1, end);
        if (node.value.length > start + 2) inner.unshift({ type: 'text', value: node.value.slice(start + 2) });
        joined.push({ type: 'strong', children: inner });
        children[end] = { ...children[end], value: children[end].value.slice(2) };
        i = end - 1;
      }
      parent.children = joined;
      parent.children = parent.children.flatMap((node: any) => {
        if (node.type !== 'text') { walk(node); return [node]; }
        const raw = source.slice(node.position?.start?.offset, node.position?.end?.offset);
        if (/\\\*/.test(raw)) return [node]; // Intentionally escaped literal asterisks.
        const pattern = /\*\*([^*\n]+)\*\*(?=\u200B*[가-힣A-Za-z0-9])/g;
        const pieces: any[] = [];
        let offset = 0, match: RegExpExecArray | null;
        while ((match = pattern.exec(node.value))) {
          if (!punctuation.test(match[1])) continue;
          if (match.index > offset) pieces.push({ type: 'text', value: node.value.slice(offset, match.index) });
          pieces.push({ type: 'strong', children: [{ type: 'text', value: match[1] }] });
          offset = match.index + match[0].length;
        }
        if (!pieces.length) return [node];
        if (offset < node.value.length) pieces.push({ type: 'text', value: node.value.slice(offset) });
        return pieces;
      });
    };
    walk(tree);
  };
}
