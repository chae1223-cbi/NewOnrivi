/** Recover text spacing from PDF glyph runs without adding spaces to every run. */
export function extractPdfPageText(items: readonly unknown[]): string {
  let output = '';
  let previous: { x: number; y: number; width: number; height: number } | undefined;
  for (const raw of items) {
    const item = raw as { str?: string; transform?: number[]; width?: number; height?: number; hasEOL?: boolean };
    if (typeof item.str !== 'string') continue;
    // Some PDF generators encode visible spaces as SOH in their text mapping.
    const value = item.str.replace(/\x01/g, ' ').replace(/[\x00\x02-\x08\x0b\x0c\x0e-\x1f]/g, '');
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const height = Math.abs(item.height || item.transform?.[3] || 12);
    if (value && previous && !output.endsWith('\n')) {
      const lineChanged = Math.abs(y - previous.y) > Math.max(height, previous.height) * 0.5;
      const gap = x - (previous.x + previous.width);
      if (lineChanged) output += '\n';
      else if (gap > Math.min(height, previous.height) * 0.15 && !/\s$/.test(output) && !/^\s/.test(value)) output += ' ';
    }
    output += value;
    if (value) previous = { x, y, width: item.width ?? 0, height };
    if (item.hasEOL) {
      if (!output.endsWith('\n')) output += '\n';
      previous = undefined;
    }
  }
  return output.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}
