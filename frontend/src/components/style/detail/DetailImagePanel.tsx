// ====================================================================
// 📊 [OMD-STYLE-DETAIL-IMAGE-0001] DetailImagePanel.tsx
// 🎯 @KICK  : 이미지(img) 규격, 정렬, 형태 프리셋 및 캡션 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [이미지 캡션 위치 및 표현 구문 반응성 보장]:
//             1) MediaCaptionControl 공용 위젯을 연동하여 이미지 설명(캡션) 상/하단 및 6종 포맷 변경을 kindOverrides.image에 원자적 반영
// 🚨 @PATCH : **2026-10-26** — [이미지 및 캡션 전용 컴포넌트 분리 신설]:
//             동영상/지도/수식과 분리하여 이미지 프레임 형태, 모서리, 그림자, 정렬, 캡션 위치·표현 구문 독립 제어
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, MediaCaptionControl, getNumValue } from './DetailWidgets';

interface DetailImagePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailImagePanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailImagePanelProps) {
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
    let newRules: CssRuleSet = { ...baseRule, display: 'block', float: 'none' };
    delete newRules['margin'];

    if (!newRules['width']) {
      newRules['width'] = getTagRules(tag)['width'] || '480px';
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
    const alignLabel = align === 'left' ? '왼쪽' : align === 'right' ? '오른쪽' : '중앙';
    triggerUpdate(updated, tag, `이미지 정렬 (${alignLabel})`);
  };

  const updateMediaCaption = (key: string, value: string) => {
    if (isSystemProfile) return;
    const base = currentProfile.mediaCaptionStructure || {
      position: 'top',
      format: 'standard',
      customTemplate: '**{kind} {n}. {title}**',
    };
    const updated = {
      ...currentProfile,
      mediaCaptionStructure: {
        ...base,
        [key]: value,
        kindOverrides: {
          ...(base.kindOverrides || {}),
          image: {
            ...((base.kindOverrides && base.kindOverrides.image) || {}),
            [key]: value,
          },
        },
      },
    };
    triggerUpdate(updated, 'img', `이미지 설명(캡션) ${key === 'position' ? '위치' : '표현 구문'} 변경`);
  };

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
      {/* 1. 이미지 객체 규격 및 프레임 형태 */}
      <SectionCard
        title="🖼️ 이미지 객체 (IMG) 규격 및 모양"
        description="이미지 프레임 형태 프리셋, 모서리 곡률, 그림자 강도, 정렬 및 여백을 설정합니다."
      >
        <div className="space-y-3.5">
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
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isBasic ? activeBtnClass : inactiveBtnClass}`}
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
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isPolaroid ? activeBtnClass : inactiveBtnClass}`}
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
              className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isThumbnail ? activeBtnClass : inactiveBtnClass}`}
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
                      display: 'block',
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
      <MediaCaptionControl
        kind="image"
        kindLabel="이미지"
        mediaCaptionStructure={currentProfile.mediaCaptionStructure}
        disabled={isSystemProfile}
        onChange={updateMediaCaption}
      />
    </div>
  );
}
