// ====================================================================
// 📊 [OMD-STYLE-DETAIL-MATH-0001] DetailMathPanel.tsx
// 🎯 @KICK  : KaTeX 수식 블록($$...$$) 글자색, 크기, 여백, 정렬 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [수식 활자 크기 pt 단위 표준화]:
//             수식 활자 크기 듀얼 모드 제어기를 pt 단위(8pt~24pt, 0.5pt 단계)로 일원화
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, FontSizeControl, getNumValue } from './DetailWidgets';

interface DetailMathPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  baseFontSize: string;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailMathPanel({
  currentProfile,
  isSystemProfile,
  baseFontSize,
  triggerUpdate,
  updateCssRule,
}: DetailMathPanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const mathRules = getTagRules('math');

  return (
    <div className="space-y-4">
      <SectionCard
        title="📐 KaTeX 수식 블록 (Math)"
        description="독립 수식($$ ... $$)의 글자 색상, 폰트 크기, 상하 여백 및 정렬을 설정합니다."
      >
        <div className="space-y-3.5">
          {/* 수식 글자 색상 */}
          <ColorPickerWidget
            label="수식 글자 색상"
            value={mathRules['color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('math', 'color', v)}
          />

          {/* 수식 활자 크기 */}
          <FontSizeControl
            label="수식 글자 크기"
            min={8}
            max={24}
            step={0.5}
            value={(currentProfile.rules.math || {})['font-size']}
            baseFontSize={baseFontSize}
            disabled={isSystemProfile}
            onChange={(v) => {
              const currentMath = currentProfile.rules.math || {};
              if (!v) {
                const { 'font-size': _, ...rest } = currentMath;
                triggerUpdate(
                  {
                    ...currentProfile,
                    rules: { ...currentProfile.rules, math: { ...rest, 'font-size': 'inherit' } },
                  },
                  'math',
                  '수식 기본 글자 크기 유지'
                );
              } else {
                updateCssRule('math', 'font-size', v);
              }
            }}
          />

          {/* 수식 상하 여백 */}
          <SliderWidget
            label="수식 상하 바깥 여백"
            min={0}
            max={80}
            value={getNumValue((currentProfile.rules.math || {})['margin-top'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              if (!isSystemProfile) {
                const { margin: _, ...currentMath } = currentProfile.rules.math || {};
                const updated = {
                  ...currentProfile,
                  rules: {
                    ...currentProfile.rules,
                    math: {
                      ...currentMath,
                      'margin-top': px,
                      'margin-bottom': px,
                    },
                  },
                };
                triggerUpdate(updated, 'math', `수식 상하 바깥 여백 (${v}px)`);
              }
            }}
          />

          {/* 정렬 방식 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">수식 정렬 방식</span>
            <select
              value={mathRules['text-align'] || 'center'}
              disabled={isSystemProfile}
              onChange={(e) => updateCssRule('math', 'text-align', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="center">중앙 정렬</option>
              <option value="left">왼쪽 정렬</option>
              <option value="right">오른쪽 정렬</option>
            </select>
          </div>

          {/* 수식 미리보기 카드 */}
          <div className="p-3 bg-zinc-100/70 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 text-center font-mono">
            <span className="text-xs text-zinc-500 mr-2 block mb-1">수식 표현 미리보기:</span>
            <span
              style={{
                color: mathRules['color'] || 'inherit',
                fontSize: mathRules['font-size'] && mathRules['font-size'] !== 'inherit' ? mathRules['font-size'] : '15px',
              }}
              className="font-serif italic font-bold"
            >
              E = mc² &nbsp; | &nbsp; ∫ f(x)dx = F(b) - F(a)
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
