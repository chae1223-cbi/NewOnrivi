// ====================================================================
// 📊 [OMD-LIB-REMARKPAGEBREAK-0001] remarkPageBreak.ts
// 🎯 @KICK  : 마크다운 페이지 나누기 주석/태그를 표준 HTML 노드로 치환하는 Remark 플러그인
// 🛡️ @GUARD : Rule 1(단일 주석 관리), onrivi:page-break, [page-break], \\pagebreak, \\newpage 등 전 패턴 매칭
// 🚨 @PATCH : **2026-10-20** — [PDF 인쇄 시 화면 페이지 나누기 1:1 완벽 일치 및 파싱 정규식 확장]:
//             1) \\pagebreak, \\newpage, HTML div/hr 등 모든 수동 페이지 나누기 패턴을 data-onrivi-page-break='true' 표준 노드로 변환
//             2) className에 onrivi-page-break 및 page-break 동시 부여로 뷰어/위지윅/PDF 출력 100% 호환성 확보
// ====================================================================
export function remarkPageBreak(){
 return (tree:any)=>{
  function visit(node:any){
   const text = String(node.value || '').trim();
   const isPageBreak =
     (node.type === 'html' || node.type === 'text') &&
     (/^(?:<!--\s*(?:onrivi:)?page-?break\s*-->|<!--\s*\[page-?break\]\s*-->|\\pagebreak\b|\\newpage\b|<(?:div|hr)[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>[\s\S]*?(?:<\/(?:div|hr)>)?|<div[^>]*style=["'][^"']*(?:page-break-before|break-before)[^"']*["'][^>]*>[\s\S]*?<\/div>)$/i.test(text));

   if (isPageBreak) {
    node.type = 'html';
    node.value = '<div data-onrivi-page-break="true" class="onrivi-page-break page-break" aria-label="수동 페이지 나누기">수동 페이지 나누기</div>';
   }
   node.children?.forEach(visit);
  }
  visit(tree);
 };
}
