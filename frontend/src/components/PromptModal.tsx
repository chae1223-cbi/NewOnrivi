"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit3, Palette } from 'lucide-react';
import { CssProfile } from '@/types/cssProfile';
import { SYSTEM_PROFILES, isSystemProfileId } from '@/constants/cssProfile';
import { getAvailableProfilesSnapshot } from '@/lib/folderProfileStorage';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  showStyleSelector?: boolean;
  initialProfileId?: string;
  styleSelectorLabel?: string;
  hideTextInput?: boolean;
  profiles?: CssProfile[];
  onConfirm: (value: string, selectedProfileId?: string) => void;
  onCancel: () => void;
}

// ====================================================================
// 📊 [OMD-IO-PromptModal-0004] PromptModal ➔ PromptModal
// 🎯 @KICK  : 사용자 입력을 받는 모달 다이얼로그 - 파일명/폴더명 입력 및 폴더 기본 서식 지정
// 🛡️ @GUARD : isOpen/mounted false 시 null 반환; Escape 키로 취소
// 🚨 @PATCH : **2026-11-14** — [폴더 생성 및 폴더 서식 설정 시 디폴트 서식(Default CSS Profile) 지정 드롭다운 추가]:
//             1) showStyleSelector 활성화 시 폴더 생성/설정 모달 내에서 해당 폴더의 기본 서식을 선택·저장할 수 있는 UI 탑재
//             2) 시스템 표준 서식(Onrivi 기본서식 등) 및 사용자 정의 서식 전체 목록 연동
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-08-23** — ConfirmModal과 동일한 스타일로 통일: 상단 코너 회색 제거(rounded-t-xl), Dim 35% 완화, 다층 입체 그림자, 제목 내 파일명 따옴표 강조 표시
// 🔗 @CALLS : handleSubmit, handleKeyDown, onConfirm, onCancel
// ====================================================================
export default function PromptModal({ 
  isOpen, 
  title, 
  defaultValue = "", 
  placeholder = "", 
  error = "",
  showStyleSelector = false,
  initialProfileId = "system-1",
  styleSelectorLabel = "폴더 기본 서식 (이 폴더의 문서에 기본 적용)",
  hideTextInput = false,
  profiles,
  onConfirm, 
  onCancel 
}: PromptModalProps) {
  useModalEscape(isOpen, onCancel);
  const [value, setValue] = useState(defaultValue);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(initialProfileId || "system-1");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableProfiles = useMemo(() => {
    return getAvailableProfilesSnapshot(profiles);
  }, [profiles, isOpen]);

  const userProfiles = useMemo(
    () => availableProfiles.filter(p => p.id !== 'default' && !isSystemProfileId(p.id)),
    [availableProfiles]
  );
  const systemProfiles = useMemo(
    () => availableProfiles.filter(p => isSystemProfileId(p.id) && p.id !== SYSTEM_PROFILES[0].id),
    [availableProfiles]
  );

// ====================================================================
// 📊 [OMD-IO-PromptModal-0003] PromptModal ➔ useEffect (mounted)
// 🎯 @KICK  : 클라이언트 마운트 완료 상태를 설정하여 hydration mismatch 방지
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setMounted
// ====================================================================
  useEffect(() => {
    setMounted(true);
  }, []);

// ====================================================================
// 📊 [OMD-IO-PromptModal-0002] PromptModal ➔ useEffect (focus)
// 🎯 @KICK  : 모달이 열릴 때 입력창에 defaultValue 설정 후 자동 포커스
// 🛡️ @GUARD : isOpen이 true일 때만 실행
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setValue, inputRef.current.focus, inputRef.current.select
// ====================================================================
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setSelectedProfileId(initialProfileId || "system-1");
      setTimeout(() => {
        if (!hideTextInput) {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }, 10);
    }
  }, [isOpen, defaultValue, initialProfileId, hideTextInput]);

  if (!isOpen) return null;
  if (!mounted) return null;

// ====================================================================
// 📊 [OMD-IO-PromptModal-0001] PromptModal ➔ handleSubmit
// 🎯 @KICK  : 폼 제출 시 입력값과 선택된 폴더 기본 서식을 onConfirm으로 전달
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : onConfirm
// ====================================================================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value, showStyleSelector ? selectedProfileId : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  // 제목 내 따옴표/대괄호로 감싸진 항목명 강조 처리
  const renderTitle = (t: string) => {
    const parts = t.split(/(\[.*?\]|'.*?')/g);
    return parts.map((part, i) =>
      (part.startsWith('[') && part.endsWith(']')) || (part.startsWith("'") && part.endsWith("'")) ? (
        <span key={i} className="font-bold text-[#1d4ed8]">{part}</span>
      ) : part
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ overflowY: "auto", backgroundColor: "rgba(0,0,0,0.45)", fontFamily: "Pretendard, sans-serif" }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-2xl border border-[#EFEFEF] dark:border-white/10 animate-in zoom-in-95 duration-200 flex flex-col shadow-2xl"
        style={{
          maxHeight: "90dvh",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEFEF] dark:border-white/10 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <Edit3 size={18} />
            </div>
            <h3 className="text-base font-bold tracking-tight text-[#1F1F1F] dark:text-white">{renderTitle(title)}</h3>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-4">
          {!hideTextInput && (
            <div>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={`w-full px-4 py-2.5 bg-[#F7F8F9] dark:bg-white/5 border rounded-lg text-sm text-[#1F1F1F] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/40 transition-all ${
                  error ? 'border-red-500 ring-1 ring-red-500/50' : 'border-[#EFEFEF] dark:border-white/10'
                }`}
                autoComplete="off"
              />
              {error && (
                <p className="mt-2 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  {error}
                </p>
              )}
            </div>
          )}

          {showStyleSelector && (
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
                <Palette size={13} className="text-[#1d4ed8] dark:text-blue-400" />
                <span>{styleSelectorLabel}</span>
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F8F9] dark:bg-zinc-800 border border-[#EFEFEF] dark:border-white/10 rounded-lg text-sm font-medium text-[#1F1F1F] dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/40 cursor-pointer"
              >
                <option value={SYSTEM_PROFILES[0].id}>
                  🌐 {SYSTEM_PROFILES[0].name} (Google Developers 표준 · 기본값)
                </option>
                <option value="NONE">
                  ⚡ 별도 지정 안함 (상위 폴더 서식 또는 Onrivi 기본서식 자동 적용)
                </option>
                {userProfiles.length > 0 && (
                  <optgroup label="✨ 사용자 정의 서식">
                    {userProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        🎨 {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📚 시스템 표준 서식">
                  {systemProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      📄 {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                이 폴더의 문서에 별도 서식이 지정되지 않은 경우 선택한 폴더 서식이 자동 반영됩니다.
              </p>
            </div>
          )}
          
          <div className="mt-6 flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-[#616161] hover:text-[#1F1F1F] dark:text-[#A0A0A0] dark:hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#1d4ed8]/25 transition-all active:scale-95"
            >
              확인
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
