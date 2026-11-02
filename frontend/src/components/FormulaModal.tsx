"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sigma, Plus, History, Info, ChevronRight, Calculator, AlignCenter, AlignLeft } from 'lucide-react';
import { wrapMathWithBold } from "@/lib/editorUtils";
import { msg } from '@/lib/systemMessages';
import katex from 'katex';

/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.0.1
 * 프로그램 ID : oaar-formula-modal
 * 🚨 @PATCH : **2026-10-17** — [블록 수식($$) 생성 시 하단 빈 행 자동 추가]: displayMode(블록 수식) 삽입 시 닫는 $$ 뒤에 빈 행(\n\n)을 자동 추가하여 마우스 클릭으로 다음 작업을 이어갈 수 있도록 개선
 * 🚨 @PATCH : **2026-10-14** — [수식 에디터 실시간 미리보기 크로미움 가상 스크롤바 글리치 제거 및 행렬 개행(\\) 보존]:
 *             1) #formula-live-preview의 중복 overflow-x-auto를 overflow-visible 및 상하 여백(py-2 px-1)으로 개선하여, 분수/루트 등 수식 우측에 회색 막대(|) 스크롤바가 노출되는 렌더링 결함 완전 해소
 *             2) cleanLatex의 불필요한 .replace(/\\\\/g, '\\') 처리를 제거하여 행렬(pmatrix) 및 다행 수식의 줄바꿈(\\) 문법 보존
 * 🚨 @PATCH : **2026-10-14** — [수식 에디터 모달 기존 수식 편집(initialLatex) 및 인라인($)/블록($$) 모드 양방향 연동]:
 *             1) initialLatex prop을 추가하여 기존 수식 더블클릭 시 해당 LaTeX 수식을 모달에 즉각 로드
 *             2) initialLatex 형식($...$ vs $$...$$)에 따라 인라인/블록 displayMode 자동 전환 및 실시간 KaTeX 미리보기 연동
 *             3) 인라인 수식($) 삽입 시 후행 1칸 공백($latex$ )을 기본 포함하여 에디터 삽입 직후 수식 옆 본문 글쓰기 즉각 보장
 *             4) 모달 오픈 시 initialLatex 상태 동기화로 신규 삽입 및 기존 수식 수정 일원화 지원
 */
interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  isDarkMode: boolean;
  initialLatex?: string;
}

