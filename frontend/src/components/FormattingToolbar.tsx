/**
 * 프로그램명 : OnriviAuthor 
 * 파일명 : FormattingToolbar.tsx
 * -----------------------------------------------------------------------
 * 변경내역
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-31** — [제목 화살표(▲, ▼) 클릭 시 레벨 변경 및 에디터 즉시 반영]: 제목 레벨 조절 화살표 클릭 시 H1~H6 명령어가 에디터에 즉시 실행되도록 연동
 * 🚨 @PATCH : **2026-10-15** — [서명/발신인 서식 왼쪽 정렬 명칭 동기화]: 툴팁 라벨을 '서명/발신인 (왼쪽 정렬)'으로 갱신
 * 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 변경] 다른 이름으로 저장(Ctrl+Shift+S)과의 충돌 방지를 위해 서명/발신인 단축키를 Ctrl+Alt+R로 변경
 * 🚨 @PATCH : **2026-10-01** — [서명/발신인 버튼 추가] 서명/발신인(우측 정렬, Ctrl+Alt+R) 버튼 탑재 및 SHORTCUTS 동기화
 * 🚨 @PATCH : **2026-09-23** — [서식 툴바 인용구 한글/영문 Alert 태그 듀얼 지원] 인용구 선택 드롭다운에 한글/영문 태그([!참고] · [!NOTE] 등) 듀얼 표기 및 너비 확장
 * 🚨 @PATCH : **2026-09-23** — [인라인코드 및 인용(참조문헌) 아이콘 지정] 인라인 코드를 Password.png로, 인용(참조문헌)을 오른쪽 툴바 참조파일관리(NewspaperClipping) 아이콘으로 교체
 * 🚨 @PATCH : **2026-09-23** — [인라인 인용(CITE) 아이콘 교체] 인라인 인용(참조문헌) 아이콘을 frontend/public/icons/Password.png 이미지로 교체
 * 🚨 @PATCH : **2026-09-23** — [서식 툴바 인용구 아이콘 교체] 인용구(QUOTE) 아이콘을 텍스트(❝)에서 frontend/public/icons/WechatLogo.png 이미지로 교체
 * 🚨 @PATCH : **2026-09-23** — [서식 툴바 아이콘 고대비 선명화] 반투명(opacity-75) 제거하여 100% 완전 불투명 및 고대비 적용
 * 🚨 @PATCH : **2026-09-23** — [서식 툴바 커스텀 아이콘 PNG 연동] 플로팅/상단 서식 툴바 15개 액션 아이콘을 frontend/public/icons PNG 및 NewspaperClipping으로 일원화
 * 🚨 @PATCH : **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(Eraser, Sparkles) 제거, Icon 컴포넌트로 교체. 나머지 이모지 버튼은 사용자 요청에 따라 유지.
 * 🚨 @PATCH : **2026-09-12** — AI 버튼 툴팁을 'AI 프롬프트'로 명칭 일원화 및 툴바 원래 이모지 서식 원복 유지
 * 🚨 @PATCH : **2026-09-11** — 인용구(❝) 버튼에 Alert 태그 선택 콤보 드롭다운(일반 인용구, Note, Tip, Important, Warning, Caution) 추가 탑재
 * 🚨 @PATCH : **2026-09-05** — AI 연동 해제(!geminiApiKey) 시 서식 툴바의 AI 글쓰기 어시스턴트 버튼(Sparkles) 비활성화(disabled, opacity-30, grayscale) 적용
 * 🚨 @PATCH : **2026-07-20** — 툴바의 '문서 서식 일괄 정리' 버튼 아이콘을 플로팅 툴바 및 환경설정과 동일하게 `🧹`로 변경하여, AI 글쓰기 어시스턴트 아이콘(`✨`)과의 시각적 중복 및 혼선 방지 패치
 * -----------------------------------------------------------------------
 */
"use client";
import React from 'react';
import { Icon } from '@/components/icons/Icon';



import { useEditorContext } from '@/context/EditorContext';

const SHORTCUTS: Record<string, string> = {
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  inlineCode: 'Ctrl+E',
  underline: 'Ctrl+U',
  strikethrough: 'Ctrl+Shift+X',
  footnote: 'Ctrl+Alt+F',
  hr: 'Ctrl+Alt+-',
  orderedList: 'Ctrl+Shift+7',
  list: 'Ctrl+Shift+8',
  quote: 'Ctrl+Q',
  check: 'Ctrl+Shift+C',
  eraser: 'Ctrl+Shift+X',
  cleanDoc: 'Ctrl+Shift+L',
  link: 'Ctrl+K',
  table: 'Ctrl+T',
  code: 'Ctrl+Shift+E',
  math: 'Ctrl+Shift+T',
  signature: 'Ctrl+Alt+R',
};

const tooltip = (label: string, shortcut?: string) =>
  shortcut ? `${label} (${shortcut})` : label;

