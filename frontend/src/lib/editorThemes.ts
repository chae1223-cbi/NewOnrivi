// ====================================================================
// 📊 [OMD-LIB-editorThemes-0001] editorThemes.ts ➔ EDITOR_THEMES & applySafeMarkdownMonarchTokenizer
// 🎯 @KICK  : Monaco 에디터 테마 정의 및 마크다운 코드블록(한글/미지정 언어/무명/다중 백틱) Monarch 토크나이저 안전 패치
// 🛡️ @GUARD : 한글·유니코드·특수문자 언어명(예: ```아자아자) 및 언어 미지정(```) 코드블록에서 여는 펜스 미인식으로 인해 닫는 ```가 코드블록 시작 상태로 역전되어 코드블록 이하 전체 일반 문장이 보라색(variable.source)으로 오염되던 Monaco 기본 마크다운 토크나이저 정규식 결함 원천 차단
// 🚨 @PATCH : **2026-10-17** — [코드블록 언어 미지정/한글·임의 언어명 입력 시 코드블록 이하 일반 텍스트 색상 오염(보라색 변색) 결함 완벽 해결]:
//             1) Monaco 내장 markdown Monarch 토크나이저가 영문/숫자(\w)만 여는 코드블록 언어명으로 허용하여 한글/특수문자 언어명(예: ```아자아자) 입력 시 여는 펜스를 무시하고 닫는 ```를 코드블록 시작으로 오인해 코드블록 아래의 모든 일반 본문을 @codeblock(보라색)으로 물들이던 상태 역전 버그 해결
//             2) SAFE_MARKDOWN_MONARCH_LANGUAGE 및 applySafeMarkdownMonarchTokenizer를 통해 한글/유니코드/공백/미지정 언어(```) 및 4중 백틱(````)/물결(~~~) 코드블록의 열림·닫힘 상태를 100% 정확히 매칭
//             3) 언어 미지정 코드블록 내부 텍스트(variable.source) 색상을 본문 코드 가독성에 맞춘 차분한 슬레이트 톤으로 통일하여 일반 본문 및 인라인 코드(variable)와 명확히 구분
// 🔗 @CALLS : monaco.languages.registerTokensProviderFactory, monaco.languages.setMonarchTokensProvider
// ====================================================================

export interface ThemeDefinition {
  id: string;
  name: string;
  icon: string;
  isDark: boolean;
  base: 'vs' | 'vs-dark';
  rules: { token: string; fontStyle?: string; foreground?: string }[];
  colors: Record<string, string>;
}

