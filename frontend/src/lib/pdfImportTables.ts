/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-pdf-import-tables
 * 🚨 @PATCH : **2026-11-12** — [PDF 중복 표 제거 및 HTML 변환]: 큰 표에 포함된 셀별 중복 블록을 제거하고 복합 열 표를 HTML로 출력해 원래 열 배치를 유지
 * 🚨 @PATCH : **2026-11-12** — [번호 안내 상자 HTML 표 복원]: 제목 아래 연속된 ①·② 안내 항목을 독립 목록 대신 번호 열과 내용 열을 가진 HTML 표로 구성
 * 🚨 @PATCH : **2026-11-12** — [제목·내용 1열 2행 마크다운 표]: 안내·제외대상 상자의 제목과 번호 항목들을 한 열의 머리행·내용행으로 직렬화
 * 🚨 @PATCH : 2026-11-13 — [분리 열 표의 행 경계(segmentedYs) 복원 및 중복 하위 표 출력 차단]:
 *             1) 열 사이에 간격이 있는 다단 표(예: 구분 | 현재 | 미래 비전)에서 열마다 끊어진 동일 높이(Y) 가로선들을 합산하여 행 경계(ys)로 복원함으로써 모든 행이 1행으로 뭉개지던 현상 해결
 *             2) roots와 distinctRecovered 간 포함 관계(inside(r.box, g)) 양방향 중복 필터링 및 모든 행이 비어있는 공백 간격 열 제거로 동일 표가 두 번 출력되거나 빈 간격 열이 생기는 문제 차단
 * 🚨 @PATCH : 2026-11-13 — [표 셀 내부 및 표 상단 열 정렬 이미지 단일 HTML <table> 통합]:
 *             1) pdfRuledTableBlocks에 embeddedImages를 전달받아 표 클리핑 셀/격자 셀 내부의 이미지와 표 바로 위 열에 배치된 이미지를 HTML <table>의 <td><img .../></td> 행으로 통합
 *             2) 표 내부로 편입된 이미지는 used 플래그로 마킹하여 표 바깥에 개별 이미지 블록으로 중복 출력되지 않도록 처리
 * 🚨 @PATCH : 2026-11-13 — [복잡한 다중 행/멀티라인 셀 표 HTML <table> 자동 전환 강화]: 마크다운 표(| ... |)로 표현하기 어려운 다중 문단/줄바꿈(<br>) 셀을 포함한 표도 HTML <table>로 자동 변환
 * 🚨 @PATCH : 2026-11-13 — [HTML 표 셀 내 마크다운 서식(** / * / ~~) HTML 태그 복원 및 미세 슬리버 셀 열 밀림 방지]:
 *             1) escapeStyled에서 HTML <table> 셀 내부의 **텍스트**, *텍스트*, ~~텍스트~~를 <strong>, <em>, <del>로 변환하여 표 안에 ** 기호가 그대로 노출되는 결함 해결
 *             2) groups 표 복원 시 3pt 미만 미세 경계 슬리버 셀이 별도 <td>를 생성해 행 전체가 1열씩 우측으로 밀리는 현상 차단 및 열 중점(colMid) 기준 colspan 산출로 열 정렬 무결성 보장
 * 🚨 @PATCH : 2026-11-13 — [표 인접 구분선·제목 판별 시 마크다운 인라인 서식(** / * / ~~) 인식 추가]
 * 🚨 @PATCH : 2026-11-13 — [PDF 서식·구분선 복원] 글꼴과 선 정보를 셀 변환에 전달하고 독립 가로선을 마크다운 구분선으로 출력
 * 🚨 @PATCH : 2026-11-13 — [행별 표 구조 우선] 전체 열만 인식한 단일 행 격자보다 클리핑 셀의 실제 여러 행을 우선하여 숫자 열 합침 방지
 * 🚨 @PATCH : 2026-11-13 — [표 테두리 오차 보정] 3pt 미만의 중복 세로 경계를 제거하여 빈 열이 끼어드는 현상 완화
 */
import { pdfTextBlocks, deduplicatePdfRuns, type PdfImportBlock, type PdfFontNames, type PdfDrawnRule } from './pdfImportLayout';

