// ====================================================================
// 📊 [OMD-LIB-remarkQuoteIndent-0001] remarkQuoteIndent.ts
// 🎯 @KICK  : 저장된 마크다운 주석(<!-- onrivi:quote-indent -->, <!-- onrivi:list-indent -->, <!-- onrivi:list-boundary -->)을 AST 노드 속성으로 복원
// 🛡️ @GUARD : 미리보기(MarkdownViewer)에서 인용구 및 리스트의 독립적인 들여쓰기 여백(margin-left) 및 단계별 레벨(data-onrivi-list-level) 100% 보존
// 🚨 @PATCH : **2026-11-14** — [리스트 단계 속성(data-onrivi-list-level) 주입 및 list-boundary 주석 정제]:
//             1) onrivi:list-indent 감지 시 data-onrivi-list-level(2/3단계) 속성을 함께 주입하여 미리보기에서도 단계별 기호 일치 보장
//             2) onrivi:list-boundary 주석 노드를 AST에서 정제하여 인접 리스트 간 CSS 선택자(:has(+ :is(ul, ol))) 동작 보장
// 🚨 @PATCH : **2026-10-25** — [리스트 전체 들여쓰기 주석(<!-- onrivi:list-indent=... -->) AST 연동]:
//             1) target.type === 'list' 감지 시 data-onrivi-list-indent 속성을 주입하여 ul/ol 들여쓰기 1:1 보존
// ====================================================================

/** Keep independent quote and list indentation when rendering saved Markdown. */
export function remarkQuoteIndent(){
  return (tree:any)=>{
    const visit=(node:any)=>{
      if(!Array.isArray(node.children))return;
      for(let index=0;index<node.children.length;index++){
        const marker=node.children[index];
        if(marker.type==='html' && /^<!--\s*onrivi:list-boundary\s*-->$/.test(String(marker.value||'').trim())){
          node.children.splice(index,1);index--;
          continue;
        }
        if(index>=node.children.length-1)continue;
        const target=node.children[index+1];
        const quoteMatch=marker.type==='html' && String(marker.value||'').trim().match(/^<!--\s*onrivi:quote-indent=(\d+(?:\.\d+)?)\s*-->$/);
        if(quoteMatch && target.type==='blockquote'){
          const value=Math.max(0,Math.min(4096,Number(quoteMatch[1])));
          target.data={...target.data,hProperties:{...target.data?.hProperties,'data-onrivi-quote-indent':value}};
          node.children.splice(index,1);index--;
          continue;
        }
        const listMatch=marker.type==='html' && String(marker.value||'').trim().match(/^<!--\s*onrivi:list-indent=(\d+(?:\.\d+)?)\s*-->$/);
        if(listMatch && target.type==='list'){
          const value=Math.max(0,Math.min(4096,Number(listMatch[1])));
          const level=value>=50?'3':value>0?'2':undefined;
          target.data={...target.data,hProperties:{...target.data?.hProperties,'data-onrivi-list-indent':value,...(level?{'data-onrivi-list-level':level}:{})}};
          node.children.splice(index,1);index--;
          continue;
        }
      }
      node.children.forEach(visit);
    };
    visit(tree);
  };
}
