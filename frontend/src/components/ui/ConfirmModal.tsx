// ====================================================================
// 📊 [OMD-UI-ConfirmModal-0009 ✅ FIXED] ConfirmModal ➔ ConfirmModal
// 🎯 @KICK  : 사용자에게 중요 결정(작업 취소, 확인 등)에 대한 컨피메이션(예/아니오)을 묻는 딤드 오버레이 확인창 제공
// 🛡️ @GUARD : isOpen이 false일 때 null을 즉시 반환하여 렌더링 오버헤드 최소화; whitespace-pre-line으로 줄바꿈 유지
// 🚨 @PATCH : **2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치
// 🔗 @CALLS : onConfirm, onCancel
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  useModalEscape(isOpen, onCancel);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" style={{ overflowY: "auto" }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150" style={{ maxHeight: "90dvh", overflowY: "auto" }}>
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              취소
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-600/10"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
