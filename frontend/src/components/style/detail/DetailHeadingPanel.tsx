// ====================================================================
// 📊 [OMD-STYLE-DETAIL-HEADING-0001] DetailHeadingPanel.tsx
// 🎯 @KICK  : 제목 위계(H1~H6) 정렬, 크기, 밑줄, 좌측 색깔바, 여백, 색상 세부 디자인 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-27** — [제목 단계별 크기 감소폭 쇼케이스 기준 초기값(3pt) 동기화 및 제목 앞 좌측 색깔바(border-left) 설정 항목 신설]:
//             1) pageStyle.headingSizeOffset이 레거시 초기값('0px')이거나 비어있을 때 쇼케이스(MainEditorApp)와 동일하게 3pt(4px)를 초기 슬라이더 값으로 반영(resolveHeadingOffsetPt)하고, 사용자가 슬라이더를 직접 0pt로 내린 경우('0pt')에만 0pt로 동작하도록 정합화
//             2) H1 대제목 및 H2~H6 하위 제목에 제목 앞 '좌측 색깔바(border-left: 바 없음 / 얇은 바 3px / 표준 바 4px / 굵은 바 6px)' 및 '좌측 색깔바 색상' 설정 항목 신설 (색깔바 활성화 시 왼쪽 들여쓰기 여백 12px 자동 보정, 바 없음 선택 시 0px 원복 연동)
// 🚨 @PATCH : **2026-10-26** — [제목 활자 크기 pt 단위 표준화]:
//             H1 기준 활자 크기 및 단계별 감소폭, 자동 계산 크기 단위를 pt로 전면 일원화
// ====================================================================

import React, { useState } from 'react';
import type { CssProfile } from '@/types/cssProfile';

type CssPageStyle = CssProfile['pageStyle'];
import {
  SectionCard, SliderWidget, ColorPickerWidget, getNumValue, parsePt,
  ALIGN_OPTIONS, STYLE_OPTIONS, BORDER_BOTTOM_OPTIONS,
  isAlignActive, isStyleOptionActive, isBorderMatch, isBorderNone
} from './DetailWidgets';

/** 제목 앞 좌측 색깔바(border-left) 프리셋 옵션 */
const BORDER_LEFT_OPTIONS = [
  { label: '바 없음', widthPx: 0, value: '' },
  { label: '얇은 바 (3px)', widthPx: 3, value: '3px solid' },
  { label: '표준 바 (4px)', widthPx: 4, value: '4px solid' },
  { label: '굵은 바 (6px)', widthPx: 6, value: '6px solid' },
] as const;

/**
 * 쇼케이스(MainEditorApp) 기준 제목 단계별 크기 감소폭(pt) 해석기
 * - 프로필 초기값이 '0px' 또는 빈 값인 경우 쇼케이스는 기본 감소폭 3pt(4px)로 렌더링하므로 슬라이더 초기값도 3pt로 일치시킨다.
 * - 사용자가 슬라이더를 직접 0으로 이동해 '0pt'가 저장된 경우에는 0pt를 그대로 유지한다.
 */
export const resolveHeadingOffsetPt = (rawOffset?: string | number): number => {
  if (rawOffset === undefined || rawOffset === null) return 3;
  const trimmed = String(rawOffset).trim();
  if (trimmed === '' || trimmed === '0px') return 3;
  if (trimmed === '0pt' || trimmed === '0') return 0;
  return parsePt(trimmed, 3);
};

/** border-left 문자열에서 두께(px) 매칭 판별 */
const isBorderLeftMatch = (currentVal: string | undefined, targetWidthPx: number): boolean => {
  if (targetWidthPx === 0) return isBorderNone(currentVal);
  if (isBorderNone(currentVal)) return false;
  const num = parseFloat(String(currentVal).trim());
  if (isNaN(num) || num <= 0) return false;
  if (targetWidthPx === 3) return num <= 3.5;
  if (targetWidthPx === 4) return num > 3.5 && num <= 5.2;
  if (targetWidthPx === 6) return num > 5.2;
  return Math.abs(num - targetWidthPx) < 0.6;
};

/** border-left 문자열에서 현재 색깔바 색상 추출 */
const extractBorderLeftColor = (
  currentVal: string | undefined,
  explicitLeftColor?: string,
  fallbackColor: string = '#1d4ed8'
): string => {
  if (explicitLeftColor && explicitLeftColor.trim() !== '') return explicitLeftColor.trim();
  if (!currentVal || isBorderNone(currentVal)) return fallbackColor;
  const colorMatch = currentVal.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
  return colorMatch ? colorMatch[1] : fallbackColor;
};

