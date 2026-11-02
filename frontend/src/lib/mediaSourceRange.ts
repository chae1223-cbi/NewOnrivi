import { defaultMarkdownParser } from 'prosemirror-markdown';
import { mediaDetails } from './mediaMarkup';

/** Find the original markup, excluding fenced examples; nearby duplicate wins. */
export function mediaSourceRange(source: string, kind: 'image'|'video'|'map', path: string, hintLine = 1) {
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) || [];
  const offsets = [0]; lines.forEach(line => offsets.push(offsets[offsets.length-1] + line.length));
  const fences = defaultMarkdownParser.tokenizer.parse(source,{}).filter(token => (token.type === 'fence' || token.type === 'code_block') && token.map)
    .map(token => ({from:offsets[token.map![0]],to:offsets[token.map![1]]}));
  const regex = kind === 'image' ? /!\[(?:\\.|[^\]])*\]\((?:<[^>]*>|(?:\\.|[^()\r\n]|\([^()\r\n]*\))*)\)/g : /<(video|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const candidates: {from:number;to:number;source:string}[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    if (fences.some(fence => match!.index >= fence.from && match!.index < fence.to)) continue;
    let actualPath = '';
    if (kind === 'image') {
      const node = defaultMarkdownParser.parse(match[0]).firstChild?.firstChild;
      if (node?.type.name === 'image') actualPath = node.attrs.src;
    } else {
      const details = mediaDetails(match[0]);
      if (details?.kind === kind) actualPath = details.path;
    }
    if (actualPath === path) candidates.push({from:match.index,to:match.index+match[0].length,source:match[0]});
  }
  const hint = offsets[Math.max(0,Math.min(lines.length,hintLine-1))];
  return candidates.sort((a,b) => Math.abs(a.from-hint)-Math.abs(b.from-hint))[0] || null;
}