export const EDITOR_THEMES: ThemeDefinition[] = [
  {
    id: 'onrivi-light',
    name: 'Onrivi Light',
    icon: '☀️',
    isDark: false,
    base: 'vs',
    rules: [
      { token: '', foreground: '1e293b' },
      { token: 'keyword', fontStyle: 'bold', foreground: '4f46e5' }, // 헤더/키워드 (강렬한 로열 블루)
      { token: 'keyword.markdown', fontStyle: 'bold', foreground: '4f46e5' },
      { token: 'comment', fontStyle: 'italic', foreground: '78716c' }, // 인용구 (돌빛 회색)
      { token: 'comment.markdown', fontStyle: 'italic', foreground: '78716c' },
      { token: 'strong', fontStyle: 'bold', foreground: 'db2777' }, // Bold (진한 핑크)
      { token: 'strong.markdown', fontStyle: 'bold', foreground: 'db2777' },
      { token: 'emphasis', fontStyle: 'italic', foreground: '059669' }, // Italic (청록색)
      { token: 'emphasis.markdown', fontStyle: 'italic', foreground: '059669' },
      { token: 'string.link', fontStyle: 'underline', foreground: '2563eb' }, // 링크 주소 (블루)
      { token: 'string.link.markdown', fontStyle: 'underline', foreground: '2563eb' },
      { token: 'string', foreground: '1e293b' }, // 일반 텍스트
      { token: 'variable', foreground: '7c3aed' }, // 인라인 코드 (자수정 보라)
      { token: 'variable.source', foreground: '334155' }, // 코드 블록 내부 기본 텍스트 (차콜 슬레이트)
      { token: 'type', foreground: 'ea580c', fontStyle: 'bold' }, // 리스트 기호 (오렌지)
      { token: 'type.markdown', foreground: 'ea580c', fontStyle: 'bold' },
      { token: 'tag', foreground: '0ea5e9' }, // HTML 태그 (하늘색)
      { token: 'tag.markdown', foreground: '0ea5e9' },
      { token: 'meta', foreground: '0891b2' }, // 메타데이터
      { token: 'meta.content', foreground: '0891b2' },
      { token: 'meta.separator', foreground: '0891b2', fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1e293b',
      'editor.lineHighlightBackground': '#f1f5f980',
      'editorLineNumber.foreground': '#94a3b880',
      'editorLineNumber.activeForeground': '#0f172a',
      'editorCursor.foreground': '#0f172a',
      'editor.selectionBackground': '#cbd5e180'
    }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    icon: '🌅',
    isDark: false,
    base: 'vs',
    rules: [
      { token: '', foreground: '657B83' },
      { token: 'keyword', fontStyle: 'bold', foreground: 'CB4B16' }, // 헤더/키워드 (황토 오렌지)
      { token: 'keyword.markdown', fontStyle: 'bold', foreground: 'CB4B16' },
      { token: 'comment', fontStyle: 'italic', foreground: '859900' }, // 인용구/의견 (올리브 그린)
      { token: 'comment.markdown', fontStyle: 'italic', foreground: '859900' },
      { token: 'strong', fontStyle: 'bold', foreground: 'b58900' }, // Bold (황금 옐로우)
      { token: 'strong.markdown', fontStyle: 'bold', foreground: 'b58900' },
      { token: 'emphasis', fontStyle: 'italic', foreground: '2aa198' }, // Italic (청록 민트)
      { token: 'emphasis.markdown', fontStyle: 'italic', foreground: '2aa198' },
      { token: 'string.link', fontStyle: 'underline', foreground: '268bd2' }, // 링크 (솔라 블루)
      { token: 'string.link.markdown', fontStyle: 'underline', foreground: '268bd2' },
      { token: 'string', foreground: '657B83' },
      { token: 'variable', foreground: 'd33682' }, // 인라인 코드 (매젠타 핑크)
      { token: 'variable.source', foreground: '586E75' }, // 코드 블록 내부 기본 텍스트
      { token: 'type', foreground: 'cb4b16', fontStyle: 'bold' }, // 리스트 (레드 오렌지)
      { token: 'type.markdown', foreground: 'cb4b16', fontStyle: 'bold' },
      { token: 'tag', foreground: '2aa198' }, // HTML 태그
      { token: 'tag.markdown', foreground: '2aa198' },
    ],
    colors: {
      'editor.background': '#FDF6E3',
      'editor.foreground': '#657B83',
      'editor.lineHighlightBackground': '#EEE8D5',
      'editor.selectionBackground': '#D1D1C0',
      'editorCursor.foreground': '#657B83',
      'editorLineNumber.foreground': '#93A1A1',
      'editorLineNumber.activeForeground': '#657B83',
      'editorBracketMatch.background': '#E4DDD0',
      'editorBracketMatch.border': '#657B83',
    }
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    icon: '🐙',
    isDark: false,
    base: 'vs',
    rules: [
      { token: '', foreground: '24292E' },
      { token: 'keyword', fontStyle: 'bold', foreground: '6f42c1' }, // 헤더/키워드 (짙은 보라)
      { token: 'keyword.markdown', fontStyle: 'bold', foreground: '6f42c1' },
      { token: 'comment', fontStyle: 'italic', foreground: '28a745' }, // 인용구 (그린)
      { token: 'comment.markdown', fontStyle: 'italic', foreground: '28a745' },
      { token: 'strong', fontStyle: 'bold', foreground: 'd73a49' }, // Bold (레드)
      { token: 'strong.markdown', fontStyle: 'bold', foreground: 'd73a49' },
      { token: 'emphasis', fontStyle: 'italic', foreground: '005cc5' }, // Italic (딥 블루)
      { token: 'emphasis.markdown', fontStyle: 'italic', foreground: '005cc5' },
      { token: 'string.link', fontStyle: 'underline', foreground: '032f62' }, // 링크
      { token: 'string.link.markdown', fontStyle: 'underline', foreground: '032f62' },
      { token: 'string', foreground: '24292E' },
      { token: 'variable', foreground: 'e36209' }, // 인라인 코드 (오렌지 브라운)
      { token: 'variable.source', foreground: '24292E' }, // 코드 블록 내부 기본 텍스트
      { token: 'type', foreground: 'd73a49', fontStyle: 'bold' }, // 리스트 기호
      { token: 'type.markdown', foreground: 'd73a49', fontStyle: 'bold' },
      { token: 'tag', foreground: '22863a' }, // HTML 태그
      { token: 'tag.markdown', foreground: '22863a' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292E',
      'editor.lineHighlightBackground': '#F6F8FA',
      'editor.selectionBackground': '#C8E1FF',
      'editorCursor.foreground': '#24292E',
      'editorLineNumber.foreground': '#959DA5',
      'editorLineNumber.activeForeground': '#24292E',
      'editorBracketMatch.background': '#E8F0FE',
      'editorBracketMatch.border': '#24292E',
    }
  },
  {
    id: 'github-dark-dimmed',
    name: 'GitHub Dark Dimmed',
    icon: '🐨',
    isDark: true,
    base: 'vs-dark',
    rules: [
      { token: '', foreground: 'e2e8f0' },
      { token: 'keyword', fontStyle: 'bold', foreground: 'f69d50' }, // 헤더/키워드 (선명한 살구 오렌지)
      { token: 'keyword.markdown', fontStyle: 'bold', foreground: 'f69d50' },
      { token: 'comment', fontStyle: 'italic', foreground: '768390' }, // 인용구 (차분한 그레이)
      { token: 'comment.markdown', fontStyle: 'italic', foreground: '768390' },
      { token: 'strong', fontStyle: 'bold', foreground: 'ec4899' }, // Bold (화려한 매젠타)
      { token: 'strong.markdown', fontStyle: 'bold', foreground: 'ec4899' },
      { token: 'emphasis', fontStyle: 'italic', foreground: '34d399' }, // Italic (민트 그린)
      { token: 'emphasis.markdown', fontStyle: 'italic', foreground: '34d399' },
      { token: 'string.link', fontStyle: 'underline', foreground: '58a6ff' }, // 링크
      { token: 'string.link.markdown', fontStyle: 'underline', foreground: '58a6ff' },
      { token: 'string', foreground: 'adbac7' },
      { token: 'variable', foreground: 'd3b887' }, // 인라인 코드 (브론즈 골드)
      { token: 'variable.source', foreground: 'adbac7' }, // 코드 블록 내부 기본 텍스트
      { token: 'type', foreground: 'ff7b72', fontStyle: 'bold' }, // 리스트 기호 (체리 레드)
      { token: 'type.markdown', foreground: 'ff7b72', fontStyle: 'bold' },
      { token: 'tag', foreground: '56b6c2' }, // HTML 태그 (아쿠아)
      { token: 'tag.markdown', foreground: '56b6c2' },
      { token: 'meta', foreground: 'a5d6ff' }, // 메타데이터
      { token: 'meta.content', foreground: 'a5d6ff' },
      { token: 'meta.separator', foreground: 'a5d6ff', fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': '#22272E',
      'editor.foreground': '#ADBAC7',
      'editor.lineHighlightBackground': '#2D333B',
      'editorLineNumber.foreground': '#545D68',
      'editorLineNumber.activeForeground': '#ADBAC7',
      'editor.selectionBackground': '#3D4551',
      'editorCursor.foreground': '#ADBAC7',
      'editorBracketMatch.background': '#2D333B',
      'editorBracketMatch.border': '#ADBAC7',
    }
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    icon: '🌁',
    isDark: true,
    base: 'vs-dark',
    rules: [
      { token: '', foreground: '839496' },
      { token: 'keyword', fontStyle: 'bold', foreground: 'cb4b16' }, // 헤더/키워드 (오렌지)
      { token: 'keyword.markdown', fontStyle: 'bold', foreground: 'cb4b16' },
      { token: 'comment', fontStyle: 'italic', foreground: '586e75' }, // 인용구
      { token: 'comment.markdown', fontStyle: 'italic', foreground: '586e75' },
      { token: 'strong', fontStyle: 'bold', foreground: '268bd2' }, // Bold (블루)
      { token: 'strong.markdown', fontStyle: 'bold', foreground: '268bd2' },
      { token: 'emphasis', fontStyle: 'italic', foreground: '859900' }, // Italic (그린)
      { token: 'emphasis.markdown', fontStyle: 'italic', foreground: '859900' },
      { token: 'string.link', fontStyle: 'underline', foreground: '2aa198' }, // 링크
      { token: 'string.link.markdown', fontStyle: 'underline', foreground: '2aa198' },
      { token: 'string', foreground: '839496' },
      { token: 'variable', foreground: 'd33682' }, // 인라인 코드 (매젠타)
      { token: 'variable.source', foreground: '93a1a1' }, // 코드 블록 내부 기본 텍스트
      { token: 'type', foreground: 'b58900', fontStyle: 'bold' }, // 리스트 (옐로우)
      { token: 'type.markdown', foreground: 'b58900', fontStyle: 'bold' },
      { token: 'tag', foreground: '2aa198' }, // HTML 태그
      { token: 'tag.markdown', foreground: '2aa198' },
    ],
    colors: {
      'editor.background': '#002B36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editorLineNumber.foreground': '#586E75',
      'editorLineNumber.activeForeground': '#839496',
      'editor.selectionBackground': '#073642',
      'editorCursor.foreground': '#D30102',
      'editorBracketMatch.background': '#073642',
      'editorBracketMatch.border': '#839496',
    }
  }
];

export const THEME_MAP = Object.fromEntries(
  EDITOR_THEMES.map(t => [t.id, t])
) as Record<string, ThemeDefinition>;

/**
 * 🛡️ CommonMark 규격 및 한글/미지정 언어명을 완벽 지원하는 안전 마크다운 Monarch 문법 정의
 * - Monaco 기본 문법은 `/^\s*```\s*((?:\w|[\/\-#])+).*$/`만 허용하여 한글(예: ```아자아자)이나 특수기호 언어명이 오면
 *   여는 코드블록 펜스를 인식하지 못하고, 뒤따르는 닫는 ```를 여는 펜스로 오인해 문서 하단 전체 색상을 변질시킵니다.
 * - 이를 해결하기 위해 4+ 백틱 중첩 블록, 3+ 물결 블록, 영문 표준 언어 블록, 한글/미지정/무명 코드블록을 모두 안전하게 처리합니다.
 */
export const SAFE_MARKDOWN_MONARCH_LANGUAGE = {
  defaultToken: '',
  tokenPostfix: '.md',
  control: /[\\`*_\[\]{}()#+\-\.!]/,
  noncontrol: /[^\\`*_\[\]{}()#+\-\.!]/,
  escapes: /\\(?:@control)/,
  jsescapes: /\\(?:[btnfr\\"']|[0-7][0-7]?|[0-3][0-7]{2})/,
  empty: [
    'area', 'base', 'basefont', 'br', 'col', 'frame', 'hr',
    'img', 'input', 'isindex', 'link', 'meta', 'param'
  ],
  tokenizer: {
    root: [
      // markdown tables
      [/^\s*\|/, '@rematch', '@table_header'],
      // headers (with #)
      [/^(\s{0,3})(#+)((?:[^\\#]|@escapes)+)((?:#+)?)/, ['white', 'keyword', 'keyword', 'keyword']],
      // headers (with =)
      [/^\s*(=+|\-+)\s*$/, 'keyword'],
      // headers (with ***)
      [/^\s*((\*[ ]?)+)\s*$/, 'meta.separator'],
      // quote
      [/^\s*>+/, 'comment'],
      // list (starting with * or number)
      [/^\s*([\*\-+:]|\d+\.)\s/, 'keyword'],
      // code block (4 spaces indent)
      [/^(\t|[ ]{4})[^ ].*$/, 'string'],
      // 4+ backtick fences (nested codeblock safe container)
      [/^\s*`{4,}[^`]*$/, { token: 'string', next: '@codeblock_backtick4' }],
      // 3+ tilde fences (supports empty, ASCII, Korean/Unicode language names)
      [/^\s*~{3,}.*$/, { token: 'string', next: '@codeblock_tilde' }],
      // 3 backtick fences with standard ASCII language identifier
      [
        /^\s*```\s*([a-zA-Z0-9_+\-#.]+)[^`]*$/,
        { token: 'string', next: '@codeblockgh', nextEmbedded: '$1' }
      ],
      // 3 backtick fences with Korean/Unicode/custom label or no language name
      [/^\s*```[^`]*$/, { token: 'string', next: '@codeblock' }],
      // markup within lines
      { include: '@linecontent' }
    ],
    table_header: [
      { include: '@table_common' },
      [/[^\|]+/, 'keyword.table.header']
    ],
    table_body: [{ include: '@table_common' }, { include: '@linecontent' }],
    table_common: [
      [/\s*[\-:]+\s*/, { token: 'keyword', switchTo: 'table_body' }],
      [/^\s*\|/, 'keyword.table.left'],
      [/^\s*[^\|]/, '@rematch', '@pop'],
      [/^\s*$/, '@rematch', '@pop'],
      [
        /\|/,
        {
          cases: {
            '@eos': 'keyword.table.right',
            '@default': 'keyword.table.middle'
          }
        }
      ]
    ],
    codeblock_backtick4: [
      [/^\s*`{4,}\s*$/, { token: 'string', next: '@pop' }],
      [/.*$/, 'variable.source']
    ],
    codeblock_tilde: [
      [/^\s*~{3,}\s*$/, { token: 'string', next: '@pop' }],
      [/.*$/, 'variable.source']
    ],
    codeblock: [
      [/^\s*`{3,}\s*$/, { token: 'string', next: '@pop' }],
      [/^\s*~{3,}\s*$/, { token: 'string', next: '@pop' }],
      [/.*$/, 'variable.source']
    ],
    codeblockgh: [
      [/^\s*`{3,}\s*$/, { token: 'string', next: '@pop', nextEmbedded: '@pop' }],
      [/.*$/, 'variable.source']
    ],
    linecontent: [
      [/&\w+;/, 'string.escape'],
      [/@escapes/, 'escape'],
      [/\b__([^\\_]|@escapes|_(?!_))+__\b/, 'strong'],
      [/\*\*([^\\*]|@escapes|\*(?!\*))+\*\*/, 'strong'],
      [/\b_[^_]+_\b/, 'emphasis'],
      [/\*([^\\*]|@escapes)+\*/, 'emphasis'],
      [/`([^\\`]|@escapes)+`/, 'variable'],
      [/\{+[^}]+\}+/, 'string.target'],
      [/(!?\[)((?:[^\]\\]|@escapes)*)(\]\([^\)]+\))/, ['string.link', '', 'string.link']],
      [/(!?\[)((?:[^\]\\]|@escapes)*)(\])/, 'string.link'],
      { include: 'html' }
    ],
    html: [
      [/<(\w+)\/>/, 'tag'],
      [
        /<(\w+)(\-|\w)*/,
        {
          cases: {
            '@empty': { token: 'tag', next: '@tag.$1' },
            '@default': { token: 'tag', next: '@tag.$1' }
          }
        }
      ],
      [/<\/(\w+)(\-|\w)*\s*>/, { token: 'tag' }],
      [/<!--/, 'comment', '@comment']
    ],
    comment: [
      [/[^<\-]+/, 'comment.content'],
      [/-->/, 'comment', '@pop'],
      [/<!--/, 'comment.content.invalid'],
      [/[<\-]/, 'comment.content']
    ],
    tag: [
      [/[ \t\r\n]+/, 'white'],
      [
        /(type)(\s*=\s*)(")([^"]+)(")/,
        [
          'attribute.name.html',
          'delimiter.html',
          'string.html',
          { token: 'string.html', switchTo: '@tag.$S2.$4' },
          'string.html'
        ]
      ],
      [
        /(type)(\s*=\s*)(')([^']+)(')/,
        [
          'attribute.name.html',
          'delimiter.html',
          'string.html',
          { token: 'string.html', switchTo: '@tag.$S2.$4' },
          'string.html'
        ]
      ],
      [/(\w+)(\s*=\s*)("[^"]*"|'[^']*')/, ['attribute.name.html', 'delimiter.html', 'string.html']],
      [/\w+/, 'attribute.name.html'],
      [/\/>/, 'tag', '@pop'],
      [
        />/,
        {
          cases: {
            '$S2==style': {
              token: 'tag',
              switchTo: 'embeddedStyle',
              nextEmbedded: 'text/css'
            },
            '$S2==script': {
              cases: {
                $S3: {
                  token: 'tag',
                  switchTo: 'embeddedScript',
                  nextEmbedded: '$S3'
                },
                '@default': {
                  token: 'tag',
                  switchTo: 'embeddedScript',
                  nextEmbedded: 'text/javascript'
                }
              }
            },
            '@default': { token: 'tag', next: '@pop' }
          }
        }
      ]
    ],
    embeddedStyle: [
      [/[^<]+/, ''],
      [/<\/style\s*>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
      [/</, '']
    ],
    embeddedScript: [
      [/[^<]+/, ''],
      [/<\/script\s*>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
      [/</, '']
    ]
  }
};

export function applySafeMarkdownMonarchTokenizer(monaco: any): void {
  if (!monaco?.languages) return;
  try {
    if (typeof monaco.languages.registerTokensProviderFactory === 'function') {
      monaco.languages.registerTokensProviderFactory('markdown', {
        create: async () => SAFE_MARKDOWN_MONARCH_LANGUAGE
      });
    }
    if (typeof monaco.languages.setMonarchTokensProvider === 'function') {
      monaco.languages.setMonarchTokensProvider('markdown', SAFE_MARKDOWN_MONARCH_LANGUAGE as any);
    }
  } catch (err) {
    console.warn('[editorThemes] Failed to register safe markdown Monarch tokenizer:', err);
  }
}

