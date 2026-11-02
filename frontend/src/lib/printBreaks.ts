import { type PrintBreakAnchor, type DocumentPaginationSettings } from './documentPaginationSettings';

export const ANCHOR_ATTRIBUTE = 'data-onrivi-print-anchor';
const clean = (s: string | null) => (s || '').normalize('NFC').replace(/\s+/g,' ').trim().slice(0,1200);
const digest = (s: string) => { let n=2166136261; for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return (n>>>0).toString(36); };
export interface PrintCandidate { element: HTMLElement; anchor: PrintBreakAnchor; disabled?: string }

/** Wrap code lines on the output clone only, retaining highlighted inline markup and all characters. */
function codeLines(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('pre').forEach(pre => {
    const code=pre.querySelector('code') || pre;
    if(code.querySelector('[data-onrivi-code-line]'))return;
    const text=code.textContent || '', doc=code.ownerDocument;
    const walker=doc.createTreeWalker(code,4),texts:Text[]=[];let node:Node|null;
    while((node=walker.nextNode()))texts.push(node as Text);
    if(!texts.length)return;
    const point=(offset:number):[Node,number]=>{let n=offset;for(const text of texts){if(n<=text.length)return[text,n];n-=text.length;}return[texts[texts.length-1],texts[texts.length-1].length];};
    const fragment=doc.createDocumentFragment();let offset=0;
    for(const [i,line] of Array.from(text.split(/(?<=\n)/).entries())){
      const range=doc.createRange(),start=point(offset),end=point(offset+line.length);
      range.setStart(...start);range.setEnd(...end);
      let piece:Node=range.cloneContents();
      let ancestor=range.commonAncestorContainer.nodeType===3?range.commonAncestorContainer.parentElement:range.commonAncestorContainer as HTMLElement;
      while(ancestor && ancestor!==code){const wrapper=ancestor.cloneNode(false) as HTMLElement;wrapper.append(piece);piece=wrapper;ancestor=ancestor.parentElement;}
      const span=doc.createElement('span');span.dataset.onriviCodeLine=String(i);span.append(piece);fragment.append(span);offset+=line.length;
    }
    code.replaceChildren(fragment);
  });
}
function context(element: HTMLElement) {
  const groups:string[]=[];
  for(let p=element.parentElement;p;p=p.parentElement){
    if(p.matches('table'))groups.push('table:'+clean(p.querySelector('thead, tr')?.textContent || ''));
    else if(p.matches('pre'))groups.push('code:'+(p.querySelector('code')?.className || p.className));
    else if(p.matches('blockquote'))groups.push('quote:'+(p.getAttribute('data-alert-type')||''));
    else if(p.matches('ul,ol'))groups.push(p.tagName.toLowerCase());
    if(groups.length===6)break;
  }
  const structural=groups.reverse().join('/');
  let cursor:Element|null=element;
  while(cursor){
    let previous=cursor.previousElementSibling;
    while(previous){
      const headings=previous.querySelectorAll('h1,h2,h3,h4,h5,h6');
      const heading=previous.matches('h1,h2,h3,h4,h5,h6')?previous:headings[headings.length-1];
      if(heading)return (clean(heading.textContent)+'/'+structural).slice(0,1800);
      previous=previous.previousElementSibling;
    }
    cursor=cursor.parentElement;
  }
  return structural.slice(0,1800);
}
export function collectPrintCandidates(root: HTMLElement): PrintCandidate[] {
  codeLines(root);
  const candidates:PrintCandidate[]=[];
  root.querySelectorAll<HTMLElement>(`tr,li,[data-onrivi-code-line],p,h1,h2,h3,h4,h5,h6,figure,hr,img,.visual-math-node,.katex-display`).forEach(element=>{
    if(element.closest('[data-editor-controls],.onrivi-page-guides,.onrivi-print-tools,.book-screen-only'))return;
    const tag=element.tagName;
    if(tag==='IMG' && element.closest('figure'))return;
    if(element.closest('figure') && tag!=='FIGURE')return;
    let kind:PrintBreakAnchor['kind']='block';
    if(tag==='TR'){
      const table=element.closest('table');
      if(!table || element.closest('thead') || element===table.querySelector('tr'))return;
      kind='row';
    }else if(tag==='LI')kind='item';
    else if(element.hasAttribute('data-onrivi-code-line'))kind='code';
    else if(element.closest('td,th,li,pre'))return;
    else if(element.closest('blockquote'))kind='quote';
    const text=clean(tag==='TR'?Array.from((element as HTMLTableRowElement).cells).map(cell=>cell.textContent).join(' '):element.textContent) || clean(element.querySelector('img')?.getAttribute('src') || '');
    if(!text && tag!=='HR' && kind!=='code')return;
    const siblingText=(direction:'previousElementSibling'|'nextElementSibling')=>clean(element[direction]?.textContent || '');
    const anchor={id:'',kind,text,context:context(element),previous:siblingText('previousElementSibling'),next:siblingText('nextElementSibling')};
    anchor.id=digest(JSON.stringify(anchor));
    let disabled:string|undefined;
    const range=root.ownerDocument.createRange();range.selectNodeContents(root);range.setEndBefore(element);
    const preceding=range.cloneContents();
    if(!preceding.textContent?.trim() && !preceding.querySelector('img,svg,math,video'))disabled='첫 콘텐츠 앞에는 빈 페이지를 추가하지 않습니다.';
    if(kind==='row'){
      const table=element.closest('table')!;
      const rows=Array.from(table.rows),index=rows.indexOf(element as HTMLTableRowElement);
      if(rows.slice(0,index).some((row,i)=>Array.from(row.cells).some(cell=>cell.rowSpan===0||i+cell.rowSpan>index)))disabled='세로 병합 셀이 걸쳐 있는 위치는 나눌 수 없습니다.';
    }
    candidates.push({element,anchor,disabled});
  });
  const counts=new Map<string,number>();candidates.forEach(c=>counts.set(c.anchor.id,(counts.get(c.anchor.id)||0)+1));
  for(const c of candidates){
    if((counts.get(c.anchor.id)||0)>1)c.disabled='같은 내용과 주변 문맥이 반복되어 위치를 구별할 수 없습니다.';
    c.element.setAttribute(ANCHOR_ATTRIBUTE,JSON.stringify(c.anchor));
    if(c.disabled)c.element.dataset.onriviBreakDisabled=c.disabled;
  }
  return candidates;
}
function locate(anchor:PrintBreakAnchor,candidates:PrintCandidate[]) {
  const exact=candidates.filter(c=>c.anchor.id===anchor.id);
  if(exact.length===1)return exact[0];
  const same=candidates.filter(c=>c.anchor.kind===anchor.kind && c.anchor.text===anchor.text && c.anchor.context===anchor.context);
  if(same.length===1)return same[0];
  const neighbors=same.filter(c=>c.anchor.previous===anchor.previous && c.anchor.next===anchor.next);
  return neighbors.length===1?neighbors[0]:undefined;
}
const removeIds=(node:HTMLElement)=>{node.removeAttribute('id');node.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));};
const hasContent=(node:HTMLElement)=>Boolean(node.textContent?.length || node.querySelector('img,svg,math,video,hr'));

