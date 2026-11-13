/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-pdf-import-layout
 * 🚨 @PATCH : **2026-11-07** — [PDF 이미지 블록 독립 문단 분리]:
 *             1) serializePdfBlocks에서 이미지 블록(![...](...)) 또는 직전 블록이 이미지인 경우 반드시 개행 2개(\n\n)를 부여하여 앞뒤 일반 텍스트나 연속된 이미지와 문단이 뭉쳐 깨지는 현상 원천 차단
 * 🚨 @PATCH : **2026-11-12** — [PDF 겹친 글자 및 목록 단계 복원]: 같은 위치의 중복 글자층을 제거하고 위첨자 기호를 본문 줄에 합치며 절 제목·하위 목록의 단계를 명시적으로 정리
 * 🚨 @PATCH : **2026-11-12** — [PDF 하위 각주 및 표 블록 경계 복원]: 각주를 앞 항목의 하위 목록에 넣고 목록 뒤 표 앞뒤에 빈 줄을 두어 마크다운 표 렌더링 복구
 * 🚨 @PATCH : **2026-11-12** — [위첨자 번호 본문 위치 복원]: 본문보다 위에 그려진 작은 ①·②를 독립 목록으로 만들지 않고 해당 문장 줄에 합침
 * 🚨 @PATCH : **2026-11-12** — [겹친 숫자 누락 글자층 제거]: 같은 위치의 '제 조'처럼 숫자가 빠진 중복 글자층을 완전한 표제에서 분리하지 않도록 정리
 * 🚨 @PATCH : **2026-11-12** — [PDF 박스 안내문 중복 제거]: ▶ 안내문의 전체 텍스트층을 우선하고 겹친 조각층에서 시작 기호와 누락된 끝 글자만 결합
 * 🚨 @PATCH : 2026-11-13 — [납작한 가로형 표 아이콘 이미지 박스 추출 허용]: pdfImageBoxes에서 가로폭이 넓은 아이콘(width > 40 && height > 12)도 누락 없이 추출되도록 조건 확장
 * 🚨 @PATCH : 2026-11-13 — [행 끝 위첨자([국정과제24] 등) 인라인 병합 및 고아 목록 들여쓰기 레벨 정규화]:
 *             1) 제목/문장 우측 끝에 붙은 위첨자(other.end + other.h*2 이내, other.h >= line.h*1.2)도 본문 줄 끝에 인라인 병합되도록 허용 범위 확장
 *             2) 상위(- ) 없이 중간 들여쓰기(  - /     - )로 시작하는 고아 목록의 최소 들여쓰기를 0(- ) 기준으로 정규화하여 레벨별 글머리 기호(• → ◦ → ▪) 일관성 보장
 * 🚨 @PATCH : 2026-11-13 — [위첨자 각주·보조어(’25.12월, 가칭, 행안부 등) 본문 위치 인라인 병합 확장]:
 *             1) 기호(’*†‡①-⑨)뿐만 아니라 본문 글자 위첨자 높이(other.h >= line.h * 1.3, 0.85*other.h 이내)에 위치한 짧은 위첨자 주석(연도, 가칭, 부처명 등)도 본문 줄의 정확한 X 좌표 위치로 병합하여 별도 줄로 분리되는 현상 해결
 * 🚨 @PATCH : 2026-11-13 — [겹친 조각 병합 시 정상 각주(* / **) 및 좌측 텍스트 누락 결함 수정]:
 *             1) 줄 내 텍스트 런(run)들이 실제로 가로로 겹치지 않은 일반 줄은 병합 루프에서 제외하여 정상 문장이 잘려나가는 현상 원천 차단
 *             2) 겹침이 있는 줄에서도 * / ** 각주 기호가 ▶로 강제 치환되거나 주 텍스트 좌측의 선행 텍스트가 소실되지 않도록 선행 런 보존 로직 추가
 * 🚨 @PATCH : 2026-11-13 — [PDF 인라인 서식 HTML 태그 제거 및 표준 마크다운 태그(** / * / ~~) 전환]:
 *             1) **...**를 <strong>으로 변환하던 후처리 제거 및 PDF 굵게(bold)/기울임(italic)/취소선(crossing) 서식을 HTML 태그(<strong>, <em>, <del>) 대신 순수 마크다운 태그(**텍스트**, *텍스트*, ~~텍스트~~)로 직접 변환
 *             2) 인접한 동일 마크다운 구분자(****, ~~~~) 자동 병합으로 비주얼/소스 에디터 호환성 보장
 * 🚨 @PATCH : 2026-11-13 — [겹친 표·목록 문구 복원] 동일 위치의 문장층 중 괄호·쉼표가 보존된 글자층을 우선하고 * 목록의 중복 조각과 줄바꿈 띄어쓰기를 보정
 * 🚨 @PATCH : 2026-11-13 — [PDF 글자 서식 복원] 글꼴과 그려진 선의 위치로 강조·기울임·밑줄·취소선을 판별하여 원문 단어에 적용
 * 🚨 @PATCH : 2026-11-13 — [보고서 본문 줄 연결] 굵은 서식의 ㅇ 항목 둘째 줄을 제목으로 오인하지 않고 앞 문장에 연결
 * 🚨 @PATCH : 2026-11-13 — [보고서 목차·표제 정리] 목차 배경 그림을 코드 문단으로 분류하지 않고 겹친 표제의 중복 문구를 제거
 * 🚨 @PATCH : 2026-11-13 — [보고서 목록 단계 복원] ㅇ·✔·※ 표시를 순서에 맞는 하위 글머리로 변환
 */
