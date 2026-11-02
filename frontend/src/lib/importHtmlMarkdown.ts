/** Deterministic document conversion. No AI request or server dependency. */
export async function importHtmlWithImages(
  html: string,
  saveImage?: (base64: string, mime: string) => Promise<string>,
): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const saved = new Map<string, string>();
  for (const image of Array.from(doc.querySelectorAll('img'))) {
    const src = image.getAttribute('src') || '';
    if (!/^data:image\//i.test(src)) continue;
    if (!saveImage) throw new Error('HTML 이미지를 저장할 리소스 폴더를 설정해 주세요.');
    let path = saved.get(src);
    if (!path) {
      const match = src.match(/^data:(image\/[\w.+-]+)(?:;[^,]*)?,([\s\S]*)$/i);
      if (!match) throw new Error('HTML 내장 이미지 형식이 올바르지 않습니다.');
      // Let the UI paint between image saves. Base64 is only a transfer format,
      // never part of the returned Markdown document.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      let base64: string;
      if (/;base64(?:;|,)/i.test(src.slice(0, src.indexOf(',') + 1))) {
        base64 = match[2].replace(/\s/g, '');
      } else {
        const blob = await (await fetch(src)).blob();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const chunks: string[] = [];
        for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...Array.from(bytes.subarray(i, i + 8192))));
        base64 = btoa(chunks.join(''));
      }
      path = await saveImage(base64, match[1]);
      if (!path || /^data:/i.test(path)) throw new Error('HTML 이미지를 리소스 폴더에 저장하지 못했습니다.');
      saved.set(src, path);
    }
    image.setAttribute('src', path);
    image.removeAttribute('srcset');
  }
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  return htmlToImportMarkdown(doc.body.innerHTML);
}

