/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.0.1
 * 프로그램 ID : oaar-vm-inputrules
 * 🚨 @PATCH : **2026-10-28** — [번호 리스트 마지막 행에서 하위 레벨 글머리 기호(•) 리스트 전환 및 자동 들여쓰기 지원]:
 *             1) 번호 리스트(ordered_list) 또는 체크리스트의 빈 항목에서 '-', '*', '+' 공백 입력 시 기존 리스트 항목을 글머리 기호 리스트(bullet_list)로 즉시 전환하도록 convertExistingList 가드 복원
 *             2) 번호 리스트의 후속 항목(itemIndex > 0)에서 공백 + 불릿(' - ') 입력 시 또는 리스트 바로 아래 들여쓰기된 문단(Tab)에서 불릿('- ') 입력 시 상위 번호 항목의 하위 레벨 글머리 기호 리스트로 즉시 자동 편입
 * 🚨 @PATCH : **2026-10-25** — [인라인 코드/백틱(`) 내부 서식 태그(<u>, ~~, ** 등) 문자열 보존 가드 신설]:
 *             1) isInsideCode 판정기를 신설하여 code_block 내부, code 마크 활성 상태, 또는 닫히지 않은 열린 백틱(`) 구간 타이핑 중일 때 <u>...</u>, ~~...~~, **...** 등의 서식 자동 변환 규칙 발속을 전면 억제
 *             2) `<u>밑줄 내용</u>` 또는 `~~취소선 내용~~` 등 문법 안내 코드를 작성할 때 내부 태그가 성급하게 스타일 마크로 치환되어 <u>`밑줄`</u> 형태로 오변환되는 결함을 원천 해결
 * 🚨 @PATCH : **2026-10-25** — [코드블록(`) 생성 시 하단 빈 행(문단) 자동 보장 및 CODE 입력란 연동]:
 *             1) ` 뒤 언어 식별자 없이 공백 입력 시 onrivi:focus-code-block 트랜잭션 메타를 전달하여 상단 CODE 언어 입력란에 자동 포커스
 *             2) 코드블록 변환 즉시 하단에 빈 문단(paragraph)을 확실히 보장하여 코드블록 밖에서 곧바로 타이핑을 이어갈 수 있도록 개선
 * 🚨 @PATCH : **2026-10-17** — [콜아웃 인용문(> [!태그]), 코드블록(```), 구분선(--- / ***) 입력 규칙 실행 시 하단 빈 행(paragraph) 자동 추가]:
 *             1) > [!태그] 및 인용문 내 [!태그] 변환 시 인용문 바로 아래에 빈 문단(paragraph)을 자동 추가하여 마우스 클릭으로 다음 작업 진행 지원
 *             2) ```언어명 공백 타이핑으로 코드 블록 변환 시 코드 블록 바로 아래에 빈 문단(paragraph)을 자동 추가하고 커서는 코드 블록 내부에 유지
 *             3) --- 또는 *** 공백 타이핑으로 구분선(horizontal_rule) 변환 시 하단에 빈 문단(paragraph)을 자동 보장하여 연속 타이핑 지원
 * 🚨 @PATCH : **2026-10-14** — [인용문 내 콜아웃 태그([!Note], [!참고] 등) 직접 타이핑 시 자동 변환 지원]:
 *             1) 인용문(blockquote) 내에서 [!Note], [!참고], [!TIP], [!WARNING] 등 태그 직접 타이핑 시 닫는 괄호(']') 입력 즉시 콜아웃 박스로 자동 전환되도록 공백 강제 제약 제거 및 유연한 정규식 개선
 *             2) 일반 문단에서 '> [!태그]' 타이핑 시에도 즉시 해당 스타일의 콜아웃 알림 상자로 자동 생성되도록 개선
 *             3) 영문 태그(Note, tip, warning 등) 대소문자 무관 표준 대문자(NOTE, TIP, WARNING 등) 자동 정규화
 * 🚨 @PATCH : **2026-10-14** — [글머리기호/체크리스트/번호 리스트 직접 타이핑 시 자동 변환(Auto-List InputRule) 및 문단 분할 완벽 지원]:
 *             1) 본문에서 '-', '*', '+', '1.', '- [ ]', '- [x]' 직접 타이핑 시 줄 시작 위치 및 줄바꿈 직후를 정밀 감지하여 bullet_list, ordered_list, task_list로 즉각 자동 변환
 *             2) 기존 텍스트 앞머리에서 리스트 마커 입력 시 해당 문단을 리스트 항목으로 즉각 래핑하고 커서 위치를 자연스럽게 유지
 * 🚨 @PATCH : **2026-10-14** — [인라인 수식($수식$) 타이핑 시 visual_inline_math 노드 자동 변환 및 수식 옆 글쓰기 공백 보장]:
 *             본문에서 $수식$ 타이핑 시 네이티브 visual_inline_math 노드와 함께 후행 공백 텍스트 노드를 생성하고 커서를 그 뒤로 이동시켜, 인라인 수식 직후 끊김 없이 본문 글쓰기가 즉각 이어지도록 보장
 * 🚨 @PATCH : **2026-10-13** — [마크다운 링크([텍스트](url)) 및 일반 URL 타이핑 자동 변환 InputRule 추가]:
 *             1) 본문에서 [텍스트](url) 또는 [텍스트](url] 타이핑 즉시 네이티브 link 마크로 즉각 자동 변환 지원
 *             2) http/https 일반 URL 입력 후 공백 입력 시 자동 링크(Auto Link) 변환 지원
 * 🚨 @PATCH : **2026-10-13** — [밑줄(<u>...</u>) 타이핑 입력 규칙(InputRule) 추가]:
 *             본문에서 <u>...</u> 마크다운 태그 타이핑 시 네이티브 밑줄(underline) 마크로 즉각 자동 변환 지원
 * 🚨 @PATCH : **2026-10-13** — [기존 텍스트 문단에서 마크다운 헤딩(## ) 입력 시 제목 2 정상 전환 및 성급한 H1 오변환 방어]:
 *             1) 기존 텍스트가 있는 문단 앞머리에서 '#' 입력 시 공백 없이 H1으로 즉시 성급하게 변환되던 결함 방어 (후행 텍스트가 있을 때는 '## ' 등 공백 입력 완성 시에만 헤딩 변환)
 *             2) 빈 줄에서는 기존과 동일하게 '#' / '###' 단독 입력 시 즉각 헤딩 전환 동작 100% 호환 보장
 *             3) 이미 헤딩인 블록의 시작 위치에서 '## ' 등 다른 레벨의 마크다운 헤딩 입력 시 해당 레벨(H2 등)로 즉시 승격/전환 지원
 */