import { extractPdfPageText } from './pdfImportText';

type Run = { str: string; transform: number[]; width: number; height: number; fontName?: string };
export type PdfImportBlock = { y: number; markdown: string };
type Box = { x: number; y: number; width: number; height: number };
export type PdfFontNames = Record<string, string>;
export type PdfDrawnRule = { x: number; y: number; width: number };
/** Remove shadow/overprint runs at the same position, retaining genuine repetitions. */
export function deduplicatePdfRuns(items: readonly unknown[]): Run[] {
  const runs=(items as Run[]).filter(r=>typeof r.str==='string'&&r.str.trim()&&r.transform);
  const redundant=new Set(runs.filter(run=>runs.some(prefix=>{
    if(prefix===run || !/^[가-힣]{1,3}$/.test(prefix.str) ||
      Math.abs(prefix.transform[5]-run.transform[5])>2.5 ||
      Math.abs(prefix.transform[4]-run.transform[4])>2 ||
      !run.str.startsWith(prefix.str+' ')) return false;
    const remaining=run.str.slice(prefix.str.length).trimStart();
    if(remaining.length<8) return false;
    return runs.some(suffix=>suffix!==run && suffix!==prefix &&
      Math.abs(suffix.transform[5]-run.transform[5])<2.5 &&
      suffix.transform[4]>prefix.transform[4]+prefix.width &&
      suffix.transform[4]<=run.transform[4]+run.width+3 &&
      suffix.str.startsWith(remaining) &&
      suffix.transform[4]+suffix.width>run.transform[4]+run.width+3);
  })));
  return runs.filter((run,index)=>!redundant.has(run) && !runs.some((other,j)=>{
    if(redundant.has(other)) return false;
    if(j===index || Math.abs(run.transform[5]-other.transform[5])>3.2) return false;
    const left=Math.max(run.transform[4],other.transform[4]);
    const right=Math.min(run.transform[4]+run.width,other.transform[4]+other.width);
    const overlap=Math.max(0,right-left)/Math.max(1,run.width);
    if(run.str===other.str) return j<index && overlap>0.9;
    const normalizedRun=run.str.replace(/[\s,.:()\[\]{}]/g,'');
    const normalizedOther=other.str.replace(/[\s,.:()\[\]{}]/g,'');
    const sameBox=Math.abs(run.transform[4]-other.transform[4])<2 && Math.abs(run.width-other.width)<2;
    if(sameBox && normalizedRun===normalizedOther && normalizedRun.length>=2) {
      const punctuation=(value:string)=>(value.match(/[,.:;()\[\]{}]/g)||[]).length;
      return punctuation(other.str)>punctuation(run.str) ||
        (punctuation(other.str)===punctuation(run.str) && j<index);
    }
    if(overlap>0.85 && normalizedRun.length>=4 && normalizedOther.length>normalizedRun.length &&
      normalizedOther.includes(normalizedRun)) return true;
    const withoutDigits=(value:string)=>value.replace(/[\s\d,.:()\[\]{}]/g,'');
    if(overlap>0.85 && run.str.length>=3 && other.str.length>run.str.length &&
      withoutDigits(other.str).includes(withoutDigits(run.str)) && withoutDigits(run.str).length>=2) return true;
    const offset=other.str.indexOf(run.str);
    if(offset<0 || other.str.length<=run.str.length) return false;
    if(overlap>0.85) return true;
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
  const boundary=/(?:거나|로만|되지|하며|되고|[가-힣]+적)$/.test(word) ||
    /^(?:정부|정책|클라우드|기계|텍스트)$/.test(word) || /[가-힣]{2,}가$/.test(word) || /^[#'"“‘]/.test(next);
  return boundary || /[,.!?。]$/.test(previous) || remaining>fontSize*0.95 ? ' ' : '';
}

export function serializePdfBlocks(blocks: PdfImportBlock[], compact = false): string {
  return blocks.map((block, index) => {
    const isImage = /^\s*!\[/.test(block.markdown);
    const isTable = /^(?:\|[^\n]+\n\|\s*:?-{3}|<table(?:\s|>))/i.test(block.markdown);
    const prevBlock = blocks[index - 1];
    const prevIsImage = prevBlock && /^\s*!\[/.test(prevBlock.markdown);
    const prevIsTable = prevBlock && /^(?:\|[^\n]+\n\|\s*:?-{3}|<table(?:\s|>))/i.test(prevBlock.markdown);
    const current = block.markdown.match(/^(\d+)\. /);
    const previous = prevBlock?.markdown.match(/^(\d+)\. /);

    // 🛡️ 이미지는 앞뒤로 반드시 빈 줄(\n\n)을 보장하여 일반 텍스트 문단 또는 연속 이미지와 뭉치지 않고 독립 블록으로 분리
    let separator = '\n\n';
    if (isImage || prevIsImage || isTable || prevIsTable) {
      separator = '\n\n';
    } else if (compact || (current && previous && Number(current[1]) === Number(previous[1]) + 1)) {
      separator = '\n';
    }
    return (index ? separator : '') + block.markdown;
  }).join('');
}

export function pdfTextBlocks(items: readonly unknown[], codeRegions: Box[] = [], inferTables = true, pageBodySize?: number,
  fontNames: PdfFontNames = {}, drawnRules: PdfDrawnRule[] = []): PdfImportBlock[] {
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
  for (let i=lines.length-1;i>=0;i--) {
    const line=lines[i];
    const isSymbolSup = line.runs.every(run=>/^[’'*†‡①②③④⑤⑥⑦⑧⑨\s]+$/.test(run.str));
    const isShortSup = line.h <= 11 &&
      !/^\s*(?:※|ㅇ|✔|□|☐|■|•|●|▪|-|\*\s)/.test(line.runs[0]?.str || '') &&
      line.runs.every(run => run.str.trim().length <= 20);
    if (!isSymbolSup && !isShortSup) continue;
    const parent=lines.find(other=>other!==line && other.h>=line.h*1.2 &&
      line.y>=other.y-other.h*0.25 && line.y-other.y<other.h*0.95 &&
      line.x>=other.x-2 && line.x<other.end+other.h*2);
    if(parent) { parent.runs.push(...line.runs); lines.splice(i,1); }
  }
  for (const l of lines) { l.runs.sort((a,b) => a.transform[4] - b.transform[4]); l.text = extractPdfPageText(l.runs.map(r => ({ ...r, hasEOL: false }))).replace(/^(.{5,}?)\1$/,'$1'); }
  lines.sort((a,b) => b.y - a.y);
  for(let index=0;index<lines.length;index++) {
    const line=lines[index];
    const sortedRuns=[...line.runs].sort((a,b)=>a.transform[4]-b.transform[4]);
    const hasOverlap=sortedRuns.some((run,idx)=>
      idx>0 && run.transform[4]<sortedRuns[idx-1].transform[4]+sortedRuns[idx-1].width-2
    );
    if(!hasOverlap) continue;
    const bullet=line.runs.find(run=>/^▶|^\*{1,2}\s/.test(run.str));
    const preceding=lines[index-1];
    const followsBullet=preceding?.runs.some(run=>/^▶|^\*{1,2}\s/.test(run.str)) &&
      preceding.y-line.y<line.h*1.65;
    if(!bullet && !followsBullet) continue;
    const main=line.runs.filter(run=>run!==bullet && run.str.length>5)
      .sort((a,b)=>b.width-a.width)[0];
    if(!main) continue;
    let prefix='';
    if(bullet) {
      let overlap=0;
      for(let length=Math.min(bullet.str.length,main.str.length);length>=3;length--)
        if(bullet.str.endsWith(main.str.slice(0,length))) { overlap=length; break; }
      prefix=overlap ? bullet.str.slice(0,-overlap) : (bullet.str.startsWith('▶') ? '▶ ' : bullet.str);
      const punctuation=line.runs.filter(run=>run!==bullet && run!==main && /^[‧·•]$/.test(run.str) &&
        run.transform[4]>bullet.transform[4] && run.transform[4]<main.transform[4]+3)
        .map(run=>run.str).join('');
      if(punctuation) prefix=prefix.trimEnd()+punctuation;
    }
    const mainStart=main.transform[4];
    const mainEnd=main.transform[4]+main.width;
    let leading='';
    let leadingEnd=-Infinity;
    for(const run of sortedRuns) {
      if(run===bullet || run===main || /^[‧·•]$/.test(run.str)) continue;
      const right=run.transform[4]+run.width;
      if(right<=mainStart+2) {
        if(run.transform[4]<leadingEnd-2 && right<=leadingEnd+2) continue;
        leading+=(leading && run.transform[4]>leadingEnd+2 ? ' ' : '')+run.str;
        leadingEnd=Math.max(leadingEnd,right);
      }
    }
    let result=(prefix ? (leading ? prefix+leading+' ' : prefix) : (leading ? leading+(mainStart>leadingEnd+2 ? ' ' : '') : ''))+main.str;
    let end=mainEnd;
    for(const run of sortedRuns) {
      if(run===bullet || run===main || /^[‧·•]$/.test(run.str)) continue;
      const right=run.transform[4]+run.width;
      if(right<=mainStart+2) continue;
      if(run.transform[4]>=mainStart-2 && run.transform[4]<end-2 && right<=end+2) continue;
      let overlap=0;
      if(run.transform[4]<end-2)
        for(let length=Math.min(result.length,run.str.length);length>=3;length--)
          if(result.endsWith(run.str.slice(0,length))) { overlap=length; break; }
      if(overlap) result+=run.str.slice(overlap);
      else result+=(run.transform[4]>end+2 ? ' ' : '')+run.str;
      end=Math.max(end,right);
    }
    line.text=result.replace(/\s+/g,' ').trim();
  }
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
    const codeRegion=codeRegions.find(b=>line.y>=b.y && line.y<=b.y+b.height && line.x>=b.x-2 && line.end<=b.x+b.width+2 &&
      !lines.some(candidate=>candidate.y>=b.y && candidate.y<=b.y+b.height &&
        (candidate.text.trim()==='순 서' || /^[ⅠⅡⅢⅣⅤⅥ]\./.test(candidate.text))));
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
    if (inferTables && /^\d+\s+[^\d\s]/.test(line.text)) {
      blocks.push({y:line.y,markdown:`## ${line.text}`}); continue;
    }
    const prev=lines[i-1];
    const paragraphContinuation=prev && /^(?:ㅇ|v|❖|⇒)\s/.test(prev.text) &&
      prev.y-line.y<bodySize*2.8 && Math.abs(line.x-prev.x-22)<12 &&
      prev.end>rightEdge-bodySize*3;
    const precedingList=/^\s*- /.test(blocks.at(-1)?.markdown || '') && i>0 &&
      lines[i-1].y-line.y<bodySize*2.8;
    if (!precedingList && !paragraphContinuation && line.h > Math.max(14,bodySize*1.2) && !/^(?:\(.+\)$|[□☐ㅇ*※◦①②③④⑤⑥⑦⑧⑨]|제\d+조|예\))/.test(line.text)) {
      blocks.push({y:line.y,markdown:`${line.h>=17?'##':'###'} ${line.text}`}); continue;
    }
    const last=blocks.at(-1);
    const isNew = /^(?:예\)|[□☐ㅇ✔※■☞]|\*\s|\d+[.)]\s|[•●▪]\s|[QA]\d+[.:]|[📌💡👉]|(?:호기심 자극형|정보 전달형|찬반 논쟁 유발형):)/.test(line.text);
    const listContinuation=last && prev && /^\s*- /.test(last.markdown) &&
      Math.abs(line.x-prev.x-22)<12;
    if (last && prev && !isNew && !/^#{1,6} |^\|/.test(last.markdown) && (Math.abs(prev.h-line.h)<1 || paragraphContinuation) &&
      prev.y-line.y < bodySize*(listContinuation || paragraphContinuation ? 2.8 : 2.05) &&
      ((Math.abs(prev.x-line.x)<4 && prev.end>rightEdge-bodySize*2) || listContinuation || paragraphContinuation)) {
      // An actual trailing space in the PDF run distinguishes a word boundary
      // from a Korean word that was split across physical lines.
      const separator=(listContinuation || paragraphContinuation) && /^[가-힣‘「]/.test(line.text) ? ' ' :
        wrapSeparator(prev.text,line.text,rightEdge-prev.end,bodySize);
      last.markdown += separator + line.text;
    } else {
      const note = /^\*{1,2}\s+/.test(line.text);
      const priorList = blocks.at(-1)?.markdown.match(/^(\s*)- /);
      const noteText = note && inferTables && priorList
        ? `${priorList[1]}  - ${line.text.replace(/^\*{1,2}\s+/, '')}` : null;
      blocks.push({y:line.y,markdown:noteText ?? (inferTables ? line.text
        .replace(/^\s*[□☐■]\s*/, '- ')
        .replace(/^\s*◦\s*/, '  - ')
        .replace(/^\s*ㅇ\s*/, '  - ')
        .replace(/^\s*✔\s*/, '    - ')
        .replace(/^\s*※\s*/, '      - ')
        .replace(/^([①②③④⑤⑥⑦⑧⑨])\s*/, '  - $1 ')
        .replace(/^(\*{1,2})(?=\s)/, match=>match.split('').map(()=>'\\*').join(''))
        .replace(/^[•●▪]\s*/, '- ') : line.text.replace(/^[•●▪]\s*/, '- '))});
    }
  }
  for (const [index, block] of blocks.entries()) {
    if (block.markdown.startsWith('```') || block.markdown.startsWith('|') || block.markdown.startsWith('<table')) continue;
    const lowerBound=blocks[index+1]?.y ?? -Infinity;
    const candidates=runs.filter(run=>run.transform[5]<=block.y+2 && run.transform[5]>lowerBound+2 && run.str.trim().length>=2)
      .sort((a,b)=>b.str.length-a.str.length);
    for (const run of candidates) {
      const font=fontNames[run.fontName || ''] || '';
      const bold=/(?:bold|black|heavy|semibold|demibold)/i.test(font);
      const italic=/(?:italic|oblique)/i.test(font);
      const crossing=drawnRules.some(rule=>rule.x<=run.transform[4]+1 &&
        rule.x+rule.width>=run.transform[4]+run.width-1 && rule.width<=run.width+8 &&
        Math.abs(rule.y-(run.transform[5]+run.height*0.35))<2);
      const underlined=drawnRules.some(rule=>rule.x<=run.transform[4]+1 &&
        rule.x+rule.width>=run.transform[4]+run.width-1 && rule.width<=run.width+8 &&
        Math.abs(rule.y-(run.transform[5]-Math.max(1,run.height*0.12)))<2);
      if(!bold && !italic && !crossing && !underlined) continue;
      const needle=run.str.trim();
      const first=block.markdown.indexOf(needle);
      if(first<0 || block.markdown.indexOf(needle,first+needle.length)>=0 ||
        block.markdown.slice(0,first).endsWith('<')) continue;
      let styled = underlined
        ? `<u>${needle.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</u>`
        : needle;
      if(bold) styled=`**${styled}**`;
      if(italic) styled=`*${styled}*`;
      if(crossing) styled=`~~${styled}~~`;
      block.markdown=block.markdown.slice(0,first)+styled+block.markdown.slice(first+needle.length);
    }
    block.markdown = block.markdown.replace(/\*\*\*\*/g, '').replace(/~~~~/g, '');
  }
  // 상위(- ) 없이 중간 들여쓰기(  - /     - )로 시작하는 고아 목록은 첫 항목 기준으로 레벨(0, 2, 4...)을 정규화
  let listStart = -1;
  const flushList = (end: number) => {
    if (listStart < 0) return;
    const indents = blocks.slice(listStart, end).map(b => b.markdown.match(/^(\s*)- /)?.[1].length ?? 0);
    const minIndent = Math.min(...indents);
    if (minIndent > 0) {
      for (let k = listStart; k < end; k++) {
        blocks[k].markdown = blocks[k].markdown.slice(minIndent);
      }
    }
    listStart = -1;
  };
  for (let i = 0; i < blocks.length; i++) {
    if (/^\s*- /.test(blocks[i].markdown)) {
      if (listStart < 0) listStart = i;
    } else {
      flushList(i);
    }
  }
  flushList(blocks.length);
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
      if(((box.width>24&&box.height>24)||(box.width>40&&box.height>12))&&!boxes.some(b=>Math.abs(b.x-box.x)<2&&Math.abs(b.y-box.y)<2&&Math.abs(b.width-box.width)<2)) boxes.push(box);
    }
  }
  return boxes.filter((b,i)=>!boxes.some((outer,j)=>j!==i && outer.width>=b.width && outer.height>=b.height &&
    b.x>=outer.x-1 && b.y>=outer.y-1 && b.x+b.width<=outer.x+outer.width+1 && b.y+b.height<=outer.y+outer.height+1));
}
