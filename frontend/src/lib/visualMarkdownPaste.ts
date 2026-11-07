// ====================================================================
// 📊 [OMD-IO-visualMarkdownPaste] frontend/src/lib/visualMarkdownPaste.ts
// 🎯 @KICK  : Markdown 붙여넣기를 ProseMirror 문서 및 표 셀 트랜잭션으로 변환
// 🛡️ @GUARD : 링크 문구는 현재 문단 안에 삽입하고 표·목록 블록 구조는 유지
// 🚨 @PATCH : 2026-11-07 — [HTML 표 및 다이어그램 source_block 붙여넣기 시 명시적 블록 보존]: source_block 노드를 isExplicitBlock에 포함하여 HTML 표 붙여넣기 시 인라인 텍스트로 분해되지 않고 독립 블록 형태로 온전히 유지되도록 개선
// 🚨 @PATCH : 2026-11-07 — [코드블록 형태 복사 붙여넣기 시 code_block 노드 보존 및 인라인 분해 방지]: 붙여넣는 마크다운이 code_block 등 명시적 블록인 경우(isExplicitBlock) 텍스트 인라인 분해(singleTextblock) 대상에서 제외하고, 빈 문단일 경우 해당 문단을 code_block 노드로 안전 교체하여 코드블록 형태(박스 컨트롤) 그대로 온전히 안착하도록 수정
// 🚨 @PATCH : 2026-11-07 — [태그 텍스트 붙여넣기 시 현재 커서 위치 인라인 삽입 및 다음 행 밀림 원천 방어]: 앞뒤 개행 정돈(trimmedSource), 인라인 대상(isInlineTarget) 및 문장 중간 붙여넣기 시 리스트/인용/헤딩 블록의 인라인 내용을 추출하여 Slice(inlineContent, 0, 0)로 삽입하고 커서를 삽입 콘텐츠 바로 뒤(insertPos + inlineContent.size)로 안착시켜 다음 줄 밀림 결함 완벽 해소
// 🚨 @PATCH : 2026-11-07 — [태그 텍스트 붙여넣기 시 다음 행 줄바꿈 밀림 방지]: 단일 행(isSingleLine) 및 1개 텍스트블록(paragraph, heading 등) 붙여넣기 시 현재 커서 위치에 인라인 슬라이스(Slice(content, 0, 0))로 삽입하여 문단 분할 결함 해소
// 🚨 @PATCH : 2026-11-05 — [문서 링크 붙여넣기 위치]: 한 문단짜리 Markdown은 현재 문단 내부에 삽입한다.
// 🔗 @CALLS : createVisualDocumentCodec, bulletNumbersAsText
// ====================================================================
import { createVisualDocumentCodec, visualSchema } from '@/lib/visualDocumentCodec';
import { EditorState, TextSelection } from 'prosemirror-state';
import { Fragment, Node as DocumentNode, Slice } from 'prosemirror-model';
import { bulletNumbersAsText } from './bulletNumberText';

type Codec = ReturnType<typeof createVisualDocumentCodec>;

function fields(prefix: string) {
  const header = prefix.match(/^\uFEFF?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---/)
    || prefix.match(/^---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---/);
  const result = new Map<string, string>();
  let key = '';
  for (const line of (header?.[1] || '').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:/);
    if (match) { key = match[1]; result.set(key, line); }
    else if (key) result.set(key, `${result.get(key)}\n${line}`);
  }
  return result;
}

export function mergePastedFrontmatter(current: string, incoming: string) {
  if (!incoming.trim()) return current;
  if (!current.trim()) return incoming;
  const incomingFields = fields(incoming);
  const extra = Array.from(fields(current)).filter(([key]) => !incomingFields.has(key)).map(([, value]) => value.trimEnd());
  if (!extra.length) return incoming;
  const newline = incoming.includes('\r\n') ? '\r\n' : '\n';
  return incoming.replace(/\r?\n---([^\S\r\n]*(?:\r?\n|$))/, `${newline}${extra.join(newline)}${newline}---$1`);
}

