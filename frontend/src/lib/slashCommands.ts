// ====================================================================
// 📊 [OMD-CORE-SlashCommands-0001] slashCommands.ts ➔ Default Slash Commands & Hotkeys
// 🎯 @KICK  : 기본 슬래시 명령어 목록 및 단축키 기본 매핑 정의
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 붉은색 인감도장 태그 적용]: 기본 템플릿의 도장 표식을 붉은색 원형 인감도장 태그(<span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">인</span>)로 업그레이드
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 변경]: 다른 이름으로 저장과의 충돌 방지를 위해 서명/발신인 단축키를 Ctrl+Alt+R로 변경 및 /sign, /사인 슬래시 명령어 탑재
// ====================================================================
export const DEFAULT_HOTKEYS: Record<string, string> = {
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  strikethrough: 'Ctrl+Shift+X',
  h1: 'Ctrl+1',
  h2: 'Ctrl+2',
  h3: 'Ctrl+3',
  quote: 'Ctrl+Q',
  quoteNote: 'Ctrl+Shift+1',
  quoteTip: 'Ctrl+Shift+2',
  quoteImportant: 'Ctrl+Shift+3',
  quoteWarning: 'Ctrl+Shift+4',
  quoteCaution: 'Ctrl+Shift+5',
  inlineCode: 'Ctrl+E',
  codeblock: 'Ctrl+Shift+E',
  clear: 'Ctrl+\\',
  signature: 'Ctrl+Alt+R'
};

export const DEFAULT_SLASH_COMMANDS = [
  { id: 'h1', label: 'H1 (제목 1)', kind: 17, insertText: '# ', detail: '가장 큰 제목' },
  { id: 'h2', label: 'H2 (제목 2)', kind: 17, insertText: '## ', detail: '두 번째 제목' },
  { id: 'h3', label: 'H3 (제목 3)', kind: 17, insertText: '### ', detail: '세 번째 제목' },
  { id: 'table', label: 'Table (표)', kind: 15, insertText: '| 열 1 | 열 2 |\n| --- | --- |\n| 내용 | 내용 |', detail: '기본 표 삽입' },
  { id: 'quote', label: 'Quote (인용구)', kind: 17, insertText: '> ', detail: '인용문 블록' },
  { id: 'quoteNote', label: 'Note (인용구 참고)', kind: 17, insertText: '> [!NOTE]\n> ', detail: '참고(Note) 안내 상자' },
  { id: 'quoteTip', label: 'Tip (인용구 팁)', kind: 17, insertText: '> [!TIP]\n> ', detail: '팁(Tip) 유용한 정보 상자' },
  { id: 'quoteImportant', label: 'Important (인용구 중요)', kind: 17, insertText: '> [!IMPORTANT]\n> ', detail: '중요(Important) 공지 상자' },
  { id: 'quoteWarning', label: 'Warning (인용구 주의)', kind: 17, insertText: '> [!WARNING]\n> ', detail: '주의(Warning) 안내 상자' },
  { id: 'quoteCaution', label: 'Caution (인용구 경고)', kind: 17, insertText: '> [!CAUTION]\n> ', detail: '경고(Caution) 위험 알림 상자' },
  { id: 'codeblock', label: 'Code Block (코드)', kind: 15, insertText: '', detail: '코드 블록 삽입 (언어 자동 선택)', actionId: 'codeblock' },
  { id: 'orderedlist', label: 'Ordered List (숫자 목록)', kind: 17, insertText: '1. ', detail: '숫자 목록', actionId: 'AUTO_RENUMBER' },
  { id: 'list', label: 'List (글머리 기호)', kind: 17, insertText: '- ', detail: '기호 목록' },
  { id: 'checklist', label: 'Checklist (체크리스트)', kind: 17, insertText: '- [ ] ', detail: '할 일 목록' },
  { id: 'clear', label: 'Clear Tag (태그 취소)', kind: 17, insertText: '', detail: '서식 마크다운 태그 취소', actionId: 'clear' },
  { id: 'signature', label: 'Sign / 사인 (서명/발신인)', kind: 15, insertText: '', detail: '서명 및 발신인 왼쪽 정렬 삽입 (Ctrl+Alt+R)', actionId: 'signature' },
  { id: 'image', label: 'Image (이미지)', kind: 15, insertText: '![대체 텍스트](이미지_URL)', detail: '이미지 삽입' },
  { id: 'link', label: 'Link (링크)', kind: 15, insertText: '[링크 텍스트](URL)', detail: '링크 삽입' },
  { id: 'cite', label: 'Cite (참조문헌 인용)', kind: 15, insertText: '', detail: '참조문헌(bib) 선택 및 인용 삽입', actionId: 'custom-action-citation' },
  { id: 'knowledge', label: 'Knowledge (지식 베이스 보관함)', kind: 15, insertText: '', detail: '지식 보관함 관리자 열기 (Ctrl+Shift+K)', actionId: 'custom-action-knowledge-manager' }
];

// Monaco가 없어도 사용할 수 있도록 초기화 함수 작성
// ====================================================================
// 📊 [OMD-EDIT-slashCommands-0001] slashCommands.ts ➔ getSlashCommands
// 🎯 @KICK  : 기본 슬래시 명령어 배열을 Monaco CompletionItem 형식으로 변환
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : **2026-10-15** — [서명/발신인 서식 왼쪽 정렬 갱신]: detail 안내를 왼쪽 정렬로 동기화
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 변경]: 다른 이름으로 저장(Ctrl+Shift+S)과의 충돌 방지를 위해 서명/발신인 단축키를 Ctrl+Alt+R로 변경
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 슬래시 및 단축키 추가] signature(Ctrl+Alt+R, /sign, /사인) 기본 명령어 및 단축키 등록
// 🚨 @PATCH : **2026-09-11** — 코드블록(codeblock) 언어 자동 선택 액션 연동 및 Alert 인용구 5종/태그 취소 단축키 동기화
//             **2026-09-11** — Alert 인용구 5종(Note, Tip, Important, Warning, Caution) 슬래시 명령어 추가
// 🔗 @CALLS : 없음
// ====================================================================
export const getSlashCommands = (monaco: any, customCommands = DEFAULT_SLASH_COMMANDS) => {
  return customCommands.map(cmd => {
    const item: any = {
      ...cmd,
      kind: cmd.kind === 17 ? monaco.languages.CompletionItemKind.Keyword : monaco.languages.CompletionItemKind.Snippet
    };
    if (cmd.actionId) {
      item.command = {
        id: 'trigger-custom-action',
        title: cmd.label,
        arguments: [cmd.actionId]
      };
    }
    return item;
  });
};
