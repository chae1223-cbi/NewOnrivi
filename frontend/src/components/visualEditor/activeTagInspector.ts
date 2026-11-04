// ====================================================================
// 🏷️ [OMD-CORE-ActiveTagInspector-0001] activeTagInspector.ts ➔ 시각 에디터 실시간 활성 태그 및 인스펙터 분석 엔진
// 🎯 @KICK  : ProseMirror 상태(Selection 및 $from 계층)를 AST 기반으로 순회하여 최하위(Innermost) 태그 및 전체 DOM 계층 경로(breadcrumb)를 정밀 분석
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 VisualDocumentEditor 대형 컴포넌트 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 5순위 모듈화 분리]: activeTagInspector 엔진 독립 분리
// 🔗 @CALLS : EditorState, visualSchema
// ====================================================================
// @ts-nocheck
import type { EditorState } from 'prosemirror-state';
import { visualSchema } from '@/lib/visualDocumentCodec';

export interface ActiveTagInfo {
  innermostTag: string;
  innermostLabel: string;
  path: Array<{ tag: string; label: string }>;
  pathString: string;
  labelPathString: string;
}

export function getActiveTagInfo(state: EditorState): ActiveTagInfo {
  const { $from, empty, from, to } = state.selection;
  const path: Array<{ tag: string; label: string }> = [];

  // 1. 단독 선택된 노드(NodeSelection: 이미지, 구분선, 표, 코드블록 등) 감지
  if ('node' in state.selection && (state.selection as any).node) {
    const selNode = (state.selection as any).node;
    const name = selNode.type.name;
    if (name === 'visual_image' || name === 'image') {
      return { innermostTag: 'img', innermostLabel: '이미지', path: [{ tag: 'img', label: '이미지' }], pathString: 'img', labelPathString: '이미지' };
    }
    if (name === 'horizontal_rule') {
      return { innermostTag: 'hr', innermostLabel: '구분선', path: [{ tag: 'hr', label: '구분선' }], pathString: 'hr', labelPathString: '구분선' };
    }
    if (name === 'table') {
      return { innermostTag: 'table', innermostLabel: '표', path: [{ tag: 'table', label: '표' }], pathString: 'table', labelPathString: '표' };
    }
    if (name === 'code_block') {
      const lang = selNode.attrs.params || '';
      return { innermostTag: 'pre', innermostLabel: lang ? `코드(${lang})` : '코드 블록', path: [{ tag: 'pre', label: lang ? `코드(${lang})` : '코드 블록' }], pathString: 'pre', labelPathString: lang ? `코드(${lang})` : '코드 블록' };
    }
    if (name === 'visual_checkbox') {
      return { innermostTag: 'input', innermostLabel: '체크박스', path: [{ tag: 'input', label: '체크박스' }], pathString: 'input', labelPathString: '체크박스' };
    }
  }

  // 2. 루트부터 커서 위치($from)까지의 블록 노드 계층 탐색
  for (let depth = 1; depth <= $from.depth; depth++) {
    const node = $from.node(depth);
    const name = node.type.name;
    const parentName = depth > 1 ? $from.node(depth - 1).type.name : '';

    if (name === 'heading') {
      const level = node.attrs.level || 1;
      path.push({ tag: `h${level}`, label: `제목 ${level}` });
    } else if (name === 'blockquote') {
      const alert = node.attrs.alertType;
      path.push({ tag: 'blockquote', label: alert ? `알림(${alert})` : '인용구' });
    } else if (name === 'bullet_list') {
      path.push({ tag: 'ul', label: '글머리 목록' });
    } else if (name === 'ordered_list') {
      path.push({ tag: 'ol', label: '번호 목록' });
    } else if (name === 'list_item') {
      const isChecked = node.attrs.checked;
      path.push({ tag: 'li', label: isChecked !== null && isChecked !== undefined ? '체크 항목' : '목록 항목' });
    } else if (name === 'table') {
      path.push({ tag: 'table', label: '표' });
    } else if (name === 'table_row') {
      path.push({ tag: 'tr', label: '행' });
    } else if (name === 'table_header') {
      path.push({ tag: 'th', label: '제목 셀' });
    } else if (name === 'table_cell') {
      path.push({ tag: 'td', label: '내용 셀' });
    } else if (name === 'code_block') {
      const lang = node.attrs.params || '';
      path.push({ tag: 'pre', label: lang ? `코드(${lang})` : '코드 블록' });
    } else if (name === 'paragraph') {
      if (!['table_header', 'table_cell', 'list_item'].includes(parentName)) {
        path.push({ tag: 'p', label: '본문' });
      }
    } else if (name === 'visual_math') {
      path.push({ tag: 'math', label: '수식 블록' });
    } else if (name === 'visual_inline_math') {
      path.push({ tag: 'math', label: '인라인 수식' });
    } else if (name === 'source_block') {
      path.push({ tag: 'html', label: 'HTML 블록' });
    } else if (name === 'visual_footnote_def') {
      path.push({ tag: 'footnote', label: '각주' });
    } else if (name === 'visual_checkbox') {
      path.push({ tag: 'input', label: '체크박스' });
    }
  }

  // 3. 인라인 서식 마크(Marks) 탐색 및 정렬
  const markMap: Record<string, { tag: string; label: string }> = {
    strong: { tag: 'strong', label: '굵게' },
    em: { tag: 'em', label: '기울임' },
    strike: { tag: 's', label: '취소선' },
    underline: { tag: 'u', label: '밑줄' },
    code: { tag: 'code', label: '인라인 코드' },
    link: { tag: 'a', label: '링크' },
  };

  const markNames = ['strong', 'em', 'strike', 'underline', 'code', 'link'];
  const activeMarkNames = markNames.filter(name => empty
    ? (state.storedMarks ?? $from.marks()).some(m => m.type.name === name)
    : state.doc.rangeHasMark(from, to, visualSchema.marks[name]));

  for (const mName of activeMarkNames) {
    if (markMap[mName]) {
      path.push(markMap[mName]);
    }
  }

  if (path.length === 0) {
    path.push({ tag: 'p', label: '본문' });
  }

  const innermost = path[path.length - 1];

  return {
    innermostTag: innermost.tag,
    innermostLabel: innermost.label,
    path,
    pathString: path.map(p => p.tag).join(' > '),
    labelPathString: path.map(p => p.label).join(' > '),
  };
}
