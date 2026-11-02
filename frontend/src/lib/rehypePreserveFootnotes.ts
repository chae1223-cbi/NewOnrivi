import { visit } from 'unist-util-visit';

export function rehypePreserveFootnotes() {
  return (tree: any) => {
    // 1. 본문 내 각주 링크 텍스트를 원본 식별자로 복구
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' && node.properties && node.properties.dataFootnoteRef !== undefined) {
        const href = node.properties.href;
        if (typeof href === 'string') {
          // #user-content-fn-키워드
          const match = href.match(/#user-content-fn-(.+)$/);
          if (match && node.children && node.children.length > 0 && node.children[0].type === 'text') {
            node.children[0].value = match[1];
          }
        }
      }
    });

    // 2. 하단 각주 목록을 원본 식별자 순으로 정렬 및 번호 강제 지정, 제목 변경
    visit(tree, 'element', (node) => {
      if (node.tagName === 'section' && node.properties && node.properties.dataFootnotes !== undefined) {
        // 제목 변경 (Footnotes -> 각주(Footnotes))
        const h2 = node.children.find((c: any) => c.tagName === 'h2' && c.properties?.id === 'footnote-label');
        if (h2 && h2.children && h2.children.length > 0 && h2.children[0].type === 'text') {
          h2.children[0].value = '각주( FootNote )';
        }
        if (h2 && h2.properties) {
          // Remove sr-only to make it visible, and add Tailwind classes for styling
          h2.properties.className = ['text-sm', 'font-bold', 'text-gray-500', 'mb-2', 'mt-2', 'dark:text-gray-400'];
        }
        
        // Add a line separator (hr) before the h2 if it doesn't exist
        const hrIndex = node.children.findIndex((c: any) => c.tagName === 'hr');
        if (hrIndex === -1 && h2) {
          const h2Index = node.children.indexOf(h2);
          node.children.splice(h2Index, 0, {
            type: 'element',
            tagName: 'hr',
            properties: { className: ['my-4', 'border-t-2', 'border-gray-200', 'dark:border-gray-700'] },
            children: []
          });
        }

        const ol = node.children.find((c: any) => c.tagName === 'ol');
        if (ol) {
          const lis = ol.children.filter((c: any) => c.tagName === 'li');
          // ol 태그에 여백 제거 클래스 부여
          ol.properties = ol.properties || {};
          ol.properties.className = ['!space-y-0', '!my-0', '!py-0', 'text-sm'];
          ol.properties.style = 'margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; gap: 0 !important;';

          lis.forEach((li: any) => {
            // li 태그에 여백 제거 클래스 부여
            li.properties = li.properties || {};
            li.properties.className = ['!my-0', '!py-0', '!leading-tight'];
            li.properties.style = 'margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; line-height: 1.25 !important;';

            // li 내부의 p 태그 찾아서 여백 제거
            if (li.children) {
              const p = li.children.find((c: any) => c.tagName === 'p');
              if (p) {
                p.properties = p.properties || {};
                p.properties.className = ['!my-0', '!py-0'];
                p.properties.style = 'margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important;';
              }
            }

            const id = li.properties.id;
            if (typeof id === 'string') {
              const match = id.match(/^user-content-fn-(.+)$/);
              if (match) {
                // 식별자가 숫자인 경우 정렬 기준을 위해 저장하고, value 속성에 지정하여 브라우저가 해당 번호로 렌더링하도록 함
                const num = parseInt(match[1], 10);
                if (!isNaN(num)) {
                  li.properties.value = num;
                  li.__originalIdNum = num;
                } else {
                  li.__originalIdStr = match[1];
                }
              }
            }
          });
          
          // 숫자 ID가 있는 것들 우선 정렬, 그다음 문자열 ID
          lis.sort((a: any, b: any) => {
            if (a.__originalIdNum !== undefined && b.__originalIdNum !== undefined) {
              return a.__originalIdNum - b.__originalIdNum;
            }
            if (a.__originalIdNum !== undefined) return -1;
            if (b.__originalIdNum !== undefined) return 1;
            return (a.__originalIdStr || '').localeCompare(b.__originalIdStr || '');
          });

          ol.children = [];
          lis.forEach((li: any) => {
            ol.children.push(li);
          });
        }
      }
    });
  };
}
