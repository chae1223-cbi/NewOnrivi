// ====================================================================
// 📊 [OMD-STYLE-DETAIL-FOOTNOTE-0001] DetailFootnotePanel.tsx
// 🎯 @KICK  : 각주(Footnote) 영역 글자 크기, 색상, 행간, 여백 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [각주 활자 크기 pt 단위 표준화]:
//             각주 텍스트 활자 크기를 pt 단위 및 0.5pt 단계로 통일
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, getNumValue, parsePt, isFontWeightBold } from './DetailWidgets';

interface DetailFootnotePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailFootnotePanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailFootnotePanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const fnRules = getTagRules('footnote');

  return (
    <div className="space-y-4">
      <SectionCard
        title="각주 (Footnote) 서식 및 조판"
        badge="문서 하단 주석"
        description="페이지 하단이나 문서 끝에 표시되는 각주 텍스트의 크기와 간격을 정밀하게 조절합니다."
      >
        <ColorPickerWidget
          label="각주 글자 색상"
          value={fnRules['color'] || ''}
          disabled={isSystemProfile}
          onChange={(v) => updateCssRule('footnote', 'color', v)}
        />

        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
          <span className="text-zinc-650 dark:text-zinc-350 font-semibold text-xs">각주 글자 굵기</span>
          <select
            value={isFontWeightBold(fnRules['font-weight']) ? 'bold' : 'normal'}
            disabled={isSystemProfile}
            onChange={(e) => updateCssRule('footnote', 'font-weight', e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
          >
            <option value="normal">보통 (Regular)</option>
            <option value="bold">굵게 (Bold)</option>
          </select>
        </div>

        <SliderWidget
          label="각주 글자 크기"
          min={6}
          max={16}
          step={0.5}
          value={parsePt(fnRules['font-size'], 9)}
          unit="pt"
          disabled={isSystemProfile}
          onChange={(v) => updateCssRule('footnote', 'font-size', `${v}pt`)}
        />

        <SliderWidget
          label="각주 줄 간격 (행간)"
          min={1.0}
          max={2.5}
          step={0.1}
          value={getNumValue(fnRules['line-height'], 1.6)}
          unit="배"
          disabled={isSystemProfile}
          onChange={(v) => updateCssRule('footnote', 'line-height', String(v))}
        />

        <SliderWidget
          label="각주 상하 바깥 여백"
          min={0}
          max={32}
          value={getNumValue(fnRules['margin-top'], 6)}
          unit="px"
          disabled={isSystemProfile}
          onChange={(v) => {
            const px = v + 'px';
            const updated = {
              ...currentProfile,
              rules: {
                ...currentProfile.rules,
                footnote: {
                  ...fnRules,
                  'margin-top': px,
                  'margin-bottom': px
                }
              }
            };
            triggerUpdate(updated, 'footnote', `각주 상하 여백 (${v}px)`);
          }}
        />
      </SectionCard>
    </div>
  );
}