export default function FormattingToolbar() {
  const { dispatchCommand: dispatch, previewMode, isExpired, geminiApiKey, showToast } = useEditorContext();
  const [headingLevel, setHeadingLevel] = React.useState(3);

  const handleHeadingUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (headingLevel > 1) {
      const next = headingLevel - 1;
      setHeadingLevel(next);
      dispatch(('H' + next) as any);
    }
  };

  const handleHeadingDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (headingLevel < 6) {
      const next = headingLevel + 1;
      setHeadingLevel(next);
      dispatch(('H' + next) as any);
    }
  };


  if (previewMode === 'preview') return null;

  return (
    <div className="h-10 flex items-center px-2 gap-1 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border-b border-black/5 dark:border-white/5 shrink-0 overflow-x-auto z-10 transition-colors duration-300">
      {/* AI 글쓰기 단독 버튼 */}
      <FormatBtn
        disabled={!geminiApiKey}
        label={<Icon name="AiAssistant" size={15} className={geminiApiKey ? "text-purple-500 animate-pulse" : "text-slate-400 dark:text-zinc-500"} />}
        title={geminiApiKey ? "AI 프롬프트" : "AI 연동 해제됨 (설정에서 API 키를 등록해 주세요)"}
        onAction={() => {
          if (!geminiApiKey) {
            showToast("AI 기능을 사용하려면 설정에서 Gemini API Key를 등록해 주세요.", "warning");
            dispatch('SETTINGS');
            return;
          }
          dispatch('OPEN_AI_WRITER');
        }}
      />
      <Divider />

      {/* 서식 */}
      <FormatBtn label="B" title={tooltip('굵게', SHORTCUTS.bold)} onAction={() => dispatch('BOLD')} bold />
      <FormatBtn label="I" title={tooltip('기울임', SHORTCUTS.italic)} onAction={() => dispatch('ITALIC')} italic />
      <FormatBtn label={<img src="/icons/Password.png" alt="인라인 코드" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('인라인 코드', SHORTCUTS.inlineCode)} onAction={() => dispatch('INLINE_CODE')} />
      <FormatBtn label="U" title={tooltip('밑줄', SHORTCUTS.underline)} onAction={() => dispatch('UNDERLINE')} underline />
      <FormatBtn label={<span className="line-through">S</span>} title={tooltip('취소선', SHORTCUTS.strikethrough)} onAction={() => dispatch('STRIKETHROUGH')} />

      <Divider />

      {/* 제목 */}
      <div className="flex items-center border border-emerald-500/20 dark:border-emerald-500/30 rounded bg-emerald-500/5 dark:bg-emerald-500/10 px-1">
        <button onMouseDown={handleHeadingUp} disabled={headingLevel === 1}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 text-[11px]" title="제목 크기 키우기">▲</button>
        <button onMouseDown={(e) => { e.preventDefault(); dispatch(`H${headingLevel}`); }}
          className="w-7 h-7 flex items-center justify-center font-bold text-[13px] hover:bg-black/10 dark:hover:bg-white/10 rounded" title={`제목 ${headingLevel} 적용`}>H{headingLevel}</button>
        <button onMouseDown={handleHeadingDown} disabled={headingLevel === 6}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 text-[11px]" title="제목 크기 줄이기">▼</button>
      </div>

      <Divider />

      {/* 문서/구분선 */}
      <FormatBtn label="—" title={tooltip('구분선', SHORTCUTS.hr)} onAction={() => dispatch('HR')} />
      <FormatBtn label={<img src="/icons/ListNumbers.png" alt="숫자 목록" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('숫자 목록', SHORTCUTS.orderedList)} onAction={() => dispatch('ORDERED_LIST')} />
      <FormatBtn label={<img src="/icons/ListBullets.png" alt="글머리 기호" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('글머리 기호', SHORTCUTS.list)} onAction={() => dispatch('LIST')} />
      <QuoteDropdownBtn dispatch={dispatch} />
      <FormatBtn label={<img src="/icons/ListChecks.png" alt="체크리스트" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('체크리스트', SHORTCUTS.check)} onAction={() => dispatch('CHECK')} />
      <FormatBtn label={<img src="/icons/Eraser.png" alt="태그 취소" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('태그 취소', SHORTCUTS.eraser)} onAction={() => dispatch('REMOVE_PREFIX')} />
      <FormatBtn label={<img src="/icons/MagicWand.png" alt="문서 서식 일괄 정리" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('문서 서식 일괄 정리', SHORTCUTS.cleanDoc)} onAction={() => dispatch('CLEAN_DOC')} />

      <Divider />

      {/* 링크/미디어 */}
      <FormatBtn label={<img src="/icons/Link.png" alt="링크" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('링크', SHORTCUTS.link)} onAction={() => dispatch('LINK')} />
      <FormatBtn label={<img src="/icons/BookBookmark.png" alt="문서 연결" className="w-5 h-5 object-contain dark:invert" />} title="문서 연결" onAction={() => dispatch('DOCLINK')} />
      <FormatBtn label={<Icon name="NewspaperClipping" size={18} className="text-zinc-800 dark:text-zinc-100" />} title={tooltip('인용(참조문헌)', 'Ctrl+Alt+C')} onAction={() => dispatch('CITE')} />
      <FormatBtn label="fn" title={tooltip('각주', SHORTCUTS.footnote)} onAction={() => dispatch('FOOTNOTE')} />
      <Divider />
      <FormatBtn label={<img src="/icons/Farm.png" alt="이미지" className="w-5 h-5 object-contain dark:invert" />} title="이미지" onAction={() => dispatch('IMAGE')} />
      <FormatBtn label={<img src="/icons/FilmReel.png" alt="동영상삽입" className="w-5 h-5 object-contain dark:invert" />} title="동영상삽입" onAction={() => dispatch('YOUTUBE')} />
      <FormatBtn label={<img src="/icons/Calendar.png" alt="현재 날짜/시간" className="w-5 h-5 object-contain dark:invert" />} title="현재 날짜/시간" onAction={() => dispatch('NOW')} />
      <FormatBtn label={<Icon name="Signature" size={18} className="text-zinc-800 dark:text-zinc-100" />} title={tooltip('서명/발신인 (왼쪽 정렬)', SHORTCUTS.signature)} onAction={() => dispatch('SIGNATURE')} />

      <Divider />

      {/* 고급/코드 */}
      <FormatBtn label={<img src="/icons/MapTrifold.png" alt="지도 삽입" className="w-5 h-5 object-contain dark:invert" />} title="지도 삽입" onAction={() => dispatch('MAP')} />
      <FormatBtn label={<img src="/icons/Table.png" alt="표 생성" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('표 생성', SHORTCUTS.table)} onAction={() => dispatch('TABLE')} />
      <FormatBtn label={<img src="/icons/FileCode.png" alt="코드 블록" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('코드 블록', SHORTCUTS.code)} onAction={() => dispatch('CODE')} />
      <FormatBtn label={<img src="/icons/PlusMinus.png" alt="수식(LaTeX)" className="w-5 h-5 object-contain dark:invert" />} title={tooltip('수식(LaTeX)', SHORTCUTS.math)} onAction={() => dispatch('LATEX')} />
    </div>
  );
}

