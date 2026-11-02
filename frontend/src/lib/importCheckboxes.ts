/** Convert form symbols to inline controls usable inside Markdown table cells. */
export function convertFormCheckboxes(text: string): string {
  let index=0;
  const control = (symbol: string, line: string, offset: number): string => {
    index++;
    const label = line.slice(offset + symbol.length).match(/^\s*([^<|□☑☒]{1,40})/)?.[1]?.trim() || `선택 항목 ${index}`;
    const safeLabel = label.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `<input type="checkbox" data-import-checkbox="hwp-${index}" aria-label="${safeLabel}"${symbol === '□' ? '' : ' checked'} />`;
  };
  return text.split('\n').map(line => {
    // A single square introducing a heading is a bullet, not a form field.
    // Tables and inline groups of choices are the supported form contexts.
    const isHtmlRow = /<t[dh]\b/i.test(line);
    const isFormRow = /^\s*\|/.test(line) || (!isHtmlRow && (line.match(/[□☑☒]/g)||[]).length > 1);
    if (isHtmlRow) {
      // A consent table can also contain many section bullets (□). Only its
      // explicit answer choices are controls.
      return line.replace(/[□☑☒](?=\s*(?:동의함|동의하지\s*않음))/g, (symbol, offset) => control(symbol, line, offset));
    }
    if (!isFormRow) return line;
    return line.replace(/[□☑☒]/g, (symbol, offset) => control(symbol, line, offset));
  }).join('\n');
}

export function importedCheckboxEdit(text: string, id: string, checked: boolean) {
  for (const match of Array.from(text.matchAll(/<input\b[^>]*>/g))) {
    if (!match[0].includes(`data-import-checkbox="${id}"`)) continue;
    const clean=match[0].replace(/\s+checked(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi,'');
    return {start:match.index!,end:match.index!+match[0].length,text:checked?clean.replace(/\s*\/?\s*>$/,' checked />'):clean};
  }
  return null;
}
