// ====================================================================
// 📊 [OMD-STYLE-DETAIL-RULES-0001] DetailRulesPanel.tsx
// 🎯 @KICK  : 전체 유효 CSS 태그 규칙 인스펙터 및 사용자 정의 CSS 에디터 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [전체 태그 규칙 및 커스텀 CSS 전용 컴포넌트 분리 신설]:
//             현재 프로필 적용 규칙 리스트 뷰어, 태그 룰 에디터, 추가 커스텀 CSS 편집기 통합 격리
// ====================================================================

import React from 'react';
import type { CssProfile } from '@/types/cssProfile';
import { SectionCard, TagRuleEditor } from './DetailWidgets';

interface DetailRulesPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  onUpdateProfile: (profile: CssProfile) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
  removeCssRule: (tag: string, prop: string) => void;
}

export default function DetailRulesPanel({
  currentProfile,
  isSystemProfile,
  onUpdateProfile,
  updateCssRule,
  removeCssRule,
}: DetailRulesPanelProps) {
  return (
    <div className="space-y-4">
      {/* 1. 현재 적용되는 전체 태그 규칙 */}
      <SectionCard
        title="🧩 쇼케이스에 적용되는 전체 태그 규칙"
        description="기본값을 포함해 현재 문서 쇼케이스에 적용되는 태그별 설정 목록입니다."
      >
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {Object.entries(currentProfile.rules).map(([tag, rule]) => {
            if (!rule) return null;
            const shownRules =
              /^h[1-6]$/.test(tag) && !rule['border-bottom']
                ? { ...rule, 'border-bottom': 'none' }
                : rule;
            return (
              <TagRuleEditor
                key={tag}
                tag={tag}
                label={tag.toUpperCase()}
                rules={shownRules}
                isSystemProfile={true}
                onUpdateRule={updateCssRule}
                onRemoveRule={removeCssRule}
              />
            );
          })}
        </div>
      </SectionCard>

      {/* 2. 추가 커스텀 CSS */}
      <SectionCard
        title={`추가 CSS ${currentProfile.customCss?.trim() ? '(적용 중)' : '(없음)'}`}
        description="가져오거나 AI로 만든 서식의 추가 규칙입니다. 속성이 겹칠 경우 위의 서식 컨트롤 값이 우선합니다."
      >
        <div className="space-y-2">
          <textarea
            id="profile-custom-css"
            value={currentProfile.customCss || ''}
            disabled={isSystemProfile}
            onChange={(event) =>
              onUpdateProfile({
                ...currentProfile,
                customCss: event.target.value,
              })
            }
            placeholder="/* 여기에 사용자 정의 CSS 규칙을 직접 작성할 수 있습니다 */"
            className="w-full min-h-36 p-3 font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 disabled:opacity-60 resize-y outline-none focus:border-blue-500"
          />
        </div>
      </SectionCard>
    </div>
  );
}
