// ====================================================================
// 📊 [OMD-LIB-PICTUREBOOK-0001] picturebook.ts
// 🚨 @PATCH : **2026-10-16** — [그림책 본문 편집 진입 시 선행 개행 제거로 즉시 변경/흔들림 방지]:
//             sceneEditableBody에서 이미지 추출 후 남아있는 선행 줄바꿈(\n+)을 정제하여
//             VisualDocumentEditor 마운트 시 불필요한 공백 생성 및 즉시 onChange 격발에 의한 화면 흔들림 방어
// ====================================================================
import type { CssProfile } from '@/types/cssProfile';
import { extractFrontmatter } from './frontmatter';

export const DEFAULT_BOOK_LAYOUT: NonNullable<CssProfile['layout']> = {
  schemaVersion: 1, type: 'picturebook', cover: 'full-image',
  imageRatio: 0.5, imageFit: 'cover', gap: '6mm', pageNumbers: true,
};

export function normalizeBookLayout(value: unknown): CssProfile['layout'] {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  if (input.type !== 'picturebook' || (input.schemaVersion !== undefined && input.schemaVersion !== 1)) {
    throw new Error('지원하지 않는 문서 배치 형식 또는 버전입니다.');
  }
  return {
    ...DEFAULT_BOOK_LAYOUT,
    cover: input.cover === 'image-right' ? 'image-right' : 'full-image',
    imageRatio: typeof input.imageRatio === 'number' && Number.isFinite(input.imageRatio)
      ? Math.min(0.7, Math.max(0.3, input.imageRatio)) : 0.5,
    imageFit: input.imageFit === 'contain' ? 'contain' : 'cover',
    gap: typeof input.gap === 'string' && /^\d+(?:\.\d+)?(?:mm|px)$/.test(input.gap) ? input.gap : '6mm',
    pageNumbers: input.pageNumbers !== false,
  };
}

export interface BookScene { image: string; body: string; cover: boolean; start: number; end: number; opening: string; raw: string }
export interface BookOutsideBlock { afterScene: number; startLine: number; endLine: number; text: string; location: string; ranges: { start: number; end: number }[] }

export function replaceOutsideBookText(markdown: string, block: BookOutsideBlock, text: string): string {
  let next = markdown;
  // Only the diagnosed text is replaced. Hidden metadata and scene blocks stay intact.
  for (let i = block.ranges.length - 1; i >= 0; i--) {
    const { start, end } = block.ranges[i];
    next = next.slice(0, start) + (i === 0 ? text : '') + next.slice(end);
  }
  return next;
}

