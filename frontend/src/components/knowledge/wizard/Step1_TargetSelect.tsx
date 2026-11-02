// ====================================================================
// 📊 [OMD-WIZARD-Step1-0001] Step1_TargetSelect.tsx ➔ KUI-004 대량 수집 대상 선택
// 🎯 @KICK  : 지식 문서 등록 마법사 1단계로 현재 작업공간, 폴더 선택, 개별 파일 선택 모드 제공
// 🛡️ @GUARD : LDSG v5.0 디자인 시스템 적용, 선택 상태 유효성 보장
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-004 지식 문서 등록 대상 선택 화면 신규 구현
// ====================================================================

import React from 'react';
import { FolderTree, Folder, FileText, CheckCircle2 } from 'lucide-react';

export type TargetSelectionMode = 'WORKSPACE' | 'FOLDER' | 'FILES';

interface Step1TargetSelectProps {
  selectionMode: TargetSelectionMode;
  onSelectMode: (mode: TargetSelectionMode) => void;
  workspaceName?: string;
  totalWorkspaceFiles?: number;
}

export const Step1_TargetSelect: React.FC<Step1TargetSelectProps> = ({
  selectionMode,
  onSelectMode,
  workspaceName = '현재 작업공간',
  totalWorkspaceFiles = 0,
}) => {
  const options = [
    {
      id: 'WORKSPACE' as TargetSelectionMode,
      title: '현재 Workspace의 문서',
      description: `현재 열려 있는 작업공간(${workspaceName}) 내의 모든 마크다운 문서를 탐색합니다. (약 ${totalWorkspaceFiles}개 파일)`,
      icon: FolderTree,
      badge: '추천',
    },
    {
      id: 'FOLDER' as TargetSelectionMode,
      title: '폴더 선택',
      description: '내 컴퓨터의 특정 폴더를 선택하여 하위 마크다운 문서들을 재귀적으로 탐색합니다.',
      icon: Folder,
      badge: '로컬 폴더',
    },
    {
      id: 'FILES' as TargetSelectionMode,
      title: '개별 파일 선택',
      description: '하나 이상의 특정 마크다운(.md) 파일들을 직접 지정하여 등록합니다.',
      icon: FileText,
      badge: '직접 선택',
    },
  ];

  return (
    <div className="space-y-4 py-2">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          무엇을 등록하시겠습니까?
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          대량 문서 등록 시 먼저 로컬 파일 시스템을 안전하게 탐색하며, 선택 전에는 AI 분석을 시작하지 않습니다.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectionMode === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => onSelectMode(opt.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                isSelected
                  ? 'border-[#1d4ed8] bg-[#1d4ed8]/5 dark:bg-[#1d4ed8]/10 shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-lg ${
                    isSelected
                      ? 'bg-[#1d4ed8] text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {opt.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <input
                  type="radio"
                  name="targetMode"
                  checked={isSelected}
                  onChange={() => onSelectMode(opt.id)}
                  className="w-4 h-4 text-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