/** border-left 문자열에서 현재 색깔바 두께(px) 추출 */
const extractBorderLeftWidthPx = (currentVal: string | undefined, explicitWidth?: string): number => {
  if (explicitWidth) {
    const parsed = parseFloat(explicitWidth);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (!currentVal || isBorderNone(currentVal)) return 4;
  const parsed = parseFloat(currentVal.trim());
  return !isNaN(parsed) && parsed > 0 ? parsed : 4;
};

interface DetailHeadingPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  currentOutlineSummary: string;
  activeHeadingTab?: number;
  onSelectHeadingTab?: (level: number) => void;
  onUpdateProfile: (profile: CssProfile) => void;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  handlePageStyleChange: (propOrChanges: keyof CssPageStyle | Partial<CssPageStyle>, val?: any) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
  onSwitchToQuickMode: () => void;
}

export default function DetailHeadingPanel({
  currentProfile,
  isSystemProfile,
  currentOutlineSummary,
  activeHeadingTab: externalHeadingTab,
  onSelectHeadingTab,
  triggerUpdate,
  handlePageStyleChange,
  updateCssRule,
  onSwitchToQuickMode,
}: DetailHeadingPanelProps) {
  const [internalHeadingTab, setInternalHeadingTab] = useState(2);
  const activeLevel = externalHeadingTab || internalHeadingTab;

  const handleHeadingTabChange = (level: number) => {
    setInternalHeadingTab(level);
    onSelectHeadingTab?.(level);
  };

  const h1Rules = currentProfile.rules.h1 || {};

  /** 단일 태그 내 복수 CSS 규칙 원자적 갱신 */
  const updateHeadingRulesPatch = (tag: string, patch: Record<string, string | undefined>, label?: string) => {
    if (isSystemProfile) return;
    const tagKey = tag as keyof CssProfile['rules'];
    const nextTagRules: Record<string, string> = { ...(currentProfile.rules[tagKey] || {}) };
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined) {
        delete nextTagRules[k];
      } else {
        nextTagRules[k] = v;
      }
    });
    const updated: CssProfile = {
      ...currentProfile,
      rules: {
        ...currentProfile.rules,
        [tagKey]: nextTagRules,
      },
    };
    triggerUpdate(updated, tag, label || `${tag} 서식 변경`);
  };

  const handleBorderBottomClick = (tag: string, targetValue: string, currentVal: string | undefined, tagColor?: string) => {
    if (targetValue === '') {
      updateCssRule(tag, 'border-bottom', 'none');
      return;
    }
    const colorMatch = currentVal?.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
    const colorToUse = colorMatch ? colorMatch[1] : (tagColor || '#e5e5e5');
    updateCssRule(tag, 'border-bottom', `${targetValue} ${colorToUse}`.trim());
  };

  /** 제목 앞 좌측 색깔바(border-left) 두께/유무 선택 핸들러 */
  const handleBorderLeftClick = (
    tag: string,
    targetValue: string,
    tagRules: Record<string, string>
  ) => {
    const currentBorderLeft = tagRules['border-left'];
    const currentPaddingLeft = getNumValue(tagRules['padding-left'], 0);

    if (targetValue === '') {
      updateHeadingRulesPatch(
        tag,
        {
          'border-left': 'none',
          'border-left-width': undefined,
          'border-left-color': undefined,
          'padding-left': currentPaddingLeft <= 16 ? '0px' : tagRules['padding-left'],
        },
        `${tag} 좌측 색깔바 해제`
      );
      return;
    }

    const barColor = extractBorderLeftColor(
      currentBorderLeft,
      tagRules['border-left-color'],
      tagRules['color'] || '#1d4ed8'
    );
    updateHeadingRulesPatch(
      tag,
      {
        'border-left': `${targetValue} ${barColor}`.trim(),
        'border-left-width': undefined,
        'border-left-color': undefined,
        'padding-left': currentPaddingLeft === 0 ? '12px' : `${currentPaddingLeft}px`,
      },
      `${tag} 좌측 색깔바 설정`
    );
  };

  /** 제목 앞 좌측 색깔바 색상 변경 핸들러 */
  const handleBorderLeftColorChange = (
    tag: string,
    newColor: string,
    tagRules: Record<string, string>
  ) => {
    const widthPx = extractBorderLeftWidthPx(tagRules['border-left'], tagRules['border-left-width']);
    const currentPaddingLeft = getNumValue(tagRules['padding-left'], 0);
    updateHeadingRulesPatch(
      tag,
      {
        'border-left': `${widthPx}px solid ${newColor}`,
        'border-left-width': undefined,
        'border-left-color': undefined,
        'padding-left': currentPaddingLeft === 0 ? '12px' : `${currentPaddingLeft}px`,
      },
      `${tag} 좌측 색깔바 색상 변경`
    );
  };

  const h1HasLeftBar = !isBorderNone(h1Rules['border-left']);
  const h1LeftBarColor = extractBorderLeftColor(
    h1Rules['border-left'],
    h1Rules['border-left-color'],
    h1Rules['color'] || '#1d4ed8'
  );
  const currentOffsetPt = resolveHeadingOffsetPt(currentProfile.pageStyle.headingSizeOffset);

  return (
    <div className="space-y-4">
      {/* 💡 제목 번호 체계 간편 모드 위임 안내 배너 */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
            <span>⚡ 제목 개요 번호 체계 (1., Ⅰ., 가., 제1장 등)</span>
          </span>
          <button
            type="button"
            onClick={onSwitchToQuickMode}
            className="font-bold text-[#1d4ed8] dark:text-blue-400 hover:underline cursor-pointer"
          >
            ⚡ 간편 모드에서 변경 ➔
          </button>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
          제목 앞머리/뒷머리 번호 매김 및 사용자 정의 서식은 <span className="font-bold text-zinc-800 dark:text-zinc-200">[간편 스타일링]</span>에서 일괄 관리됩니다. 세부 서식 다듬기에서는 각 제목의 1px 단위 디자인(밑줄, 좌측 색깔바, 정렬, 글자크기, 여백)을 정밀 조정합니다.
        </p>
        <div className="pt-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
          <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            현재 개요: <strong>{currentOutlineSummary}</strong>
          </span>
        </div>
      </div>

      {/* 1. H1 마스터 설정 */}
      <SectionCard
        title="H1 대제목 마스터 설정"
        badge="최상위 제목"
        description="문서의 메인 타이틀(H1) 기준 서식 및 단계별 크기 감소 규칙을 정합니다."
      >
        {/* H1 정렬 */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">H1 글자 정렬</span>
          <div className="flex gap-1.5">
            {ALIGN_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                disabled={isSystemProfile}
                onClick={() => updateCssRule('h1', 'text-align', value)}
                className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                  isAlignActive(h1Rules['text-align'], value)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* H1 글자 크기 & 단계별 감소폭 (쇼케이스 기준 초기값 3pt 동기화) */}
        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="H1 기준 활자 크기"
            min={12}
            max={36}
            step={0.5}
            value={parsePt(h1Rules['font-size'], 21)}
            unit="pt"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('h1', 'font-size', v + 'pt')}
          />
          <SliderWidget
            label="단계별 크기 감소폭"
            min={0}
            max={6}
            step={0.5}
            value={currentOffsetPt}
            unit="pt"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('headingSizeOffset', v + 'pt')}
          />
        </div>

        {/* 서식 효과 버튼 */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">글자 효과</span>
          <div className="flex gap-1.5">
            {STYLE_OPTIONS.map(({ label, property, onVal, offVal }) => {
              const isActive = isStyleOptionActive(h1Rules, property, onVal);
              return (
                <button
                  key={property}
                  type="button"
                  disabled={isSystemProfile}
                  onClick={() => updateCssRule('h1', property, isActive ? offVal : onVal)}
                  className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* H1 하단 밑줄 테두리 */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">하단 밑줄</span>
          <div className="flex gap-1.5">
            {BORDER_BOTTOM_OPTIONS.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                disabled={isSystemProfile}
                onClick={() => handleBorderBottomClick('h1', value, h1Rules['border-bottom'], h1Rules['color'])}
                className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                  isBorderMatch(h1Rules['border-bottom'], value)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 🌟 H1 제목 앞 좌측 색깔바 (border-left) */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">제목 앞 좌측 색깔바</span>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {BORDER_LEFT_OPTIONS.map(({ label, widthPx, value }) => (
                <button
                  key={label}
                  type="button"
                  disabled={isSystemProfile}
                  onClick={() => handleBorderLeftClick('h1', value, h1Rules)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                    isBorderLeftMatch(h1Rules['border-left'], widthPx)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {h1HasLeftBar && (
            <ColorPickerWidget
              label="H1 좌측 색깔바 색상"
              value={h1LeftBarColor}
              disabled={isSystemProfile}
              onChange={(v) => handleBorderLeftColorChange('h1', v, h1Rules)}
            />
          )}
        </div>

        {/* 상/하/왼쪽 여백 & 자간 */}
        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="H1 위 여백"
            min={0}
            max={80}
            value={getNumValue(h1Rules['margin-top'], 24)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('h1', 'margin-top', v + 'px')}
          />
          <SliderWidget
            label="H1 아래 여백"
            min={0}
            max={80}
            value={getNumValue(h1Rules['margin-bottom'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('h1', 'margin-bottom', v + 'px')}
          />
        </div>

        <SliderWidget
          label="H1 왼쪽 들여쓰기 여백"
          min={0}
          max={60}
          value={getNumValue(h1Rules['padding-left'], 0)}
          unit="px"
          disabled={isSystemProfile}
          onChange={(v) => updateCssRule('h1', 'padding-left', v + 'px')}
        />

        <ColorPickerWidget
          label="H1 글자 색상"
          value={h1Rules['color'] || ''}
          disabled={isSystemProfile}
          onChange={(v) => updateCssRule('h1', 'color', v)}
        />
      </SectionCard>

      {/* 2. H2~H6 세부 위계 설정 */}
      <SectionCard
        title={`H${activeLevel} 하위 제목 개별 서식`}
        description="장, 절, 소제목 등 각 위계 레벨별로 크기, 밑줄, 좌측 색깔바, 여백을 독립 설정합니다."
      >
        {/* 위계 선택 탭 바 */}
        <div className="flex items-center justify-between p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 pl-2">세부 H 위계</span>
          <div className="flex gap-1">
            {[2, 3, 4, 5, 6].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleHeadingTabChange(level)}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                  activeLevel === level
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                H{level}
              </button>
            ))}
          </div>
        </div>

        {/* 활성 H 레벨 설정 */}
        {(() => {
          const tag = 'h' + activeLevel;
          const tagRules = currentProfile.rules[tag as keyof typeof currentProfile.rules] || {};
          const offset = currentOffsetPt;
          const h1Size = parsePt(h1Rules['font-size'], 21);
          const calculatedSize = Math.max(8, Math.round((h1Size - (activeLevel - 1) * offset) * 10) / 10);
          const tagHasLeftBar = !isBorderNone(tagRules['border-left']);
          const tagLeftBarColor = extractBorderLeftColor(
            tagRules['border-left'],
            tagRules['border-left-color'],
            tagRules['color'] || '#1d4ed8'
          );

          return (
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">자동 계산된 활자 크기</span>
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-bold">
                  {calculatedSize}pt
                </span>
              </div>

              {/* 서식 효과 */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">글자 효과</span>
                <div className="flex gap-1.5">
                  {STYLE_OPTIONS.map(({ label, property, onVal, offVal }) => {
                    const isActive = isStyleOptionActive(tagRules, property, onVal);
                    return (
                      <button
                        key={property}
                        type="button"
                        disabled={isSystemProfile}
                        onClick={() => updateCssRule(tag, property, isActive ? offVal : onVal)}
                        className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 하단 밑줄 */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">하단 밑줄</span>
                <div className="flex gap-1.5">
                  {BORDER_BOTTOM_OPTIONS.map(({ label, value }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={isSystemProfile}
                      onClick={() => handleBorderBottomClick(tag, value, tagRules['border-bottom'], tagRules['color'])}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        isBorderMatch(tagRules['border-bottom'], value)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🌟 H2~H6 제목 앞 좌측 색깔바 (border-left) */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350">제목 앞 좌측 색깔바</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {BORDER_LEFT_OPTIONS.map(({ label, widthPx, value }) => (
                      <button
                        key={label}
                        type="button"
                        disabled={isSystemProfile}
                        onClick={() => handleBorderLeftClick(tag, value, tagRules)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          isBorderLeftMatch(tagRules['border-left'], widthPx)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {tagHasLeftBar && (
                  <ColorPickerWidget
                    label={`H${activeLevel} 좌측 색깔바 색상`}
                    value={tagLeftBarColor}
                    disabled={isSystemProfile}
                    onChange={(v) => handleBorderLeftColorChange(tag, v, tagRules)}
                  />
                )}
              </div>

              {/* 여백 조절 */}
              <div className="grid grid-cols-2 gap-2.5">
                <SliderWidget
                  label="위 여백"
                  min={0}
                  max={80}
                  value={getNumValue(tagRules['margin-top'], 16)}
                  unit="px"
                  disabled={isSystemProfile}
                  onChange={(v) => updateCssRule(tag, 'margin-top', v + 'px')}
                />
                <SliderWidget
                  label="아래 여백"
                  min={0}
                  max={80}
                  value={getNumValue(tagRules['margin-bottom'], 8)}
                  unit="px"
                  disabled={isSystemProfile}
                  onChange={(v) => updateCssRule(tag, 'margin-bottom', v + 'px')}
                />
              </div>

              <SliderWidget
                label="왼쪽 들여쓰기 여백"
                min={0}
                max={60}
                value={getNumValue(tagRules['padding-left'], 0)}
                unit="px"
                disabled={isSystemProfile}
                onChange={(v) => updateCssRule(tag, 'padding-left', v + 'px')}
              />

              <ColorPickerWidget
                label={`H${activeLevel} 글자 색상`}
                value={tagRules['color'] || ''}
                disabled={isSystemProfile}
                onChange={(v) => updateCssRule(tag, 'color', v)}
              />
            </div>
          );
        })()}
      </SectionCard>
    </div>
  );
}
