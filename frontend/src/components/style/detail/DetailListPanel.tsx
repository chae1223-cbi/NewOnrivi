// ====================================================================
// 📊 [OMD-STYLE-DETAIL-LISTS-0001] DetailListPanel.tsx
// 🎯 @KICK  : 글머리 기호(ul), 숫자 목록(ol), 들여쓰기, 태스크 체크박스 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [원문자(①, ②, ③) 숫자 목록 및 레벨별(1~3단계) 글머리 불릿 구성기 신설]:
//             1) 숫자 목록(ol)에 ①, ②, ③ (원문자 목록: onrivi-circled-decimal) 옵션 추가 및 실시간 프리뷰 연동
//             2) 글머리 불릿(ul)을 1단계(기본), 2단계(하위), 3단계(세부) 계층별로 독립 지정할 수 있는 레벨별 서식 구성기 위젯 탑재
//             3) 5대 프리셋(기본형, 다이아몬드, 대시형, 화살표, 체크형) 원클릭 적용 및 커스텀 기호 직접 입력 지원
// 🚨 @PATCH : **2026-10-26** — [목록 및 태스크 체크박스 세부 조판 전용 컴포넌트 분리 신설]:
//             글머리/숫자 마커, 목록 간격/들여쓰기, 보고서 체계 안내, 태스크 체크박스 스타일 위젯 통합 격리
// ====================================================================

import React from 'react';
import type { CssProfile } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, getNumValue } from './DetailWidgets';
import { getBulletSymbolValue } from '@/lib/reportNumbering';

interface DetailListPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

const BULLET_PRESETS = [
  { label: '기본형 (• → ○ → ■)', level1: 'disc', level2: 'circle', level3: 'square' },
  { label: '다이아몬드 (◆ → ◇ → ·)', level1: 'diamond', level2: 'white-diamond', level3: 'dot' },
  { label: '대시형 (- → – → ·)', level1: 'dash', level2: 'hyphen', level3: 'dot' },
  { label: '화살표 (▶ → • → -)', level1: 'arrow', level2: 'disc', level3: 'dash' },
  { label: '체크형 (✓ → ★ → •)', level1: 'check', level2: 'star', level3: 'disc' },
];

