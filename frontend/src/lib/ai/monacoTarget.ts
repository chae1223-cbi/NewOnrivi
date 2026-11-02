import type {AITarget} from './types';
export function captureMonacoAITarget(editor:any,documentId:string,currentId:()=>string|null,scope?:import('./types').AIEditScope):AITarget{
  const model=editor?.getModel(),selection=editor?.getSelection();if(!model||!selection)throw Error('편집할 문서를 선택해 주세요.');
  if(scope==='selection'&&selection.isEmpty())throw Error('수정할 글을 선택해 주세요.');
  if(scope==='reference'&&(!editor.hasTextFocus()||selection.isEmpty()))throw Error('질문할 글을 편집기에서 선택해 주세요.');
  let range=selection;
  if(scope==='paragraph'||selection.isEmpty()){let startLine=selection.startLineNumber,endLine=startLine;while(startLine>1&&model.getLineContent(startLine-1).trim())startLine--;while(endLine<model.getLineCount()&&model.getLineContent(endLine+1).trim())endLine++;range={startLineNumber:startLine,startColumn:1,endLineNumber:endLine,endColumn:model.getLineMaxColumn(endLine)};}
  const original=model.getValueInRange(range),id=model.deltaDecorations([],[{range,options:{className:selection.isEmpty()?'':'onrivi-ai-target',stickiness:1}}])[0];
  let invalid=false,released=false,start=model.getOffsetAt({lineNumber:range.startLineNumber,column:range.startColumn}),end=model.getOffsetAt({lineNumber:range.endLineNumber,column:range.endColumn});
  const metadata=model.getValue().match(/^(?:\uFEFF)?---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if(metadata&&start<metadata[0].length||/!\[|<!--|```|<\/?(?:img|video|iframe)\b/.test(original)){model.deltaDecorations([id],[]);throw Error('메타정보·이미지·코드가 없는 본문 글을 선택해 주세요.');}
  const listener=model.onDidChangeContent((event:any)=>{for(const change of [...event.changes].sort((a:any,b:any)=>b.rangeOffset-a.rangeOffset)){
    const a=change.rangeOffset,b=a+change.rangeLength;if(a<end&&b>start||a===b&&a>=start&&a<=end)invalid=true;
    if(b<=start){const delta=change.text.length-change.rangeLength;start+=delta;end+=delta;}
  }});
  const valid=()=>!released&&!invalid&&!model.isDisposed()&&currentId()===documentId&&editor.getModel()===model&&Boolean(model.getDecorationRange(id))&&model.getValueInRange(model.getDecorationRange(id))===original;
  const release=()=>{released=true;listener.dispose();if(!model.isDisposed())model.deltaDecorations([id],[]);};
  const position=editor.getScrolledVisiblePosition(selection.getStartPosition()),bounds=editor.getDomNode()?.getBoundingClientRect();
  return {documentId,label:scope==='paragraph'||selection.isEmpty()?'현재 문단':'선택한 글',text:original,rect:{top:(bounds?.top||0)+(position?.top||0),bottom:(bounds?.top||0)+(position?.top||0)+20,left:(bounds?.left||0)+(position?.left||0)},focus:()=>editor.focus(),valid,release,
    apply:(result,mode)=>{if(scope==='reference'||!valid()||!result.trim())return false;const target=model.getDecorationRange(id);release();editor.pushUndoStop();editor.executeEdits('onrivi-inline-ai',[{range:mode==='replace'?target:{startLineNumber:target.endLineNumber,startColumn:target.endColumn,endLineNumber:target.endLineNumber,endColumn:target.endColumn},text:mode==='replace'?result:'\n\n'+result,forceMoveMarkers:true}]);editor.pushUndoStop();editor.focus();return true;}};
}
