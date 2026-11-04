/**
 * ====================================================================
 * 📊 [OMD-TYPE-EditorCommandType] editorCommand.ts
 * 🎯 @KICK  : Onrivi Author 에디터 통합 명령어 타입(EditorCommandType) 및 툴바 ID 매핑 유틸
 * 🛡️ @GUARD : UPPER_SNAKE_CASE 표준 준수 및 camelCase ID 자동 폴백 지원
 * 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] MainEditorApp에서 독립 타입 및 매퍼로 분리
 * ====================================================================
 */

export type EditorCommandType =
  | 'NEW_FILE' | 'OPEN_FILE' | 'SAVE' | 'SAVE_AS' | 'OPEN_WORKSPACE'                   // ① 파일 시스템 및 입출력 제어
  | 'PRINT' | 'EXPORT_HTML' | 'EXPORT_EPUB' | 'EXPORT_PNG' | 'EXPORT_DOCX' | 'EXPORT_HWPX' | 'EXIT'                    // ② 출력(Export) 및 종료  
  | 'UNDO' | 'REDO' | 'FIND' | 'REPLACE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'ZOOM_RESET'                      // ③ 편집 및 보기 제어
  | 'GLOBAL_SEARCH' | 'TOGGLE_HELP' | 'HELP' | 'ERASER' | 'BOLD' | 'ITALIC' | 'UNDERLINE'                       // ④ 스타일 적용
  | 'STRIKETHROUGH' | 'INLINE_CODE' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6'                 // ⑤ 스타일 적용
  | 'HR' | 'ORDERED_LIST' | 'UNORDERED_LIST' | 'QUOTE' | 'QUOTE_NOTE' | 'QUOTE_TIP' | 'QUOTE_IMPORTANT' | 'QUOTE_WARNING' | 'QUOTE_CAUTION' | 'CHECKLIST'                   // ⑥ 스타일 적용
  | 'LINK' | 'IMAGE' | 'VIDEO' | 'MAP' | 'TABLE' | 'QUICK_TABLE' | 'CODE' | 'LATEX' | 'CLEAN_DOC' | 'PAGEBREAK'       // ⑦ 스타일 적용
  | 'YOUTUBE' | 'NOW' | 'CALENDAR' | 'CODE_BLOCK' | 'CHART' | 'MATH' | 'SETTINGS'                  // ⑧ 스타일 적용
  | 'ABOUT' | 'LICENSE' | 'TOGGLE_FLOATING_TOOLBAR' | 'TOGGLE_EMOJI_PANEL' | 'OPEN_EXPORT' | 'REMOVE_PREFIX' | 'LIST' | 'CHECK' | 'COPY_ALL'  // ⑨ 스타일 적용
  | 'TOGGLE_TOOLBAR' | 'TOGGLE_SIDEBAR' | 'TOGGLE_MODE' | 'TOGGLE_THEME'                  // ⑩ 스타일 적용 
  | 'WRAP_H1' | 'WRAP_H2' | 'WRAP_H3' | 'WRAP_QUOTE' | 'WRAP_CODE'                       // ⑪ 스타일 적용 
  | 'TOGGLE_CSS_STYLE' | 'SETTINGS_SHORTCUTS' | 'SETTINGS_ACCOUNT' | 'SELECT_RESOURCE_FOLDER'                                                                // ⑫ 스타일 적용 
  | 'FOOTNOTE' | 'ORGANIZE_FOOTNOTES'                                                                         // ⑬ 각주 삽입 
  | 'INSERT_TABLE_ROW' | 'DELETE_TABLE_ROW'                                               // ⑭ 표 행 편집 명령
  | 'DOCLINK'                                                                          // ⑮ 문서링크
  | 'MERGE'                                                                             // ⑯ 파일 병합
  | 'AI_HELP'                                                                           // ⑰ AI 글쓰기 도우미
  | 'ADD_REFERENCE' | 'CITE' | 'CITATION'                                               // ⑱ 참조 파일 추가 및 인용문헌
  | 'AI_DRAFT' | 'OPEN_AI_WRITER' | 'SLASH_COMMAND' | 'AUTO_RENUMBER' | 'SIGNATURE';

const EXPLICIT_MAP: Record<string, EditorCommandType> = {
  bold: 'BOLD',
  italic: 'ITALIC',
  inlineCode: 'INLINE_CODE',
  underline: 'UNDERLINE',
  strikethrough: 'STRIKETHROUGH',
  h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
  divider: 'HR',        // id는 divider이지만 커맨드는 HR
  orderedList: 'ORDERED_LIST',
  list: 'LIST',
  quote: 'QUOTE',
  quoteNote: 'QUOTE_NOTE',
  quoteTip: 'QUOTE_TIP',
  quoteImportant: 'QUOTE_IMPORTANT',
  quoteWarning: 'QUOTE_WARNING',
  quoteCaution: 'QUOTE_CAUTION',
  checklist: 'CHECKLIST',
  clear: 'REMOVE_PREFIX',  // id는 clear이지만 커맨드는 REMOVE_PREFIX
  cleanDoc: 'CLEAN_DOC',
  link: 'LINK',
  taglink: 'DOCLINK',
  image: 'IMAGE',
  video: 'VIDEO',
  vidio: 'VIDEO',
  youtube: 'YOUTUBE',
  calendar: 'NOW',
  now: 'NOW',
  map: 'MAP',
  chart: 'CHART',
  codeblock: 'CODE_BLOCK',
  math: 'MATH',
  styleSettings: 'TOGGLE_CSS_STYLE',
  table: 'TABLE',
  footnote: 'FOOTNOTE',
  citation: 'CITE',
  signature: 'SIGNATURE',
  quickTable: 'QUICK_TABLE',
  insertTableRow: 'INSERT_TABLE_ROW',
  deleteTableRow: 'DELETE_TABLE_ROW',
  toggleFloatingToolbar: 'TOGGLE_FLOATING_TOOLBAR',
  toggleToolbar: 'TOGGLE_TOOLBAR',
  toggleSidebar: 'TOGGLE_SIDEBAR',
  toggleMode: 'TOGGLE_MODE',
  toggleTheme: 'TOGGLE_THEME',
  'wrap-h1': 'WRAP_H1',
  aiHelp: 'AI_DRAFT',
  'wrap-h2': 'WRAP_H2',
  'wrap-h3': 'WRAP_H3',
  'wrap-quote': 'WRAP_QUOTE',
  'wrap-code': 'WRAP_CODE',
};

export function mapIdToCommandType(id: string): EditorCommandType {
  if (EXPLICIT_MAP[id]) return EXPLICIT_MAP[id];
  // 명시적 매핑이 없으면 camelCase → UPPER_SNAKE_CASE 자동 변환으로 폴백
  const snake = id.replace(/([A-Z])/g, '_$1').toUpperCase();
  return snake as EditorCommandType;
}