type OutsideLine = { afterScene: number; line: number; text: string; literal?: boolean };
/** Exclude document metadata without changing source offsets or scene content. */
function outsideBodyLines(markdown: string, entries: OutsideLine[], lineOffset: number): OutsideLine[] {
  const result = entries.map(entry => ({ ...entry }));
  const document = extractFrontmatter(markdown);
  if (document.content !== markdown) {
    const prefix = markdown.slice(0, markdown.length - document.content.length);
    const metadataLines = (prefix.match(/\n/g) || []).length;
    result.forEach(entry => { if (entry.line <= lineOffset + metadataLines) entry.text = ''; });
  }
  // Recognize copied Onrivi metadata too, including a separator accidentally
  // joined to the preceding paragraph. Keep that paragraph's actual text.
  const marker = /^(?:>\s*)?(?:메타영역|#\s*서식설정)\s*$/;
  const field = /^(?:>\s*)?(?:메타영역|#\s*서식설정|[A-Za-z_][\w.-]*\s*:.*)?\s*$/;
  for (let i = 0; i < result.length; i++) {
    if (result[i].literal || !marker.test(result[i].text.trim())) continue;
    const previous = result[i - 1];
    if (previous && !previous.literal && previous.line === result[i].line - 1) {
      if (/^(?:>\s*)?(?:---)?\s*$/.test(previous.text.trim())) previous.text = '';
      else if (/---\s*$/.test(previous.text)) previous.text = previous.text.replace(/---\s*$/, '');
    }
    for (let j = i; j < result.length; j++) {
      const entry = result[j];
      if (entry.literal || (j > i && entry.line !== result[j - 1].line + 1)) break;
      if (/^(?:>\s*)?---\s*$/.test(entry.text.trim())) { entry.text = ''; break; }
      if (!field.test(entry.text.trim())) break;
      entry.text = '';
    }
  }
  return result;
}

/** Explicit blocks preserve ordinary Markdown and reference definitions. */
export function parseBookScenes(markdown: string, sourceLineOffset = 0): { scenes: BookScene[]; errors: string[]; outsideBlocks: BookOutsideBlock[] } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const scenes: BookScene[] = [];
  const errors: string[] = [];
  let block: string[] | null = null;
  let isCover = false;
  let fence = '';
  let offset = 0;
  let start = 0;
  let opening = '';
  const outside: string[] = [];
  const outsideLines: OutsideLine[] = [];
  let lineNumber = sourceLineOffset;
  const append = (line: string) => {
    if (block) block.push(line);
    else {
      outside.push(line);
      outsideLines.push({ afterScene: scenes.length, line: lineNumber, text: line, literal: !!fence });
    }
  };
  for (const line of lines) {
    lineNumber++;
    const lineStart = offset;
    offset += line.length + 1;
    const match = line.match(/^\s*(`{3,}|~{3,})/);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = '';
      append(line);
      continue;
    }
    if (!fence && /^:::scene(?:\s+\{[^}]*\})?\s*$/.test(line)) {
      if (block) { errors.push('장면 안에 다른 장면을 시작할 수 없습니다.'); continue; }
      block = []; isCover = /\bcover\b/.test(line); start = lineStart; opening = line; continue;
    }
    if (!fence && block && /^:::\s*$/.test(line)) {
      const content = block.join('\n');
      const imageMatch = content.match(/^\s*(!\[[^\]\n]*\](?:\([^\n]+\)|\[[^\]\n]*\]))\s*$/m);
      scenes.push({ image: imageMatch?.[1] || '', body: imageMatch
        ? content.slice(0, imageMatch.index) + '\n'.repeat((imageMatch[0].match(/\n/g)||[]).length) + content.slice(imageMatch.index! + imageMatch[0].length) : content,
        cover: isCover, start, end: lineStart + line.length, opening, raw: content });
      block = null; continue;
    }
    append(line);
  }
  if (block) errors.push('마지막 장면의 닫는 표시 :::가 없습니다.');
  const definitions = outside.filter(line => /^\s{0,3}\[[^\]]+\]:/.test(line)).join('\n');
  const outsideBlocks: BookOutsideBlock[] = [];
  const bodyLines = outsideBodyLines(markdown.replace(/\r\n/g, '\n'), outsideLines, sourceLineOffset);
  const lineStarts: number[] = [];
  let character = 0;
  for (const line of lines) { lineStarts.push(character); character += line.length + 1; }
  for (let afterScene = 0; afterScene <= scenes.length; afterScene++) {
    const entries = bodyLines.filter(entry => entry.afterScene === afterScene && entry.text.trim() && !/^\s{0,3}\[[^\]]+\]:/.test(entry.text));
    if (!entries.length) continue;
    const location = !scenes.length ? '장면으로 묶이지 않은 본문' : afterScene === 0 ? '첫 장면 앞' : afterScene === scenes.length ? `마지막 장면(장면 ${afterScene}) 뒤` : `장면 ${afterScene}과 장면 ${afterScene + 1} 사이`;
    const startLine = entries[0].line, endLine = entries[entries.length - 1].line;
    const text = bodyLines.filter(entry => entry.afterScene === afterScene && entry.line >= startLine && entry.line <= endLine).map(entry => entry.text).join('\n');
    const ranges = entries.map(entry => ({ start: lineStarts[entry.line - sourceLineOffset - 1], end: lineStarts[entry.line - sourceLineOffset - 1] + entry.text.length }));
    outsideBlocks.push({ afterScene, startLine, endLine, text, location, ranges });
    const excerpt = entries[0].text.trim().slice(0, 65);
    errors.push(`${location}, 원문 ${startLine}${endLine !== startLine ? `~${endLine}` : ''}행에 장면 밖 본문이 있습니다: “${excerpt}${entries[0].text.trim().length > 65 ? '…' : ''}”. 해당 글을 장면의 닫는 표시 ::: 앞에 넣거나 새 :::scene 장면으로 묶어 주세요.`);
  }
  for (const scene of scenes) {
    if (!scene.image) errors.push(`${scenes.indexOf(scene) + 1}번째 장면에 그림이 없습니다.`);
    if (definitions) { scene.image += '\n\n' + definitions; scene.body += '\n\n' + definitions; }
  }
  if (scenes.some((scene, i) => scene.cover && i !== 0)) errors.push('표지 장면은 첫 번째에만 배치해 주세요.');
  if (!scenes.length) errors.push(':::scene 블록을 추가해 그림과 본문을 작성해 주세요.');
  return { scenes, errors, outsideBlocks };
}

export function replaceBookScene(markdown: string, scene: BookScene, raw: string): string {
  return markdown.slice(0, scene.start) + scene.opening + '\n' + raw + '\n:::' + markdown.slice(scene.end);
}

export function moveBookSceneUp(markdown: string, index: number): string {
  const { scenes } = parseBookScenes(markdown);
  const scene = scenes[index];
  const previous = scenes[index-1];
  if (!scene || !previous || scene.cover || previous.cover) return markdown;
  return markdown.slice(0,previous.start) + markdown.slice(scene.start,scene.end)
    + markdown.slice(previous.end,scene.start) + markdown.slice(previous.start,previous.end) + markdown.slice(scene.end);
}

/** Render using the profile loaded from the resource profile files. */
export function documentBookProfile(markdown: string, fallback: CssProfile, preferLive = false): CssProfile {
  return fallback;
}

/** Read old embedded settings only to migrate them into the profile library. */
export function legacyBookProfile(markdown: string): CssProfile | undefined {
  try {
    const { data } = extractFrontmatter(markdown);
    const snapshot = JSON.parse(data.onrivi_picturebook_profile || 'null');
    const id = data.css_profile?.replace(/^["']|["']$/g, '');
    if (!snapshot || snapshot.id !== id || !snapshot.pageStyle || !snapshot.rules) return undefined;
    const layout = normalizeBookLayout(snapshot.layout);
    if (!layout) return undefined;
    return { ...snapshot, layout };
  } catch { return undefined; }
}

export function writeBookProfileSnapshot(markdown: string, profile?: CssProfile, keepExisting = false): string {
  const { data, content } = extractFrontmatter(markdown);
  const existing = data.onrivi_picturebook_profile;
  delete data.onrivi_picturebook_profile;
  if (existing === data.onrivi_picturebook_profile) return markdown;
  return '---\n메타영역\n#서식설정\n' + Object.entries(data).filter(([,value]) => value !== undefined)
    .map(([key,value]) => `${key}: ${value}`).join('\n') + '\n---\n\n' + content;
}

export function replaceSceneImage(markdown:string, index:number, imagePath:string, alt:string, expectedRaw?:string): string {
  const {content:body} = extractFrontmatter(markdown);
  const normalized = body.replace(/\r\n/g,'\n');
  const scene = parseBookScenes(normalized).scenes[index];
  if (!scene || (expectedRaw !== undefined && scene.raw !== expectedRaw)) throw new Error('사진 선택 중 장면이 변경됐습니다. 해당 그림을 다시 선택해 주세요.');
  const image = `![${alt.replace(/[\[\]\r\n]/g,' ')}](<${imagePath}>)`;
  const raw = /!\[[^\]\n]*\](?:\([^\n]+\)|\[[^\]\n]*\])/.test(scene.raw)
    ? scene.raw.replace(/!\[[^\]\n]*\](?:\([^\n]+\)|\[[^\]\n]*\])/,image)
    : image+'\n\n'+scene.raw;
  return markdown.slice(0,markdown.length-body.length) + replaceBookScene(normalized,scene,raw);
}

export const BOOK_SAMPLE = `:::scene {cover}
![표지 그림](media/cover.png)

# 책 제목

저자 이름
:::

:::scene
![첫 번째 장면](media/scene-01.png)

첫 번째 장면의 이야기를 입력하세요.
:::
`;

/** Edit only the selected scene, preserving its image and outside reference definitions. */
export function sceneEditableBody(scene: BookScene): string {
  const image = scene.raw.match(/^\s*(!\[[^\]\n]*\](?:\([^\n]+\)|\[[^\]\n]*\]))[ \t]*$/m);
  if (!image) return scene.raw.trim();
  const before = scene.raw.slice(0, image.index).trim();
  const after = scene.raw.slice(image.index! + image[0].length).replace(/^\n+/, '').trimEnd();
  return before ? `${before}\n\n${after}` : after;
}
export function replaceSceneBody(markdown:string,index:number,body:string,expectedRaw:string):string {
  const scene=parseBookScenes(markdown).scenes[index];
  if(!scene || scene.raw!==expectedRaw)throw new Error('편집 중 장면이 변경되었습니다. 다시 선택해 주세요.');
  const image=scene.raw.match(/^\s*(!\[[^\]\n]*\](?:\([^\n]+\)|\[[^\]\n]*\]))[ \t]*$/m)?.[1];
  return replaceBookScene(markdown,scene,(image ? image+'\n\n' : '')+body.trim());
}
export function duplicateBookScene(markdown:string,index:number):string {
  const scene=parseBookScenes(markdown).scenes[index];
  if(!scene)return markdown;
  const copy='\n\n:::scene\n'+scene.raw+'\n:::';
  return markdown.slice(0,scene.end)+copy+markdown.slice(scene.end);
}
