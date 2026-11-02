// ====================================================================
// 📊 [OMD-STYLE-DETAIL-QUOTE-0001] DetailQuotePanel.tsx
// 🎯 @KICK  : 인용구(Blockquote) 형태 프리셋, 강조선, 배경색, 여백 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [인용구 테두리 형태 선택 표시 및 두께·색상 제어 완벽 정상화]:
//             1) isLeftLine 기본값 보정(!isShadowBox && !isFullBox) 및 전체 박스형/그림자형 선택 시 border-left: none 명시적 보존
//             2) parseBorderShorthand 헬퍼를 신설하여 border-left/border 단축 속성에서 두께, 색상, 스타일을 완벽 파싱·동기화
//             3) 테두리 두께 슬라이더 및 강조선 색상 위젯이 현재 서식 값과 1:1 일치하여 실시간 조절되도록 개선
// 🚨 @PATCH : **2026-10-26** — [인용구 활자 크기 pt 단위 표준화]:
//             인용구 활자 크기 듀얼 모드 제어기를 pt 단위(8pt~24pt, 0.5pt 단계)로 일원화
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, FontSizeControl, getNumValue, isFontWeightBold } from './DetailWidgets';

interface DetailQuotePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  baseFontSize: string;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailQuotePanel({
  currentProfile,
  isSystemProfile,
  baseFontSize,
  triggerUpdate,
  updateCssRule,
}: DetailQuotePanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const rawBq = currentProfile.rules.blockquote || {};

  // 💡 단축 테두리 속성(4px solid #2563eb 등)에서 두께, 스타일, 색상 파싱
  const parseBorderShorthand = (val?: string) => {
    if (!val || val === 'none') return { width: 0, style: 'solid', color: '' };
    const parts = val.trim().split(/\s+/);
    const widthNum = parseFloat(parts[0]) || 0;
    const style = ['solid', 'dashed', 'dotted', 'double', 'none'].includes(parts[1]) ? parts[1] : 'solid';
    const color = parts.slice(2).join(' ') || (parts[1] && !['solid', 'dashed', 'dotted', 'double', 'none'].includes(parts[1]) ? parts.slice(1).join(' ') : '');
    return { width: widthNum, style, color };
  };

  const leftBorderParsed = parseBorderShorthand(rawBq['border-left']);
  const allBorderParsed = parseBorderShorthand(rawBq['border']);

  const hasBorderLeft = !!rawBq['border-left'] && rawBq['border-left'] !== 'none';
  const hasBorder = !!rawBq['border'] && rawBq['border'] !== 'none';
  const hasBoxShadow = !!rawBq['box-shadow'] && rawBq['box-shadow'] !== 'none';

  const isShadowBox = hasBoxShadow && !hasBorder && !hasBorderLeft;
  const isFullBox = !hasBorderLeft && hasBorder;
  // 그림자형도 전체박스형도 아니면 기본 마크다운 표준인 '왼쪽 띠형'으로 활성 판정
  const isLeftLine = !isShadowBox && !isFullBox;

  // 현재 유효 테두리 두께 및 색상 추출 (단축 속성 우선 추출로 inherit 빈값 방지)
  const currentBorderWidth = isLeftLine
    ? getNumValue(rawBq['border-left-width'], leftBorderParsed.width || 4)
    : getNumValue(rawBq['border-width'], allBorderParsed.width || 1);

  const currentBorderColor = isLeftLine
    ? (rawBq['border-left-color'] || leftBorderParsed.color || '#2563eb')
    : (rawBq['border-color'] || allBorderParsed.color || '#cbd5e1');

  const activeClass = 'bg-blue-600 text-white font-bold shadow-xs';
  const inactiveClass = 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50';

  return (
    <div className="space-y-4">
      <SectionCard
        title="인용구 (Blockquote) 형태 및 테두리"
        description="강조선 띠형, 전체 박스형, 부드러운 그림자 카드형 중 선택합니다."
      >
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              const newBq = { ...(currentProfile.rules.blockquote || {}) };
              const curColor = newBq['border-left-color'] || leftBorderParsed.color || newBq['border-color'] || allBorderParsed.color || '#2563eb';
              const curWidth = newBq['border-left-width'] || (leftBorderParsed.width ? `${leftBorderParsed.width}px` : '4px');
              newBq['border-left'] = `${curWidth} solid ${curColor}`;
              newBq['border-left-width'] = curWidth;
              newBq['border-left-color'] = curColor;
              newBq['border'] = 'none';
              delete newBq['border-width'];
              delete newBq['border-color'];
              newBq['box-shadow'] = 'none';
              newBq['border-radius'] = '0 8px 8px 0';
              newBq['padding'] = '14px 20px';
              triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, blockquote: newBq } }, 'blockquote', '인용구 형태 (왼쪽 띠형)');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isLeftLine ? activeClass : inactiveClass}`}
          >
            왼쪽 띠형
          </button>

          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              const newBq = { ...(currentProfile.rules.blockquote || {}) };
              const curColor = newBq['border-color'] || allBorderParsed.color || newBq['border-left-color'] || leftBorderParsed.color || '#cbd5e1';
              const curWidth = newBq['border-width'] || (allBorderParsed.width ? `${allBorderParsed.width}px` : '1px');
              newBq['border-left'] = 'none';
              delete newBq['border-left-width'];
              delete newBq['border-left-color'];
              newBq['border'] = `${curWidth} solid ${curColor}`;
              newBq['border-width'] = curWidth;
              newBq['border-color'] = curColor;
              newBq['box-shadow'] = 'none';
              newBq['border-radius'] = '8px';
              newBq['padding'] = '16px';
              triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, blockquote: newBq } }, 'blockquote', '인용구 형태 (전체 박스형)');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isFullBox ? activeClass : inactiveClass}`}
          >
            전체 박스형
          </button>

          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              const newBq = { ...(currentProfile.rules.blockquote || {}) };
              newBq['border-left'] = 'none';
              delete newBq['border-left-width'];
              delete newBq['border-left-color'];
              newBq['border'] = 'none';
              delete newBq['border-width'];
              delete newBq['border-color'];
              newBq['box-shadow'] = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
              newBq['border-radius'] = '8px';
              newBq['padding'] = '16px';
              triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, blockquote: newBq } }, 'blockquote', '인용구 형태 (부드러운 그림자)');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isShadowBox ? activeClass : inactiveClass}`}
          >
            부드러운 그림자
          </button>
        </div>

        {/* 배경색 및 강조선 색상 */}
        <div className="grid grid-cols-2 gap-2.5">
          <ColorPickerWidget
            label="인용구 배경색"
            value={getTagRules('blockquote')['background-color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('blockquote', 'background-color', v)}
          />
          <ColorPickerWidget
            label="강조선 색상"
            value={currentBorderColor}
            disabled={isSystemProfile}
            onChange={(c) => {
              const newBq = { ...(currentProfile.rules.blockquote || {}) };
              if (isLeftLine) {
                const curWidth = newBq['border-left-width'] || `${leftBorderParsed.width || 4}px`;
                const curStyle = leftBorderParsed.style || 'solid';
                newBq['border-left-color'] = c;
                newBq['border-left'] = `${curWidth} ${curStyle} ${c}`;
                newBq['border'] = 'none';
              } else {
                const curWidth = newBq['border-width'] || `${allBorderParsed.width || 1}px`;
                const curStyle = allBorderParsed.style || 'solid';
                newBq['border-color'] = c;
                newBq['border'] = `${curWidth} ${curStyle} ${c}`;
                newBq['border-left'] = 'none';
              }
              triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, blockquote: newBq } }, 'blockquote', '인용구 강조선 색상');
            }}
          />
        </div>

        {/* 테두리 두께 및 모서리 둥글기 */}
        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="테두리 두께"
            min={0}
            max={12}
            value={currentBorderWidth}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const newBq = { ...(currentProfile.rules.blockquote || {}) };
              if (isLeftLine) {
                const curColor = newBq['border-left-color'] || leftBorderParsed.color || '#2563eb';
                const curStyle = leftBorderParsed.style || 'solid';
                newBq['border-left-width'] = `${v}px`;
                newBq['border-left'] = `${v}px ${curStyle} ${curColor}`;
                newBq['border'] = 'none';
                delete newBq['border-width'];
              } else {
                const curColor = newBq['border-color'] || allBorderParsed.color || '#cbd5e1';
                const curStyle = allBorderParsed.style || 'solid';
                newBq['border-width'] = `${v}px`;
                newBq['border'] = `${v}px ${curStyle} ${curColor}`;
                newBq['border-left'] = 'none';
                delete newBq['border-left-width'];
              }
              triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, blockquote: newBq } }, 'blockquote', `인용구 테두리 두께 (${v}px)`);
            }}
          />
          <SliderWidget
            label="모서리 둥글기"
            min={0}
            max={24}
            value={getNumValue(getTagRules('blockquote')['border-radius'], 8)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('blockquote', 'border-radius', v + 'px')}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="인용구 여백 및 활자"
        description="바깥 상하 간격, 내부 안쪽 여백, 글자 크기 및 굵기를 조절합니다."
      >
        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="바깥 상하 여백"
            min={0}
            max={48}
            value={getNumValue(getTagRules('blockquote')['margin-top'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              const currentBq = currentProfile.rules.blockquote || {};
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  blockquote: { ...currentBq, 'margin-top': px, 'margin-bottom': px }
                }
              };
              triggerUpdate(updated, 'blockquote', `인용구 상하 여백 (${v}px)`);
            }}
          />
          <SliderWidget
            label="안쪽 여백 (Padding)"
            min={4}
            max={36}
            value={getNumValue(getTagRules('blockquote')['padding'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('blockquote', 'padding', v + 'px')}
          />
        </div>

        <FontSizeControl
          label="인용구 활자 크기"
          min={8}
          max={24}
          step={0.5}
          value={getTagRules('blockquote')['font-size']}
          baseFontSize={baseFontSize}
          disabled={isSystemProfile}
          onChange={(v) => {
            const currentBq = getTagRules('blockquote');
            const updatedRules = { ...currentProfile.rules };
            if (!v) {
              const { 'font-size': _, ...rest } = currentBq;
              updatedRules.blockquote = { ...rest, 'font-size': 'inherit' };
            } else {
              updatedRules.blockquote = { ...currentBq, 'font-size': v };
            }
            triggerUpdate({ ...currentProfile, rules: updatedRules }, 'blockquote', '인용구 글자 크기');
          }}
        />

        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
          <span className="text-zinc-650 dark:text-zinc-350 font-semibold text-xs">인용구 글자 굵기</span>
          <select
            value={isFontWeightBold(getTagRules('blockquote')['font-weight']) ? 'bold' : 'normal'}
            disabled={isSystemProfile}
            onChange={(e) => updateCssRule('blockquote', 'font-weight', e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
          >
            <option value="normal">보통 (Regular)</option>
            <option value="bold">굵게 (Bold)</option>
          </select>
        </div>
      </SectionCard>
    </div>
  );
}