export function htmlToImportMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,nav,button').forEach(el => el.remove());
  // Exported editor chrome is metadata, not document prose.
  doc.querySelectorAll('.codeblock-header').forEach(el => {
    const area = el.closest('.codeblock-area');
    if (area && !area.hasAttribute('data-code-info')) {
      area.setAttribute('data-code-info', el.querySelector('.codeblock-header-text')?.textContent?.trim() || '');
    }
    el.remove();
  });
  doc.querySelectorAll('*').forEach(el=>Array.from(el.attributes).forEach(attr=>{
    if(/^on/i.test(attr.name) || (['href','src'].includes(attr.name) && /^\s*javascript:/i.test(attr.value))) el.removeAttribute(attr.name);
  }));
  // Word exports often use typed markers instead of native list paragraphs.
  for (const p of Array.from(doc.querySelectorAll('p'))) {
    const match=(p.textContent||'').match(/^\s*(?:([•●▪])\s+|(\d+)[.)]\s+)/);
    if (!match || p.querySelector('img,a[href^="#_Toc"]') || p.closest('li,td,th,pre')) continue;
    const ordered=!!match[2];
    let remaining=match[0].length;
    const texts=doc.createTreeWalker(p,4);
    while(remaining>0) { const node=texts.nextNode(); if(!node) break; const value=node.textContent||''; const count=Math.min(remaining,value.length); node.textContent=value.slice(count); remaining-=count; }
    p.querySelectorAll('strong,b,em,i').forEach(el=>{if(!el.textContent?.trim()) el.remove();});
    const prev=p.previousElementSibling;
    const number=Number(match[2])||1;
    let list=prev && prev.tagName===(ordered?'OL':'UL') ? prev : null;
    if(list && ordered && (Number(list.getAttribute('start'))||1)+list.children.length!==number) list=null;
    if(!list) { list=doc.createElement(ordered?'ol':'ul'); if(ordered) list.setAttribute('start',String(number)); p.before(list); }
    const li=doc.createElement('li'); li.append(...Array.from(p.childNodes)); list.append(li); p.remove();
  }
  for(const caption of Array.from(doc.querySelectorAll('figcaption'))) {
    const previous=caption.previousElementSibling;
    if(previous?.tagName==='P' && previous.querySelector('img') && !previous.textContent?.trim()) {
      const figure=doc.createElement('figure'); previous.before(figure);
      figure.append(...Array.from(previous.childNodes),caption); previous.remove();
    }
  }
  const walk = (node: Node, depth = 0): string => {
    if (node.nodeType === 3) {
      const value=node.textContent||'';
      if(!value.trim() && /\n/.test(value)) return '';
      return value.replace(/\s+/g, ' ');
    }
    if (node.nodeType !== 1) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const content = () => Array.from(el.childNodes).map(child => walk(child, depth)).join('');
    if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${content().trim()}\n\n`;
    if (tag === 'br') return '  \n';
    if (tag === 'hr') return '\n\n---\n\n';
    if (tag === 'strong' || tag === 'b') {
      const value=content(), trimmed=value.trim();
      if(!trimmed) return value;
      // A space after punctuation keeps emphasis valid before Korean suffixes.
      const next=el.nextSibling?.textContent||'';
      const previous=el.previousSibling?.textContent||'';
      const needsLeadingSpace=new RegExp('^[\\p{P}\\p{S}]','u').test(trimmed) && new RegExp('[\\p{L}\\p{N}]$','u').test(previous);
      const needsSpace=new RegExp('[\\p{P}\\p{S}]$','u').test(trimmed) && new RegExp('^[\\p{L}\\p{N}]','u').test(next);
      return (value.match(/^\s+/)?.[0]||(needsLeadingSpace?' ':''))+`**${trimmed}**`+(value.match(/\s+$/)?.[0]||(needsSpace?' ':''));
    }
    if (tag === 'em' || tag === 'i') { const value=content(); return value.trim() ? (value.match(/^\s+/)?.[0]||'')+`*${value.trim()}*`+(value.match(/\s+$/)?.[0]||'') : value; }
    if (tag === 'del' || tag === 's') return `~~${content()}~~`;
    if (tag === 'pre') {
      const code=el.querySelector('code')||el;
      const lines=Array.from(code.children);
      const text=code.getAttribute('data-code-text') ?? (lines.length && lines.every(line=>line.classList.contains('onrivi-line'))
        ? lines.map(line=>(line.textContent||'').replace(/^\u200b$/,'')).join('\n')
        : code.textContent||'');
      const language=code.getAttribute('data-code-info') ?? el.closest('.codeblock-area')?.getAttribute('data-code-info') ?? code.className.match(/(?:^|\s)language-([\w+-]+)/)?.[1] ?? '';
      const fence = '`'.repeat(Math.max(3, ...Array.from(text.matchAll(/`+/g), match => match[0].length + 1)));
      return `\n\n${fence}${language}\n${text}\n${fence}\n\n`;
    }
    if (tag === 'code') return '`' + content() + '`';
    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      if (!src || /^javascript:/i.test(src)) return '';
      return `![${(el.getAttribute('alt') || '').replace(/\]/g, '\\]')}](<${src.replace(/>/g, '%3E')}>)`;
    }
    if(tag==='figure' && el.querySelector('figcaption') && el.querySelector('img')) {
      const image=el.querySelector('img')!;
      const caption=el.querySelector('figcaption')!.textContent?.trim()||'';
      const src=image.getAttribute('src')||'';
      if(!src) return caption;
      const alt=(image.getAttribute('alt')||caption).replace(/\]/g,'\\]');
      return `\n\n![${alt}](<${src.replace(/>/g,'%3E')}>)\n\n`;
    }
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      return href && !/^javascript:/i.test(href) ? `[${content()}](<${href.replace(/>/g, '%3E')}>)` : content();
    }
    if (tag === 'ul' || tag === 'ol') {
      let index = Number(el.getAttribute('start')) || 1;
      return '\n' + Array.from(el.children).filter(child => child.tagName === 'LI').map(li => {
        const body = Array.from(li.childNodes).map(child => walk(child, depth + 1)).join('').trim();
        return '  '.repeat(depth) + (tag === 'ol' ? `${index++}. ` : '- ') + body;
      }).join('\n') + '\n';
    }
    if (tag === 'table') {
      if (el.querySelector('td[colspan], th[colspan], td[rowspan], th[rowspan], table')) {
        // Pipe tables cannot represent merged cells. Keep the table structure
        // and inline formatting, without carrying source scripts or handlers.
        const table = el.cloneNode(true) as HTMLElement;
        const allowedAttributes = new Set(['colspan', 'rowspan', 'href', 'src', 'alt', 'title', 'width', 'height']);
        for (const child of [table, ...Array.from(table.querySelectorAll('*'))]) {
          for (const attr of Array.from(child.attributes)) {
            if (!allowedAttributes.has(attr.name.toLowerCase()) ||
                (['href', 'src'].includes(attr.name.toLowerCase()) && /^\s*(?:javascript|vbscript):/i.test(attr.value))) {
              child.removeAttribute(attr.name);
            }
          }
        }
        return '\n\n' + table.outerHTML.replace(/\r?\n/g, ' ') + '\n\n';
      }
      const rows = Array.from(el.querySelectorAll('tr')).map(row => Array.from(row.children).filter(cell => /^(TD|TH)$/.test(cell.tagName)).map(cell =>
        Array.from(cell.childNodes).map(child => walk(child, depth)).join('').trim().replace(/\|/g, '\\|').replace(/\n+/g, '<br>')));
      const width = Math.max(0, ...rows.map(row => row.length));
      if (!width) return '';
      const lines = rows.map(row => '| ' + Array.from({ length: width }, (_, index) => row[index] || '').join(' | ') + ' |');
      lines.splice(1, 0, '| ' + Array(width).fill('---').join(' | ') + ' |');
      return '\n\n' + lines.join('\n') + '\n\n';
    }
    if (tag === 'blockquote') return '\n\n' + content().trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n';
    if (el.classList.contains('onrivi-line') && el.parentElement?.tagName === 'P') {
      const next=el.nextElementSibling;
      return content() + (next?.classList.contains('onrivi-line') ? '  \n' : '');
    }
    if (['p', 'div', 'section', 'article', 'figure', 'figcaption'].includes(tag)) return '\n\n' + content().trim() + '\n\n';
    return content();
  };
  return Array.from(doc.body.childNodes).map(node => walk(node)).join('').replace(/\n{3,}/g, '\n\n').trim();
}
