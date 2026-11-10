// ====================================================================
// 📊 [OMD-MODAL-SignatureModal] frontend/src/components/editor/modals/SignatureModal.tsx
// 🎯 @KICK  : 서명/발신인 설정 모달 — 정렬(left/right), 날짜, 작성자 직함·성명, 인감도장 설정 및 실시간 시각적 미리보기 제공
// 🛡️ @GUARD : Rule 1(소스 주석 단일 관리), Rule 6(Modern Technical Editorial), 배경 클릭 버블링 엄격 방어(e.target === e.currentTarget)
// 🚨 @PATCH : 2026-11-10 — [서명/발신인 대화상자 신설 및 left/right 정렬·문구 커스텀·실시간 렌더링 프리뷰 연동]
// 🔗 @CALLS : createPortal
// ====================================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markdown: string) => void;
  initialData?: {
    align?: 'left' | 'right';
    date?: string;
    signerRole?: string;
    signerText?: string;
    showSeal?: boolean;
    sealText?: string;
    customBody?: string;
  };
  isDarkMode?: boolean;
}

export default function SignatureModal({
  isOpen,
  onClose,
  onInsert,
  initialData,
  isDarkMode = false,
}: SignatureModalProps) {
  const [mounted, setMounted] = useState(false);

  // 기본 날짜 계산 (오늘 날짜: YYYY년 M월 D일)
  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  };

  const [align, setAlign] = useState<'left' | 'right'>('right');
  const [date, setDate] = useState<string>('');
  const [signerRole, setSignerRole] = useState<string>('작성자');
  const [signerText, setSignerText] = useState<string>('홍길동');
  const [showSeal, setShowSeal] = useState<boolean>(true);
  const [sealText, setSealText] = useState<string>('인');
  const [isDirectMode, setIsDirectMode] = useState<boolean>(false);
  const [directText, setDirectText] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAlign(initialData?.align || 'right');
      setDate(initialData?.date || getTodayString());
      setSignerRole(initialData?.signerRole ?? '작성자');
      setSignerText(initialData?.signerText ?? '홍길동');
      setShowSeal(initialData?.showSeal ?? true);
      setSealText(initialData?.sealText || '인');
      if (initialData?.customBody) {
        setDirectText(initialData.customBody);
        setIsDirectMode(true);
      } else {
        setIsDirectMode(false);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen || !mounted) return null;

  // 인감도장 HTML 태그 생성
  const sealHtml = `<span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">${sealText || '인'}</span>`;

  // 최종 마크다운 블록 조립
  const generateMarkdown = () => {
    let bodyContent = '';
    if (isDirectMode && directText.trim()) {
      bodyContent = directText.trim();
    } else {
      const parts: string[] = [];
      if (date.trim()) {
        parts.push(date.trim());
      }
      const rolePrefix = signerRole.trim() ? `${signerRole.trim()}: ` : '';
      const namePart = signerText.trim() ? `**${rolePrefix}${signerText.trim()}**` : '';
      const sealPart = showSeal ? ` ${sealHtml}` : '';
      if (namePart || sealPart) {
        parts.push(`${namePart}${sealPart}`.trim());
      }
      bodyContent = parts.join('  \n');
    }

    return `<div align="${align}">\n\n${bodyContent}\n\n</div>\n`;
  };

  const handleConfirm = () => {
    const md = generateMarkdown();
    onInsert(md);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-5 transition-all ${
          isDarkMode
            ? 'bg-zinc-900 border-zinc-700/60 text-zinc-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-800 shadow-blue-900/10'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              ✍️
            </div>
            <div>
              <h3 className="text-[16px] font-bold">서명 / 발신인 서식</h3>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                문서 하단에 들어갈 정렬 및 발신자·날짜·인감 정보를 지정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="닫기 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. 정렬 선택 (Left / Right) */}
        <div>
          <label className="block text-[12px] font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
            정렬 방향 (Alignment)
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80">
            <button
              type="button"
              onClick={() => setAlign('left')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                align === 'left'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
              </svg>
              왼쪽 정렬 (Left)
            </button>
            <button
              type="button"
              onClick={() => setAlign('right')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                align === 'right'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
              </svg>
              오른쪽 정렬 (Right)
            </button>
          </div>
        </div>

        {/* 2. 작성자 및 날짜 입력 */}
        {!isDirectMode ? (
          <div className="space-y-3.5">
            {/* 날짜 필드 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-bold text-slate-700 dark:text-zinc-300">작성 일자</label>
                <button
                  type="button"
                  onClick={() => setDate(getTodayString())}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  오늘 날짜로 재설정
                </button>
              </div>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="예: 2026년 11월 10일"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-[13px] font-medium outline-none focus:border-blue-600 dark:focus:border-blue-400"
              />
            </div>

            {/* 직함 및 성명 */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 dark:text-zinc-300 mb-1">직함/라벨</label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="작성자"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-[13px] font-medium outline-none focus:border-blue-600 dark:focus:border-blue-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[12px] font-bold text-slate-700 dark:text-zinc-300 mb-1">성명 / 발신인명</label>
                <input
                  type="text"
                  autoFocus
                  value={signerText}
                  onChange={(e) => setSignerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                  placeholder="홍길동"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-[13px] font-bold outline-none focus:border-blue-600 dark:focus:border-blue-400"
                />
              </div>
            </div>

            {/* 도장 설정 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSeal}
                  onChange={(e) => setShowSeal(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="text-[13px] font-semibold">인감도장(인) 표기 포함</span>
              </label>

              {showSeal && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-slate-500 dark:text-zinc-400">도장 문구:</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={sealText}
                    onChange={(e) => setSealText(e.target.value)}
                    placeholder="인"
                    className="w-16 px-2 py-1 text-center font-bold text-[13px] rounded-lg border border-red-300 dark:border-red-900 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 outline-none focus:border-red-500"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[12px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
              자유 문구 직접 입력 (마크다운 지원)
            </label>
            <textarea
              rows={4}
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              placeholder="2026년 11월 10일&#10;**대표이사 홍길동** (직인)"
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-[13px] font-mono outline-none focus:border-blue-600 dark:focus:border-blue-400 resize-none leading-relaxed"
            />
          </div>
        )}

        {/* 직접 편집 토글 링크 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsDirectMode(!isDirectMode)}
            className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {isDirectMode ? '⚙️ 기본 입력 폼으로 전환' : '📝 자유 문구 직접 편집 모드'}
          </button>
        </div>

        {/* 3. 실시간 시각적 미리보기 (Live Preview) */}
        <div>
          <label className="block text-[12px] font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
            실시간 렌더링 미리보기
          </label>
          <div
            className={`p-4 rounded-xl border border-dashed transition-all ${
              align === 'right' ? 'text-right' : 'text-left'
            } ${
              isDarkMode
                ? 'bg-zinc-950/70 border-zinc-700 text-zinc-100'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            {!isDirectMode ? (
              <div className="space-y-1">
                {date.trim() && (
                  <div className="text-[14px] text-slate-600 dark:text-zinc-400 font-sans">
                    {date.trim()}
                  </div>
                )}
                <div className="text-[15px] font-bold font-sans flex items-center gap-1.5 inline-flex">
                  <span>
                    {signerRole.trim() ? `${signerRole.trim()}: ` : ''}
                    {signerText.trim() || '홍길동'}
                  </span>
                  {showSeal && (
                    <span
                      style={{
                        color: '#dc2626',
                        border: '1.5px solid #dc2626',
                        borderRadius: '50%',
                        padding: '0 4px',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        lineHeight: '1.2',
                      }}
                    >
                      {sealText || '인'}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[14px] whitespace-pre-wrap font-sans">
                {directText.trim() || '입력된 서명 문구가 없습니다.'}
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 바 */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-[13px] font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            ✍️ 서명 삽입
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