export default function FormulaModal({ isOpen, onClose, onInsert, isDarkMode, initialLatex }: FormulaModalProps) {
  useModalEscape(isOpen, onClose);
  const [latex, setLatex] = useState(initialLatex || "");
  const [displayMode, setDisplayMode] = useState<boolean>(true); // true: $$, false: $
  const [activeTab, setActiveTab] = useState<'symbols' | 'templates' | 'history'>('templates');
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [katexLoaded, setKatexLoaded] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      let raw = (initialLatex || '').trim();
      if (raw.startsWith('$$') && raw.endsWith('$$') && raw.length >= 4) {
        setDisplayMode(true);
        raw = raw.slice(2, -2).trim();
      } else if (raw.startsWith('$') && raw.endsWith('$') && raw.length >= 2) {
        setDisplayMode(false);
        raw = raw.slice(1, -1).trim();
      }
      setLatex(raw);
    }
  }, [isOpen, initialLatex]);

  // 최근 사용된 수식 로드
  // ====================================================================
  // 📊 [OMD-EDIT-FormulaModal-0001] FormulaModal ➔ useEffect (loadHistory)
  // 🎯 @KICK  : localStorage에서 최근 사용한 수식 기록을 불러오거나 기본 공식 세트 초기화
  // 🛡️ @GUARD : JSON 파싱 실패 시 에러 로그만 출력
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : 없음
  // ====================================================================
  useEffect(() => {
    const saved = localStorage.getItem('onrivi-formula-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        msg.error("Failed to load history", e);
      }
    } else {
      // 초기 기본 공식 세트
      const defaults = [
        '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
        'e^{i\\pi} + 1 = 0',
        '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}',
        '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}',
        'A = \\pi r^2'
      ];
      setHistory(defaults);
      localStorage.setItem('onrivi-formula-history', JSON.stringify(defaults));
    }
  }, []);

  // 실시간 미리보기 렌더링 useEffect (DOM 직접 접근으로 순서 및 상태 갱신 문제 100% 완전 해결!)
  // ====================================================================
  // 📊 [OMD-EDIT-FormulaModal-0002] FormulaModal ➔ useEffect (livePreview)
  // 🎯 @KICK  : LaTeX 수식을 KaTeX로 실시간 렌더링하여 미리보기 영역에 표시
  // 🛡️ @GUARD : isOpen이 false면 실행 생략, katex 미로드 시 로딩 메시지 표시
  // 🚨 @PATCH : requestAnimationFrame으로 DOM 안전 타이밍 보장
  // 🔗 @CALLS : katex.render
  // ====================================================================
  useEffect(() => {
    if (!isOpen) return;

    const renderPreview = () => {
      const previewEl = document.getElementById("formula-live-preview");

      if (previewEl && katex) {
        try {
          previewEl.innerHTML = "";
          // 실시간 렌더링 구문 에러를 예방하기 위해, 수식 값이 없을 때는 기본 공식(f(x) = x^2)을 표시합니다
          const cleanLatex = latex.trim() || "f(x) = x^2";
          katex.render(cleanLatex, previewEl, {
            throwOnError: false,
            displayMode: displayMode,
            output: 'html',
            strict: false
          });
        } catch (e) {
          msg.error("KaTeX Live Preview Render Error", e);
        }
      } else if (previewEl) {
        // KaTeX가 아직 다 불러와지지 않은 경우
        previewEl.innerHTML = `<span style="font-size: 11.5px; opacity: 0.5;">수식 엔진 로딩 중...</span>`;
      }
    };

    // DOM이 확실히 렌더링되고 마운트된 후에 실행되도록 requestAnimationFrame으로 안전한 실행 타이밍을 획득합니다
    const animId = requestAnimationFrame(renderPreview);
    
    return () => cancelAnimationFrame(animId);
  }, [latex, displayMode, katexLoaded, isOpen]);

  if (!isOpen) return null;
  if (!mounted) return null;

  const symbols = [
    { name: 'Greek', items: ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', '\\phi', '\\chi', '\\psi', '\\omega'] },
    { name: 'Operators', items: ['\\pm', '\\times', '\\div', '\\cdot', '\\cap', '\\cup', '\\subset', '\\supset', '\\subseteq', '\\supseteq', '\\in', '\\notin', '\\ni', '\\infty', '\\nabla', '\\partial', '\\forall', '\\exists', '\\neg', '\\lor', '\\land'] },
    { name: 'Relations', items: ['=', '\\neq', '\\approx', '\\sim', '\\equiv', '\\le', '\\ge', '\\ll', '\\gg', '\\propto', '\\parallel', '\\perp'] },
    { name: 'Arrows', items: ['\\leftarrow', '\\rightarrow', '\\leftrightarrow', '\\Leftarrow', '\\Rightarrow', '\\Leftrightarrow', '\\uparrow', '\\downarrow'] }
  ];

  const templates = [
    { name: '기본 분수', code: '\\frac{a}{b}', icon: 'n/d' },
    { name: '제곱근', code: '\\sqrt{x}', icon: '√' },
    { name: 'n제곱근', code: '\\sqrt[n]{x}', icon: 'n√' },
    { name: '합계 (Sigma)', code: '\\sum_{i=1}^{n} x_i', icon: 'Σ' },
    { name: '적분 (Integral)', code: '\\int_{a}^{b} f(x) dx', icon: '∫' },
    { name: '극한 (Limit)', code: '\\lim_{x \\to \\infty} f(x)', icon: 'lim' },
    { name: '승수', code: 'x^{a}', icon: 'x^a' },
    { name: '첨자', code: 'x_{i}', icon: 'x_i' },
    { name: '행렬 (2x2)', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', icon: '[M]' },
    { name: '벡터', code: '\\vec{v}', icon: 'v' },
  ];

  // ====================================================================
  // 📊 [OMD-EDIT-FormulaModal-0003] FormulaModal ➔ insertLatex
  // 🎯 @KICK  : 템플릿/기호 버튼 클릭 시 LaTeX 코드를 텍스트 영역 커서 위치에 삽입
  // 🛡️ @GUARD : textareaRef 존재 여부 확인 후 분기 처리
  // 🚨 @PATCH : setTimeout 0ms으로 상태 업데이트 후 커서 위치 재설정
  // 🔗 @CALLS : 없음
  // ====================================================================
  const insertLatex = (code: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const newLatex = before + code + after;
      setLatex(newLatex);
      
      // 상태 업데이트 후 커서 위치 조정 (다음 렌더링 사이클에서 실행)
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + code.length, start + code.length);
      }, 0);
    } else {
      setLatex(prev => prev + code);
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-FormulaModal-0004] FormulaModal ➔ handleInsertToEditor
  // 🎯 @KICK  : 작성한 LaTeX 수식을 에디터에 삽입하고 최근 기록에 저장
  // 🛡️ @GUARD : latex 미입력 시 실행 차단, displayMode에 따라 $$/$ 래핑 분기
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : onInsert
  // ====================================================================
  const handleInsertToEditor = () => {
    if (!latex.trim()) return;
    
    // 최근 기록 업데이트
    const newHistory = [latex, ...history.filter(h => h !== latex)].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('onrivi-formula-history', JSON.stringify(newHistory));

    const finalCode = displayMode ? `\n$$\n${latex.trim()}\n$$\n\n` : `$${latex.trim()}$ `;
    onInsert(finalCode);
    setLatex("");
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ overflowY: "auto" }}>
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />
      
      <div className={`relative w-full max-w-[800px] shadow-2xl rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 border ${
        isDarkMode ? 'bg-[#1e2022] border-[#44474e] text-white' : 'bg-white border-[#c1c6d7] text-zinc-900'
      }`} style={{ maxHeight: "90dvh", overflow: "hidden" }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDarkMode ? 'border-[#44474e] bg-[#181c20]' : 'border-[#EFEFEF] bg-[#f7f9ff]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <Sigma size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1d4ed8] tracking-tight">수식 에디터</h2>
              <p className="text-[10px] opacity-50">LaTeX 문법을 사용하여 수식을 작성하세요</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Tools */}
          <div className={`w-72 flex-shrink-0 border-r flex flex-col ${isDarkMode ? 'border-[#44474e] bg-[#1a1c1e]' : 'border-[#c1c6d7] bg-[#f8f9fc]'}`}>
            <div className="flex p-2 gap-1 border-b border-inherit">
              <TabBtn active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} icon={<Calculator size={14}/>} label="템플릿" isDarkMode={isDarkMode} />
              <TabBtn active={activeTab === 'symbols'} onClick={() => setActiveTab('symbols')} icon={<Sigma size={14}/>} label="기호" isDarkMode={isDarkMode} />
              <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={14}/>} label="최근" isDarkMode={isDarkMode} />
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {activeTab === 'templates' && (
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((t, i) => (
                    <button 
                      key={i} 
                      onClick={() => insertLatex(t.code)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                        isDarkMode ? 'bg-[#2d3135] border-[#44474e] hover:border-blue-500/50' : 'bg-white border-[#c1c6d7] hover:border-blue-500 shadow-sm'
                      }`}
                    >
                      <span className="text-lg font-serif mb-1 text-blue-500">{t.icon}</span>
                      <span className="text-[10px] opacity-60 font-medium">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'symbols' && (
                <div className="space-y-4">
                  {symbols.map((group, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <h3 className="text-[10px] font-bold opacity-40 uppercase tracking-widest pl-1">{group.name}</h3>
                      <div className="grid grid-cols-4 gap-1">
                        {group.items.map((sym, i) => (
                          <button 
                            key={i} 
                            onClick={() => insertLatex(sym)}
                            title={sym}
                            onMouseDown={(e) => e.preventDefault()}
                            className={`aspect-square flex items-center justify-center text-sm rounded-lg border transition-all hover:border-blue-500 ${
                              isDarkMode ? 'bg-[#2d3135] border-[#44474e]' : 'bg-white border-[#c1c6d7]'
                            }`}
                          >
                            <SymbolPreview latex={sym} isDarkMode={isDarkMode} katexLoaded={katexLoaded} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2">
                  {history.length > 0 ? (
                    history.map((h, i) => (
                      <button 
                        key={i} 
                        onClick={() => setLatex(h)}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`w-full flex items-center justify-start text-left font-bold gap-3 p-3 rounded-xl border transition-all hover:border-blue-500 group ${
                          isDarkMode 
                            ? 'bg-blue-500/10 border-blue-500/20 text-white' 
                            : 'bg-blue-50/50 border-blue-100 text-zinc-900 shadow-sm'
                        }`}
                      >
                        <div className="flex-1 overflow-hidden text-left font-bold w-full">
                          <SymbolPreview 
                            latex={h} 
                            isDarkMode={isDarkMode} 
                            katexLoaded={katexLoaded} 
                            className="pointer-events-none text-left font-bold w-full flex items-center justify-start"
                          />
                        </div>
                        <div className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          클릭하여 선택
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center">
                      <History size={32} className="mb-2" />
                      <p className="text-xs">최근 사용한 수식이 없습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Editor & Preview */}
          <div className={`flex-1 min-w-0 flex flex-col ${isDarkMode ? 'bg-[#181c20]' : 'bg-white'}`}>
            {/* Preview Area */}
            <div className={`h-40 flex flex-col border-b ${isDarkMode ? 'border-[#44474e]' : 'border-[#c1c6d7]'}`}>
              <div className="px-4 py-2 flex items-center justify-between opacity-50">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Info size={10} /> 실시간 미리보기
                </span>
                {!katexLoaded && <span className="text-[10px] text-orange-500 animate-pulse">수식 엔진 로딩 중...</span>}
              </div>
              <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex items-center justify-center min-w-0 custom-scrollbar">
                <div id="formula-live-preview" className={`${isDarkMode ? 'text-white' : 'text-zinc-900'} max-w-full overflow-visible py-2 px-1`} style={{ fontSize: '1.05em' }} />
              </div>
            </div>

            {/* Input Area */}
            <div className="flex-1 flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] opacity-50">LaTeX 문법을 사용하여 수식을 작성하세요</p>
                  <button 
                    onClick={() => setLatex("")}
                    className="text-[10px] text-red-500 hover:underline opacity-60 hover:opacity-100 transition-opacity"
                  >
                    초기화
                  </button>
                </div>
                <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 gap-1">
                  <button 
                    onClick={() => setDisplayMode(false)}
                    className={`px-3 py-1 text-[10px] rounded-md transition-all flex items-center gap-1.5 ${!displayMode ? 'bg-blue-500 text-white shadow-sm' : 'opacity-50'}`}
                  >
                    <AlignLeft size={12} /> 인라인 ($)
                  </button>
                  <button 
                    onClick={() => setDisplayMode(true)}
                    className={`px-3 py-1 text-[10px] rounded-md transition-all flex items-center gap-1.5 ${displayMode ? 'bg-blue-500 text-white shadow-sm' : 'opacity-50'}`}
                  >
                    <AlignCenter size={12} /> 블록 ($$)
                  </button>
                </div>
              </div>
              <textarea 
                ref={textareaRef}
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder="예: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                spellCheck={false}
                className={`flex-1 w-full p-4 font-mono text-sm rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none ${
                  isDarkMode 
                    ? 'bg-[#2d3135] border-[#44474e] text-white focus:border-blue-400' 
                    : 'bg-zinc-50 border-[#c1c6d7] focus:border-blue-500'
                }`}
              />
              <div className="flex items-center gap-2 text-[10px] opacity-40 italic">
                <ChevronRight size={12} />
                <span>줄 바꿈은 \\ 를 사용하고, 공백은 \quad 또는 \, 를 사용하세요.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex justify-end items-center gap-3 shrink-0 ${
          isDarkMode ? 'border-[#44474e] bg-[#1d2024]' : 'border-[#c1c6d7] bg-[#f1f4f9]'
        }`}>
          <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              isDarkMode 
                ? 'bg-transparent border border-[#44474e] text-gray-400 hover:bg-[#2d3135]' 
                : 'bg-white border border-[#c1c6d7] text-gray-600 hover:bg-gray-50 shadow-sm'
            }`}
          >
            취소
          </button>
          <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertToEditor}
            disabled={!latex.trim()}
            className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 ${
              latex.trim() 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20' 
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Plus size={16} />
            문서에 삽입하기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ====================================================================
// 📊 [OMD-EDIT-FormulaModal-0005] FormulaModal ➔ TabBtn
// 🎯 @KICK  : 수식 에디터 좌측 패널의 탭 버튼 (템플릿/기호/최근) 컴포넌트
// 🛡️ @GUARD : active 상태에 따라 활성화 스타일 및 그림자 효과 분기
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function TabBtn({ active, onClick, icon, label, isDarkMode }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
        active 
          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 scale-[1.02]' 
          : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ====================================================================
// 📊 [OMD-EDIT-FormulaModal-0006] FormulaModal ➔ SymbolPreview
// 🎯 @KICK  : LaTeX 기호 미리보기용 메모이즈드 컴포넌트 - RAF로 DOM 안전 렌더링
// 🛡️ @GUARD : katex 미로드 시 폴백 텍스트 표시, throwOnError=false로 렌더링 오류 방어
// 🚨 @PATCH : wrapMathWithBold 헬퍼로 기호 가독성 강화
// 🔗 @CALLS : wrapMathWithBold, katex.render
// ====================================================================
const SymbolPreview = React.memo(({ 
  latex, 
  isDarkMode, 
  katexLoaded, 
  className = "pointer-events-none text-center font-bold w-full flex items-center justify-center"
}: { 
  latex: string; 
  isDarkMode: boolean; 
  katexLoaded: boolean;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ====================================================================
  // 📊 [OMD-EDIT-FormulaModal-0007] FormulaModal ➔ useEffect (SymbolPreview render)
  // 🎯 @KICK  : LaTeX 기호를 KaTeX로 실시간 렌더링하여 SymbolPreview에 표시
  // 🛡️ @GUARD : containerRef 및 katex 존재 여부 확인 후 안전하게 렌더링
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : katex.render
  // ====================================================================
  useEffect(() => {
    let animId: number;
    
    const renderSymbol = () => {
      if (containerRef.current && katex) {
        try {
          containerRef.current.innerHTML = "";
          let finalLatex = latex.replace(/\\\\/g, '\\');
          
          // 그리스 문자나 연산자 기호들이 한눈에 들어오게 굵은 칠판 볼드체로 만들기 위해 공용 헬퍼 유틸리티(wrapMathWithBold)를 태웁니다!
          finalLatex = wrapMathWithBold(finalLatex);

          katex.render(finalLatex, containerRef.current, {
            throwOnError: false,
            displayMode: false
          });
        } catch (e) {
          msg.error("SymbolPreview render error", e);
        }
      } else if (containerRef.current) {
        containerRef.current.innerHTML = `<span style="font-size: 11px; opacity: 0.85; font-family: monospace; font-weight: bold; text-align: left; display: block; word-break: break-all;">${latex}</span>`;
      }
    };

    animId = requestAnimationFrame(renderSymbol);
    return () => cancelAnimationFrame(animId);
  }, [latex, katexLoaded]);

  return <div ref={containerRef} className={className} />;
});

SymbolPreview.displayName = "SymbolPreview";
