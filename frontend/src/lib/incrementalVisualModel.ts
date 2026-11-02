type SourceModel = {
  getValue(): string;
  getPositionAt(offset: number): { lineNumber: number; column: number };
  pushEditOperations(before: unknown[], edits: { range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; text: string }[], cursor: () => null): unknown;
};

// Keep the source model current for Save, while avoiding full-model replacement
// and tokenization on every visual-editor keystroke.
export function syncVisualSourceModel(model: SourceModel, next: string) {
  const previous = model.getValue();
  if (previous === next) return;
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  const splitsPair = (text: string, offset: number) => offset > 0 && /[\uD800-\uDBFF]/.test(text[offset - 1]) && /[\uDC00-\uDFFF]/.test(text[offset] || '');
  if (splitsPair(previous, start) || splitsPair(next, start)) start--;
  let oldEnd = previous.length, newEnd = next.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) { oldEnd--; newEnd--; }
  if (splitsPair(previous, oldEnd)) oldEnd++;
  if (splitsPair(next, newEnd)) newEnd++;
  const from = model.getPositionAt(start), to = model.getPositionAt(oldEnd);
  model.pushEditOperations([], [{ range: { startLineNumber: from.lineNumber, startColumn: from.column,
    endLineNumber: to.lineNumber, endColumn: to.column }, text: next.slice(start, newEnd) }], () => null);
}
