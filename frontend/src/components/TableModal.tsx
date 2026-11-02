"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { reportCaption, formatMediaCaption } from '@/lib/aiFriendlyReport';
import { type MediaCaptionFormat } from '@/components/MediaLayoutFields';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  isDarkMode: boolean;
  nextNumber?: number;
  captionConfig?: {
    position?: 'top' | 'bottom';
    format?: string;
    customTemplate?: string;
  };
}

// ====================================================================
// 📊 [OMD-EDIT-TableModal-0003] TableModal ➔ TableModal
// 🎯 @KICK  : 표 삽입 모달 - 10x10 그리드 UI로 마우스 표 크기 선택 후 마크다운 코드 생성
// 🛡️ @GUARD : isOpen false 또는 mounted false 시 null 반환으로 조기 종료
// 🚨 @PATCH : **2026-10-25** — [슬래시 커맨드 /table 등 모달 진입 시 Enter 키 조기 격발 방어]:
//             1) 슬래시 자동완성 메뉴나 단축키에서 Enter 키로 표 생성을 호출할 때, 동일한 Enter keydown 이벤트가 window 리스너로 전파되어 모달이 화면에 뜨지도 못하고 기본 크기(2열 3행)로 자동 제출·닫힘되는 결함 해결
//             2) canSubmitRef 및 keyup / 200ms 디바운스 가드를 신설하여 모달이 온전히 화면에 열려 사용자가 행·열을 직접 지정할 수 있도록 보장
// 🚨 @PATCH : **2026-10-21** — [표 설명(캡션) 위치(상단/하단) 및 표현 구문(mediaCaptionStructure) 연동]:
//             1) 서식 프로필의 mediaCaptionStructure(position, format) 설정을 표 캡션 생성에 반영
//             2) formatMediaCaption 연동으로 표준/대괄호/화살괄호 및 상/하단 배치 지원
// 🚨 @PATCH : **2026-10-14** — [표 삽입 모달 Enter 키 즉시 생성 및 첫 번째 헤더 안착 연동]: 모달 내에서 Enter 키 입력 시 즉시 표가 생성되도록 키보드 편의성 지원
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-02 - 헤더는 중앙 정렬 · 본문 열 정렬 프리셋 4종(기본 좌측, 전체 중앙, 회계형, 요약형) 선택 UI 및 마크다운 자동 생성 지원
//             2026-07-15 - 마우스 드래그 그리드 10x10 디자인 전면 개편 및 안개 블러 제거, 라운드 4px 규격 장착
// 🔗 @CALLS : handleInsert, createPortal
// ====================================================================
export default function TableModal({ isOpen, onClose, onInsert, isDarkMode, nextNumber = 1, captionConfig }: TableModalProps) {
  useModalEscape(isOpen, onClose);
  const [hoverPos, setHoverPos] = useState({ r: 3, c: 2 });
  const [selectedPos, setSelectedPos] = useState({ r: 3, c: 2 });
  const [alignPreset, setAlignPreset] = useState<'default' | 'center' | 'numeric' | 'summary'>('default');
  const [tableTitle, setTableTitle] = useState('');
  const [tableNumber, setTableNumber] = useState(1);
  const [captionPosition, setCaptionPosition] = useState<'top' | 'bottom'>('top');
  const [captionFormat, setCaptionFormat] = useState<MediaCaptionFormat>('standard');
  const [customTemplate, setCustomTemplate] = useState('**{kind} {n}. {title}**');

  useEffect(() => {
    if (isOpen) {
      setTableTitle('');
      setTableNumber(nextNumber);
      setCaptionPosition(captionConfig?.position || 'top');
      setCaptionFormat((captionConfig?.format as MediaCaptionFormat) || 'standard');
      setCustomTemplate(captionConfig?.customTemplate || '**{kind} {n}. {title}**');
    }
  }, [isOpen, nextNumber, captionConfig]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInsert = React.useCallback(() => {
    const { r, c } = selectedPos;
    let header = "| " + Array(c).fill("제목").join(" | ") + " |\n";
    
    let dividerCols: string[] = [];
    for (let i = 0; i < c; i++) {
      if (alignPreset === 'center') {
        dividerCols.push(':---:');
      } else if (alignPreset === 'numeric') {
        dividerCols.push(i === 0 ? ':---' : '---:');
      } else if (alignPreset === 'summary') {
        dividerCols.push(i === 0 || i === c - 1 ? ':---:' : ':---');
      } else {
        dividerCols.push(':---');
      }
    }
    let divider = "| " + dividerCols.join(" | ") + " |\n";
    let row = "| " + Array(c).fill("내용").join(" | ") + " |\n";
    let body = Array(r).fill(row).join("");
    
    const caption = tableTitle.trim() ? formatMediaCaption('표', tableNumber, tableTitle, captionFormat, customTemplate) : '';
    let finalCode = '';
    if (caption) {
      if (captionPosition === 'bottom') {
        finalCode = `\n${header}${divider}${body}\n\n${caption}\n`;
      } else {
        finalCode = `\n${caption}\n\n${header}${divider}${body}\n`;
      }
    } else {
      finalCode = `\n${header}${divider}${body}\n`;
    }
    onInsert(finalCode);
    onClose();
  }, [selectedPos, alignPreset, tableTitle, tableNumber, captionPosition, captionFormat, customTemplate, onInsert, onClose]);

  const canSubmitRef = useRef(false);

  // ⌨️ Enter 키 입력 시 즉시 표 삽입 처리
  useEffect(() => {
    if (!isOpen) {
      canSubmitRef.current = false;
      return;
    }

    // 💡 [슬래시 명령어 /table 등 모달 진입 시 Enter 키 조기 격발 방어]
    //    슬래시 자동완성 메뉴나 단축키에서 Enter로 명령을 선택하여 모달이 열릴 때,
    //    동일한 Enter 이벤트가 window 리스너로 전파되어 모달이 화면에 뜨지도 못하고
    //    기본값(2열 3행)으로 즉시 자동 제출·닫힘되는 결함을 완벽히 방어합니다.
    canSubmitRef.current = false;
    const timer = setTimeout(() => {
      canSubmitRef.current = true;
    }, 200);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        canSubmitRef.current = true;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.isComposing) {
        if (!canSubmitRef.current) return;
        e.preventDefault();
        handleInsert();
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleInsert]);

  if (!isOpen) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ overflowY: "auto" }}>
      {/* 선명한 투명 배경 (안개 블러 제거) */}
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />
      
      {/* MainModalContainer */}
      <div 
        className={`relative w-full max-w-[360px] shadow-2xl rounded-2xl border flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden ${
          isDarkMode 
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100' 
            : 'bg-white border-[#EFEFEF] text-slate-800'
        }`} 
        style={{ maxHeight: "90dvh", fontFamily: "Pretendard, sans-serif" }}
      >
        {/* ModalHeader */}
        <header className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-[#EFEFEF] bg-slate-50/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
            <h1 className="text-base font-bold tracking-tight text-[#1d4ed8]">표 삽입</h1>
          </div>
          <span className="text-[#1d4ed8] font-extrabold text-base tracking-wide">
            {selectedPos.c} × {selectedPos.r}
          </span>
        </header>

        {/* GridContent */}
        <main className="flex-1 flex flex-col items-center py-6 px-6 bg-white dark:bg-zinc-950 min-h-0 overflow-y-auto">
          {/* Table Grid Visualization Container */}
          <div 
            className={`p-4 rounded-xl mb-5 border shadow-sm ${
              isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50/50 border-slate-100'
            }`} 
            data-purpose="grid-visualization"
          >
            <div 
              className="grid grid-cols-10 gap-1"
              onMouseLeave={() => setHoverPos(selectedPos)}
            >
              {[...Array(100)].map((_, i) => {
                const row = Math.floor(i / 10) + 1;
                const col = (i % 10) + 1;
                const isHover = col <= hoverPos.c && row <= hoverPos.r;
                const isSelected = col <= selectedPos.c && row <= selectedPos.r;

                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHoverPos({ r: row, c: col })}
                    onClick={() => {
                      setSelectedPos({ r: row, c: col });
                      setHoverPos({ r: row, c: col });
                    }}
                    className={`w-6 h-6 rounded-[2px] transition-all cursor-pointer ${
                      isHover 
                        ? 'bg-[#1d4ed8] scale-105 shadow-sm z-10' 
                        : isSelected 
                          ? 'bg-[#1d4ed8]/60' 
                          : isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Guide Text */}
          <p className="text-slate-400 dark:text-zinc-500 italic text-xs mb-4 text-center font-medium">
            그리드를 클릭하여 크기를 지정하세요
          </p>

          <div className="w-full mb-4 space-y-2">
            <label className="block text-xs font-semibold">표 제목 (선택)
              <input aria-label="표 제목" value={tableTitle} onChange={e=>setTableTitle(e.target.value)} placeholder="예: 추진 일정" className="mt-1 w-full rounded border p-2 bg-transparent" />
            </label>
            <label className="flex items-center gap-2 text-xs">표 번호
              <input aria-label="표 번호" type="number" min={1} value={tableNumber} onChange={e=>setTableNumber(Math.max(1,Number(e.target.value)||1))} className="w-20 rounded border p-2 bg-transparent" />
            </label>
            <p className="text-xs text-slate-500">제목을 입력하면 표 위에 ‘표 {tableNumber}. 제목’을 원문으로 저장합니다. 번호는 삽입 후에도 직접 수정할 수 있습니다. 표 안의 표와 복잡한 병합은 피하세요.</p>
          </div>
          {/* Column Alignment Presets */}
          <div className="w-full mb-4">
            <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-2 block text-center">
              헤더는 중앙 정렬 · 본문 열 정렬 프리셋
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAlignPreset('default')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  alignPreset === 'default'
                    ? 'bg-[#1d4ed8]/15 border-[#1d4ed8] text-[#1d4ed8] font-bold'
                    : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>⬅️</span>
                <span>기본 (왼쪽)</span>
              </button>
              <button
                type="button"
                onClick={() => setAlignPreset('center')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  alignPreset === 'center'
                    ? 'bg-[#1d4ed8]/15 border-[#1d4ed8] text-[#1d4ed8] font-bold'
                    : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>↔️</span>
                <span>전체 중앙</span>
              </button>
              <button
                type="button"
                onClick={() => setAlignPreset('numeric')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  alignPreset === 'numeric'
                    ? 'bg-[#1d4ed8]/15 border-[#1d4ed8] text-[#1d4ed8] font-bold'
                    : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📊</span>
                <span>회계형 (좌+우)</span>
              </button>
              <button
                type="button"
                onClick={() => setAlignPreset('summary')}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  alignPreset === 'summary'
                    ? 'bg-[#1d4ed8]/15 border-[#1d4ed8] text-[#1d4ed8] font-bold'
                    : isDarkMode
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📑</span>
                <span>요약/통계형</span>
              </button>
            </div>
          </div>

          {/* TipBox */}
          <section className={`w-full border rounded-xl p-4 ${
            isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50/50 border-slate-200/60'
          }`} data-purpose="usage-tips">
            <h2 className="text-[#1d4ed8] text-xs font-black text-center mb-3 flex items-center justify-center gap-1">
              <span>💡</span> 표 병합 TIP
            </h2>
            <ul className="text-[11px] text-slate-600 dark:text-zinc-400 space-y-2.5 font-medium leading-normal">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-slate-400 dark:bg-zinc-600 rounded-full shrink-0"></span>
                <span>
                  가로 병합: 병합 시작 셀에 
                  <span className="mx-1 px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded font-mono text-[9px] font-bold text-[#1d4ed8]">{">"}</span> 
                  입력
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-slate-400 dark:bg-zinc-600 rounded-full shrink-0"></span>
                <span>
                  세로 병합: 병합될 대상 셀에 
                  <span className="mx-1 px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded font-mono text-[9px] font-bold text-[#1d4ed8]">^</span> 
                  입력
                </span>
              </li>
            </ul>
          </section>
        </main>

        {/* ActionZone */}
        <footer className={`p-6 border-t flex flex-col gap-3 ${
          isDarkMode ? 'bg-zinc-900/30 border-zinc-800/80' : 'bg-slate-50/30 border-slate-150'
        }`}>
          <button 
            onClick={handleInsert}
            className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-[#1d4ed8]/20 transition-all flex items-center justify-center gap-2 text-xs active:scale-[0.98]"
            data-purpose="submit-button"
          >
            <Plus size={15} />
            {selectedPos.c} x {selectedPos.r} 표 삽입하기
          </button>
          <button 
            onClick={onClose}
            className="w-full text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 text-xs font-bold py-2 transition-colors active:scale-[0.98]"
            data-purpose="cancel-button"
          >
            취소
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
