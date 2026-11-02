// ====================================================================
// 📊 [OMD-STYLE-DETAIL-CODE-0001] DetailCodePanel.tsx
// 🎯 @KICK  : 소스코드 블록(Code Block) 전용 세부 스타일 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [코드 활자 크기 pt 단위 표준화]:
//             코드 블록 활자 크기 듀얼 모드 제어기를 pt 단위(7pt~20pt, 0.5pt 단계)로 일원화
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, FontSizeControl, getNumValue } from './DetailWidgets';

interface DetailCodePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  baseFontSize: string;
  onUpdateProfile: (profile: CssProfile) => void;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailCodePanel({
  currentProfile,
  isSystemProfile,
  baseFontSize,
  onUpdateProfile,
  triggerUpdate,
  updateCssRule,
}: DetailCodePanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const cb = getTagRules('codeBlock');
  const bg = (cb['background-color'] || '').toLowerCase();
  const isMac = bg === '#282c34';
  const isDark = !isMac && (bg === '#0f172a' || bg === '#1e293b' || bg === '#111827' || bg === '#18181b' || (cb['color'] && cb['color'].toLowerCase().startsWith('#f')));
  const isBasic = !isMac && !isDark;

  const activeClass = 'bg-blue-600 text-white font-bold shadow-xs';
  const inactiveClass = 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50';

  return (
    <div className="space-y-4">
      {/* 1. 코드 블록 형태 및 프리셋 */}
      <SectionCard
        title="💻 소스코드 블록 (Code Block)"
        description="프로그래밍 코드 블록의 테마 프리셋, 타이틀 바 색상, 행간, 여백을 조절합니다."
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isSystemProfile}
              onClick={() => {
                const newCb = { ...(currentProfile.rules.codeBlock || {}) };
                const newCbt = { ...(currentProfile.rules.codeBlockTitle || {}) };
                newCb['background-color'] = '#f1f5f9';
                newCb['color'] = '#1e293b';
                newCb['border-radius'] = '6px';
                newCbt['background-color'] = '#e2e8f0';
                newCbt['color'] = '#475569';
                newCbt['padding'] = '8px 12px';
                newCbt['border-radius'] = '6px 6px 0 0';
                onUpdateProfile({ ...currentProfile, rules: { ...currentProfile.rules, codeBlock: newCb, codeBlockTitle: newCbt } });
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isBasic ? activeClass : inactiveClass}`}
            >
              기본 박스 (라이트)
            </button>

            <button
              type="button"
              disabled={isSystemProfile}
              onClick={() => {
                const newCb = { ...(currentProfile.rules.codeBlock || {}) };
                const newCbt = { ...(currentProfile.rules.codeBlockTitle || {}) };
                newCb['background-color'] = '#282c34';
                newCb['color'] = '#abb2bf';
                newCb['border-radius'] = '0 0 8px 8px';
                newCbt['background-color'] = '#21252b';
                newCbt['color'] = '#abb2bf';
                newCbt['padding'] = '10px 16px';
                newCbt['border-radius'] = '8px 8px 0 0';
                onUpdateProfile({ ...currentProfile, rules: { ...currentProfile.rules, codeBlock: newCb, codeBlockTitle: newCbt } });
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isMac ? activeClass : inactiveClass}`}
            >
              Mac OS 테마
            </button>

            <button
              type="button"
              disabled={isSystemProfile}
              onClick={() => {
                const newCb = { ...(currentProfile.rules.codeBlock || {}) };
                const newCbt = { ...(currentProfile.rules.codeBlockTitle || {}) };
                newCb['background-color'] = '#0f172a';
                newCb['color'] = '#e2e8f0';
                newCb['border-radius'] = '0 0 8px 8px';
                newCbt['background-color'] = '#1e293b';
                newCbt['color'] = '#94a3b8';
                newCbt['padding'] = '8px 12px';
                newCbt['border-radius'] = '8px 8px 0 0';
                onUpdateProfile({ ...currentProfile, rules: { ...currentProfile.rules, codeBlock: newCb, codeBlockTitle: newCbt } });
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isDark ? activeClass : inactiveClass}`}
            >
              다크 테마 고정
            </button>
          </div>

          {/* 타이틀 및 블록 배경색 */}
          <div className="grid grid-cols-2 gap-2.5">
            <ColorPickerWidget
              label="타이틀 바 배경색"
              value={getTagRules('codeBlockTitle')['background-color'] || ''}
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('codeBlockTitle', 'background-color', v)}
            />
            <ColorPickerWidget
              label="타이틀 바 글자색"
              value={getTagRules('codeBlockTitle')['color'] || ''}
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('codeBlockTitle', 'color', v)}
            />
            <ColorPickerWidget
              label="코드 본문 배경색"
              value={getTagRules('codeBlock')['background-color'] || ''}
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('codeBlock', 'background-color', v)}
            />
            <ColorPickerWidget
              label="코드 본문 글자색"
              value={getTagRules('codeBlock')['color'] || ''}
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('codeBlock', 'color', v)}
            />
          </div>

          <FontSizeControl
            label="코드 활자 크기"
            min={7}
            max={20}
            step={0.5}
            value={getTagRules('codeBlock')['font-size']}
            baseFontSize={baseFontSize}
            disabled={isSystemProfile}
            onChange={(v) => {
              if (!v) {
                const { 'font-size': _, ...rest } = getTagRules('codeBlock');
                triggerUpdate({
                  ...currentProfile,
                  rules: { ...currentProfile.rules, codeBlock: { ...rest, 'font-size': 'inherit' } }
                }, 'codeBlock', '코드 블록 기본 글자 크기 유지');
              } else {
                updateCssRule('codeBlock', 'font-size', v);
              }
            }}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <SliderWidget
              label="코드 줄 간격 (행간)"
              min={1.0}
              max={2.0}
              step={0.05}
              value={parseFloat(getTagRules('codeBlock')['line-height'] || '1.35')}
              unit="배"
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('codeBlock', 'line-height', String(v))}
            />
            <SliderWidget
              label="안쪽 여백 (Padding)"
              min={0}
              max={32}
              value={getNumValue(getTagRules('codeBlock')['padding'], 12)}
              unit="px"
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('codeBlock', 'padding', v + 'px')}
            />
          </div>

          <SliderWidget
            label="모서리 둥글기 (Border Radius)"
            min={0}
            max={16}
            value={getNumValue(getTagRules('codeBlock')['border-radius'], 6)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('codeBlock', 'border-radius', v + 'px')}
          />
        </div>
      </SectionCard>
    </div>
  );
}