type Rect = { x: number; y: number; width: number; height: number };
type Grid = Rect & { xs: number[]; ys: number[] };
type Run = { str: string; transform: number[] };
export type PdfEmbeddedImage = Rect & { src: string; alt: string; used?: boolean };
const close = (a: number, b: number) => Math.abs(a-b)<0.8;
const unique = (values: number[]) => values.sort((a,b)=>a-b).filter((v,i,a)=>!i || !close(v,a[i-1]));
const inside = (inner: Rect, outer: Rect) => inner.x>=outer.x-1 && inner.y>=outer.y-1 &&
  inner.x+inner.width<=outer.x+outer.width+1 && inner.y+inner.height<=outer.y+outer.height+1;
const contains = (r: Run, box: Rect) => r.transform[4]>=box.x-0.5 && r.transform[4]<box.x+box.width-0.5 &&
  r.transform[5]>=box.y-0.5 && r.transform[5]<box.y+box.height-0.5;
const containsImg = (img: PdfEmbeddedImage, box: Rect) => {
  const cx = img.x + img.width / 2;
  const cy = img.y + img.height / 2;
  return cx >= box.x - 1 && cx <= box.x + box.width + 1 && cy >= box.y - 1 && cy <= box.y + box.height + 1;
};
const escape = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/**
 * ========================================================================================
 * [escapeStyled] PDF 변환기가 생성한 제한된 글자 서식 태그만 HTML 표 안에 보존합니다.
 * @param s - PDF 셀 문구
 * @returns 안전하게 이스케이프한 HTML 문구
 * ========================================================================================
 */