export function markdownPasteTransaction(state: EditorState, codec: Codec, source: string) {
  const { $from, $to } = state.selection;
  const insideBullet = Array.from({ length: $from.depth }, (_, index) => $from.node(index + 1).type.name).includes('bullet_list');

  // 앞뒤 불필요한 공백 및 개행 정돈
  const trimmedSource = source.replace(/^\r?\n+|\r?\n+$/g, '');
  const isSingleLine = !/[\r\n]/.test(trimmedSource);
  const isInlineTarget = $from.parent.isTextblock && $to.parent.isTextblock;
  const isMiddleOfTextblock = isInlineTarget && ($from.parentOffset > 0 || $from.parent.content.size > 0);

  const pasted = createVisualDocumentCodec(bulletNumbersAsText(trimmedSource, insideBullet));
  codec.adopt(pasted);
  const empty = state.doc.childCount === 1 && state.doc.firstChild?.type.name === 'paragraph' && !state.doc.firstChild.content.size;
  const meaningfulBlocks = Array.from({ length: pasted.doc.childCount }, (_, index) => pasted.doc.child(index))
    .filter(node => node.type !== visualSchema.nodes.paragraph || node.content.size > 0);

  // 명시적 블록 노드 (code_block, table, source_block, math, media, image, hr, page_break 등)는 인라인 분해 대상에서 엄격히 제외
  const isExplicitBlock = meaningfulBlocks.length === 1 && (
    meaningfulBlocks[0].type === visualSchema.nodes.code_block ||
    meaningfulBlocks[0].type === visualSchema.nodes.table ||
    meaningfulBlocks[0].type === visualSchema.nodes.source_block ||
    meaningfulBlocks[0].type === visualSchema.nodes.visual_image ||
    meaningfulBlocks[0].type === visualSchema.nodes.visual_media ||
    meaningfulBlocks[0].type === visualSchema.nodes.visual_math ||
    meaningfulBlocks[0].type === visualSchema.nodes.page_break ||
    meaningfulBlocks[0].type === visualSchema.nodes.horizontal_rule
  );

  const singleTextblock = !isExplicitBlock && meaningfulBlocks.length === 1 && (
    meaningfulBlocks[0].type === visualSchema.nodes.paragraph ||
    (meaningfulBlocks[0].isTextblock && meaningfulBlocks[0].type !== visualSchema.nodes.code_block)
  );
  
  // 인라인으로 삽입해야 하는 경우:
  // 1) 커서가 텍스트블록 내부의 중간(isMiddleOfTextblock)에 위치하여 문단 분할을 방지해야 할 때
  // 2) 붙여넣는 내용이 단일 텍스트블록(singleTextblock)이거나 단일 줄(isSingleLine)인 경우
  const inlineParagraph = !isExplicitBlock && isInlineTarget && (
    (isMiddleOfTextblock && isSingleLine && meaningfulBlocks.every(n => n.type !== visualSchema.nodes.code_block)) ||
    singleTextblock ||
    (isSingleLine && meaningfulBlocks.every(n => n.isTextblock && n.type !== visualSchema.nodes.code_block))
  );

  let inlineContent: Fragment = Fragment.empty;
  if (inlineParagraph) {
    if (singleTextblock) {
      inlineContent = meaningfulBlocks[0].content;
    } else if (
      meaningfulBlocks.length === 1 &&
      (meaningfulBlocks[0].type === visualSchema.nodes.bullet_list ||
        meaningfulBlocks[0].type === visualSchema.nodes.ordered_list ||
        meaningfulBlocks[0].type === visualSchema.nodes.blockquote)
    ) {
      const firstChild = meaningfulBlocks[0].firstChild;
      if (firstChild?.isTextblock) {
        inlineContent = firstChild.content;
      } else if (firstChild?.firstChild?.isTextblock) {
        inlineContent = firstChild.firstChild.content;
      } else {
        inlineContent = Fragment.from(visualSchema.text(trimmedSource));
      }
    } else {
      const fragments: DocumentNode[] = [];
      meaningfulBlocks.forEach(b => {
        if (b.isTextblock) {
          b.content.forEach(child => fragments.push(child));
        }
      });
      inlineContent = Fragment.fromArray(fragments);
    }
  }

  let transaction = state.tr;
  if (empty) {
    transaction = transaction.replaceWith(0, state.doc.content.size, pasted.doc.content);
  } else if (inlineParagraph && inlineContent.size > 0) {
    const insertPos = state.selection.from;
    transaction = transaction.replaceSelection(new Slice(inlineContent, 0, 0));
    // 정확히 삽입된 인라인 콘텐츠 끝에 커서를 안착시켜 다음 줄 밀림 차단
    const newPos = Math.min(insertPos + inlineContent.size, transaction.doc.content.size);
    transaction.setSelection(TextSelection.create(transaction.doc, newPos));
  } else if (isExplicitBlock && $from.parent.type === visualSchema.nodes.paragraph && $from.parent.content.size === 0) {
    // 텅 빈 문단에서 명시적 블록(코드블록 등)을 붙여넣으면 빈 문단을 블록 노드로 완전 교체하여 불필요한 빈 줄 방어
    const fromBefore = $from.before();
    const fromAfter = $from.after();
    transaction = transaction.replaceWith(fromBefore, fromAfter, pasted.doc.content);
    const newPos = Math.min(fromBefore + pasted.doc.content.size, transaction.doc.content.size);
    transaction.setSelection(TextSelection.near(transaction.doc.resolve(newPos), 1));
  } else {
    transaction = transaction.replaceSelection(new Slice(pasted.doc.content, 0, 0));
    const mappedPos = Math.min(transaction.mapping.map(state.selection.to), transaction.doc.content.size);
    transaction.setSelection(TextSelection.near(transaction.doc.resolve(mappedPos), 1));
  }

  if (pasted.doc.attrs.frontmatter.trim()) {
    transaction.setDocAttribute('frontmatter', mergePastedFrontmatter(state.doc.attrs.frontmatter, pasted.doc.attrs.frontmatter));
  }
  transaction.setStoredMarks([]);
  return transaction.scrollIntoView();
}

// A table cell accepts inline content. Inserting a document slice here can split
// the surrounding table, so keep Markdown marks while flattening block boundaries.
export function markdownPasteInTableCellTransaction(state: EditorState, source: string) {
  const parsed = createVisualDocumentCodec(source).doc;
  const inline: DocumentNode[] = [];
  const textBlocks = Array.from({ length: parsed.childCount }, (_, index) => parsed.child(index));
  if (textBlocks.every(node => node.type === visualSchema.nodes.paragraph || node.type === visualSchema.nodes.heading)) {
    textBlocks.forEach((node, index) => {
      if (index) inline.push(visualSchema.nodes.hard_break.create());
      node.content.forEach(child => inline.push(child));
    });
  } else {
    const plain = source.replace(/\s*\r?\n\s*/g, ' ');
    if (plain) inline.push(visualSchema.text(plain));
  }
  return state.tr.replaceSelection(new Slice(Fragment.fromArray(inline), 0, 0)).scrollIntoView();
}
