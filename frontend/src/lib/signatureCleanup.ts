/**
 * 프로그램명 : OnriviAuthor 
 * 파일명 : signatureCleanup.ts
 * 🚨 @PATCH : **2026-11-10** — [서명 블록 정리 트랜잭션 스텝 범위 가드 최적화]:
 *             1) removeEmptySignatureBlocks 실행 시 삭제 스텝 구간에 source_block이나 div 태그가 없을 경우 emptyNodeRanges 전수 검사를 즉각 바이패스
 *             2) 일반 백스페이스 삭제 시 정규식 파싱 오버헤드를 0ms로 소거
 */
import type { Node as DocumentNode } from 'prosemirror-model';
import type { Transaction } from 'prosemirror-state';

type Range = { from: number; to: number };

/** Empty alignment wrappers used by the signature tool; code examples are protected. */
export function emptySignatureRanges(source: string): Range[] {
  if (!/<div\b/i.test(source)) return [];
  let fence = '';
  let metadata = source.startsWith('---\n') || source.startsWith('---\r\n');
  let first = true;
  const masked = source.replace(/[^\n]*(?:\n|$)/g, line => {
    const trim = line.trim();
    const marker = trim.match(/^(`{3,}|~{3,})/);
    const protect = metadata || Boolean(fence) || Boolean(marker);
    if (metadata && !first && trim === '---') metadata = false;
    first = false;
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = '';
    }
    return protect ? line.replace(/[^\r\n]/g, ' ') : line.replace(/(`+)(.*?)\1/g, text => ' '.repeat(text.length));
  });
  const stack: Array<{ from: number; end: number; aligned: boolean }> = [];
  const found: Range[] = [];
  for (const match of Array.from(masked.matchAll(/<\/?div\b[^>]*>/gi))) {
    if (!/^<\//.test(match[0])) {
      stack.push({ from: match.index!, end: match.index! + match[0].length, aligned: /\balign\s*=\s*(["']?)(?:left|right)\1(?=\s|>)/i.test(match[0]) });
    } else {
      const open = stack.pop();
      if (!open?.aligned) continue;
      const body = source.slice(open.end, match.index)
        .replace(/<\/?(?:p|br|span|b|strong|i|em|u)\b[^>]*>/gi, '')
        .replace(/&nbsp;|&#160;|&#x0*a0;/gi, '')
        .replace(/[\s\u200b\ufeff]/g, '');
      if (!body) found.push({ from: open.from, to: match.index! + match[0].length });
    }
  }
  return found.sort((a, b) => a.from - b.from).filter((range, index, all) => !all.some((other, j) => j !== index && other.from < range.from && other.to >= range.to));
}

function emptyNodeRanges(doc: DocumentNode): Range[] {
  const found: Range[] = [];
  const stack: Array<{ from: number; raw: string }> = [];
  doc.forEach((node, pos) => {
    const raw = node.type.name === 'source_block' ? String(node.attrs.source || '') : node.type.name === 'paragraph' && !node.content.size ? '\n' : 'NONEMPTY';
    for (const open of stack) open.raw += raw;
    if (/^\s*<div\b[^>]*>\s*$/i.test(raw)) stack.push({ from: pos, raw });
    else if (/^\s*<\/div>\s*$/i.test(raw)) {
      const open = stack.pop();
      if (open && emptySignatureRanges(open.raw).some(range => !open.raw.slice(0, range.from).trim() && !open.raw.slice(range.to).trim())) found.push({ from: open.from, to: pos + node.nodeSize });
    } else if (node.type.name === 'source_block' && emptySignatureRanges(raw).some(range => !raw.slice(0, range.from).trim() && !raw.slice(range.to).trim())) found.push({ from: pos, to: pos + node.nodeSize });
  });
  return found.filter(range => !found.some(other => other.from < range.from && other.to >= range.to));
}

/** Append cleanup to the user's deletion so Undo restores the entire signature. */
export function removeEmptySignatureBlocks(transaction: Transaction): void {
  if (!transaction.docChanged || transaction.doc.content.size >= transaction.before.content.size) return;

  // 🛡️ [성능 최적화 가드]: 삭제된 스텝 범위에 서명 블록(source_block, div)이 없으면 전체 검사 즉시 바이패스
  let mayHaveSignature = false;
  for (let i = 0; i < transaction.steps.length; i++) {
    const step = transaction.steps[i] as any;
    if (step.from !== undefined && step.to !== undefined && step.from < step.to) {
      transaction.before.nodesBetween(step.from, step.to, node => {
        if (node.type.name === 'source_block' || (node.isText && /<\/?div/i.test(node.text || ''))) {
          mayHaveSignature = true;
          return false;
        }
      });
      if (mayHaveSignature) break;
    }
  }
  if (!mayHaveSignature) return;
  const previous = emptyNodeRanges(transaction.before).map(range => transaction.mapping.map(range.from, -1));
  const ranges = emptyNodeRanges(transaction.doc).filter(range => !previous.includes(range.from));
  for (const range of ranges.reverse()) transaction.delete(range.from, range.to);
}

export function registerSignatureCleanup(editor: any, monaco: any) {
  let applying = false;
  const listener = editor.onDidChangeModelContent((event: any) => {
    if (applying || event.isUndoing || event.isRedoing || event.isFlush || !event.changes?.some((change: any) => change.rangeLength > change.text.length)) return;
    const model = editor.getModel();
    if (!model) return;
    const after = model.getValue();
    // Monaco offsets refer to the old document. Map each deletion into the new
    // document so multiple selections and replacements clean the correct wrapper.
    let delta = 0;
    const deletedPositions: number[] = [];
    for (const change of [...event.changes].sort((a: any, b: any) => a.rangeOffset - b.rangeOffset)) {
      if (change.rangeLength > change.text.length) deletedPositions.push(change.rangeOffset + delta);
      delta += change.text.length - change.rangeLength;
    }
    const ranges = emptySignatureRanges(after).filter(range => deletedPositions.some(position => position >= range.from && position <= range.to));
    if (!ranges.length) return;
    applying = true;
    try {
      const selections = editor.getSelections();
      model.pushEditOperations(selections, ranges.map(range => {
        const start = model.getPositionAt(range.from), end = model.getPositionAt(range.to);
        return { range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column), text: '' };
      }), () => null);
    } finally { applying = false; }
  });
  editor.onDidDispose(() => listener.dispose());
}
