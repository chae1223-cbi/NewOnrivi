/** Remove presentation wrappers while retaining the document's text and block boundaries. */
export function clearMarkdownFormatting(source: string): string {
  return source
    .replace(/<\/div\s*>/gi, '\n\n')
    .replace(/<\/?(?:div|u|mark|span|b|i|strong|em|ins|del)\b[^>]*>/gi, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/!?\[(.*?)\]\(.*?\)/g, '$1')
    .split('\n').map(line => line.replace(/^(\s*)(?:#{1,6}|[-*+]\s+\[[ xX]\]|[-*+]|\d+\.|>+)(?:\s+(.*))?$/, '$1$2')).join('\n');
}
