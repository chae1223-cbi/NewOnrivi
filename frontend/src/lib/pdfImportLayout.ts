import { extractPdfPageText } from './pdfImportText';

type Run = { str: string; transform: number[]; width: number; height: number; fontName?: string };
export type PdfImportBlock = { y: number; markdown: string };
type Box = { x: number; y: number; width: number; height: number };
/** Remove shadow/overprint runs at the same position, retaining genuine repetitions. */
export function deduplicatePdfRuns(items: readonly unknown[]): Run[] {
  const runs=(items as Run[]).filter(r=>typeof r.str==='string'&&r.str.trim()&&r.transform);
  return runs.filter((run,index)=>!runs.some((other,j)=>{
    if(j===index || Math.abs(run.transform[5]-other.transform[5])>2.5) return false;
    if(run.str===other.str) return j<index && Math.abs(run.transform[4]-other.transform[4])<2.5 && Math.abs(run.width-other.width)<3;
    const offset=other.str.indexOf(run.str);
    if(offset<0 || other.str.length<=run.str.length) return false;
    const expected=other.transform[4]+other.width*offset/other.str.length;
    return Math.abs(run.transform[4]-expected)<3 && run.transform[4]+run.width<=other.transform[4]+other.width+3;
  }));
}
function wrapSeparator(previous: string, next: string, remaining: number, fontSize: number): string {
  const word=previous.split(/\s+/).at(-1)||'';
  // Derivational suffixes remain attached even when their stem is a boundary noun.
  if (/^(?:적|적인|적으로)(?:\s|$)/.test(next)) return '';
  if (/^[가-힣]{1,2}$/.test(next) || /^(?:니다|습니다|어요)/.test(next)) return '';
  if (/^[가-힣]$/.test(word) && !/^[수것등중내그이]$/.test(word) && /^[가-힣]/.test(next)) return '';
  // Apply linguistic hints only at a physical wrap, never across the document.
  const boundary=/(?:거나|로만|되지|[가-힣]+적)$/.test(word) ||
    /^(?:정부|정책|클라우드|기계|텍스트)$/.test(word) || /[가-힣]{2,}가$/.test(word) || /^[#'"“‘]/.test(next);
  return boundary || /[,.!?。]$/.test(previous) || remaining>fontSize*0.95 ? ' ' : '';
}

export function serializePdfBlocks(blocks: PdfImportBlock[], compact = false): string {
  return blocks.map((block,index)=>{
    const current=block.markdown.match(/^(\d+)\. /), previous=blocks[index-1]?.markdown.match(/^(\d+)\. /);
    const separator=compact || (current && previous && Number(current[1])===Number(previous[1])+1) ? '\n' : '\n\n';
    return (index?separator:'')+block.markdown;
  }).join('');
}

export function pdfTextBlocks(items: readonly unknown[], codeRegions: Box[] = [], inferTables = true, pageBodySize?: number): PdfImportBlock[] {
  const runs = deduplicatePdfRuns(items);
  const sizes = new Map<number, number>();
  for (const r of runs) { const h = Math.round(r.height); sizes.set(h, (sizes.get(h) || 0) + r.str.length); }
  const bodySize = pageBodySize || Array.from(sizes).sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
  const lines: { y: number; runs: Run[]; text: string; h: number; x: number; end: number }[] = [];
  for (const r of runs) {
    let line = lines.find(l => Math.abs(l.y - r.transform[5]) < 2);
    if (!line) { line = { y: r.transform[5], runs: [], text: '', h: 0, x: Infinity, end: 0 }; lines.push(line); }
    line.runs.push(r); line.h = Math.max(line.h, r.height); line.x = Math.min(line.x, r.transform[4]);
    line.end = Math.max(line.end, r.transform[4] + r.width);
  }
  for (const l of lines) { l.runs.sort((a,b) => a.transform[4] - b.transform[4]); l.text = extractPdfPageText(l.runs.map(r => ({ ...r, hasEOL: false }))); }
  lines.sort((a,b) => b.y - a.y);
  // Printed folios are separate from the document's numbered clauses.
  for (let i=lines.length-1;i>=0;i--) {
    if (/^[-–—]\s*\d+\s*[-–—]$/.test(lines[i].text.trim()) && (i===0 || i===lines.length-1)) lines.splice(i,1);
  }
  if (!lines.length) return [];
  // Some PDFs place the list marker on the last physical line of an item.
  // Move only a geometrically detached marker back to its preceding full line.
  for (let i=1;i<lines.length;i++) {
    const line=lines[i], prev=lines[i-1], marker=line.runs[0];
    if (/^\d+[.)]$/.test(marker.str) && line.h<bodySize*1.15 && prev.h===line.h &&
      prev.y-line.y<bodySize*2 && line.runs[1] && Math.abs(line.runs[1].transform[4]-prev.x)<3 &&
      prev.end-prev.x>bodySize*25 && !/^\d+[.)]\s/.test(prev.text)) {
      prev.text=Math.max(1,parseInt(marker.str,10)-1)+'. '+prev.text;
      line.runs=line.runs.slice(1); line.text=extractPdfPageText(line.runs); line.x=prev.x;
    }
  }
  const rightEdge = Math.max(...lines.filter(l => l.h >= bodySize - 1).map(l => l.end));
  const blocks: PdfImportBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeRegion=codeRegions.find(b=>line.y>=b.y && line.y<=b.y+b.height && line.x>=b.x-2 && line.end<=b.x+b.width+2);
    if (codeRegion) {
      const codeLines=[line];
      while(i+1<lines.length && lines[i+1].y>=codeRegion.y && lines[i+1].y<=codeRegion.y+codeRegion.height &&
        lines[i+1].x>=codeRegion.x-2 && lines[i+1].end<=codeRegion.x+codeRegion.width+2) codeLines.push(lines[++i]);
      const previous=blocks.at(-1);
      if(previous && /^(?:#{1,6}\s*)?TEXT$/i.test(previous.markdown)) blocks.pop();
      const content=codeLines.filter(l=>l.text!=='TEXT');
      const edge=Math.max(...content.map(l=>l.end));
      let body='';
      for(let c=0;c<content.length;c++) {
        const current=content[c], previous=content[c-1];
        // Reflow prose in text fences; preserve indentation and physical lines
        // for programming code and explicit lists, labels and paragraphs.
        const prose=previous && /[가-힣]/.test(previous.text) && /[가-힣]/.test(current.text) &&
          Math.abs(previous.x-current.x)<3 && previous.y-current.y<current.h*1.65 &&
          previous.end>edge-current.h*2 && !/^(?:\d+[.)]\s|[#•]|\[|https?:|\{)/.test(current.text);
        body+=(c ? (prose ? wrapSeparator(previous.text,current.text,edge-previous.end,current.h) : '\n') : '')+current.text;
      }
      if(body) { const fence='`'.repeat(Math.max(3,...Array.from(body.matchAll(/`+/g),m=>m[0].length+1))); blocks.push({y:line.y,markdown:fence+'text\n'+body+'\n'+fence}); }
      continue;
    }
    // Repeated aligned columns following a widely separated header indicate a table.
    const starts = [line.runs[0].transform[4]];
    for (let j=1;j<line.runs.length;j++) {
      const prev=line.runs[j-1], cur=line.runs[j];
      if (cur.transform[4] - prev.transform[4] - prev.width > line.h * 1.8) starts.push(cur.transform[4]);
    }
    if (inferTables && starts.length >= 3) {
      const tableLines = [line];
      let k = i+1;
      while (k<lines.length && lines[k].h <= line.h+1 && lines[k-1].y-lines[k].y < line.h*6 &&
        lines[k].runs.every(r => r.transform[4] >= starts[0]-3)) tableLines.push(lines[k++]);
      if (tableLines.length >= 3) {
        const rowStarts: typeof tableLines = [];
        for (const l of tableLines.filter(l => l.runs.some(r => Math.abs(r.transform[4]-starts[0])<3))) {
          if (!rowStarts.length || rowStarts[rowStarts.length-1].y-l.y > line.h*2.1) rowStarts.push(l);
        }
        const rows = rowStarts.map((row, idx) => {
          const group = tableLines.filter(l => l.y <= row.y+2 && (idx===rowStarts.length-1 || l.y>rowStarts[idx+1].y+2));
          return starts.map((x, col) => group.map(l => extractPdfPageText(l.runs.filter(r => r.transform[4]>=x-3 && (col===starts.length-1 || r.transform[4]<starts[col+1]-3)).map(r=>({...r,hasEOL:false})))).filter(Boolean).join(' ').replace(/\|/g,'\\|'));
        });
        // Only commit when rows have content in each column; otherwise retain all text.
        if (rows.length>=2 && rows.every(r => r.every(Boolean))) {
          blocks.push({y:line.y,markdown:[`| ${rows[0].join(' | ')} |`,`| ${starts.map(()=>'---').join(' | ')} |`,...rows.slice(1).map(r=>`| ${r.join(' | ')} |`)].join('\n')});
          i=k-1; continue;
        }
      }
    }
    if (line.h > Math.max(14,bodySize*1.2) && !/^(?:\(.+\)$|[□☐ㅇ*※]|예\))/.test(line.text)) {
      blocks.push({y:line.y,markdown:`${line.h>=17?'##':'###'} ${line.text}`}); continue;
    }
    const prev=lines[i-1]; const last=blocks.at(-1);
    const isNew = /^(?:예\)|[□☐ㅇ※■☞]|\*\s|\d+[.)]\s|[•●▪]\s|[QA]\d+[.:]|[📌💡👉]|(?:호기심 자극형|정보 전달형|찬반 논쟁 유발형):)/.test(line.text);
    if (last && prev && !isNew && !/^#{1,6} |^\|/.test(last.markdown) && Math.abs(prev.h-line.h)<1 &&
      prev.y-line.y < bodySize*2.05 && Math.abs(prev.x-line.x)<4 && prev.end>rightEdge-bodySize*2) {
      // An actual trailing space in the PDF run distinguishes a word boundary
      // from a Korean word that was split across physical lines.
      const separator=wrapSeparator(prev.text,line.text,rightEdge-prev.end,bodySize);
      last.markdown += separator + line.text;
    } else blocks.push({y:line.y,markdown:line.text.replace(/^[•●▪]\s*/, '- ')});
  }
  for (const block of blocks) {
    if (!block.markdown.startsWith('```')) block.markdown=block.markdown.replace(/\*\*([^*\n]+)\*\*/g,(_,value:string)=>'<strong>'+value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</strong>');
  }
  return blocks;
}

export function pdfImageBoxes(fnArray: number[], argsArray: unknown[][], ops: Record<string, number>) {
  type Matrix = number[];
  let m: Matrix=[1,0,0,1,0,0]; const stack: Matrix[]=[]; const boxes:{x:number;y:number;width:number;height:number}[]=[];
  for(let i=0;i<fnArray.length;i++) {
    const op=fnArray[i], args=argsArray[i];
    if(op===ops.save) stack.push([...m]);
    else if(op===ops.restore) m=stack.pop()||m;
    else if(op===ops.transform) {
      const [a,b,c,d,e,f]=args as number[]; const [A,B,C,D,E,F]=m;
      m=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];
    } else if(op===ops.paintImageXObject||op===ops.paintInlineImageXObject) {
      const xs=[m[4],m[0]+m[4],m[2]+m[4],m[0]+m[2]+m[4]], ys=[m[5],m[1]+m[5],m[3]+m[5],m[1]+m[3]+m[5]];
      const box={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
      if(box.width>24&&box.height>24&&!boxes.some(b=>Math.abs(b.x-box.x)<2&&Math.abs(b.y-box.y)<2&&Math.abs(b.width-box.width)<2)) boxes.push(box);
    }
  }
  return boxes.filter((b,i)=>!boxes.some((outer,j)=>j!==i && outer.width>=b.width && outer.height>=b.height &&
    b.x>=outer.x-1 && b.y>=outer.y-1 && b.x+b.width<=outer.x+outer.width+1 && b.y+b.height<=outer.y+outer.height+1));
}
