/** Keep visible HWP text while removing parser control characters. */
const decorationRun = new RegExp('([^A-Za-z0-9가-힣\\s])\\1{15,}', 'gu');

export function cleanHwpText(text: string): string {
  return text
    .replace(/[\u001e\u001f]/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001d\u007f]/g, '')
    .replace(decorationRun, '---');
}