export default function DetailListPanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  updateCssRule,
}: DetailListPanelProps) {
  const checkboxStructure = {
    checkedEffect: currentProfile.checkboxStructure?.checkedEffect || 'none',
    boxSize: currentProfile.checkboxStructure?.boxSize || '16px',
    textGap: currentProfile.checkboxStructure?.textGap || '10px',
    color: currentProfile.checkboxStructure?.color || '#2f2f2f',
  };

  const updateCheckboxStructure = (key: string, value: string) => {
    if (isSystemProfile) return;
    const updated = {
      ...currentProfile,
      checkboxStructure: {
        ...checkboxStructure,
        [key]: value,
      },
    };
    triggerUpdate(updated, 'taskList', `태스크 체크박스 (${key})`);
  };

  const bulletStructure = {
    level1: currentProfile.bulletStructure?.level1 || currentProfile.rules.ul?.['list-style-type'] || 'disc',
    level2: currentProfile.bulletStructure?.level2 || 'circle',
    level3: currentProfile.bulletStructure?.level3 || 'square',
    custom1: currentProfile.bulletStructure?.custom1 || '',
    custom2: currentProfile.bulletStructure?.custom2 || '',
    custom3: currentProfile.bulletStructure?.custom3 || '',
  };

  const updateBulletStructure = (patch: Partial<typeof bulletStructure>) => {
    if (isSystemProfile) return;
    const updatedBs = {
      ...bulletStructure,
      ...patch,
    };
    const updated = {
      ...currentProfile,
      bulletStructure: updatedBs,
      rules: {
        ...currentProfile.rules,
        ul: {
          ...(currentProfile.rules.ul || {}),
          'list-style-type': updatedBs.level1,
        },
      },
    };
    triggerUpdate(updated, 'ul', '글머리 불릿 레벨별 서식');
  };

  const ulRules = currentProfile.rules.ul || {};
  const olRules = currentProfile.rules.ol || {};
  const liRules = currentProfile.rules.li || {};
  const taskListRules = currentProfile.rules.taskList || {};

  const getPreviewChar = (level: 1 | 2 | 3) => {
    const type = level === 1 ? bulletStructure.level1 : level === 2 ? bulletStructure.level2 : bulletStructure.level3;
    const custom = level === 1 ? bulletStructure.custom1 : level === 2 ? bulletStructure.custom2 : bulletStructure.custom3;
    const sym = getBulletSymbolValue(type, custom).text.trim();
    return sym || '(숨김)';
  };

  return (
    <div className="space-y-4">
      {/* 1. 순서 있는 숫자 목록 (Ordered List) */}
      <SectionCard
        title="순서 있는 숫자 목록 (Ordered List)"
        description="아라비아 숫자, 원문자(①, ②, ③), 한국형 보고서 번호 체계 및 색상을 설정합니다."
      >
        <div className="space-y-3">
          {/* 숫자 마커 종류 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">숫자 목록 마커</span>
            <select
              value={olRules['list-style-type'] || 'decimal'}
              disabled={isSystemProfile}
              onChange={(e) => updateCssRule('ol', 'list-style-type', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="decimal">1, 2, 3 (아라비아 숫자)</option>
              <option value="onrivi-circled-decimal">①, ②, ③ (원문자 목록)</option>
              <option value="onrivi-report">보고서: Ⅰ. → 1. → 가. → 1) → 가)</option>
              <option value="decimal-leading-zero">01, 02, 03 (두 자리 수)</option>
              <option value="lower-roman">i, ii, iii (소문자 로마자)</option>
              <option value="upper-roman">I, II, III (대문자 로마자)</option>
              <option value="none">없음 (숫자 숨김)</option>
            </select>
          </div>

          {olRules['list-style-type'] === 'onrivi-circled-decimal' && (
            <p className="text-xs text-zinc-500 bg-blue-50/60 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50 leading-relaxed">
              💡 <strong>원문자 숫자 목록 체계</strong>: 항목 번호를 ①, ②, ③... ㊿ 형태로 깔끔하게 표시합니다. 본문 화면 및 PDF, 인쇄, DOCX/HWPX 내보내기 시에도 100% 동일하게 유지됩니다.
            </p>
          )}

          {olRules['list-style-type'] === 'onrivi-report' && (
            <p className="text-xs text-zinc-500 bg-blue-50/60 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50 leading-relaxed">
              💡 <strong>한국형 보고서 번호 체계</strong>: 단계별로 Ⅰ. → 1. → 가. → 1) → 가)를 표시합니다. Enter로 다음 항목, Tab·Shift+Tab으로 단계를 변경할 수 있습니다.
            </p>
          )}

          {/* 숫자 마커 색상 */}
          <ColorPickerWidget
            label="숫자 마커 색상"
            value={olRules['color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('ol', 'color', v)}
          />
        </div>
      </SectionCard>

      {/* 2. 글머리 기호(불릿) 레벨별 계층 서식 구성기 */}
      <SectionCard
        title="글머리 기호(불릿) 레벨별 서식 구성기"
        description="들여쓰기 단계(1단계 기본, 2단계 하위, 3단계 세부)별 불릿 기호를 독립적으로 설정합니다."
      >
        <div className="space-y-3">
          {/* 추천 프리셋 버튼군 */}
          <div>
            <span className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
              ⚡ 추천 계층 프리셋
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BULLET_PRESETS.map((preset) => {
                const isActive =
                  bulletStructure.level1 === preset.level1 &&
                  bulletStructure.level2 === preset.level2 &&
                  bulletStructure.level3 === preset.level3;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isSystemProfile}
                    onClick={() =>
                      updateBulletStructure({
                        level1: preset.level1,
                        level2: preset.level2,
                        level3: preset.level3,
                      })
                    }
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3단계 레벨별 기호 선택 */}
          <div className="space-y-2 pt-1">
            {/* 1단계 (기본 목록) */}
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-150 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    1단계
                  </span>
                  기본 목록 (최상위)
                </span>
                <select
                  value={bulletStructure.level1}
                  disabled={isSystemProfile}
                  onChange={(e) => updateBulletStructure({ level1: e.target.value })}
                  className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
                >
                  <option value="disc">채워진 원 (•)</option>
                  <option value="circle">비어있는 원 (○)</option>
                  <option value="square">정사각형 (■)</option>
                  <option value="diamond">채워진 다이아몬드 (◆)</option>
                  <option value="white-diamond">비어있는 다이아몬드 (◇)</option>
                  <option value="dash">하이픈 대시 (-)</option>
                  <option value="hyphen">엔대시 (–)</option>
                  <option value="arrow">화살표 (▶)</option>
                  <option value="check">체크 (✓)</option>
                  <option value="star">별표 (★)</option>
                  <option value="dot">가운뎃점 (·)</option>
                  <option value="custom">✏️ 직접 입력...</option>
                  <option value="none">없음 (기호 숨김)</option>
                </select>
              </div>
              {bulletStructure.level1 === 'custom' && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-500 font-medium">직접 입력 기호:</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={bulletStructure.custom1}
                    placeholder="예: 👉, ✦, ※"
                    disabled={isSystemProfile}
                    onChange={(e) => updateBulletStructure({ custom1: e.target.value })}
                    className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              )}
            </div>

            {/* 2단계 (1차 하위 목록 Tab) */}
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-150 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                    2단계
                  </span>
                  1차 하위 목록 (Tab)
                </span>
                <select
                  value={bulletStructure.level2}
                  disabled={isSystemProfile}
                  onChange={(e) => updateBulletStructure({ level2: e.target.value })}
                  className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
                >
                  <option value="circle">비어있는 원 (○)</option>
                  <option value="disc">채워진 원 (•)</option>
                  <option value="white-square">작은 정사각형 (▫)</option>
                  <option value="square">정사각형 (■)</option>
                  <option value="white-diamond">비어있는 다이아몬드 (◇)</option>
                  <option value="diamond">채워진 다이아몬드 (◆)</option>
                  <option value="dash">하이픈 대시 (-)</option>
                  <option value="hyphen">엔대시 (–)</option>
                  <option value="arrow">화살표 (▶)</option>
                  <option value="dot">가운뎃점 (·)</option>
                  <option value="star">별표 (★)</option>
                  <option value="custom">✏️ 직접 입력...</option>
                  <option value="none">없음 (기호 숨김)</option>
                </select>
              </div>
              {bulletStructure.level2 === 'custom' && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-500 font-medium">직접 입력 기호:</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={bulletStructure.custom2}
                    placeholder="예: ▫, -, ㆍ"
                    disabled={isSystemProfile}
                    onChange={(e) => updateBulletStructure({ custom2: e.target.value })}
                    className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              )}
            </div>

            {/* 3단계 (2차 하위 목록 Tab+Tab) */}
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-150 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                    3단계
                  </span>
                  2차 하위 목록 (Tab+Tab)
                </span>
                <select
                  value={bulletStructure.level3}
                  disabled={isSystemProfile}
                  onChange={(e) => updateBulletStructure({ level3: e.target.value })}
                  className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
                >
                  <option value="square">정사각형 (■)</option>
                  <option value="white-square">작은 정사각형 (▫)</option>
                  <option value="circle">비어있는 원 (○)</option>
                  <option value="disc">채워진 원 (•)</option>
                  <option value="dot">가운뎃점 (·)</option>
                  <option value="dash">하이픈 대시 (-)</option>
                  <option value="hyphen">엔대시 (–)</option>
                  <option value="star">별표 (★)</option>
                  <option value="custom">✏️ 직접 입력...</option>
                  <option value="none">없음 (기호 숨김)</option>
                </select>
              </div>
              {bulletStructure.level3 === 'custom' && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] text-zinc-500 font-medium">직접 입력 기호:</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={bulletStructure.custom3}
                    placeholder="예: ㆍ, *, -"
                    disabled={isSystemProfile}
                    onChange={(e) => updateBulletStructure({ custom3: e.target.value })}
                    className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 계층 흐름 요약 배너 */}
          <div className="flex items-center justify-between p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-[11px]">계층 흐름 요약:</span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
              {getPreviewChar(1)} &nbsp;➔&nbsp; {getPreviewChar(2)} &nbsp;➔&nbsp; {getPreviewChar(3)}
            </span>
          </div>

          {/* 글머리 마커 색상 */}
          <ColorPickerWidget
            label="글머리 마커 색상"
            value={ulRules['color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('ul', 'color', v)}
          />
        </div>
      </SectionCard>

      {/* 3. 목록 간격 및 들여쓰기 */}
      <SectionCard
        title="목록 간격 및 들여쓰기 너비"
        description="목록 항목 간 상하 간격과 전체 들여쓰기 너비를 미세 조정합니다."
      >
        <div className="space-y-3">
          {/* 목록 줄 간격 슬라이더 */}
          <SliderWidget
            label="목록 항목 간 줄 여백"
            min={0}
            max={32}
            value={getNumValue(liRules['margin-bottom'], 6)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('li', 'margin-bottom', v + 'px')}
          />

          {/* 목록 전체 들여쓰기 슬라이더 */}
          <SliderWidget
            label="목록 기본 들여쓰기 너비"
            min={0}
            max={60}
            value={getNumValue(ulRules['padding-left'], 28)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const pxVal = v + 'px';
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  ul: { ...(currentProfile.rules.ul || {}), 'padding-left': pxVal },
                  ol: { ...(currentProfile.rules.ol || {}), 'padding-left': pxVal },
                },
              };
              triggerUpdate(updated, 'ul', '목록 기본 들여쓰기 너비');
            }}
          />

          {/* 마커-글자 간격 슬라이더 */}
          <SliderWidget
            label="기호 마커와 글자 사이 간격"
            min={0}
            max={32}
            value={getNumValue(liRules['padding-inline-start'], 8)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('li', 'padding-inline-start', v + 'px')}
          />
        </div>
      </SectionCard>

      {/* 4. 태스크 리스트 체크박스 */}
      <SectionCard
        title="태스크 리스트 체크박스"
        description="완료 항목의 시각 효과, 체크박스 크기 및 간격을 설정합니다."
      >
        <div className="space-y-3">
          {/* 완료 항목 효과 */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">완료 항목 스타일</span>
            <select
              value={checkboxStructure.checkedEffect || 'none'}
              disabled={isSystemProfile}
              onChange={(e) => updateCheckboxStructure('checkedEffect', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="none">기본 (효과 없음)</option>
              <option value="line-through-and-dim">취소선 + 반투명 흐리게</option>
              <option value="dim-only">반투명 흐리게만 적용</option>
            </select>
          </div>

          {/* 체크박스 색상 */}
          <ColorPickerWidget
            label="체크박스 색상"
            value={checkboxStructure.color || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCheckboxStructure('color', v)}
          />

          {/* 체크리스트 글자 색상 */}
          <ColorPickerWidget
            label="체크리스트 글자 색상"
            value={taskListRules['color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('taskList', 'color', v)}
          />

          {/* 박스 크기 슬라이더 */}
          <SliderWidget
            label="체크박스 물리 크기"
            min={8}
            max={32}
            value={getNumValue(checkboxStructure.boxSize, 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCheckboxStructure('boxSize', v + 'px')}
          />

          {/* 체크박스-글자 간격 슬라이더 */}
          <SliderWidget
            label="체크박스와 텍스트 사이 간격"
            min={0}
            max={32}
            value={getNumValue(checkboxStructure.textGap, 10)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateCheckboxStructure('textGap', v + 'px')}
          />
        </div>
      </SectionCard>
    </div>
  );
}
