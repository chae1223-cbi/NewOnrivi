// ====================================================================
// 📊 [OMD-IO-visualMarkdownPaste] frontend/src/lib/visualMarkdownPaste.ts
// 🎯 @KICK  : Markdown 붙여넣기를 ProseMirror 문서 및 표 셀 트랜잭션으로 변환
// 🛡️ @GUARD : 링크 문구는 현재 문단 안에 삽입하고 표·목록 블록 구조는 유지
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
  const {$from}=state.selection;
  const insideBullet=Array.from({length:$from.depth},(_,index)=>$from.node(index+1).type.name).includes('bullet_list');
  const pasted = createVisualDocumentCodec(bulletNumbersAsText(source,insideBullet));
  codec.adopt(pasted);
  const empty = state.doc.childCount === 1 && state.doc.firstChild?.type.name === 'paragraph' && !state.doc.firstChild.content.size;
  const meaningfulBlocks = Array.from({ length: pasted.doc.childCount }, (_, index) => pasted.doc.child(index))
    .filter(node => node.type !== visualSchema.nodes.paragraph || node.content.size > 0);

  const isSingleLine = !/[\r\n]/.test(source.trim());
  const isInlineTarget = state.selection.$from.parent.isTextblock && state.selection.$to.parent.isTextblock;
  const singleTextblock = meaningfulBlocks.length === 1 && (meaningfulBlocks[0].isTextblock || meaningfulBlocks[0].type === visualSchema.nodes.paragraph);
  const inlineParagraph = isInlineTarget && (singleTextblock || (isSingleLine && meaningfulBlocks.every(n => n.isTextblock)));

  let inlineContent: Fragment = Fragment.empty;
  if (inlineParagraph) {
    if (singleTextblock) {
      inlineContent = meaningfulBlocks[0].content;
    } else {
      const fragments: DocumentNode[] = [];
      meaningfulBlocks.forEach(b => b.content.forEach(child => fragments.push(child)));
      inlineContent = Fragment.fromArray(fragments);
    }
  }

  const transaction = empty
    ? state.tr.replaceWith(0, state.doc.content.size, pasted.doc.content)
    : inlineParagraph
      ? state.tr.replaceSelection(new Slice(inlineContent, 0, 0))
    : state.tr.replaceSelection(new Slice(pasted.doc.content, 0, 0));
  if (pasted.doc.attrs.frontmatter.trim()) {
    transaction.setDocAttribute('frontmatter', mergePastedFrontmatter(state.doc.attrs.frontmatter, pasted.doc.attrs.frontmatter));
  }
  transaction.setStoredMarks([]);
  transaction.setSelection(TextSelection.near(transaction.doc.resolve(transaction.mapping.map(state.selection.to)), 1));
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
