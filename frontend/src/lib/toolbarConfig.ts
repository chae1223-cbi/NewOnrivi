// ====================================================================
// 📊 [OMD-CORE-ToolbarConfig-0001] toolbarConfig.ts ➔ Toolbar Items Configuration
// 🎯 @KICK  : 에디터 툴바, 플로팅 툴바 및 단축키/슬래시 커맨드 전역 설정 메타데이터
// 🚨 @PATCH : **2026-10-25** — [서식·태그 지우기(clear/태그 취소) 기본 단축키 Ctrl+\\ 변경 및 한글 키보드(₩) 정규화]:
//             1) TOOLBAR_ITEMS 태그 취소(clear) 기본 단축키를 Ctrl+Shift+0에서 Ctrl+\\로 변경
//             2) configuredHotkeyItem에서 event.code === 'Backslash' 및 한글 원화 기호(₩)를 '\\'로 정규화하여 영문/한글 입력기 상태 무관 100% 단축키 동작 보장
// 🚨 @PATCH : **2026-10-17** — [인용문(기본 및 콜아웃 5종) 슬래시 커맨드 액션 연동 및 하단 빈 행 자동 추가]: quote, quoteNote, quoteTip, quoteImportant, quoteWarning, quoteCaution을 actionOnlyKeys에 등록하여 슬래시 명령어 실행 시에도 인용문 아래에 빈 행이 자동 추가되도록 통일
// 🚨 @PATCH : **2026-10-15** — [서명/발신인 서식 왼쪽 정렬 기본 전환]: 서명/발신인 템플릿(signature)의 기본 정렬을 <div align="left">로 변경하고 슬래시 자동완성에 '서명/발신인 (왼쪽 정렬)'으로 갱신
// 🚨 @PATCH : **2026-10-13** — [달력/날짜 슬래시 커맨드 별칭 확장]: now 커맨드에 '달력', '캘린더', '시간' 별칭 추가 연동
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 붉은색 인감도장 태그 적용]: 기본 템플릿의 도장 표식을 붉은색 원형 인감도장 태그(<span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">인</span>)로 업그레이드
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 변경]: 다른 이름으로 저장(Ctrl+Shift+S)과의 충돌 방지를 위해 서명/발신인 기본 단축키를 Ctrl+Alt+R로 변경
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 툴바 아이템 추가]: 문서(Document) 그룹에 서명/발신인 (우측 정렬, signature) 툴바 아이템 신설
// ====================================================================
export const TOOLBAR_ITEMS = [
  // 1. 서식 (Formatting)
  { id: 'bold', icon: 'B', name: '굵게', group: '서식', tagFormat: '**텍스트**', defaultHotkey: 'Ctrl+B', defaultCommand: 'bold', insertText: '**텍스트**', kind: 15 },
  { id: 'italic', icon: 'I', name: '기울임', group: '서식', tagFormat: '*텍스트*', defaultHotkey: 'Ctrl+I', defaultCommand: 'italic', insertText: '*텍스트*', kind: 15 },
  { id: 'inlineCode', icon: '</>', name: '인라인 코드', group: '서식', tagFormat: '`텍스트`', defaultHotkey: 'Ctrl+E', defaultCommand: 'inlinecode', insertText: '`텍스트`', kind: 15 },
  { id: 'underline', icon: 'U', name: '밑줄', group: '서식', tagFormat: '<u>텍스트</u>', defaultHotkey: 'Ctrl+U', defaultCommand: 'underline', insertText: '<u>텍스트</u>', kind: 15 },
  { id: 'strikethrough', icon: 'S', name: '취소선', group: '서식', tagFormat: '~~텍스트~~', defaultHotkey: 'Ctrl+Shift+X', defaultCommand: 'strike', insertText: '~~텍스트~~', kind: 15 },
  { id: 'footnote', icon: 'fn', name: '각주', group: '서식', tagFormat: '[^1]', defaultHotkey: 'Ctrl+Alt+F', defaultCommand: 'footnote', insertText: '', kind: 15 },
  { id: 'citation', icon: '📝', name: '인용(참조문헌)', group: '서식', tagFormat: '[@]', defaultHotkey: 'Ctrl+Alt+C', defaultCommand: 'cite', insertText: '[@]', kind: 15 },

  // 2. 제목 (Title)
  { id: 'h1', icon: 'H1', name: '제목 1', group: '제목', tagFormat: '# 제목', defaultHotkey: 'Ctrl+1', defaultCommand: 'h1', insertText: '# ', kind: 17 },
  { id: 'h2', icon: 'H2', name: '제목 2', group: '제목', tagFormat: '## 제목', defaultHotkey: 'Ctrl+2', defaultCommand: 'h2', insertText: '## ', kind: 17 },
  { id: 'h3', icon: 'H3', name: '제목 3', group: '제목', tagFormat: '### 제목', defaultHotkey: 'Ctrl+3', defaultCommand: 'h3', insertText: '### ', kind: 17 },
  { id: 'h4', icon: 'H4', name: '제목 4', group: '제목', tagFormat: '#### 제목', defaultHotkey: 'Ctrl+4', defaultCommand: 'h4', insertText: '#### ', kind: 17 },
  { id: 'h5', icon: 'H5', name: '제목 5', group: '제목', tagFormat: '##### 제목', defaultHotkey: 'Ctrl+5', defaultCommand: 'h5', insertText: '##### ', kind: 17 },
  { id: 'h6', icon: 'H6', name: '제목 6', group: '제목', tagFormat: '###### 제목', defaultHotkey: 'Ctrl+6', defaultCommand: 'h6', insertText: '###### ', kind: 17 },

  // 3. 목록 및 문단 (List & Paragraph)
  { id: 'divider', icon: '—', name: '구분선', group: '목록', tagFormat: '---', defaultHotkey: 'Ctrl+Alt+-', defaultCommand: 'hr', insertText: '\n---\n', kind: 15 },
  { id: 'orderedList', icon: '1.', name: '숫자 목록', group: '목록', tagFormat: '1. ', defaultHotkey: 'Ctrl+Shift+7', defaultCommand: 'ol', insertText: '1. ', kind: 17 },
  { id: 'list', icon: '☰', name: '글머리 기호', group: '목록', tagFormat: '- ', defaultHotkey: 'Ctrl+Shift+8', defaultCommand: 'ul', insertText: '- ', kind: 17 },
  { id: 'quote', icon: '❝', name: '인용구(기본)', group: '목록', tagFormat: '> ', defaultHotkey: 'Ctrl+Q', defaultCommand: 'quote', insertText: '> \n\n', kind: 17 },
  { id: 'quoteNote', icon: 'ℹ️', name: '인용(참고·Note)', group: '목록', tagFormat: '> [!NOTE]', defaultHotkey: 'Ctrl+Shift+1', defaultCommand: 'note', insertText: '> [!NOTE]\n> \n\n', kind: 17 },
  { id: 'quoteTip', icon: '💡', name: '인용(팁·Tip)', group: '목록', tagFormat: '> [!TIP]', defaultHotkey: 'Ctrl+Shift+2', defaultCommand: 'tip', insertText: '> [!TIP]\n> \n\n', kind: 17 },
  { id: 'quoteImportant', icon: '📢', name: '인용(중요·Important)', group: '목록', tagFormat: '> [!IMPORTANT]', defaultHotkey: 'Ctrl+Shift+3', defaultCommand: 'important', insertText: '> [!IMPORTANT]\n> \n\n', kind: 17 },
  { id: 'quoteWarning', icon: '⚠️', name: '인용(주의·Warning)', group: '목록', tagFormat: '> [!WARNING]', defaultHotkey: 'Ctrl+Shift+4', defaultCommand: 'warning', insertText: '> [!WARNING]\n> \n\n', kind: 17 },
  { id: 'quoteCaution', icon: '🚨', name: '인용(경고·Caution)', group: '목록', tagFormat: '> [!CAUTION]', defaultHotkey: 'Ctrl+Shift+5', defaultCommand: 'caution', insertText: '> [!CAUTION]\n> \n\n', kind: 17 },
  { id: 'checklist', icon: '☑️', name: '체크리스트', group: '목록', tagFormat: '- [ ] ', defaultHotkey: 'Ctrl+Shift+C', defaultCommand: 'check', insertText: '- [ ] ', kind: 17 },
  { id: 'clear', icon: '🧹', name: '태그 취소', group: '목록', tagFormat: '서식 취소', defaultHotkey: 'Ctrl+\\', defaultCommand: 'clear', insertText: '', kind: 17 },
  { id: 'cleanDoc', icon: '✨', name: '문서 서식 일괄 정리', group: '목록', tagFormat: '없음', defaultHotkey: 'Ctrl+Shift+L', defaultCommand: 'cleandoc', insertText: '', kind: 17 },

  // 4. 미디어 (Media)
  { id: 'link', icon: '🔗', name: '링크', group: '미디어', tagFormat: '[홈페이지명](https://)', defaultHotkey: 'Ctrl+K', defaultCommand: 'link', insertText: '[홈페이지명](https://)', kind: 15 },
  { id: 'taglink', icon: '🔖', name: '문서 연결', group: '미디어', tagFormat: '[문서명](<상대경로>)', defaultHotkey: '', defaultCommand: 'doclink', insertText: '', kind: 15 },
  { id: 'image', icon: '🖼️', name: '이미지', group: '미디어', tagFormat: '![대체 텍스트](URL)', defaultHotkey: '', defaultCommand: 'image', insertText: '![대체 텍스트](이미지_URL)', kind: 15 },
  { id: 'youtube', icon: '🎞️', name: '동영상삽입', group: '미디어', tagFormat: '동영상 삽입', defaultHotkey: '', defaultCommand: 'video', insertText: '동영상 삽입', kind: 15 },
  { id: 'map', icon: '🌏', name: '지도', group: '미디어', tagFormat: '지도 삽입', defaultHotkey: '', defaultCommand: 'map', insertText: '지도 삽입', kind: 15 },
  { id: 'add_reference', icon: '📚', name: '바이브(참조관리)', group: '미디어', tagFormat: '바이브', defaultHotkey: 'Ctrl+Shift+V', defaultCommand: 'vibe', insertText: '', kind: 17 },

  // 5. 코드 및 고급 (Code & Advanced)
  { id: 'codeblock', icon: '⌨️', name: '코드 블록', group: '코드', tagFormat: '```코드```', defaultHotkey: 'Ctrl+Shift+E', defaultCommand: 'code', insertText: '```markdown\n\n```\n\n', kind: 15 },
  { id: 'table', icon: '📶', name: '표', group: '코드', tagFormat: '| 표 |', defaultHotkey: 'Ctrl+T', defaultCommand: 'table', insertText: '| 열 1 | 열 2 |\n| --- | --- |\n| 내용 | 내용 |\n\n', kind: 15 },
  { id: 'math', icon: '🧮', name: '수식', group: '코드', tagFormat: '$$수식$$', defaultHotkey: 'Ctrl+Shift+T', defaultCommand: 'math', insertText: '$$수식$$\n\n', kind: 15 },

  // 6. 문서 (Document)
  { id: 'now', icon: '📅', name: '현재 날짜/시간', group: '문서', tagFormat: '날짜/시간', defaultHotkey: '', defaultCommand: 'now', insertText: '', kind: 15 },
  { id: 'signature', icon: '✍️', name: '서명/발신인 (왼쪽 정렬)', group: '문서', tagFormat: '<div align="left">...</div>', defaultHotkey: 'Ctrl+Alt+R', defaultCommand: 'sign', insertText: '<div align="left">\n\n2026년 10월 1일  \n**작성자: 홍길동** <span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">인</span>\n\n</div>', kind: 15 },
  { id: 'styleSettings', icon: '🎨', name: '서식관리', group: '문서', tagFormat: '서식 테마 갤러리', defaultHotkey: '', defaultCommand: 'style', insertText: '', kind: 17 },

  // 7. 부가기능 (Extra)
  { id: 'save', icon: '💾', name: '저장', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+S', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'saveAs', icon: '💿', name: '다른 이름으로 저장', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+Shift+S', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'undo', icon: '↩️', name: '실행 취소', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+Z', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'redo', icon: '↪️', name: '다시 실행', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+Y', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'find', icon: '🔍', name: '찾기', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+F', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'replace', icon: '🔄', name: '바꾸기', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+H', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'globalSearch', icon: '🔎', name: '전체 검색', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+Shift+F', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'toggleToolbar', icon: '♻️', name: '툴바 토글', group: '부가기능', tagFormat: '', defaultHotkey: '', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'toggleSidebar', icon: '🗃️', name: '사이드바 토글', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+Shift+B', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'toggleMode', icon: '📜', name: '모드 전환', group: '부가기능', tagFormat: '', defaultHotkey: 'Ctrl+Shift+M', defaultCommand: '', insertText: '', kind: 17 },
  { id: 'aiHelp', icon: '✨', name: 'AI 글쓰기 도우미', group: '부가기능', tagFormat: '/ai [명령어]', defaultHotkey: '', defaultCommand: 'ai', insertText: '', kind: 17 },
];

