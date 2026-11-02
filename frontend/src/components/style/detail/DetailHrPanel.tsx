// ====================================================================
// 📊 [OMD-STYLE-DETAIL-HR-0001] DetailHrPanel.tsx
// 🎯 @KICK  : 수평 구분선(HR) 선 스타일, 두께, 여백, 너비 비율 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [수평 구분선 세부 조판 전용 컴포넌트 분리 신설]:
//             선 모양, 두께, 상하 여백, 너비 비율 및 색상 조작 위젯 통합 격리
// ====================================================================

import React from 'react';
import type { CssProfile } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, getNumValue } from './DetailWidgets';

interface DetailHrPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailHrPanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailHrPanelProps) {
  const hrStructure = {
    borderTopStyle: currentProfile.hrStructure?.borderTopStyle || 'solid',
    borderTopWidth: currentProfile.hrStructure?.borderTopWidth || '1px',
    marginTopBottom: currentProfile.hrStructure?.marginTopBottom || '32px',
    lineWidth: currentProfile.hrStructure?.lineWidth || '100%',
  };

  const updateHrStructure = (key: string, value: string, label?: string) => {
    if (isSystemProfile) return;
    const nextHrStructure = { ...hrStructure, [key]: value };

    const currentHrRules = { ...(currentProfile.rules.hr || {}) };
    delete (currentHrRules as any)['margin'];
    delete (currentHrRules as any)['border'];
    delete (currentHrRules as any)['height'];
    delete (currentHrRules as any)['background-color'];

    if (key === 'borderTopStyle') currentHrRules['border-top-style'] = value;
    if (key === 'borderTopWidth') currentHrRules['border-top-width'] = value;
    if (key === 'marginTopBottom') {
      currentHrRules['margin-top'] = value;
      currentHrRules['margin-bottom'] = value;
    }
    if (key === 'lineWidth') currentHrRules['width'] = value;

    const updated = {
      ...currentProfile,
      hrStructure: nextHrStructure,
      rules: {
        ...currentProfile.rules,
        hr: currentHrRules,
      },
    };
    triggerUpdate(updated, 'hr', label || '구분선(HR)');
  };

  const hrColor = (currentProfile.rules.hr || {})['border-top-color'] || '';

  return (
    <div className="space-y-4">
      <SectionCard
        title="수평 구분선 (HR) 규격 및 모양"
        description="단락을 구분하는 수평선의 선 종류, 두께, 상하 여백 및 폭을 설정합니다."
      >
        <div className="space-y-3">
          {/* 선 모양 종류 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">선 모양 스타일</span>
            <select
              value={hrStructure.borderTopStyle}
              disabled={isSystemProfile}
              onChange={(e) => updateHrStructure('borderTopStyle', e.target.value, `구분선 스타일(${e.target.options[e.target.selectedIndex].text})`)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="solid">실선 (Solid)</option>
              <option value="dotted">점선 (Dotted)</option>
              <option value="dashed">대시선 (Dashed)</option>
              <option value="double">이중선 (Double)</option>
            </select>
          </div>

          {/* 선 두께 슬라이더 */}
          <SliderWidget
            label="구분선 두께"
            min={1}
            max={10}
            value={getNumValue(hrStructure.borderTopWidth, 1)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateHrStructure('borderTopWidth', v + 'px', `구분선 두께(${v}px)`)}
          />

          {/* 위아래 여백 슬라이더 */}
          <SliderWidget
            label="구분선 상하 여백"
            min={0}
            max={100}
            value={getNumValue(hrStructure.marginTopBottom, 32)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateHrStructure('marginTopBottom', v + 'px', `구분선 상하 여백(${v}px)`)}
          />

          {/* 가로 길이 비율 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">구분선 가로 너비</span>
            <select
              value={hrStructure.lineWidth}
              disabled={isSystemProfile}
              onChange={(e) => updateHrStructure('lineWidth', e.target.value, `구분선 너비(${e.target.value})`)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="100%">100% (전체 폭)</option>
              <option value="75%">75% (중앙 정렬)</option>
              <option value="50%">50% (중앙 정렬)</option>
              <option value="30%">30% (짧은 악센트 선)</option>
            </select>
          </div>

          {/* 선 색상 */}
          <ColorPickerWidget
            label="구분선 색상"
            value={hrColor}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('hr', 'border-top-color', v)}
          />
        </div>
      </SectionCard>
    </div>
  );
}
