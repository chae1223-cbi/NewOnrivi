import { pdfTextBlocks, deduplicatePdfRuns, type PdfImportBlock } from './pdfImportLayout';

type Rect = { x: number; y: number; width: number; height: number };
type Grid = Rect & { xs: number[]; ys: number[] };
type Run = { str: string; transform: number[] };
const close = (a: number, b: number) => Math.abs(a-b)<0.8;
const unique = (values: number[]) => values.sort((a,b)=>a-b).filter((v,i,a)=>!i || !close(v,a[i-1]));
const inside = (inner: Rect, outer: Rect) => inner.x>=outer.x-1 && inner.y>=outer.y-1 &&
  inner.x+inner.width<=outer.x+outer.width+1 && inner.y+inner.height<=outer.y+outer.height+1;
const contains = (r: Run, box: Rect) => r.transform[4]>=box.x-0.5 && r.transform[4]<box.x+box.width-0.5 &&
  r.transform[5]>=box.y-0.5 && r.transform[5]<box.y+box.height-0.5;
const escape = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/** Use drawn rules, rather than text gaps, to keep adjacent and nested tables separate. */
export function pdfRuledTableBlocks(items: readonly unknown[], fnArray: number[], argsArray: unknown[][],
  ops: Record<string, number>, codeRegions: Rect[] = []): PdfImportBlock[] {
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
    const ys=unique(horizontal.filter(h=>h.x<=left+1 && h.x+h.width>=right-1 &&
      h.y>=v.y-1 && h.y<=v.y+v.height+1).map(h=>h.y));
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
  const sizes=new Map<number,number>();
  for(const run of runs){const size=Math.round(run.height);sizes.set(size,(sizes.get(size)||0)+run.str.length);}
  const pageBodySize=Array.from(sizes).sort((a,b)=>b[1]-a[1])[0]?.[0]||12;
  let roots=grids.filter(g=>!grids.some(other=>other!==g && other.width*other.height>g.width*g.height && inside(g,other)));
  const candidates=clips.filter(c=>runs.some(r=>contains(r,c)) && !roots.some(g=>inside(c,g)&&grids.some(child=>child!==g&&inside(child,g))));
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
    recovered.push({box,markdown:pdfTextBlocks(runs.filter(r=>contains(r,box)),[],false).map(b=>b.markdown).join('\n')});
  }
  for(const group of groups.filter(g=>g.length>=3)) {
    const xs=unique(group.flatMap(c=>[c.x,c.x+c.width])), ys=unique(group.flatMap(c=>[c.y,c.y+c.height]));
    const box={x:xs[0],y:ys[0],width:xs.at(-1)!-xs[0],height:ys.at(-1)!-ys[0]};
    const merged=group.some(c=>xs.some(x=>x>c.x+1&&x<c.x+c.width-1)||ys.some(y=>y>c.y+1&&y<c.y+c.height-1));
    const mdRows:string[][]=[], htmlRows:string[]=[];
    for(let row=ys.length-2;row>=0;row--) {
      const cells=group.filter(c=>close(c.y+c.height,ys[row+1])).sort((a,b)=>a.x-b.x);
      // Keep empty graphic/logo cells so a title is not shifted to column one.
      for(let col=0;col<xs.length-1;col++) {
        const x=(xs[col]+xs[col+1])/2, y=(ys[row]+ys[row+1])/2;
        if(!group.some(c=>x>c.x-0.5&&x<c.x+c.width+0.5&&y>c.y-0.5&&y<c.y+c.height+0.5))
          cells.push({x:xs[col],y:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]});
      }
      cells.sort((a,b)=>a.x-b.x);
      const md:string[]=[], html:string[]=[];
      for(const cell of cells) {
        const values=pdfTextBlocks(runs.filter(r=>contains(r,cell)),[],false).map(b=>b.markdown.replace(/^#{1,6}\s+/,''));
        md.push(values.map(s=>s.replace(/\|/g,'\\|')).join('<br>'));
        const colspan=xs.filter(x=>x>=cell.x-0.5&&x<cell.x+cell.width-0.5).length;
        const rowspan=ys.filter(y=>y>=cell.y-0.5&&y<cell.y+cell.height-0.5).length;
        html.push('<td'+(colspan>1?' colspan="'+colspan+'"':'')+(rowspan>1?' rowspan="'+rowspan+'"':'')+'>'+values.map(s=>'<p>'+escape(s)+'</p>').join('')+'</td>');
      }
      mdRows.push(md);htmlRows.push('<tr>'+html.join('')+'</tr>');
    }
    const markdown=merged ? '<table><tbody>'+htmlRows.join('')+'</tbody></table>' :
      ['| '+mdRows[0].join(' | ')+' |','| '+mdRows[0].map(()=>'---').join(' | ')+' |',...mdRows.slice(1).map(r=>'| '+r.join(' | ')+' |')].join('\n');
    recovered.push({box,markdown});
  }
  roots=roots.filter(g=>!recovered.some(r=>inside(g,r.box)));
  // Large shaded prose panels are editable Markdown quotations. Tables and
  // nested tables keep their existing representation rather than becoming quotes.
  const quotes=filledBoxes.filter((box,i)=>runs.filter(r=>contains(r,box)).reduce((n,r)=>n+r.str.length,0)>100 &&
    !roots.some(g=>inside(g,box)||inside(box,g)) && !filledBoxes.slice(0,i).some(b=>close(b.x,box.x)&&close(b.y,box.y)));
  function table(grid: Grid, forceHtml = false): string {
    const rows: string[]=[];
    const markdownRows: string[][]=[];
    const useHtml=forceHtml || grids.some(g=>g!==grid && inside(g,grid));
    for(let row=grid.ys.length-2;row>=0;row--) {
      const cells: string[]=[];
      const markdownCells: string[]=[];
      for(let col=0;col<grid.xs.length-1;col++) {
        const cell={x:grid.xs[col],y:grid.ys[row],width:grid.xs[col+1]-grid.xs[col],height:grid.ys[row+1]-grid.ys[row]};
        const children=grids.filter(g=>g!==grid && inside(g,cell)).filter(g=>!grids.some(other=>
          other!==g && other!==grid && inside(other,cell) && other.width*other.height>g.width*g.height && inside(g,other)));
        const text=runs.filter(r=>contains(r,cell)&&!children.some(g=>contains(r,g)));
        const textBlocks=pdfTextBlocks(text,[],false);
        markdownCells.push(textBlocks.map(b=>b.markdown.replace(/^#{1,6}\s+/, '').replace(/\|/g,'\\|')).join('<br>'));
        const blocks=textBlocks.map(b=>({y:b.y,markdown:'<p>'+escape(b.markdown)+'</p>'}));
        blocks.push(...children.map(g=>({y:g.y+g.height,markdown:table(g,true)})));
        cells.push('<td>'+blocks.sort((a,b)=>b.y-a.y).map(b=>b.markdown).join('')+'</td>');
      }
      rows.push('<tr>'+cells.join('')+'</tr>');
      markdownRows.push(markdownCells);
    }
    if(!useHtml) return [
      '| '+markdownRows[0].join(' | ')+' |',
      '| '+markdownRows[0].map(()=>'---').join(' | ')+' |',
      ...markdownRows.slice(1).map(row=>'| '+row.join(' | ')+' |')
    ].join('\n');
    return '<table><tbody>'+rows.join('')+'</tbody></table>';
  }
  const outside=runs.filter(r=>!roots.some(g=>contains(r,g))&&!recovered.some(g=>contains(r,g.box))&&!quotes.some(b=>contains(r,b)));
  return [...pdfTextBlocks(outside,codeRegions,true,pageBodySize),...roots.map(g=>({y:g.y+g.height,markdown:table(g)})),
    ...recovered.filter(g=>!quotes.some(b=>inside(g.box,b))).map(g=>({y:g.box.y+g.box.height,markdown:g.markdown})),
    ...quotes.map(box=>({y:box.y+box.height,markdown:pdfTextBlocks(runs.filter(r=>contains(r,box)),[],false,pageBodySize)
      .map(b=>'> '+b.markdown.replace(/^#{1,6}\s+/,'')).join('\n')}))];
}