// ====================================================================
// 📊 [OMD-EDIT-toolbarConfig-0001] toolbarConfig.ts ➔ getDefaultHotkeys
// 🎯 @KICK  : TOOLBAR_ITEMS에서 defaultHotkey 맵 생성
// 🛡️ @GUARD : item.defaultHotkey 존재 여부 필터
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export const getDefaultHotkeys = () => {
  const hotkeys: Record<string, string> = {};
  TOOLBAR_ITEMS.forEach(item => {
    if (item.defaultHotkey) hotkeys[item.id] = item.defaultHotkey;
  });
  return hotkeys;
};

// ====================================================================
// 📊 [OMD-EDIT-toolbarConfig-0002] toolbarConfig.ts ➔ getDefaultCommands
// 🎯 @KICK  : TOOLBAR_ITEMS에서 defaultCommand 맵 생성
// 🛡️ @GUARD : item.defaultCommand 존재 여부 필터
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export const getDefaultCommands = () => {
  const commands: Record<string, string> = {};
  TOOLBAR_ITEMS.forEach(item => {
    if (item.defaultCommand) commands[item.id] = item.defaultCommand;
  });
  return commands;
};

// ====================================================================
// 📊 [OMD-EDIT-toolbarConfig-0003] toolbarConfig.ts ➔ getSlashCommands
// 🎯 @KICK  : TOOLBAR_ITEMS를 Monaco 슬래시 자동완성 항목으로 변환 (모달/액션/플레이스홀더 처리)
// 🛡️ @GUARD : EXCLUDED_FROM_SLASH 필터, modalKeys/actionOnlyKeys 분기, 플레이스홀더 우선순위 매칭
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 변경]: 다른 이름으로 저장(Ctrl+Shift+S)과의 오인·충돌 방지를 위해 서명/발신인(우측 정렬) 단축키를 Ctrl+Alt+R(Right)로 변경
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 우측 정렬 도구 추가] TOOLBAR_ITEMS에 signature(Ctrl+Alt+R, /sign, /사인) 추가 및 슬래시 다국어 듀얼 자동완성(/sign, /사인) 등록
// 🚨 @PATCH : **2026-09-11** — 코드 블록(codeblock) 기본 언어를 javascript에서 markdown으로 변경 연동
//             **2026-09-11** — 플로팅 툴바와 1:1 일치하도록 기능·구분(서식, 제목, 목록, 미디어, 코드, 문서, 부가기능) 순서 동기화, Alert 인용구 5종(Ctrl+Shift+1~5) 및 태그 취소(Ctrl+Shift+0) 단축키 부여, 슬래시(/) 명령어 구분 태그 표기 및 코드블록(codeblock) 액션 연동 추가
//             **2026-09-11** — GitHub Alert 인용구 5종(Note, Tip, Important, Warning, Caution) 슬래시 자동완성(/note, /팁, /주의 등) 및 aliasTerms 다국어 검색 지원 추가
//             **2026-09-03** — 링크 삽입 서식을 플로팅 툴바 및 단축키와 동일하게 [홈페이지명](https://)으로 통일하고 플레이스홀더 후보에 홈페이지명을 추가하여 슬래시 명령어 입력 시 자동 선택 연동
//             InsertAsSnippet 하이라이트 방지, filterText 한글/영문 검색 지원
// 🔗 @CALLS : 없음
// ====================================================================
// Local-language search aliases share the configured slash command action.
export const SLASH_ALIASES: Record<string, string[]> = {
  bold: ['굵게', '강조'], italic: ['기울임'], inlineCode: ['인라인코드'],
  underline: ['밑줄'], strikethrough: ['취소선'], footnote: ['각주'],
  citation: ['인용문헌'], h1: ['제목1'], h2: ['제목2'], h3: ['제목3'],
  h4: ['제목4'], h5: ['제목5'], h6: ['제목6'], divider: ['구분선'],
  orderedList: ['숫자목록'], list: ['글머리목록'],
  quote: ['인용'], quoteNote: ['참고', '노트'], quoteTip: ['팁'],
  quoteImportant: ['중요'], quoteWarning: ['주의'], quoteCaution: ['경고'],
  checklist: ['할일', '체크리스트'], clear: ['초기화'], cleanDoc: ['정리'],
  link: ['링크'], taglink: ['문서연결'], image: ['사진', '이미지'],
  youtube: ['동영상'], map: ['지도'], add_reference: ['참조관리'],
  codeblock: ['코드블록'], table: ['표'], math: ['수식'],
  now: ['날짜', '달력', '캘린더', '시간'], signature: ['사인', '서명'],
  styleSettings: ['서식'], aiHelp: ['인공지능'],
};

