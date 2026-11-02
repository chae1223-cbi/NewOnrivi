// ====================================================================
// 📊 [OMD-LIB-remarkQuoteIndent-0001] remarkQuoteIndent.ts
// 🎯 @KICK  : 저장된 마크다운 주석(<!-- onrivi:quote-indent -->, <!-- onrivi:list-indent -->)을 AST 노드 속성으로 복원
// 🛡️ @GUARD : 미리보기(MarkdownViewer)에서 인용구 및 리스트의 독립적인 들여쓰기 여백(margin-left) 100% 보존
// 🚨 @PATCH : **2026-10-25** — [리스트 전체 들여쓰기 주석(<!-- onrivi:list-indent=... -->) AST 연동]:
//             1) target.type === 'list' 감지 시 data-onrivi-list-indent 속성을 주입하여 ul/ol 들여쓰기 1:1 보존
// ====================================================================

/** Keep independent quote and list indentation when rendering saved Markdown. */
export function remarkQuoteIndent(){
  return (tree:any)=>{
    const visit=(node:any)=>{
      if(!Array.isArray(node.children))return;
      for(let index=0;index<node.children.length-1;index++){
        const marker=node.children[index],target=node.children[index+1];
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
          target.data={...target.data,hProperties:{...target.data?.hProperties,'data-onrivi-list-indent':value}};
          node.children.splice(index,1);index--;
          continue;
        }
      }
      node.children.forEach(visit);
    };
    visit(tree);
  };
}
