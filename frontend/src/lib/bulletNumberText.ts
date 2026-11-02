import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt({html:true});
/** Numeric markers inside bullets/checklists are editable text. Token maps
 * identify real lists, so code blocks and frontmatter retain their bytes. */
export function bulletNumbersAsText(source: string, insideBullet = false): string {
  const metadata = source.match(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] || '';
  const body = source.slice(metadata.length);
  const lines = body.match(/[^\n]*\n|[^\n]+$/g) || [];
  const stack: string[] = [];
  const escaped = new Set<number>();
  for (const token of parser.parse(body, {})) {
    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') stack.push(token.type);
    if (token.type === 'list_item_open' && stack[stack.length - 1] === 'ordered_list_open'
      && (insideBullet || stack.includes('bullet_list_open')) && token.map) escaped.add(token.map[0]);
    if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') stack.pop();
  }
  for (const index of Array.from(escaped)) {
    lines[index] = lines[index].replace(/^[ \t]*(?:(?:[-+*]|\d+[.)])(?:[ \t]+|(?=\r?$))(?:\[[ xX]\][ \t]+)?|>[ \t]*)+/,
      prefix=>{
        let inBullet=insideBullet || !/[-+*][ \t]/.test(prefix);
        return prefix.replace(/([-+*]|\d+[.)])([ \t]+|(?=\r?$))/g, (all,marker:string,space:string)=>{
        if(/^[-+*]$/.test(marker)){inBullet=true;return all;}
        return inBullet ? marker.slice(0,-1)+'\\'+marker.slice(-1)+space : all;
        });
      });
  }
  return metadata + lines.join('');
}