export function configuredHotkeyItem(event: KeyboardEvent, custom: Record<string, string> = {}) {
  const mac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform);
  if (event.isComposing || (!mac && event.metaKey)) return undefined;
  const key = event.code.startsWith('Key')
    ? event.code.slice(3)
    : event.code.startsWith('Digit')
    ? event.code.slice(5)
    : event.code === 'Space'
    ? 'SPACE'
    : event.code === 'Backslash' || event.key === '\\' || event.key === '₩'
    ? '\\'
    : event.key.toUpperCase();
  const parts = [];
  if (event.ctrlKey || (mac && event.metaKey)) parts.push('CTRL');
  if (event.shiftKey) parts.push('SHIFT');
  if (event.altKey) parts.push('ALT');
  parts.push(key);
  const combo = parts.join('+');
  return TOOLBAR_ITEMS.find(item => {
    const configured = custom[item.id] !== undefined ? custom[item.id] : item.defaultHotkey;
    return !!configured && configured.replace(/\s+/g, '').toUpperCase().replace('CTRLCMD', 'CTRL') === combo;
  });
}

export const getSlashCommands = (monaco: any, customCommands: Record<string, string> = {}) => {
  // 슬래시 자동완성에서 제외할 항목 (UI 토글/래핑 류는 에디터에서 쓸 일 없음)
  const EXCLUDED_FROM_SLASH = new Set([
    'toggleFloatingToolbar', 'toggleToolbar', 'toggleSidebar',
    'toggleMode', 'toggleTheme',
    'wrap-h1', 'wrap-h2', 'wrap-h3', 'wrap-quote', 'wrap-code'
  ]);

  return TOOLBAR_ITEMS
    .filter(item => !EXCLUDED_FROM_SLASH.has(item.id))
    .flatMap(item => {
      const cmdStr = (customCommands[item.id] !== undefined ? customCommands[item.id] : item.defaultCommand).trim().replace(/^\//, '');
      if (!cmdStr) return [];

      let insertText = item.insertText;
      let insertTextRules = undefined;

      // 💡 [하이라이트 방지] InsertAsSnippet 사용 시 Monaco가 삽입된 텍스트를 자동 선택(하이라이트)하므로,
      //    스니펫 규칙을 제거하고 일반 텍스트로 삽입합니다.
      //    (툴바/단축키와 동일한 방식: 삽입 후 커서가 텍스트 끝에 위치)

      let command: any = undefined;

      // 💡 [한글 주석] 모달이 필요한 항목 (youtube 추가)
      const modalKeys = ['image', 'video', 'youtube', 'map', 'table', 'math', 'add_reference'];
      // 💡 [한글 주석] 텍스트 선 삽입 없이 액션만 실행하는 항목 (모달 수반 고급 기능 및 동적 시간 삽입 'now', 서명 'signature', 표 행 편집, 코드블록 언어선택 연동, 인용문 하단 빈 행 추가)
      const actionOnlyKeys = ['cleanDoc', 'clear', 'calendar', 'image', 'video', 'youtube', 'map', 'table', 'math', 'now', 'signature', 'insertTableRow', 'deleteTableRow', 'taglink', 'footnote', 'styleSettings', 'aiHelp', 'add_reference', 'citation', 'codeblock', 'quote', 'quoteNote', 'quoteTip', 'quoteImportant', 'quoteWarning', 'quoteCaution'];

      if (modalKeys.includes(item.id)) {
        command = {
          id: 'trigger-custom-action',
          title: item.name,
          arguments: [item.id]
        };
      }
      if (actionOnlyKeys.includes(item.id)) {
        insertText = '';
        insertTextRules = undefined;
        command = {
          id: 'trigger-custom-action',
          title: item.name,
          arguments: [item.id]
        };
      }

      // 💡 [툴바/단축키 동일 UX] 텍스트 삽입 후 플레이스홀더를 자동 선택하는 커맨드 설정
      //    Monaco completion item의 command 필드는 삽입 완료 후 자동 실행됩니다.
      //    actionOnlyKeys는 이미 trigger-custom-action이 설정되므로 제외합니다.
      if (!command && insertText) {
        // 플레이스홀더 후보 목록: 순서대로 검색 (우선순위 적용)
        const PLACEHOLDER_CANDIDATES = ['홈페이지명', '이미지_URL', '텍스트', 'URL', '제목', '코드', '내용', '수식'];
        let placeholder: string | null = null;
        let placeholderOffset = 0;

        // 단일 라인 insertText에서만 플레이스홀더 감지 (멀티라인은 플레이스홀더 없음)
        if (insertText && !insertText.includes('\n')) {
          for (const pw of PLACEHOLDER_CANDIDATES) {
            const idx = insertText.indexOf(pw);
            if (idx !== -1) {
              placeholder = pw;
              placeholderOffset = idx;
              break;
            }
          }
        }

        if (placeholder) {
          command = {
            id: 'select-slash-placeholder',
            title: '플레이스홀더 선택',
            // insertText 전체 길이, 플레이스홀더 오프셋, 플레이스홀더 길이 전달
            arguments: [insertText.length, placeholderOffset, placeholder.length]
          };
        }
      }

      // 레이블: 이모지 아이콘 + 명령어 + 한국어 이름
      const iconStr = item.icon && item.icon.length <= 4 ? `${item.icon} ` : '';
      const label = `${iconStr}/${cmdStr}   ${item.name}`;
      // filterText: 슬래시(/) 뒤 영문 및 한글 명령어 모두 완벽 지원 (/표, /제목, /인용구, /노트, /팁, /주의 등)
      let aliasTerms = '';
      if (item.id === 'quoteNote') aliasTerms = '노트 참고 note info';
      else if (item.id === 'quoteTip') aliasTerms = '팁 tip';
      else if (item.id === 'quoteImportant') aliasTerms = '중요 important';
      else if (item.id === 'quoteWarning') aliasTerms = '주의 warning warn';
      else if (item.id === 'quoteCaution') aliasTerms = '경고 caution alert danger';
      else if (item.id === 'quote') aliasTerms = '인용 인용구 quote';
      else if (item.id === 'signature') aliasTerms = '사인 sign 서명 발신인 left 왼쪽정렬 좌측정렬 right 우측정렬';

      const filterText = `/${cmdStr} /${item.name} ${item.name} ${cmdStr} ${item.group} ${aliasTerms} ${(SLASH_ALIASES[item.id] || []).map(alias => '/' + alias).join(' ')}`;

      // 💡 [서명 듀얼 슬래시 커맨드] /sign 및 /사인 모두 개별 자동완성 항목으로 즉시 제안
      if (item.id === 'signature') {
        const signItem = {
          id: 'signature',
          label: `${iconStr}/sign   ${item.name}`,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: insertText,
          insertTextRules: insertTextRules,
          detail: `[${item.group}] ${item.name}${item.tagFormat ? `  ·  ${item.tagFormat}` : ''}`,
          filterText,
          sortText: 'sign',
          command: command
        };
        const koreanSignItem = {
          id: 'signature-ko',
          label: `${iconStr}/사인   ${item.name}`,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: insertText,
          insertTextRules: insertTextRules,
          detail: `[${item.group}] ${item.name}${item.tagFormat ? `  ·  ${item.tagFormat}` : ''}`,
          filterText,
          sortText: '사인',
          command: command
        };
        return [signItem, koreanSignItem];
      }

      return [{
        id: item.id,
        label,
        kind: item.kind === 17 ? monaco.languages.CompletionItemKind.Keyword : monaco.languages.CompletionItemKind.Snippet,
        insertText: insertText,
        insertTextRules: insertTextRules,
        detail: `[${item.group}] ${item.name}${item.tagFormat ? `  ·  ${item.tagFormat}` : ''}`,
        filterText,
        sortText: cmdStr,  // 알파벳 순 정렬
        command: command
      }];
    }).filter((item) => item !== null) as any[];
};