function FormatBtn({ label, title, onAction, bold, italic, underline, disabled }: {
  label: string | React.ReactNode;
  title: string;
  onAction?: (e: any) => void;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onAction?.(e); }}
      className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center text-[16px] shrink-0 ${
        disabled 
          ? 'opacity-30 cursor-not-allowed grayscale' 
          : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'
      } ${bold ? 'font-black' : ''} ${italic ? 'italic font-serif' : ''} ${underline ? 'underline' : ''}`}
      title={title}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600/60 mx-1 shrink-0" />;
}

const ALERT_OPTIONS = [
  { id: 'QUOTE', label: '일반 인용구', icon: '❝', tag: '> ' },
  { id: 'QUOTE_NOTE', label: '참고 (Note)', icon: 'ℹ️', tag: '[!참고] · [!NOTE]', color: 'text-[#0969da] dark:text-[#2f81f7]' },
  { id: 'QUOTE_TIP', label: '팁 (Tip)', icon: '💡', tag: '[!팁] · [!TIP]', color: 'text-[#1a7f37] dark:text-[#3fb950]' },
  { id: 'QUOTE_IMPORTANT', label: '중요 (Important)', icon: '📢', tag: '[!중요] · [!IMPORTANT]', color: 'text-[#8250df] dark:text-[#a371f7]' },
  { id: 'QUOTE_WARNING', label: '주의 (Warning)', icon: '⚠️', tag: '[!주의] · [!WARNING]', color: 'text-[#9a6700] dark:text-[#d29922]' },
  { id: 'QUOTE_CAUTION', label: '경고 (Caution)', icon: '🚨', tag: '[!경고] · [!CAUTION]', color: 'text-[#d1242f] dark:text-[#f85149]' },
];

function QuoteDropdownBtn({ dispatch }: { dispatch: (cmd: any) => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          dispatch('QUOTE');
        }}
        className="h-8 px-1.5 rounded-l-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
        title="인용구 (Ctrl+Q)"
      >
        <img src="/icons/WechatLogo.png" alt="인용구" className="w-5 h-5 object-contain dark:invert" />
      </button>

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          setIsOpen(prev => !prev);
        }}
        className="h-8 px-1 rounded-r-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center text-[9px] text-zinc-500 dark:text-zinc-400 cursor-pointer"
        title="인용구 태그 선택 (Note, Tip, Important, Warning, Caution)"
      >
        ▼
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 mb-1 select-none">
            인용구 스타일 선택
          </div>
          {ALERT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onMouseDown={(e) => {
                e.preventDefault();
                dispatch(opt.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{opt.icon}</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{opt.label}</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${opt.color || 'text-zinc-400'}`}>
                {opt.tag}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

