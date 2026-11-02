// ====================================================================
// 📊 [OMD-UI-LinkModal-0001] LinkModal.tsx ➔ 하이퍼링크 생성 및 편집 모달
// 🎯 @KICK  : 표시 텍스트(예: 온리비)와 링크 주소(URL)를 직관적으로 조합하여 삽입하는 모달 폼
// 🛡️ @GUARD : isOpen/mounted false 시 null 반환, 주소 프로토콜 검증 및 자동 https:// 보정
// 🚨 @PATCH : **2026-10-13** — [하이퍼링크 전용 스마트 모달 폼 신규 생성]:
//             1) 표시할 텍스트와 대상 URL 2단 입력 및 실시간 마크다운/위지윅 미리보기 카드 제공
//             2) 빠른 프로토콜 프리셋(https://, http://, mailto:) 및 Enter/Escape 키보드 완벽 연동
// 🔗 @CALLS : createPortal, Icon
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/Icon';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { text: string; href: string }) => void;
  initialText?: string;
  initialHref?: string;
  isDarkMode?: boolean;
}

export default function LinkModal({
  isOpen,
  onClose,
  onConfirm,
  initialText = '',
  initialHref = 'https://',
  isDarkMode = false
}: LinkModalProps) {
  useModalEscape(isOpen, onClose);
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const textInputRef = useRef<HTMLInputElement>(null);
  const hrefInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const cleanText = initialText.trim();
      const cleanHref = initialHref.trim() || 'https://';
      setText(cleanText);
      setHref(cleanHref);
      setError('');

      // 포커스 자동 제어: 텍스트가 있으면 주소창에 포커스, 없으면 텍스트창에 포커스
      setTimeout(() => {
        if (cleanText) {
          hrefInputRef.current?.focus();
          hrefInputRef.current?.select();
        } else {
          textInputRef.current?.focus();
        }
      }, 50);
    }
  }, [isOpen, initialText, initialHref]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedText = text.trim();
    let trimmedHref = href.trim();

    if (!trimmedText) {
      setError('표시할 텍스트를 입력해 주세요.');
      textInputRef.current?.focus();
      return;
    }

    if (!trimmedHref || trimmedHref === 'https://' || trimmedHref === 'http://') {
      setError('연결할 웹 주소(URL)를 입력해 주세요.');
      hrefInputRef.current?.focus();
      return;
    }

    // 프로토콜 자동 보정: 프로토콜이나 앵커/상대경로가 없으면 https:// 자동 부착
    if (!/^(https?:\/\/|mailto:|tel:|#|\/|\.\.?\/)/i.test(trimmedHref)) {
      trimmedHref = `https://${trimmedHref}`;
    }

    onConfirm({ text: trimmedText, href: trimmedHref });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const applyProtocol = (proto: string) => {
    let clean = href.replace(/^(https?:\/\/|mailto:|tel:)/i, '');
    if (proto === 'mailto:' && !clean) clean = 'user@example.com';
    setHref(`${proto}${clean}`);
    hrefInputRef.current?.focus();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      style={{ overflowY: 'auto' }}
    >
      {/* 배경 오버레이 (선명한 딤드 배경) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* 모달 본체 */}
      <div
        className={`relative w-full max-w-[440px] shadow-2xl rounded-2xl border flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-[#E2E8F0] text-zinc-800'
        }`}
        style={{ fontFamily: 'Pretendard, -apple-system, sans-serif' }}
      >
        {/* 헤더 */}
        <header
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDarkMode ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#1d4ed8]/10 text-[#1d4ed8]">
              <Icon name="Link" className="w-5 h-5 text-[#1d4ed8]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                하이퍼링크 삽입
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                텍스트와 연결할 웹 주소를 설정합니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="닫기"
          >
            <Icon name="Close" className="w-4 h-4" />
          </button>
        </header>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {/* 입력 1: 표시할 텍스트 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>표시할 텍스트 (앞에 넣는 글자)</span>
              <span className="text-[11px] font-normal text-zinc-400">예: 온리비</span>
            </label>
            <input
              ref={textInputRef}
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError('');
              }}
              placeholder="예: 온리비 홈페이지"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-hidden transition-all ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-750 text-zinc-100 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20'
                  : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20'
              }`}
            />
          </div>

          {/* 입력 2: 연결할 웹 주소 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                연결할 주소 (URL)
              </label>
              {/* 프로토콜 퀵 태그 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyProtocol('https://')}
                  className="px-1.5 py-0.5 text-[10px] rounded-md font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors"
                >
                  https://
                </button>
                <button
                  type="button"
                  onClick={() => applyProtocol('http://')}
                  className="px-1.5 py-0.5 text-[10px] rounded-md font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors"
                >
                  http://
                </button>
              </div>
            </div>
            <input
              ref={hrefInputRef}
              type="text"
              value={href}
              onChange={(e) => {
                setHref(e.target.value);
                if (error) setError('');
              }}
              placeholder="https://onrivi.com"
              className={`w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border outline-hidden transition-all ${
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-750 text-zinc-100 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20'
                  : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20'
              }`}
            />
          </div>

          {/* 라이브 미리보기 카드 */}
          <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
            isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              미리보기
            </span>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-zinc-400">화면 표시:</span>
              <span className="text-[#1d4ed8] dark:text-blue-400 font-semibold underline underline-offset-2 truncate">
                {text.trim() || '(표시할 텍스트 없음)'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono truncate">
              마크다운: [{text.trim() || '...'}]({href.trim() || '...'})
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isDarkMode
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-[0.98] text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Icon name="Link" className="w-4 h-4" />
              <span>링크 삽입</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
