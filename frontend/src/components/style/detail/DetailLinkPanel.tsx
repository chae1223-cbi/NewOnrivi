// ====================================================================
// 📊 [OMD-STYLE-DETAIL-LINK-0001] DetailLinkPanel.tsx
// 🎯 @KICK  : 하이퍼링크([텍스트](URL)) 글자색, 밑줄 유무, 굵기 세부 스타일 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [하이퍼링크 전용 컴포넌트 분리 신설]:
//             코드블록과 분리하여 하이퍼링크(a)의 글자색, 밑줄 모양, 굵기 독립 제어
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, ColorPickerWidget, isFontWeightBold } from './DetailWidgets';

interface DetailLinkPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailLinkPanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailLinkPanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const aRules = getTagRules('a');

  return (
    <div className="space-y-4">
      <SectionCard
        title="🔗 하이퍼링크 (Hyperlink)"
        description="외부 웹사이트나 내부 문서로 연결되는 하이퍼링크([텍스트](URL)) 서식을 설정합니다."
      >
        <div className="space-y-3.5">
          {/* 글자색 */}
          <ColorPickerWidget
            label="링크 글자 색상"
            value={aRules['color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('a', 'color', v)}
          />

          <div className="grid grid-cols-2 gap-2.5">
            {/* 밑줄 유무 */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
              <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">밑줄 스타일</span>
              <select
                value={aRules['text-decoration'] || 'underline'}
                disabled={isSystemProfile}
                onChange={(e) => updateCssRule('a', 'text-decoration', e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
              >
                <option value="underline">밑줄 표시 (Underline)</option>
                <option value="none">밑줄 없음 (None)</option>
              </select>
            </div>

            {/* 굵기 */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
              <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">글자 굵기</span>
              <select
                value={isFontWeightBold(aRules['font-weight']) ? 'bold' : 'normal'}
                disabled={isSystemProfile}
                onChange={(e) => updateCssRule('a', 'font-weight', e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
              >
                <option value="normal">보통 (Regular)</option>
                <option value="bold">굵게 (Bold)</option>
              </select>
            </div>
          </div>

          {/* 미리보기 칩 */}
          <div className="p-3 bg-zinc-100/70 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 text-center">
            <span className="text-xs text-zinc-500 mr-2">실제 표시 미리보기:</span>
            <span
              style={{
                color: aRules['color'] || '#2563eb',
                textDecoration: aRules['text-decoration'] || 'underline',
                fontWeight: aRules['font-weight'] || 'normal',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              온리비 마크다운 가이드 문서 바로가기 ↗
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