const escapeStyled = (s: string) =>
  escape(s)
    .replace(/&lt;(\/?(?:strong|em|u|del))&gt;/g, '<$1>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

/** Use drawn rules, rather than text gaps, to keep adjacent and nested tables separate. */
export function pdfRuledTableBlocks(items: readonly unknown[], fnArray: number[], argsArray: unknown[][],
  ops: Record<string, number>, codeRegions: Rect[] = [], fontNames: PdfFontNames = {},
  embeddedImages: PdfEmbeddedImage[] = []): PdfImportBlock[] {
  const vertical: Rect[] = [], horizontal: Rect[] = [];
  const clips: Rect[]=[];
  const filledBoxes: Rect[]=[];
  let matrix=[1,0,0,1,0,0]; const stack: number[][]=[];
  for(let i=0;i<fnArray.length;i++) {
    const args=argsArray[i];
    if(fnArray[i]===ops.save) stack.push([...matrix]);
    else if(fnArray[i]===ops.restore) matrix=stack.pop()||[1,0,0,1,0,0];
    else if(fnArray[i]===ops.transform) {
      const [a,b,c,d,e,f]=args as number[], [A,B,C,D,E,F]=matrix;
      matrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];
    } else if(fnArray[i]===ops.constructPath &&
      [ops.stroke,ops.endPath,ops.fill,ops.eoFill].includes(args[0] as number) && args[2]) {
      // PDF.js supplies the bounds of the constructed path. Only straight,
      // axis-aligned rules qualify; underlines alone cannot establish a grid.
      const bounds=Array.from(args[2] as ArrayLike<number>);
      const [x1,y1,x2,y2]=bounds;
      if(bounds.length!==4) continue;
      const [A,B,C,D,E,F]=matrix;
      const x=A*x1+C*y1+E, y=B*x1+D*y1+F;
      const endX=A*x2+C*y2+E, endY=B*x2+D*y2+F;
      const rect={x:Math.min(x,endX),y:Math.min(y,endY),width:Math.abs(endX-x),height:Math.abs(endY-y)};
      if(args[0]===ops.fill || args[0]===ops.eoFill) {
        const path=args[1] as ArrayLike<ArrayLike<number>>;
        if(path?.[0]?.length===13 && rect.width>200 && rect.height>80 && rect.width*rect.height<250000)
          filledBoxes.push(rect);
        continue;
      }
      if(args[0]===ops.endPath) {
        const path=args[1] as ArrayLike<ArrayLike<number>>;
        if(path?.[0]?.length===13 && rect.width>15 && rect.height>8 && rect.width*rect.height<350000 &&
          !clips.some(c=>close(c.x,rect.x)&&close(c.y,rect.y)&&close(c.width,rect.width)&&close(c.height,rect.height))) clips.push(rect);
        continue;
      }
      if(rect.width<0.3 && rect.height>12) vertical.push(rect);
      if(rect.height<0.3 && rect.width>12) horizontal.push(rect);
    }
  }
  const grids: Grid[]=[];
  for(const v of vertical) {
    const peers=vertical.filter(p=>close(p.y,v.y)&&close(p.height,v.height));
    const xs=unique(peers.map(p=>p.x));
    if(xs.length<3) continue;
    const left=xs[0], right=xs.at(-1)!;
    const inBand=horizontal.filter(h=>h.x>=left-2 && h.x+h.width<=right+2 &&
      h.y>=v.y-1 && h.y<=v.y+v.height+1);
    const fullYs=inBand.filter(h=>h.x<=left+1 && h.x+h.width>=right-1).map(h=>h.y);
    const segmentedYs=unique(inBand.map(h=>h.y)).filter(y=>{
      const matching=inBand.filter(h=>close(h.y,y));
      const coveredWidth=matching.reduce((sum,h)=>sum+h.width,0);
      return matching.length>=2 && coveredWidth>=(right-left)*0.5;
    });
    const ys=unique([...fullYs, ...segmentedYs]);
    if(ys.length<2 && v.height<100 && !ys.some(y=>close(y,v.y)||close(y,v.y+v.height))) continue;
    // Continuation pages can omit both top and bottom rules. Three matching
    // long vertical rules still establish the same column boundaries.
    if(!ys.length || !close(ys.at(-1)!,v.y+v.height)) ys.push(v.y+v.height);
    if(!close(ys[0],v.y)) ys.unshift(v.y);
    const grid={x:left,y:v.y,width:right-left,height:v.height,xs,ys};
    if(!grids.some(g=>close(g.x,grid.x)&&close(g.y,grid.y)&&close(g.width,grid.width)&&close(g.height,grid.height))) grids.push(grid);
  }
  const runs=deduplicatePdfRuns(items).map(r=>{
    // This symbol-font arrow has no Unicode mapping. Recover it only in a
    // positive percentage column, not in arbitrary private-use text.
    if(r.str==='\uf000' && (items as Run[]).some(next=>next.transform &&
      Math.abs(next.transform[5]-r.transform[5])<2 && next.transform[4]>r.transform[4] &&
      next.transform[4]-r.transform[4]<70 && /\d/.test(next.str)) && (items as Run[]).some(next=>next.transform &&
      Math.abs(next.transform[5]-r.transform[5])<2 && next.transform[4]>r.transform[4] &&
      next.transform[4]-r.transform[4]<90 && /%/.test(next.str))) return {...r,str:'↑'};
    return r;
  });
  const drawnRules: PdfDrawnRule[]=horizontal.map(rule=>({x:rule.x,y:rule.y,width:rule.width}));
  const sizes=new Map<number,number>();
  for(const run of runs){const size=Math.round(run.height);sizes.set(size,(sizes.get(size)||0)+run.str.length);}
  const pageBodySize=Array.from(sizes).sort((a,b)=>b[1]-a[1])[0]?.[0]||12;
  let roots=grids.filter(g=>!grids.some(other=>other!==g && other.width*other.height>g.width*g.height && inside(g,other)));
  const candidates=clips.filter(c=>(runs.some(r=>contains(r,c)) || embeddedImages.some(img=>img.width<c.width*1.1 && containsImg(img,c))) && !roots.some(g=>inside(c,g)&&grids.some(child=>child!==g&&inside(child,g))));
  const leaves=candidates.filter(c=>!candidates.some(other=>other!==c && inside(other,c) && other.width*other.height<c.width*c.height-2));
  // Independently boxed infographic columns have whitespace between cells.
  // Their enclosing clipping rectangle establishes reading order even when
  // those cells do not touch, so keep each panel's text together.
  const panels=candidates.filter(c=>c.height>150 && c.width>140 && c.width<c.height &&
    leaves.filter(l=>l!==c&&inside(l,c)).length>=3);
  const groups: Rect[][]=[];
  const touches=(a:Rect,b:Rect)=>((close(a.x+a.width,b.x)||close(b.x+b.width,a.x)) &&
    Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>2) ||
    ((close(a.y+a.height,b.y)||close(b.y+b.height,a.y)) && Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>2);
  for(const leaf of leaves.filter(l=>!panels.some(p=>inside(l,p)))) {
    const matching=groups.filter(group=>group.some(c=>touches(c,leaf)));
    if(!matching.length) groups.push([leaf]);
    else { matching[0].push(leaf); for(const group of matching.slice(1)){matching[0].push(...group);groups.splice(groups.indexOf(group),1);} }
  }
  const recovered: {box:Rect; markdown:string}[]=[];
  for(const panel of panels) {
    const header=runs.filter(r=>r.transform[4]>=panel.x && r.transform[4]<panel.x+panel.width &&
      r.transform[5]>=panel.y+panel.height && r.transform[5]<panel.y+panel.height+28);
    const box={...panel,height:panel.height+(header.length?28:0)};
    recovered.push({box,markdown:pdfTextBlocks(runs.filter(r=>contains(r,box)),[],false,undefined,fontNames,drawnRules).map(b=>b.markdown).join('\n')});
  }
  for(const group of groups.filter(g=>g.length>=3)) {
    const xs=unique(group.flatMap(c=>[c.x,c.x+c.width])).filter((x,index,array)=>
      index===0 || x-array[index-1]>=3), ys=unique(group.flatMap(c=>[c.y,c.y+c.height]));
    const box={x:xs[0],y:ys[0],width:xs.at(-1)!-xs[0],height:ys.at(-1)!-ys[0]};
    const merged=group.some(c=>xs.some(x=>x>c.x+1&&x<c.x+c.width-1)||ys.some(y=>y>c.y+1&&y<c.y+c.height-1));
    const mdRows:string[][]=[], htmlRows:string[]=[];
    for(let row=ys.length-2;row>=0;row--) {
      const cells=group.filter(c=>close(c.y+c.height,ys[row+1]) && c.width>=3 && c.height>=3).sort((a,b)=>a.x-b.x);
      // Keep empty graphic/logo cells so a title is not shifted to column one.
      for(let col=0;col<xs.length-1;col++) {
        const x=(xs[col]+xs[col+1])/2, y=(ys[row]+ys[row+1])/2;
        if(!group.some(c=>c.width>=3 && c.height>=3 && x>c.x-0.5&&x<c.x+c.width+0.5&&y>c.y-0.5&&y<c.y+c.height+0.5))
          cells.push({x:xs[col],y:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]});
      }
      cells.sort((a,b)=>a.x-b.x);
      const md:string[]=[], html:string[]=[];
      for(const cell of cells) {
        const values=pdfTextBlocks(runs.filter(r=>contains(r,cell)),[],false,undefined,fontNames,drawnRules).map(b=>b.markdown.replace(/^#{1,6}\s+/,''));
        const cellImgs = xs.length >= 3
          ? embeddedImages.filter(img => !img.used && img.width < box.width * 0.85 && containsImg(img, cell))
          : [];
        for (const img of cellImgs) img.used = true;
        const imgHtml = cellImgs
          .map(img => `<p><img src="${escape(img.src)}" alt="${escape(img.alt)}" /></p>`)
          .join('');
        md.push(values.map(s=>s.replace(/\|/g,'\\|')).join('<br>'));
        const colspan=xs.slice(0,-1).filter((x,colIdx)=>{
          const colMid=(x+xs[colIdx+1])/2;
          return colMid>=cell.x-0.5 && colMid<=cell.x+cell.width+0.5;
        }).length || 1;
        const rowspan=ys.slice(0,-1).filter((y,rowIdx)=>{
          const rowMid=(y+ys[rowIdx+1])/2;
          return rowMid>=cell.y-0.5 && rowMid<=cell.y+cell.height+0.5;
        }).length || 1;
        html.push('<td'+(colspan>1?' colspan="'+colspan+'"':'')+(rowspan>1?' rowspan="'+rowspan+'"':'')+'>'+imgHtml+values.map(s=>'<p>'+escapeStyled(s)+'</p>').join('')+'</td>');
      }
      mdRows.push(md);htmlRows.push('<tr>'+html.join('')+'</tr>');
    }
    if (xs.length >= 3 && !htmlRows.some(r => r.includes('<img '))) {
      const aboveImgs = embeddedImages.filter(img => {
        if (img.used || img.width >= box.width * 0.85) return false;
        const cx = img.x + img.width / 2;
        return cx >= box.x - 2 && cx <= box.x + box.width + 2 &&
          img.y >= box.y + box.height - 8 && img.y <= box.y + box.height + 90;
      });
      if (aboveImgs.length >= 2) {
        const imgRowCells: string[] = [];
        for (let col = 0; col < xs.length - 1; col++) {
          const colImgs = aboveImgs.filter(img => {
            const cx = img.x + img.width / 2;
            return cx >= xs[col] - 2 && cx < xs[col + 1] + 2;
          });
          for (const img of colImgs) img.used = true;
          imgRowCells.push('<td>' + colImgs.map(img => `<p><img src="${escape(img.src)}" alt="${escape(img.alt)}" /></p>`).join('') + '</td>');
        }
        htmlRows.unshift('<tr>' + imgRowCells.join('') + '</tr>');
        const maxTop = Math.max(...aboveImgs.map(img => img.y + img.height));
        box.height = Math.max(box.height, maxTop - box.y);
      }
    }
    const hasMultiLineCell = mdRows.some(r => r.some(c => c.includes('<br>'))) || htmlRows.some(r => r.includes('<img '));
    const markdown=merged || xs.length>4 || hasMultiLineCell ? '<table><tbody>'+htmlRows.join('')+'</tbody></table>' :
      ['| '+mdRows[0].join(' | ')+' |','| '+mdRows[0].map(()=>'---').join(' | ')+' |',...mdRows.slice(1).map(r=>'| '+r.join(' | ')+' |')].join('\n');
    recovered.push({box,markdown});
  }
  const distinctRecovered=recovered.filter((candidate,index)=>
    !roots.some(grid=>inside(candidate.box,grid) && (grid.ys.length>2 ||
      ((candidate.markdown.match(/<tr>/g)||[]).length<3 && !candidate.markdown.includes('<img ')))) &&
    !recovered.some((other,otherIndex)=>otherIndex!==index &&
      other.box.width*other.box.height>candidate.box.width*candidate.box.height+2 && inside(candidate.box,other.box)));
  roots=roots.filter(g=>!distinctRecovered.some(r=>inside(g,r.box) || inside(r.box,g)));
  // Large shaded prose panels are editable Markdown quotations. Tables and
  // nested tables keep their existing representation rather than becoming quotes.
  const quotes=filledBoxes.filter((box,i)=>runs.filter(r=>contains(r,box)).reduce((n,r)=>n+r.str.length,0)>100 &&
    !roots.some(g=>inside(g,box)||inside(box,g)) && !filledBoxes.slice(0,i).some(b=>close(b.x,box.x)&&close(b.y,box.y)));
  function table(grid: Grid, forceHtml = false): string {
    const rows: string[]=[];
    const markdownRows: string[][]=[];
    let hasGridImages = false;
    const useHtml=forceHtml || grid.xs.length>4 || grids.some(g=>g!==grid && inside(g,grid));
    const activeCols: number[] = [];
    for (let col = 0; col < grid.xs.length - 1; col++) {
      const colBox = { x: grid.xs[col], y: grid.y, width: grid.xs[col + 1] - grid.xs[col], height: grid.height };
      const midX = (grid.xs[col] + grid.xs[col + 1]) / 2;
      const bridged = horizontal.some(h => h.y >= grid.y - 1 && h.y <= grid.y + grid.height + 1 && h.x <= midX - 1 && h.x + h.width >= midX + 1);
      const hasContent = bridged || runs.some(r => contains(r, colBox)) ||
        grids.some(g => g !== grid && inside(g, colBox)) ||
        embeddedImages.some(img => containsImg(img, colBox));
      if (hasContent) activeCols.push(col);
    }
    const colsToRender = activeCols.length ? activeCols : Array.from({ length: grid.xs.length - 1 }, (_, idx) => idx);
    for(let row=grid.ys.length-2;row>=0;row--) {
      const cells: string[]=[];
      const markdownCells: string[]=[];
      for(const col of colsToRender) {
        const cell={x:grid.xs[col],y:grid.ys[row],width:grid.xs[col+1]-grid.xs[col],height:grid.ys[row+1]-grid.ys[row]};
        const children=grids.filter(g=>g!==grid && inside(g,cell)).filter(g=>!grids.some(other=>
          other!==g && other!==grid && inside(other,cell) && other.width*other.height>g.width*g.height && inside(g,other)));
        const text=runs.filter(r=>contains(r,cell)&&!children.some(g=>contains(r,g)));
        const textBlocks=pdfTextBlocks(text,[],false,undefined,fontNames,drawnRules);
        markdownCells.push(textBlocks.map(b=>b.markdown.replace(/^#{1,6}\s+/, '').replace(/\|/g,'\\|')).join('<br>'));
        const blocks=textBlocks.map(b=>({y:b.y,markdown:'<p>'+escapeStyled(b.markdown)+'</p>'}));
        if (grid.xs.length >= 3) {
          const cellImgs = embeddedImages.filter(img => !img.used && img.width < grid.width * 0.85 && containsImg(img, cell) && !children.some(g => containsImg(img, g)));
          for (const img of cellImgs) {
            img.used = true;
            hasGridImages = true;
            blocks.push({ y: img.y + img.height, markdown: `<p><img src="${escape(img.src)}" alt="${escape(img.alt)}" /></p>` });
          }
        }
        blocks.push(...children.map(g=>({y:g.y+g.height,markdown:table(g,true)})));
        cells.push('<td>'+blocks.sort((a,b)=>b.y-a.y).map(b=>b.markdown).join('')+'</td>');
      }
      rows.push('<tr>'+cells.join('')+'</tr>');
      markdownRows.push(markdownCells);
    }
    if (grid.xs.length >= 3 && !hasGridImages) {
      const aboveImgs = embeddedImages.filter(img => {
        if (img.used || img.width >= grid.width * 0.85) return false;
        const cx = img.x + img.width / 2;
        return cx >= grid.x - 2 && cx <= grid.x + grid.width + 2 &&
          img.y >= grid.y + grid.height - 8 && img.y <= grid.y + grid.height + 90;
      });
      if (aboveImgs.length >= 2) {
        const imgRowCells: string[] = [];
        for (const col of colsToRender) {
          const colImgs = aboveImgs.filter(img => {
            const cx = img.x + img.width / 2;
            return cx >= grid.xs[col] - 2 && cx < grid.xs[col + 1] + 2;
          });
          for (const img of colImgs) img.used = true;
          imgRowCells.push('<td>' + colImgs.map(img => `<p><img src="${escape(img.src)}" alt="${escape(img.alt)}" /></p>`).join('') + '</td>');
        }
        rows.unshift('<tr>' + imgRowCells.join('') + '</tr>');
        hasGridImages = true;
      }
    }
    const hasMultiLineCell = markdownRows.some(r => r.some(c => c.includes('<br>'))) || hasGridImages;
    if(!useHtml && !hasMultiLineCell) return [
      '| '+markdownRows[0].join(' | ')+' |',
      '| '+markdownRows[0].map(()=>'---').join(' | ')+' |',
      ...markdownRows.slice(1).map(row=>'| '+row.join(' | ')+' |')
    ].join('\n');
    return '<table><tbody>'+rows.join('')+'</tbody></table>';
  }
  const outside=runs.filter(r=>!roots.some(g=>contains(r,g))&&!distinctRecovered.some(g=>contains(r,g.box))&&!quotes.some(b=>contains(r,b)));
  const textBlocks=pdfTextBlocks(outside,codeRegions,true,pageBodySize,fontNames,drawnRules);
  const separators=horizontal.filter(rule=>rule.width>pageBodySize*20 &&
    !textBlocks.some(block=>Math.abs(block.y-rule.y)<pageBodySize*1.7 &&
      /^(?:\|[\s\S]*\n\|\s*:?-{3}|<table)/.test(block.markdown)) &&
    !textBlocks.some(block=>Math.abs(block.y-rule.y)<pageBodySize*2.5 &&
      /(?:\*\*|<strong>|<u>|안내사항|제외 대상)/.test(block.markdown)) &&
    !roots.some(grid=>rule.x>=grid.x-1 && rule.x+rule.width<=grid.x+grid.width+1 &&
      rule.y>=grid.y-1 && rule.y<=grid.y+grid.height+1) &&
    !distinctRecovered.some(recovered=>inside(rule,recovered.box)) &&
    !runs.some(run=>Math.abs(run.transform[5]-rule.y)<pageBodySize*2.5 &&
      run.transform[4]<rule.x+rule.width && run.transform[4]+run.width>rule.x) &&
    !runs.some(run=>Math.abs(run.transform[5]-rule.y)<run.height*0.8 &&
      run.transform[4]<rule.x+rule.width && run.transform[4]+run.width>rule.x))
    .filter((rule,index,array)=>!array.slice(0,index).some(previous=>Math.abs(previous.y-rule.y)<2));
  for(let index=0;index<textBlocks.length-2;index++) {
    const title=textBlocks[index];
    const titleText=title.markdown.replace(/<\/?(?:strong|em|u|del)>|\*\*|\*|~~/g,'').trim();
    const titledNotice=/(?:안내사항|유의사항|참고사항)$/.test(titleText);
    const titledExclusions=/^신청 제외 대상\s*\(/.test(titleText);
    if(!titledNotice && !titledExclusions) continue;
    const entries:string[]=[];
    let cursor=index+1;
    const marks='①②③④⑤⑥⑦⑧⑨';
    while(cursor<textBlocks.length) {
      const block=textBlocks[cursor];
      const previous=textBlocks[cursor-1];
      if((cursor===index+1 && title.y-block.y>30) || previous.y-block.y>80) break;
      if(titledNotice) {
        const item=block.markdown.match(/^\s*- ([①②③④⑤⑥⑦⑧⑨])\s+([\s\S]+)/);
        if(!item || item[1]!==marks[entries.length]) break;
        entries.push(`${item[1]} ${item[2].trim()}`);
      } else {
        const item=block.markdown.match(/^(\d+)\.\s+([\s\S]+)/);
        if(item && Number(item[1])===entries.length+1) entries.push(`${item[1]}. ${item[2].trim()}`);
        else if(entries.length && !/^(?:#{1,6}\s|\s*- |<table|\|)/.test(block.markdown) && previous.y-block.y<30)
          entries[entries.length-1]+=` ${block.markdown.trim()}`;
        else break;
      }
      cursor++;
    }
    if(entries.length<2) continue;
    const cell=entries.map(entry=>escapeStyled(entry).replace(/\|/g,'\\|')).join('<br>');
    const header=escapeStyled(title.markdown.trim()).replace(/\|/g,'\\|');
    textBlocks.splice(index,cursor-index,{y:title.y,markdown:`| ${header} |\n| --- |\n| ${cell} |`});
  }
  return [...textBlocks,...separators.map(rule=>({y:rule.y,markdown:'---'})),...roots.map(g=>({y:g.y+g.height,markdown:table(g)})),
    ...distinctRecovered.filter(g=>!quotes.some(b=>inside(g.box,b))).map(g=>({y:g.box.y+g.box.height,markdown:g.markdown})),
    ...quotes.map(box=>({y:box.y+box.height,markdown:pdfTextBlocks(runs.filter(r=>contains(r,box)),[],false,pageBodySize,fontNames,drawnRules)
      .map(b=>'> '+b.markdown.replace(/^#{1,6}\s+/,'')).join('\n')}))];
}
