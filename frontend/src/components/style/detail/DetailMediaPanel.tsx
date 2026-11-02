// ====================================================================
// 📊 [OMD-STYLE-DETAIL-MEDIA-0001] DetailMediaPanel.tsx
// 🎯 @KICK  : 이미지(img), 동영상(video), 지도(map), 수식(math) 및 캡션 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [미디어/수식 활자 크기 pt 단위 표준화]:
//             수식 활자 크기 듀얼 모드 제어기를 pt 단위(8pt~24pt, 0.5pt 단계)로 일원화
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, FontSizeControl, getNumValue } from './DetailWidgets';

interface DetailMediaPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  baseFontSize: string;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailMediaPanel({
  currentProfile,
  isSystemProfile,
  baseFontSize,
  triggerUpdate,
  updateCssRule,
}: DetailMediaPanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const getMediaAlign = (tag: string): string => {
    const rules = getTagRules(tag);
    const ml = rules['margin-left'];
    const mr = rules['margin-right'];
    if ((ml === '0px' || ml === '0') && mr === 'auto') return 'left';
    if (ml === 'auto' && (mr === '0px' || mr === '0')) return 'right';
    return 'center';
  };

  const updateMediaAlign = (tag: string, align: string) => {
    if (isSystemProfile) return;
    const tagKey = tag as keyof CssProfile['rules'];
    const baseRule = currentProfile.rules[tagKey] || {};
    let newRules: CssRuleSet = { ...baseRule, 'display': 'block', 'float': 'none' };
    delete newRules['margin'];

    if (!newRules['width']) {
      const fallbackW = tag === 'img' ? '480px' : tag === 'video' ? '560px' : '600px';
      newRules['width'] = getTagRules(tag)['width'] || fallbackW;
    }

    if (align === 'left') {
      newRules['margin-left'] = '0px';
      newRules['margin-right'] = 'auto';
    } else if (align === 'right') {
      newRules['margin-left'] = 'auto';
      newRules['margin-right'] = '0px';
    } else {
      newRules['margin-left'] = 'auto';
      newRules['margin-right'] = 'auto';
    }

    const updated = {
      ...currentProfile,
      rules: {
        ...currentProfile.rules,
        [tagKey]: newRules,
      },
    };
    const tagLabel = tag === 'img' ? '이미지' : tag === 'video' ? '동영상' : '지도';
    const alignLabel = align === 'left' ? '왼쪽' : align === 'right' ? '오른쪽' : '중앙';
    triggerUpdate(updated, tag, `${tagLabel} 정렬 (${alignLabel})`);
  };

  const mediaCaptionStructure = currentProfile.mediaCaptionStructure || {
    position: 'top',
    format: 'standard',
    customTemplate: '**{kind} {n}. {title}**',
  };

  const updateMediaCaption = (key: string, value: string) => {
    if (isSystemProfile) return;
    const updated = {
      ...currentProfile,
      mediaCaptionStructure: { ...mediaCaptionStructure, [key]: value },
    };
    triggerUpdate(updated, 'img', `미디어 설명(캡션) ${key === 'position' ? '위치' : '표현 구문'} 변경`);
  };

  // Image Shape Preset State Check
  const imgRules = currentProfile.rules.img || {};
  const hasImgBorderBottom = !!imgRules['border-bottom-width'] && imgRules['border-bottom-width'] !== 'none';
  const hasImgBoxShadow = !!imgRules['box-shadow'] && imgRules['box-shadow'] !== 'none';
  const isPolaroid = imgRules['border-bottom-width'] === '32px' || hasImgBorderBottom;
  const isThumbnail = !isPolaroid && hasImgBoxShadow;
  const isBasic = !isPolaroid && !isThumbnail;

  const activeBtnClass = 'bg-blue-600 text-white font-bold shadow-xs';
  const inactiveBtnClass = 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50';

  return (
    <div className="space-y-4">
      {/* 1. 이미지 객체 (IMG) */}
      <SectionCard
        title="🖼️ 이미지 객체 (IMG) 규격 및 모양"
        description="이미지 프레임 형태, 모서리 곡률, 그림자, 정렬 및 여백을 설정합니다."
      >
        <div className="space-y-3">
          {/* 형태 프리셋 */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={isSystemProfile}
              onClick={() => {
                const img = { ...(currentProfile.rules.img || {}) };
                delete img['border'];
                delete img['border-bottom-width'];
                delete img['box-shadow'];
                img['border-radius'] = '4px';
                img['padding'] = '0px';
                img['background-color'] = 'transparent';
                triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, img } }, 'img', '이미지 형태 (기본형)');
              }}
              className={`py-2 px-2 rounded-lg text-xs border transition-all cursor-pointer ${isBasic ? activeBtnClass : inactiveBtnClass}`}
            >
              기본형
            </button>
            <button
              type="button"
              disabled={isSystemProfile}
              onClick={() => {
                const img = { ...(currentProfile.rules.img || {}) };
                img['border'] = '10px solid white';
                img['border-bottom-width'] = '32px';
                img['box-shadow'] = '0 8px 16px rgba(0,0,0,0.15)';
                img['border-radius'] = '2px';
                img['background-color'] = 'white';
                triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, img } }, 'img', '이미지 형태 (폴라로이드형)');
              }}
              className={`py-2 px-2 rounded-lg text-xs border transition-all cursor-pointer ${isPolaroid ? activeBtnClass : inactiveBtnClass}`}
            >
              폴라로이드형
            </button>
            <button
              type="button"
              disabled={isSystemProfile}
              onClick={() => {
                const img = { ...(currentProfile.rules.img || {}) };
                delete img['border'];
                delete img['border-bottom-width'];
                img['box-shadow'] = '0 4px 12px rgba(0,0,0,0.1)';
                img['border-radius'] = '16px';
                img['padding'] = '0px';
                triggerUpdate({ ...currentProfile, rules: { ...currentProfile.rules, img } }, 'img', '이미지 형태 (둥근 썸네일형)');
              }}
              className={`py-2 px-2 rounded-lg text-xs border transition-all cursor-pointer ${isThumbnail ? activeBtnClass : inactiveBtnClass}`}
            >
              둥근 썸네일형
            </button>
          </div>

          {/* 모서리 곡률 */}
          <SliderWidget
            label="모서리 둥글기 (Border Radius)"
            min={0}
            max={60}
            value={getNumValue((currentProfile.rules.img || {})['border-radius'], 4)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('img', 'border-radius', v + 'px')}
          />

          {/* 그림자 강도 */}
          <SliderWidget
            label="그림자 강도 (Shadow Blur)"
            min={0}
            max={40}
            value={(() => {
              const shadow = (currentProfile.rules.img || {})['box-shadow'] || '';
              const match = shadow.match(/0 \d+px (\d+)px/);
              return match ? parseInt(match[1], 10) : 0;
            })()}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const numV = parseInt(v);
              const shadow = numV > 0 ? `0 ${Math.floor(numV / 2)}px ${numV}px rgba(0,0,0,0.15)` : 'none';
              updateCssRule('img', 'box-shadow', shadow);
            }}
          />

          {/* 가로/세로 */}
          <div className="grid grid-cols-2 gap-2.5">
            <SliderWidget
              label="이미지 가로 너비"
              min={50}
              max={800}
              value={getNumValue(getTagRules('img')['width'], 400)}
              unit="px"
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('img', 'width', v + 'px')}
            />
            <SliderWidget
              label="이미지 세로 높이"
              min={50}
              max={600}
              value={getNumValue(getTagRules('img')['height'], 300)}
              unit="px"
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('img', 'height', v + 'px')}
            />
          </div>

          {/* 이미지 상하 바깥 여백 */}
          <SliderWidget
            label="이미지 상하 바깥 여백"
            min={0}
            max={80}
            value={getNumValue(getTagRules('img')['margin-top'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              if (!isSystemProfile) {
                const cur = currentProfile.rules.img || {};
                const updated = {
                  ...currentProfile,
                  rules: {
                    ...currentProfile.rules,
                    img: {
                      ...cur,
                      'margin-top': px,
                      'margin-bottom': px,
                      'display': 'block',
                      'margin-left': cur['margin-left'] || 'auto',
                      'margin-right': cur['margin-right'] || 'auto',
                    },
                  },
                };
                triggerUpdate(updated, 'img', `이미지 상하 바깥 여백 (${v}px)`);
              }
            }}
          />

          {/* 이미지 정렬 방식 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">이미지 정렬 방식</span>
            <select
              value={getMediaAlign('img')}
              disabled={isSystemProfile}
              onChange={(e) => updateMediaAlign('img', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="center">중앙 정렬</option>
              <option value="left">왼쪽 정렬</option>
              <option value="right">오른쪽 정렬</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 2. 미디어 설명(캡션) 위치 및 표현 구문 */}
      <SectionCard
        title="🏷️ 미디어(이미지·지도·동영상) 설명(캡션) 규격"
        description="미디어 요소의 캡션 위치(상단/하단) 및 표기 번호 형식을 지정합니다."
      >
        <div className="space-y-3">
          {/* 위치 선택 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">설명(캡션) 기본 위치</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isSystemProfile}
                onClick={() => updateMediaCaption('position', 'top')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  (mediaCaptionStructure.position || 'top') === 'top'
                    ? 'bg-[#1d4ed8] text-white shadow-xs'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300'
                }`}
              >
                상단 (AI 친화 표준)
              </button>
              <button
                type="button"
                disabled={isSystemProfile}
                onClick={() => updateMediaCaption('position', 'bottom')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  mediaCaptionStructure.position === 'bottom'
                    ? 'bg-[#1d4ed8] text-white shadow-xs'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300'
                }`}
              >
                하단 (전통 출판)
              </button>
            </div>
          </div>

          {/* 표현 구문 포맷 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">표현 구문 포맷</span>
            <select
              value={mediaCaptionStructure.format || 'standard'}
              disabled={isSystemProfile}
              onChange={(e) => updateMediaCaption('format', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="standard">표준: **그림 1. 제목**</option>
              <option value="bracket">대괄호: **[그림 1] 제목**</option>
              <option value="angle">화살괄호: &lt;그림 1&gt; 제목</option>
              <option value="plain">일반: 그림 1. 제목</option>
              <option value="title-only">제목만: **제목**</option>
              <option value="custom">직접 정의 (커스텀 템플릿)</option>
            </select>
          </div>

          {mediaCaptionStructure.format === 'custom' && (
            <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800 space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                커스텀 표현 템플릿 ({'{kind}'}: 구분, {'{n}'}: 번호, {'{title}'}: 제목)
              </label>
              <input
                type="text"
                disabled={isSystemProfile}
                value={mediaCaptionStructure.customTemplate || '**{kind} {n}. {title}**'}
                onChange={(e) => updateMediaCaption('customTemplate', e.target.value)}
                placeholder="예: **{kind} {n}. {title}**"
                className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* 3. 동영상 및 지도 (Video & Map) */}
      <SectionCard
        title="🎥 동영상 및 지도 (Video & Map)"
        description="임베드된 동영상과 인터랙티브 지도의 크기 및 정렬을 설정합니다."
      >
        <div className="space-y-4">
          {/* 동영상 */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">동영상 (Video)</span>
            <div className="grid grid-cols-2 gap-2.5">
              <SliderWidget
                label="동영상 너비"
                min={100}
                max={800}
                value={getNumValue(getTagRules('video')['width'], 560)}
                unit="px"
                disabled={isSystemProfile}
                onChange={(v) => updateCssRule('video', 'width', v + 'px')}
              />
              <SliderWidget
                label="동영상 높이"
                min={100}
                max={600}
                value={getNumValue(getTagRules('video')['height'], 315)}
                unit="px"
                disabled={isSystemProfile}
                onChange={(v) => updateCssRule('video', 'height', v + 'px')}
              />
            </div>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800">
              <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">동영상 정렬</span>
              <select
                value={getMediaAlign('video')}
                disabled={isSystemProfile}
                onChange={(e) => updateMediaAlign('video', e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
              >
                <option value="center">중앙 정렬</option>
                <option value="left">왼쪽 정렬</option>
                <option value="right">오른쪽 정렬</option>
              </select>
            </div>
          </div>

          {/* 지도 */}
          <div className="space-y-2.5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">지도 (Map)</span>
            <div className="grid grid-cols-2 gap-2.5">
              <SliderWidget
                label="지도 너비"
                min={100}
                max={800}
                value={getNumValue(getTagRules('map')['width'], 600)}
                unit="px"
                disabled={isSystemProfile}
                onChange={(v) => updateCssRule('map', 'width', v + 'px')}
              />
              <SliderWidget
                label="지도 높이"
                min={100}
                max={600}
                value={getNumValue(getTagRules('map')['height'], 450)}
                unit="px"
                disabled={isSystemProfile}
                onChange={(v) => updateCssRule('map', 'height', v + 'px')}
              />
            </div>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800">
              <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">지도 정렬</span>
              <select
                value={getMediaAlign('map')}
                disabled={isSystemProfile}
                onChange={(e) => updateMediaAlign('map', e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
              >
                <option value="center">중앙 정렬</option>
                <option value="left">왼쪽 정렬</option>
                <option value="right">오른쪽 정렬</option>
              </select>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 4. KaTeX 수식 블록 (Math) */}
      <SectionCard
        title="📐 KaTeX 수식 블록 (Math)"
        description="독립 수식($$ ... $$)의 글자 색상, 폰트 크기 및 정렬을 설정합니다."
      >
        <div className="space-y-3">
          <ColorPickerWidget
            label="수식 글자 색상"
            value={getTagRules('math')['color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('math', 'color', v)}
          />

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

          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">수식 정렬 방식</span>
            <select
              value={getTagRules('math')['text-align'] || 'center'}
              disabled={isSystemProfile}
              onChange={(e) => updateCssRule('math', 'text-align', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="center">중앙 정렬</option>
              <option value="left">왼쪽 정렬</option>
              <option value="right">오른쪽 정렬</option>
            </select>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
