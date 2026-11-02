// ====================================================================
// 📊 [OMD-STYLE-DETAIL-INLINECODE-0001] DetailInlineCodePanel.tsx
// 🎯 @KICK  : 백틱(`...`) 인라인 코드 글자색, 배경색, 굵기, 모서리 세부 스타일 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [ESLint JSX unescaped entities 수정]:
//             미리보기 코드 텍스트 따옴표 JSX 래핑으로 lint 통과 보장
// 🚨 @PATCH : **2026-10-26** — [인라인 코드 안쪽 좌우 여백 정밀 파싱 및 일괄 반영 보장]:
//             1) padding shorthand(예: '2px 6px')에서 가로 패딩(6px)을 정확히 추출하는 getInlineCodePaddingX 헬퍼 신설
//             2) 슬라이더 조작 시 padding(py px), padding-left, padding-right를 동시 주입하여 미리보기/쇼케이스 실시간 반영 보장
// 🚨 @PATCH : **2026-10-26** — [인라인 코드 전용 컴포넌트 분리 신설]:
//             코드블록과 분리하여 인라인 코드(code)의 글자색, 배경색, 굵기 독립 제어
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, ColorPickerWidget, SliderWidget, getNumValue } from './DetailWidgets';

// 인라인 코드 수평 안쪽 여백(padding-left/right) 파싱 헬퍼
export const getInlineCodePaddingX = (rule: CssRuleSet): number => {
  if (rule['padding-left']) return getNumValue(rule['padding-left'], 6);
  if (rule['padding']) {
    const parts = String(rule['padding']).trim().split(/\s+/);
    if (parts.length >= 2) return getNumValue(parts[1], 6);
    if (parts.length === 1) return getNumValue(parts[0], 6);
  }
  return 6;
};

interface DetailInlineCodePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailInlineCodePanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailInlineCodePanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const codeRules = getTagRules('code');

  return (
    <div className="space-y-4">
      <SectionCard
        title="🔤 인라인 코드 (Inline Code)"
        description="본문 문장 속 백틱(`...`)으로 감싼 인라인 코드의 서식을 설정합니다."
      >
        <div className="space-y-3.5">
          {/* 글자색 & 배경색 */}
          <div className="grid grid-cols-2 gap-2.5">
            <ColorPickerWidget
              label="글자 색상"
              value={codeRules['color'] || ''}
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('code', 'color', v)}
            />
            <ColorPickerWidget
              label="배경 색상"
              value={codeRules['background-color'] || ''}
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('code', 'background-color', v)}
            />
          </div>

          {/* 굵기 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">글자 굵기 (Font Weight)</span>
            <select
              value={codeRules['font-weight'] || 'normal'}
              disabled={isSystemProfile}
              onChange={(e) => updateCssRule('code', 'font-weight', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="normal">보통 (Regular / 400)</option>
              <option value="600">약간 굵게 (Semi-Bold / 600)</option>
              <option value="bold">굵게 (Bold / 700)</option>
            </select>
          </div>

          {/* 모서리 곡률 */}
          <SliderWidget
            label="모서리 둥글기 (Border Radius)"
            min={0}
            max={12}
            value={getNumValue(codeRules['border-radius'], 4)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('code', 'border-radius', v + 'px')}
          />

          {/* 안쪽 여백 */}
          <SliderWidget
            label="안쪽 좌우 여백 (Padding)"
            min={0}
            max={16}
            value={getInlineCodePaddingX(codeRules)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              const currentCode = currentProfile.rules.code || {};
              let py = '2px';
              if (currentCode.padding) {
                const parts = String(currentCode.padding).trim().split(/\s+/);
                if (parts.length > 0 && parts[0]) py = parts[0];
              }
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  code: {
                    ...currentCode,
                    padding: `${py} ${px}`,
                    'padding-left': px,
                    'padding-right': px,
                  },
                },
              };
              triggerUpdate(updated, 'code', `인라인 코드 여백 (${v}px)`);
            }}
          />

          {/* 미리보기 칩 */}
          <div className="p-3 bg-zinc-100/70 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 text-center">
            <span className="text-xs text-zinc-500 mr-2">실제 표시 미리보기:</span>
            <span
              style={{
                color: codeRules['color'] || 'inherit',
                backgroundColor: codeRules['background-color'] || '#f1f5f9',
                fontWeight: codeRules['font-weight'] || 'normal',
                borderRadius: codeRules['border-radius'] || '4px',
                padding: codeRules['padding'] || '2px 6px',
                paddingLeft: codeRules['padding-left'] || (codeRules['padding'] ? String(codeRules['padding']).trim().split(/\s+/)[1] : '6px'),
                paddingRight: codeRules['padding-right'] || (codeRules['padding'] ? String(codeRules['padding']).trim().split(/\s+/)[1] : '6px'),
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              {'const version = "1.0.0";'}
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
