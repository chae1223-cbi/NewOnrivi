// ====================================================================
// 📊 [OMD-AI-VISUALTARGET-0001 ✅ FIXED] visualTarget.ts
// 🎯 @KICK  : ProseMirror(VisualDocumentEditor) 기반 AI 타겟 캡처 및 편집 결과(마크다운 서식 AST) 문서 적용 엔진
// 🛡️ @GUARD : Rule 1(소스코드 주석 관리), 문서 변경 충돌 감지(valid/invalid), 실행 취소(History) 단일 그룹화, 스키마 호환성 보장
// 🚨 @PATCH : **2026-10-20** — [AI 문서 적용 시 마크다운 서식(헤딩·목록·표·인용구·볼드·링크) 지능형 파싱 및 서식 렌더링 지원]:
//             1) apply(result, 'append') 시 평문 text 노드 강제 삽입을 배제하고 createVisualDocumentCodec을 통해 마크다운 AST(heading, bullet_list, table, strong, link 등)로 정밀 파싱 주입
//             2) editedNodes에서 교체할 텍스트에 마크다운 인라인 문법(**굵게**, *기울임*, ~~취소선~~, <u>밑줄</u>, [링크](url))이 포함된 경우 parseInlineMarkdown을 통해 서식 노드로 자동 변환
//             3) prosemirror-schema-basic 단위 테스트 및 visualSchema 환경 양방향 스키마 호환성 완비
// 🔗 @CALLS : createVisualDocumentCodec, visualSchema
// ====================================================================

import {TextSelection,type Transaction} from 'prosemirror-state';
import type {Schema,Slice} from 'prosemirror-model';
import {Decoration} from 'prosemirror-view';
import type {EditorView} from 'prosemirror-view';
import {closeHistory} from 'prosemirror-history';
import type {AITarget} from './types';
import {createVisualDocumentCodec, visualSchema} from '../visualDocumentCodec';