/** Split ancestors in the output clone, never the editable document. */
function breakBefore(root:HTMLElement,target:HTMLElement): HTMLElement | null {
  let right=target;
  // Lift a first code line's boundary to the whole code block.
  if(right.hasAttribute('data-onrivi-code-line') && !right.previousSibling)right=right.closest('pre') || right;
  while(right.parentElement && right.parentElement!==root){
    const parent=right.parentElement;
    // Pure layout wrappers can also be split; attributes/styles are preserved.
    const clone=parent.cloneNode(false) as HTMLElement;
    const olStart=parent.tagName==='OL' ? Number(parent.getAttribute('start')||1) + Array.from(parent.children).filter(el=>el.tagName==='LI').indexOf(right) - (right.dataset.onriviListContinuation==='true'?1:0) : null;
    const tableHeader=parent.tagName==='TABLE' ? parent.querySelector('thead')?.cloneNode(true) || null : null;
    const firstRow=parent.tagName==='TABLE' && !tableHeader ? parent.querySelector('tr')?.cloneNode(true) || null : null;
    let node:Node|null=right;
    while(node){const next:Node|null=node.nextSibling;clone.append(node);node=next;}
    if(olStart!==null && olStart>0)clone.setAttribute('start',String(olStart));
    if(parent.tagName==='LI' && hasContent(parent)){clone.style.setProperty('list-style-type','none');clone.dataset.onriviListContinuation='true';}
    if(parent.tagName==='TABLE'){
      // A split tbody carries its body rows. Repeat only the original header.
      if(tableHeader && !clone.querySelector('thead')){removeIds(tableHeader as HTMLElement);clone.prepend(tableHeader);}
      else if(firstRow){
        removeIds(firstRow as HTMLElement);const body=clone.querySelector('tbody') || clone;body.prepend(firstRow);
      }
      parent.querySelectorAll('colgroup,caption').forEach(el=>{const copy=el.cloneNode(true) as HTMLElement;removeIds(copy);clone.prepend(copy);});
    }
    // Only the shallow ancestor is duplicated. Moved body nodes retain their IDs.
    clone.removeAttribute('id');parent.after(clone);
    const onlyHeader=parent.tagName==='TABLE' && Array.from(parent.querySelectorAll('tr')).every(row=>row===parent.querySelector('tr') || !!row.closest('thead'));
    if(!hasContent(parent)||onlyHeader)parent.remove();
    right=clone;
  }
  // No forced leading page, and no duplicate break at the same boundary.
  let previous=right.previousElementSibling;
  while(previous && !hasContent(previous as HTMLElement))previous=previous.previousElementSibling;
  if(!previous)return null;
  right.setAttribute('data-onrivi-forced-break','true');
  right.style.setProperty('break-before','page','important');right.style.setProperty('page-break-before','always','important');
  return right;
}
export function applyPrintBreaks(root:HTMLElement,settings:DocumentPaginationSettings) {
  const candidates=collectPrintCandidates(root),unresolved:PrintBreakAnchor[]=[];
  const resolved=settings.breaks.map(anchor=>({anchor,candidate:locate(anchor,candidates)}));
  for(const {anchor,candidate} of resolved){
    if(!candidate || candidate.disabled){unresolved.push(anchor);continue;}
    candidate.element.dataset.onriviBreakId=anchor.id;
  }
  // Source order makes multiple boundaries within the same container independent.
  for(const candidate of candidates){
    if(!candidate.element.dataset.onriviBreakId)continue;
    breakBefore(root,candidate.element);
  }
  root.dataset.onriviUnresolvedBreaks=JSON.stringify(unresolved);
  return {candidates,unresolved};
}
