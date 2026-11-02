// ====================================================================
// 📊 [OMD-STYLE-DETAIL-VIDEO-0001] DetailVideoPanel.tsx
// 🎯 @KICK  : 동영상 객체(Video) 규격, 여백, 정렬 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [동영상 설명(캡션) 위치 및 6종 표현 구문 제어 신설]:
//             1) MediaCaptionControl을 연동하여 동영상 설명(캡션) 상/하단 및 6종 포맷(표준/대괄호/화살괄호/일반/제목만/커스텀) 독립 제어 탑재
// 🚨 @PATCH : **2026-10-26** — [동영상 전용 컴포넌트 분리 신설]:
//             미디어 패널에서 분리하여 동영상 너비, 높이, 상하 여백, 좌/중/우 정렬 독립 제어
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, MediaCaptionControl, getNumValue } from './DetailWidgets';

interface DetailVideoPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailVideoPanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailVideoPanelProps) {
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
      newRules['width'] = getTagRules(tag)['width'] || '560px';
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
    triggerUpdate(updated, tag, `동영상 정렬 (${alignLabel})`);
  };

  const videoRules = getTagRules('video');

  const updateVideoCaption = (key: string, value: string) => {
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
        kindOverrides: {
          ...(base.kindOverrides || {}),
          video: {
            ...((base.kindOverrides && base.kindOverrides.video) || {}),
            [key]: value,
          },
        },
      },
    };
    triggerUpdate(updated, 'video', `동영상 설명(캡션) ${key === 'position' ? '위치' : '표현 구문'} 변경`);
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="🎥 동영상 객체 (Video)"
        description="임베드된 동영상 플레이어의 가로/세로 규격, 상하 여백 및 정렬을 설정합니다."
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <SliderWidget
              label="동영상 가로 너비"
              min={100}
              max={800}
              value={getNumValue(videoRules['width'], 560)}
              unit="px"
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('video', 'width', v + 'px')}
            />
            <SliderWidget
              label="동영상 세로 높이"
              min={100}
              max={600}
              value={getNumValue(videoRules['height'], 315)}
              unit="px"
              disabled={isSystemProfile}
              onChange={(v) => updateCssRule('video', 'height', v + 'px')}
            />
          </div>

          <SliderWidget
            label="동영상 상하 바깥 여백"
            min={0}
            max={80}
            value={getNumValue(videoRules['margin-top'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              if (!isSystemProfile) {
                const cur = currentProfile.rules.video || {};
                const updated = {
                  ...currentProfile,
                  rules: {
                    ...currentProfile.rules,
                    video: {
                      ...cur,
                      'margin-top': px,
                      'margin-bottom': px,
                      display: 'block',
                      'margin-left': cur['margin-left'] || 'auto',
                      'margin-right': cur['margin-right'] || 'auto',
                    },
                  },
                };
                triggerUpdate(updated, 'video', `동영상 상하 바깥 여백 (${v}px)`);
              }
            }}
          />

          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">동영상 정렬 방식</span>
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
      </SectionCard>

      {/* 2. 동영상 설명(캡션) 위치 및 표현 구문 */}
      <MediaCaptionControl
        kind="video"
        kindLabel="동영상"
        mediaCaptionStructure={currentProfile.mediaCaptionStructure}
        disabled={isSystemProfile}
        onChange={updateVideoCaption}
      />
    </div>
  );
}