const HAS_MARKDOWN_REGEX = /(?:^|\n)\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\||```|\$\$)|\*\*|__|\*|_|~~|<u>|<del>|<mark>|`[^`]+`|\[.*?\]\(.*?\)/;

function parseInlineMarkdown(schema:Schema,text:string,fallbackMarks?:any[]):any[]{
  if(!HAS_MARKDOWN_REGEX.test(text)){
    return text ? [schema.text(text,fallbackMarks||[])] : [];
  }
  try{
    const codec=createVisualDocumentCodec(text);
    const firstBlock=codec.doc.firstChild;
    if(firstBlock && firstBlock.isTextblock){
      const inlineNodes:any[]=[];
      firstBlock.forEach(child=>{
        if(schema!==visualSchema){
          try{
            inlineNodes.push(schema.nodeFromJSON(child.toJSON()));
          }catch{
            inlineNodes.push(schema.text(child.textContent,fallbackMarks||[]));
          }
        }else{
          if(fallbackMarks && fallbackMarks.length>0){
            let combined=child.marks;
            for(const m of fallbackMarks){
              if(!combined.some(existing=>existing.type.name===m.type.name)){
                combined=m.addToSet(combined);
              }
            }
            inlineNodes.push(child.mark(combined));
          }else{
            inlineNodes.push(child);
          }
        }
      });
      if(inlineNodes.length>0)return inlineNodes;
    }
  }catch(_){}
  return text ? [schema.text(text,fallbackMarks||[])] : [];
}

function editedNodes(schema:Schema,original:Slice,result:string){
  // Keep unchanged text and its exact marks. Only the edited span receives
  // marks common to that span, so an adjacent link cannot spread to new text.
  const before=original.content.textBetween(0,original.content.size,'\n','\n'),after=result.trim();
  const a=Array.from(before),b=Array.from(after);let head=0,tail=0;
  while(head<Math.min(a.length,b.length)&&a[head]===b[head])head++;
  while(tail<Math.min(a.length-head,b.length-head)&&a[a.length-1-tail]===b[b.length-1-tail])tail++;
  const start=a.slice(0,head).join('').length,end=before.length-(tail?a.slice(-tail).join('').length:0);
  let marks:any=undefined;
  const changed=original.content.cut(start,end);
  changed.forEach(node=>{if(node.isText)marks=marks===undefined?node.marks:marks.filter((mark:any)=>mark.isInSet(node.marks));});
  const nodes:any[]=[];original.content.cut(0,start).forEach(node=>nodes.push(node));
  const changedText=b.slice(head,tail?b.length-tail:b.length).join('');

  if(HAS_MARKDOWN_REGEX.test(changedText)){
    changedText.split('\n').forEach((line,index)=>{
      if(index)nodes.push(schema.nodes.hard_break ? schema.nodes.hard_break.create() : schema.text('\n'));
      if(line)nodes.push(...parseInlineMarkdown(schema,line,marks));
    });
  }else{
    changedText.split('\n').forEach((line,index)=>{
      if(index)nodes.push(schema.nodes.hard_break.create());
      if(line)nodes.push(schema.text(line,marks||[]));
    });
  }
  original.content.cut(end).forEach(node=>nodes.push(node));
  return nodes;
}

type Tracked={from:number;to:number;invalid:boolean;released:boolean;highlight?:boolean};

export class VisualAITargets{
  private targets=new Set<Tracked>();
  map(tr:Transaction){for(const target of Array.from(this.targets)){for(const map of tr.mapping.maps){
    map.forEach((start,end)=>{if(start<target.to&&end>target.from||start===end&&start>=target.from&&start<=target.to)target.invalid=true;});
    const from=map.mapResult(target.from,1),to=map.mapResult(target.to,-1);if(from.deleted||to.deleted)target.invalid=true;target.from=from.pos;target.to=Math.max(from.pos,to.pos);
  }}}
  clear(){for(const t of Array.from(this.targets))t.invalid=true;this.targets.clear();}
  decorations(){return Array.from(this.targets).filter(t=>!t.invalid&&!t.released&&t.highlight!==false&&t.to>t.from).map(t=>Decoration.inline(t.from,t.to,{class:'onrivi-ai-target',style:'background:rgba(168,85,247,.15);outline:1px solid rgba(168,85,247,.3)'}));}
  capture(view:EditorView,documentId:string,scope?:import('./types').AIEditScope):AITarget{
    if(scope==='auto'){let selected=false;try{const reference=this.captureReference(view,documentId);reference.release();selected=true;}catch{}return this.capture(view,documentId,selected?'selection':'document');}
    if(scope==='reference')return this.captureReference(view,documentId);
    if(!view.editable||view.composing)throw Error('한글 입력을 마친 뒤 편집 가능한 문단에서 실행해 주세요.');
    if(scope==='document')return this.captureDocument(view,documentId);
    const selection=view.state.selection,{$from,$to}=selection,empty=scope==='paragraph'||selection.empty;
    if(scope==='selection'&&selection.empty)throw Error('수정할 글을 드래그해 선택하거나 현재 문단을 선택해 주세요.');
    if(scope==='selection'&&!selection.empty&&!$from.sameParent($to))return this.captureDocument(view,documentId,{from:selection.from,to:selection.to});
    if((scope!=='paragraph'&&!$from.sameParent($to))||!['paragraph','heading'].includes($from.parent.type.name))throw Error('한 문단 안의 글을 선택해 주세요. 이미지·코드·표 전체는 아직 수정할 수 없습니다.');
    if(Array.from({length:$from.depth},(_,i)=>$from.node(i+1).type.name).some(n=>['table','table_cell','table_header','blockquote'].includes(n)))throw Error('현재는 일반 문단·제목·목록의 글을 선택해 주세요.');
    const from=empty?$from.start():selection.from,to=empty?$from.end():selection.to;
    const original=view.state.doc.slice(from,to),parent=$from.parent;
    let unsupported=false;
    original.content.forEach(node=>{if(node.type.name!=='hard_break'&&!node.isText)unsupported=true;});
    if(unsupported)throw Error('이미지 등 삽입 요소를 제외하고 글을 선택해 주세요.');
    const tracked:Tracked={from,to,invalid:false,released:false,highlight:!selection.empty};this.targets.add(tracked);
    const refresh=()=>{if(!view.isDestroyed)view.dispatch(view.state.tr.setMeta('onrivi:ai-highlight',true));};
    refresh();const rect=view.coordsAtPos(from);
    const valid=()=>!tracked.invalid&&!tracked.released&&!view.isDestroyed&&view.editable&&view.state.doc.slice(tracked.from,tracked.to).content.eq(original.content);
    const release=()=>{tracked.released=true;this.targets.delete(tracked);refresh();};
    return {documentId,label:empty?(from===to?'여기에 작성':'현재 문단'): '선택한 글',text:original.content.textBetween(0,original.content.size,'\n','\n'),rect,getRect:()=>valid()?view.coordsAtPos(tracked.from):rect,focus:()=>{if(!view.isDestroyed)view.focus();},
      valid,release,
      apply:(result,mode)=>{
        if(!valid()||!result.trim())return false;
        const {schema}=view.state;let tr=view.state.tr;
        if(mode==='replace'){
          const nodes=editedNodes(schema,original,result);
          tr=tr.replaceWith(tracked.from,tracked.to,nodes);
        }else{
          const $pos=tr.doc.resolve(tracked.to),end=$pos.after();
          let nodes:any[]=[];
          if(HAS_MARKDOWN_REGEX.test(result)){
            try{
              const codec=createVisualDocumentCodec(result.trim());
              codec.doc.forEach(child=>{
                if(schema!==visualSchema){
                  try{
                    nodes.push(schema.nodeFromJSON(child.toJSON()));
                  }catch{
                    nodes.push(schema.nodes.paragraph.create(null,schema.text(child.textContent)));
                  }
                }else{
                  nodes.push(child);
                }
              });
            }catch(_){
              nodes=[];
            }
          }
          if(nodes.length===0){
            nodes=result.trim().split(/\n\s*\n/).map(text=>schema.nodes.paragraph.create(null,schema.text(text)));
          }
          tr=tr.insert(end,nodes);tr=tr.setSelection(TextSelection.create(tr.doc,end+1));
        }
        release();view.dispatch(closeHistory(tr).setMeta('onrivi:preserve-viewport',true));
        // Close the history group after applying, without creating a second undo event.
        view.dispatch(closeHistory(view.state.tr));view.focus();return true;
      }};
  }
  private captureReference(view:EditorView,documentId:string):AITarget{
    const selection=view.state.selection,domSelection=document.getSelection();
    if(view.composing||!view.hasFocus()||selection.empty||!domSelection||domSelection.isCollapsed||!domSelection.anchorNode||!domSelection.focusNode||!view.dom.contains(domSelection.anchorNode)||!view.dom.contains(domSelection.focusNode))throw Error('질문할 글을 문서에서 선택해 주세요.');
    const {from,to}=selection,original=view.state.doc.slice(from,to),text=original.content.textBetween(0,original.content.size,'\n','\n');if(!text.trim())throw Error('질문할 글을 선택해 주세요.');
    const tracked:Tracked={from,to,invalid:false,released:false};this.targets.add(tracked);
    const refresh=()=>{if(!view.isDestroyed)view.dispatch(view.state.tr.setMeta('onrivi:ai-highlight',true));};refresh();
    const valid=()=>!tracked.invalid&&!tracked.released&&!view.isDestroyed&&view.state.doc.slice(tracked.from,tracked.to).content.eq(original.content);
    return {documentId,label:'질문에 참고할 선택한 글',text,rect:view.coordsAtPos(from),valid,apply:()=>false,release:()=>{tracked.released=true;this.targets.delete(tracked);refresh();}};
  }
  private captureDocument(view:EditorView,documentId:string,range?:{from:number;to:number}):AITarget{
    const snapshot=view.state.doc,rows:{id:string;text:string;from:number;to:number}[]=[];
    snapshot.descendants((node,pos)=>{
      if(node.type.spec.code||['code_block','frontmatter','html_block'].includes(node.type.name))return false;
      if(!['paragraph','heading'].includes(node.type.name))return;
      let safe=true;node.forEach(child=>{if(!child.isText&&child.type.name!=='hard_break')safe=false;});
      const from=Math.max(pos+1,range?.from??pos+1),to=Math.min(pos+1+node.content.size,range?.to??pos+1+node.content.size);
      if(safe&&from<to){const text=snapshot.textBetween(from,to,'\n','\n');if(text.trim())rows.push({id:String(pos),text,from,to});}
      return false;
    });
    if(!rows.length)throw Error('수정 가능한 본문 문단이 없습니다.');
    if(rows.length>200||rows.reduce((n,row)=>n+row.text.length,0)>100000)throw Error('전체 수정은 200문단·100,000자까지 가능합니다. 문서를 나눠 실행해 주세요.');
    const tracked:Tracked={from:range?.from??0,to:range?.to??snapshot.content.size,invalid:false,released:false,highlight:!!range};this.targets.add(tracked);
    if(range)view.dispatch(view.state.tr.setMeta('onrivi:ai-highlight',true));
    const valid=()=>!tracked.released&&!tracked.invalid&&!view.isDestroyed&&view.editable&&view.state.doc.eq(snapshot);
    const release=()=>{tracked.released=true;this.targets.delete(tracked);if(range&&!view.isDestroyed)view.dispatch(view.state.tr.setMeta('onrivi:ai-highlight',true));};
    return {documentId,label:(range?'선택한 글':'문서 전체')+' · '+rows.length+'문단',text:rows.map(row=>row.text).join('\n\n'),rect:view.coordsAtPos(rows[0].from),valid,release,sections:rows.map(({id,text})=>({id,text})),focus:()=>view.focus(),apply:()=>false,
      applySections:results=>{
        if(!valid()||!Object.keys(results).length||Object.keys(results).some(id=>!rows.some(row=>row.id===id)||typeof results[id]!=='string'||!results[id].trim()))return false;
        let tr=view.state.tr;
        for(const row of [...rows].reverse())if(Object.hasOwn(results,row.id))tr=tr.replaceWith(row.from,row.to,editedNodes(view.state.schema,snapshot.slice(row.from,row.to),results[row.id]));
        release();view.dispatch(closeHistory(tr).setMeta('onrivi:preserve-viewport',true));view.dispatch(closeHistory(view.state.tr));view.focus();return true;
      }};
  }
}