import { InputRule, inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules';
// 🚨 @PATCH : **2026-10-21** — [리스트 내부 불릿(-, *, +) 타이핑 시 중첩 리스트 파괴 및 - - / 불릿 2개 생성 원천 방어]:
//             1) bullet_list 및 ordered_list InputRule에 list_item 내부 중복 발동 방어 가드를 추가하여 리스트 안에서 하이픈 타이핑 시 중첩 리스트로 감싸지는 결함 차단
import { Fragment, MarkType } from 'prosemirror-model';
import { EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { visualSchema } from '@/lib/visualDocumentCodec';
import { independentIndentListItem, selectedList } from '@/lib/visualListCommands';

function convertExistingList(state: EditorState, kind:'bullet'|'ordered', start:number,end:number, order=1, shouldIndent=false):Transaction|null {
  const {$from}=state.selection;
  if(start!==$from.start() || $from.parent.type!==visualSchema.nodes.paragraph)return null;
  const tr=state.tr.delete(start,end);
  const next=state.apply(tr);
  let convertedOk = false;
  selectedList(kind)(next, converted=>{
    convertedOk = true;
    converted.steps.forEach(step=>tr.step(step));
    if(kind==='ordered') {
      const position=converted.selection.$from;
      for(let depth=position.depth;depth>0;depth--)if(position.node(depth).type===visualSchema.nodes.ordered_list){
        tr.setNodeMarkup(position.before(depth),undefined,{...position.node(depth).attrs,order});break;
      }
    }
    // Input rules leave the caret at the start of the converted item.
    tr.setSelection(TextSelection.near(tr.doc.resolve(converted.selection.from)));
  });
  if (!convertedOk) return null;
  if (shouldIndent) {
    const afterConvertState = state.apply(tr);
    independentIndentListItem(afterConvertState, indentTr => {
      indentTr.steps.forEach(step => tr.step(step));
      tr.setSelection(TextSelection.near(tr.doc.resolve(indentTr.selection.from)));
    });
  }
  return tr;
}

function isInsideCode(state: EditorState, from: number): boolean {
  const $from = state.doc.resolve(from);
  if ($from.parent.type.name === 'code_block') return true;
  if ($from.marks().some(m => m.type.name === 'code')) return true;
  if (state.storedMarks?.some(m => m.type.name === 'code')) return true;
  const lineBefore = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n');
  const backtickCount = (lineBefore.match(/`/g) || []).length;
  if (backtickCount % 2 === 1) return true;
  return false;
}

function markRule(expression: RegExp, type: MarkType) {
  return new InputRule(expression, (state, match, start, end) => {
    if (type.name !== 'code' && isInsideCode(state, start)) return null;
    const marker = match[1];
    const text = match[2];
    const from = start + match[0].length - marker.length;
    return state.tr.insertText(text, from, end).addMark(from, from + text.length, type.create()).removeStoredMark(type);
  }, { inCodeMark: false });
}

export function buildVisualMarkdownRules(): InputRule[] {
  const { nodes, marks } = visualSchema;
  const insideCell = (state: EditorState) => state.selection.$from.depth > 1 && ['table_cell','table_header'].includes(state.selection.$from.node(state.selection.$from.depth-1).type.name);
  const paragraphOnly = (rule: InputRule) => {
    const guarded = rule as InputRule & { match: RegExp; handler: (state: EditorState, match: RegExpMatchArray, start: number, end: number) => Transaction | null };
    return new InputRule(guarded.match, (state, match, start, end) => {
    if (state.selection.$from.parent.type !== nodes.paragraph || insideCell(state)) return null;
    return guarded.handler(state, match, start, end);
    });
  };
  return [
    new InputRule(/^\[([ xX])\]\s$/, (state,match,start,end)=>{
      const position=state.selection.$from;
      for(let depth=position.depth;depth>0;depth--)if(position.node(depth).type===nodes.list_item)return state.tr.delete(start,end).setNodeMarkup(position.before(depth),undefined,{...position.node(depth).attrs,checked:match[1].toLowerCase()==='x'});
      return null;
    }),
    // Keep hashes as text until the following space confirms the heading level.
    new InputRule(/(?:^|\ufffc)(#{1,6})[ \t](.*)$/, (state,match,start,end)=>{
      const position=state.selection.$from,parent=position.parent;
      if(insideCell(state) || ![nodes.paragraph,nodes.heading].includes(parent.type))return null;
      const title=match[2] || '';
      const hasSpace = match[2] !== undefined;
      if(parent.type===nodes.heading){
        if(!parent.content.size){
          const targetLevel = hasSpace ? match[1].length : Math.min(6, parent.attrs.level + match[1].length);
          return state.tr.insertText(title,start,end).setBlockType(start,start,nodes.heading,{level:targetLevel});
        }
        if(hasSpace && start === position.start()){
          const blockPos = position.before();
          const tr = state.tr.delete(start, end).setNodeMarkup(blockPos, undefined, { ...parent.attrs, level: match[1].length });
          return tr.setSelection(TextSelection.create(tr.doc, start));
        }
        return null;
      }
      if(position.depth>1 && position.node(position.depth-1).type===nodes.list_item)return null;
      const blockStart=position.start(),blockPos=position.before();
      const before=parent.content.cut(0,start-blockStart);
      const remaining=parent.content.cut(end-blockStart);
      if(remaining.size > 0 && !hasSpace) return null;
      let breakOffset=-1;remaining.forEach((node,offset)=>{if(breakOffset<0 && node.type===nodes.hard_break)breakOffset=offset;});
      const titleContent=(title?Fragment.from(state.schema.text(title)):Fragment.empty).append(breakOffset<0?remaining:remaining.cut(0,breakOffset));
      const blocks=[];if(before.size)blocks.push(nodes.paragraph.create(null,before));
      const headingPos=blockPos+(blocks[0]?.nodeSize || 0);
      blocks.push(nodes.heading.create({level:match[1].length},titleContent));
      if(breakOffset>=0)blocks.push(nodes.paragraph.create(null,remaining.cut(breakOffset+1)));
      const tr=state.tr.replaceWith(blockPos,blockPos+parent.nodeSize,blocks);
      return tr.setSelection(TextSelection.create(tr.doc,headingPos+1+title.length));
    }),
    new InputRule(/^ $/, (state,_match,start,end)=>state.selection.$from.parent.type===nodes.heading && !state.selection.$from.parent.content.size ? state.tr.delete(start,end) : null),
    // 인용문(blockquote) 내부에서 [!태그] 또는 [!태그]공백 입력 즉시 콜아웃(Alert)으로 자동 변환
    new InputRule(/(?:^|\ufffc)\s*\[!([^\]]+)\](?:[ \t](.*))?$/, (state, match, start, end) => {
      if (insideCell(state)) return null;
      const position = state.selection.$from;
      for (let depth = position.depth; depth > 0; depth--) {
        if (position.node(depth).type === nodes.blockquote) {
          const rawTag = match[1].trim();
          if (!rawTag) return null;
          const upper = rawTag.toUpperCase();
          const alertType = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'].includes(upper) ? upper : rawTag;
          const remainingText = match[2] || '';
          const bqPos = position.before(depth);
          let tr = state.tr;
          if (remainingText) {
            tr = tr.delete(start, end).insertText(remainingText, start);
          } else {
            tr = tr.delete(start, end);
          }
          tr = tr.setNodeMarkup(bqPos, undefined, { alertType });
          const afterPos = tr.mapping.map(position.after(depth));
          if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== nodes.paragraph) {
            const savedPos = tr.selection.from;
            tr = tr.insert(afterPos, nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, savedPos));
          }
          return tr;
        }
      }
      return null;
    }),
    // 일반 문단에서 > [!태그] 또는 > [!태그]공백 타이핑 즉시 콜아웃 박스로 즉시 변환
    paragraphOnly(new InputRule(/(?:^|\ufffc)\s*>\s*\[!([^\]]+)\](?:[ \t](.*))?$/, (state, match, start, end) => {
      if (insideCell(state)) return null;
      const position = state.selection.$from;
      const parent = position.parent;
      if (parent.type !== nodes.paragraph) return null;
      const rawTag = match[1].trim();
      if (!rawTag) return null;
      const upper = rawTag.toUpperCase();
      const alertType = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'].includes(upper) ? upper : rawTag;
      const remainingText = match[2] || '';
      const blockPos = position.before();

      const newParagraph = nodes.paragraph.create(null, remainingText ? state.schema.text(remainingText) : null);
      const newBlockquote = nodes.blockquote.create({ alertType }, [newParagraph]);

      const tr = state.tr.replaceWith(blockPos, blockPos + parent.nodeSize, [newBlockquote, nodes.paragraph.create()]);
      return tr.setSelection(TextSelection.create(tr.doc, blockPos + 2 + remainingText.length));
    })),
    // 체크리스트 (- [ ] 또는 - [x]) 타이핑 즉시 task list 변환
    new InputRule(/(?:^|\ufffc)\s*([-+*])\s+\[([ xX])\]\s$/, (state, match, start, end) => {
      const position = state.selection.$from;
      const parent = position.parent;
      if (parent.type !== nodes.paragraph || insideCell(state)) return null;
      const blockStart = position.start();
      const blockPos = position.before();
      const beforeContent = parent.content.cut(0, start - blockStart);
      let cleanBefore = beforeContent;
      if (cleanBefore.lastChild?.type === nodes.hard_break) {
        cleanBefore = cleanBefore.cut(0, cleanBefore.size - 1);
      }
      const afterContent = parent.content.cut(end - blockStart);
      const bullet = match[1];
      const checked = match[2].toLowerCase() === 'x';
      const listItem = nodes.list_item.create(
        { checked },
        nodes.paragraph.create(null, afterContent)
      );
      const bulletList = nodes.bullet_list.create({ bullet }, listItem);
      let tr = state.tr;
      if (cleanBefore.size > 0) {
        const prevParagraph = nodes.paragraph.create(null, cleanBefore);
        tr = tr.replaceWith(blockPos, blockPos + parent.nodeSize, [prevParagraph, bulletList]);
        const listPos = blockPos + prevParagraph.nodeSize;
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(listPos + 2)));
      } else {
        tr = tr.replaceWith(blockPos, blockPos + parent.nodeSize, bulletList);
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(blockPos + 2)));
      }
      return tr;
    }),
    // 글머리 기호 (-, *, +) 타이핑 즉시 bullet_list 변환
    new InputRule(/(?:^|\ufffc)\s*([-+*])\s$/, (state, match, start, end) => {
      const position = state.selection.$from;
      const parent = position.parent;
      if (parent.type !== nodes.paragraph || insideCell(state)) return null;
      const hasLeadingSpace = /^\s/.test(match[0].replace(/^\ufffc/, ''));
      let inListItem = false;
      for (let d = position.depth; d > 0; d--) {
        if (position.node(d).type === nodes.list_item) {
          inListItem = true;
          break;
        }
      }
      if (inListItem) {
        const listNode = position.depth >= 3 ? position.node(position.depth - 2) : null;
        const itemNode = position.depth >= 2 ? position.node(position.depth - 1) : null;
        const isOrderedOrTask = listNode?.type === nodes.ordered_list || (itemNode && itemNode.attrs.checked !== null);
        if (!isOrderedOrTask || start !== position.start() || end !== position.end()) {
          return null;
        }
        return convertExistingList(state, 'bullet', start, end, 1, hasLeadingSpace);
      }
      const converted=convertExistingList(state,'bullet',start,end,1,hasLeadingSpace);
      if(converted)return converted;
      const blockStart = position.start();
      const blockPos = position.before();
      const beforeContent = parent.content.cut(0, start - blockStart);
      let cleanBefore = beforeContent;
      if (cleanBefore.lastChild?.type === nodes.hard_break) {
        cleanBefore = cleanBefore.cut(0, cleanBefore.size - 1);
      }
      const afterContent = parent.content.cut(end - blockStart);
      const bullet = match[1];
      const paragraphIndentPx = parent.attrs.indentPx ?? null;
      const listItem = nodes.list_item.create(
        null,
        nodes.paragraph.create(null, afterContent)
      );
      const bulletList = nodes.bullet_list.create({ bullet, indentPx: paragraphIndentPx }, listItem);
      let tr = state.tr;
      if (cleanBefore.size > 0) {
        const prevParagraph = nodes.paragraph.create(null, cleanBefore);
        tr = tr.replaceWith(blockPos, blockPos + parent.nodeSize, [prevParagraph, bulletList]);
        const listPos = blockPos + prevParagraph.nodeSize;
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(listPos + 2)));
      } else {
        const prevNode = blockPos > 0 ? state.doc.resolve(blockPos).nodeBefore : null;
        const prevIsList = Boolean(prevNode && ['bullet_list', 'ordered_list'].includes(prevNode.type.name));
        const shouldAutoNest = prevIsList && ((paragraphIndentPx && paragraphIndentPx > 0) || hasLeadingSpace);
        const listToInsert = shouldAutoNest ? nodes.bullet_list.create({ bullet }, listItem) : bulletList;
        tr = tr.replaceWith(blockPos, blockPos + parent.nodeSize, listToInsert);
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(blockPos + 2)));
        if (shouldAutoNest) {
          const nextState = state.apply(tr);
          independentIndentListItem(nextState, indentTr => {
            indentTr.steps.forEach(step => tr.step(step));
            tr.setSelection(TextSelection.near(tr.doc.resolve(indentTr.selection.from)));
          });
        }
      }
      return tr;
    }),
    // 번호 리스트 (1., 2. 등) 타이핑 즉시 ordered_list 변환
    new InputRule(/(?:^|\ufffc)\s*(\d+)[.)]\s$/, (state, match, start, end) => {
      const position = state.selection.$from;
      const parent = position.parent;
      if (parent.type !== nodes.paragraph || insideCell(state)) return null;
      for (let d = position.depth; d > 0; d--) { if (position.node(d).type === nodes.list_item) return null; }
      // In an existing bullet/checklist, "1. " is editable item text.
      // Changing its list type is an explicit toolbar action.
      if(position.depth>=2 && position.node(position.depth-2).type===nodes.bullet_list)return null;
      const converted=convertExistingList(state,'ordered',start,end,Number(match[1]));
      if(converted)return converted;
      const blockStart = position.start();
      const blockPos = position.before();
      const beforeContent = parent.content.cut(0, start - blockStart);
      let cleanBefore = beforeContent;
      if (cleanBefore.lastChild?.type === nodes.hard_break) {
        cleanBefore = cleanBefore.cut(0, cleanBefore.size - 1);
      }
      const afterContent = parent.content.cut(end - blockStart);
      const order = Number(match[1]);
      const listItem = nodes.list_item.create(
        null,
        nodes.paragraph.create(null, afterContent)
      );
      const orderedList = nodes.ordered_list.create({ order }, listItem);
      let tr = state.tr;
      if (cleanBefore.size > 0) {
        const prevParagraph = nodes.paragraph.create(null, cleanBefore);
        tr = tr.replaceWith(blockPos, blockPos + parent.nodeSize, [prevParagraph, orderedList]);
        const listPos = blockPos + prevParagraph.nodeSize;
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(listPos + 2)));
      } else {
        tr = tr.replaceWith(blockPos, blockPos + parent.nodeSize, orderedList);
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(blockPos + 2)));
      }
      return tr;
    }),
    paragraphOnly(new InputRule(/^```([a-zA-Z0-9_-]*)\s$/, (state, match, start, end) => {
      let tr = state.tr.delete(start, end).setBlockType(start, start, nodes.code_block, { params: match[1] });
      const $from = tr.selection.$from;
      if ($from.parent.type === nodes.code_block) {
        const afterPos = $from.after();
        const savedPos = tr.selection.from;
        if (afterPos >= tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== nodes.paragraph) {
          tr = tr.insert(afterPos, nodes.paragraph.create());
        } else if (tr.doc.nodeAt(afterPos)?.content.size !== 0) {
          tr = tr.insert(afterPos, nodes.paragraph.create());
        }
        tr = tr.setSelection(TextSelection.create(tr.doc, savedPos));
      }
      if (!match[1]) {
        tr = tr.setMeta('onrivi:focus-code-block', true);
      }
      return tr;
    })),
    new InputRule(/^(?:---|\*\*\*)\s$/, (state, _match, start, end) => {
      if (state.selection.$from.parent.type !== nodes.paragraph || insideCell(state)) return null;
      const hrNode = nodes.horizontal_rule.create();
      let tr = state.tr.delete(start, end).replaceWith(start - 1, start + 1, hrNode);
      const afterPos = start - 1 + hrNode.nodeSize;
      if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== nodes.paragraph) {
        tr = tr.insert(afterPos, nodes.paragraph.create());
      }
      tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
      return tr;
    }),
    markRule(/(?:^|[^*])(\*\*([^*\n]+)\*\*)$/, marks.strong),
    markRule(/(?:^|[^_])(__(.+?)__)$/, marks.strong),
    markRule(/(?:^|[^*])(\*([^*\n]+)\*)$/, marks.em),
    markRule(/(?:^|[^\w_])(_([^_\n]+)_)$/, marks.em),
    markRule(/(~~([^~\n]+)~~)$/, marks.strike),
    markRule(/(`([^`\n]+)`)$/, marks.code),
    new InputRule(/(<u>([^<\n]+)<\/u>)$/, (state, match, start, end) => {
      if (isInsideCode(state, start)) return null;
      const text = match[2];
      const from = start + match[0].length - match[1].length;
      return state.tr.insertText(text, from, end).addMark(from, from + text.length, marks.underline.create()).removeStoredMark(marks.underline);
    }, { inCodeMark: false }),
    // 마크다운 링크 입력 규칙: [텍스트](url) 및 [텍스트](url] 입력 시 네이티브 link 마크로 즉각 변환
    new InputRule(/(?:^|[^\\])(\[([^\]\n]+)\]\((https?:\/\/[^\s\)]+|mailto:[^\s\)]+|\/[^\s\)]+|#[^\s\)]+|\.[^\s\)]*)(?:\)|\]))$/, (state, match, start, end) => {
      if (isInsideCode(state, start)) return null;
      const fullMatch = match[1];
      const text = match[2];
      const href = match[3];
      const from = start + match[0].length - fullMatch.length;
      return state.tr
        .insertText(text, from, end)
        .addMark(from, from + text.length, marks.link.create({ href }))
        .removeStoredMark(marks.link);
    }, { inCodeMark: false }),
    // 일반 URL 자동 링크 입력 규칙: https:// 또는 http:// URL 입력 후 공백 입력 시 link 마크 자동 적용
    new InputRule(/(?:^|\s)(https?:\/\/[^\s]+)\s$/, (state, match, start, end) => {
      if (isInsideCode(state, start)) return null;
      const url = match[1];
      const from = start + match[0].length - url.length - 1;
      const to = from + url.length;
      return state.tr
        .addMark(from, to, marks.link.create({ href: url }))
        .removeStoredMark(marks.link);
    }, { inCodeMark: false }),
    // 인라인 수식 입력 규칙: $수식$ 타이핑 시 네이티브 visual_inline_math 노드로 즉각 변환 및 후행 공백 삽입으로 옆에 글쓰기 보장
    new InputRule(/(?:^|[^\\])(\$([^\$\n]+)\$)$/, (state, match, start, end) => {
      if (isInsideCode(state, start)) return null;
      const fullMatch = match[1];
      const latex = match[2].trim();
      if (!latex) return null;
      const from = start + match[0].length - fullMatch.length;
      const mathNode = nodes.visual_inline_math.create({ latex });
      const spaceNode = state.schema.text(' ');
      const tr = state.tr.replaceWith(from, end, [mathNode, spaceNode]);
      return tr.setSelection(TextSelection.create(tr.doc, from + mathNode.nodeSize + spaceNode.nodeSize));
    }, { inCodeMark: false }),
  ];
}

export function visualMarkdownInputRules() {
  return inputRules({ rules: buildVisualMarkdownRules() });
}
