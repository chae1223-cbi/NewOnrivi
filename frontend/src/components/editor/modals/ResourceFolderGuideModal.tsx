// ====================================================================
// 📊 [OMD-EDIT-ResourceFolderGuideModal-0001] ResourceFolderGuideModal.tsx ➔ ResourceFolderGuideModal
// 🎯 @KICK  : 전체사용자 대상 공통 리소스 폴더(서식/미디어/AI템플릿) 필수 설정 온보딩 모달
// 🛡️ @GUARD : isOpen 가드 및 외부 클릭/ESC 제어
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — 최초 작성: 전체사용자 첫 진입 시 리소스 폴더 미지정 상태를 감지하여 원클릭 설정 유도
// 🔗 @CALLS : onSelectFolder, onClose
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderKanban, Sparkles, Image as ImageIcon, FileCode, CheckCircle2, X } from 'lucide-react';

interface ResourceFolderGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: () => Promise<void> | void;
  onOpenSettings?: () => void;
  isDarkMode: boolean;
}

export default function ResourceFolderGuideModal({
  isOpen,
  onClose,
  onSelectFolder,
  onOpenSettings,
  isDarkMode
}: ResourceFolderGuideModalProps) {
  useModalEscape(isOpen, onClose);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;
  if (typeof document === 'undefined') return null;

  const handleSelect = async () => {
    try {
      await onSelectFolder();
      onClose();
    } catch {
      // 폴더 선택 취소 시 모달 유지
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-lg rounded-3xl p-7 md:p-8 shadow-2xl border transition-all duration-300 scale-100 ${
          isDarkMode 
            ? 'bg-zinc-900 border-zinc-700/80 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          title="닫기"
        >
          <X size={18} />
        </button>

        {/* 상단 헤더 아이콘 */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#1d4ed8] to-[#4D73FF] text-white shadow-lg shadow-[#1d4ed8]/25">
            <FolderKanban size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#1d4ed8]/15 text-[#1d4ed8]">
                전체사용자 필수 설정
              </span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight mt-1">
              공통 리소스 폴더를 지정해 주세요
            </h3>
          </div>
        </div>

        {/* 안내 본문 */}
        <p className={`text-[13px] leading-relaxed mb-6 ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
          온리비 어서는 사용자의 소중한 서식과 미디어 자산을 사용자 PC 내 전용 폴더에 안전하게 영구 보관합니다. 원활한 집필 환경을 위해 PC 내 작업용 폴더(예: <strong className="text-[#1d4ed8]">Onrivi_Resource</strong>)를 1회 지정해 주세요.
        </p>

        {/* 기능 혜택 리스트 카드 */}
        <div className={`space-y-3 p-4 rounded-2xl border mb-7 ${
          isDarkMode ? 'bg-zinc-800/60 border-zinc-700/60' : 'bg-slate-50 border-slate-200/80'
        }`}>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
              <FileCode size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">나만의 커스텀 서식(CSS 프로필) 영구 보관</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">설정한 글꼴, 문단 여백, 테이블 스타일 등이 PC에 안전하게 자동 저장됩니다.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <ImageIcon size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">삽입된 이미지 & 멀티미디어 자산 관리</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">문서에 첨부한 그림들이 <code>media/</code> 폴더로 체계적으로 보관됩니다.</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">AI 맞춤형 프롬프트 & 참조 자료 동기화</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">자주 쓰는 AI 프롬프트 템플릿과 인용 자료를 자유롭게 재사용할 수 있습니다.</div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleSelect}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-98 text-white font-extrabold text-[14px] shadow-lg shadow-[#1d4ed8]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FolderKanban size={18} />
            <span>지금 공통 리소스 폴더 선택하기</span>
          </button>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-center border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isDarkMode 
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' 
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span>⚙️ 환경설정에서 등록하기</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-1.5 px-4 font-semibold text-[11px] text-center transition-colors cursor-pointer ${
              isDarkMode ? 'text-zinc-500 hover:text-zinc-400' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            나중에 설정할게요
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
