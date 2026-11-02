// ====================================================================
// 📊 [OMD-STYLE-DETAIL-TABLE-0001] DetailTablePanel.tsx
// 🎯 @KICK  : 표(Table) 테두리 규격, 행/열 두께, 배경색, 여백 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [표 형태 프리셋 전환 및 글자 크기 pt 단위 표준화]:
//             1) 미니멀(선 없음) 이후 모든 테두리(Grid) / 가로선 강조 클릭 시 'none' || 'solid' 논리 결함으로
//                border-style: none이 유지되어 쇼케이스 및 미리보기에 테두리가 나타나지 않던 버그 수정
//             2) 선 모양 '없음' 상태에서 두께 슬라이더 조절 또는 유효 선 모양 선택 시 border-style을 solid로 복구
//             3) border-style === 'none'일 때 Grid 버튼이 활성 표시되던 프리셋 판별 조건 동기화
//             4) 표 활자 크기 제어기를 pt 단위(7pt~20pt, 0.5pt 단계)로 일원화
// ====================================================================

import React from 'react';
import type { CssProfile, CssRuleSet } from '@/types/cssProfile';
import { SectionCard, SliderWidget, ColorPickerWidget, FontSizeControl, getNumValue } from './DetailWidgets';

interface DetailTablePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  baseFontSize: string;
  onUpdateProfile: (profile: CssProfile) => void;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailTablePanel({
  currentProfile,
  isSystemProfile,
  baseFontSize,
  triggerUpdate,
  updateCssRule,
}: DetailTablePanelProps) {
  const getTagRules = (tag: string): CssRuleSet => {
    const tagKey = tag as keyof CssProfile['rules'];
    return currentProfile?.rules?.[tagKey] || {};
  };

  const tableStructure = currentProfile.tableStructure || {
    outerBorderWidth: (currentProfile.rules.table && currentProfile.rules.table['border-width']) || '1px',
    rowBorderWidth: (currentProfile.rules.th && currentProfile.rules.th['border-width']) || '1px',
    colBorderWidth: (currentProfile.rules.td && currentProfile.rules.td['border-width']) || '1px',
  };

  const updateTableStructure = (
    key: 'outerBorderWidth' | 'rowBorderWidth' | 'colBorderWidth',
    value: string
  ) => {
    if (isSystemProfile) return;
    const nextTableStructure = { ...tableStructure, [key]: value };
    const tableRules = { ...(currentProfile.rules.table || {}) };
    const thRules = { ...(currentProfile.rules.th || {}) };
    const tdRules = { ...(currentProfile.rules.td || {}) };

    const valNum = parseInt(value, 10) || 0;
    if (valNum > 0 && tableRules['border-style'] === 'none') {
      tableRules['border-style'] = 'solid';
      thRules['border-style'] = 'solid';
      tdRules['border-style'] = 'solid';
    }

    if (key === 'outerBorderWidth') {
      tableRules['border-width'] = value;
      delete (tableRules as any)['border'];
    }
    if (key === 'colBorderWidth') {
      delete (thRules as any)['border-left'];
      delete (thRules as any)['border-right'];
      delete (tdRules as any)['border-left'];
      delete (tdRules as any)['border-right'];
    }
    if (key === 'rowBorderWidth') {
      delete (thRules as any)['border-top'];
      delete (thRules as any)['border-bottom'];
      delete (tdRules as any)['border-top'];
      delete (tdRules as any)['border-bottom'];
    }

    const updated = {
      ...currentProfile,
      tableStructure: nextTableStructure,
      rules: {
        ...currentProfile.rules,
        table: tableRules,
        th: thRules,
        td: tdRules,
      },
    };
    triggerUpdate(updated, 'table', '표(Table) 테두리 두께');
  };

  const updateTableBorder = (property: string, value: string) => {
    if (isSystemProfile) return;
    const tableRules = { ...getTagRules('table') };
    const thRules = { ...getTagRules('th') };
    const tdRules = { ...getTagRules('td') };
    let nextTableStructure = currentProfile.tableStructure
      ? { ...currentProfile.tableStructure }
      : {
          outerBorderWidth: (tableRules['border-width'] as string) || '1px',
          rowBorderWidth: (thRules['border-width'] as string) || '1px',
          colBorderWidth: (tdRules['border-width'] as string) || '1px',
        };

    if (property === 'border-style') {
      const shorthandKeys = ['border', 'border-top', 'border-bottom', 'border-left', 'border-right'];
      shorthandKeys.forEach(k => {
        delete (tableRules as any)[k];
        delete (thRules as any)[k];
        delete (tdRules as any)[k];
      });

      if (value === 'double') {
        const curWidth = parseInt(tableRules['border-width'] || '1', 10);
        if (curWidth < 3) {
          tableRules['border-width'] = '3px';
          thRules['border-width'] = '3px';
          tdRules['border-width'] = '3px';
          nextTableStructure.outerBorderWidth = '3px';
        }
      }

      tableRules['border-style'] = value;
      thRules['border-style'] = value;
      tdRules['border-style'] = value;

      if (value !== 'none') {
        const curOuter = parseInt(nextTableStructure.outerBorderWidth || '0', 10);
        const curRow = parseInt(nextTableStructure.rowBorderWidth || '0', 10);
        if (curOuter === 0 && curRow === 0) {
          nextTableStructure.outerBorderWidth = '1px';
          nextTableStructure.rowBorderWidth = '1px';
        }
        if (parseInt(tableRules['border-width'] || '0', 10) === 0) {
          tableRules['border-width'] = '1px';
          thRules['border-width'] = '1px';
          tdRules['border-width'] = '1px';
        }
      } else {
        nextTableStructure.outerBorderWidth = '0px';
        nextTableStructure.rowBorderWidth = '0px';
        nextTableStructure.colBorderWidth = '0px';
        tableRules['border-width'] = '0px';
        thRules['border-width'] = '0px';
        tdRules['border-width'] = '0px';
      }
    } else if (property === 'border-width') {
      tableRules['border-width'] = value;
      thRules['border-width'] = value;
      tdRules['border-width'] = value;
      delete (tableRules as any)['border'];
      delete (thRules as any)['border'];
      delete (tdRules as any)['border'];
      nextTableStructure.outerBorderWidth = value;
      nextTableStructure.rowBorderWidth = value;
      nextTableStructure.colBorderWidth = value;
      if (parseInt(value, 10) > 0 && tableRules['border-style'] === 'none') {
        tableRules['border-style'] = 'solid';
        thRules['border-style'] = 'solid';
        tdRules['border-style'] = 'solid';
      }
    } else if (property === 'border-color') {
      tableRules['border-color'] = value;
      thRules['border-color'] = value;
      tdRules['border-color'] = value;
      delete (tableRules as any)['border'];
      delete (thRules as any)['border'];
      delete (tdRules as any)['border'];
    }

    const updated = {
      ...currentProfile,
      tableStructure: nextTableStructure,
      rules: {
        ...currentProfile.rules,
        table: tableRules,
        th: thRules,
        td: tdRules,
      }
    };
    triggerUpdate(updated, 'table', '표(Table) 테두리');
  };

  const updateCellPadding = (value: string) => {
    if (isSystemProfile) return;
    const thRules = getTagRules('th');
    const tdRules = getTagRules('td');
    const updated = {
      ...currentProfile,
      rules: {
        ...currentProfile.rules,
        th: { ...thRules, padding: value },
        td: { ...tdRules, padding: value },
      }
    };
    triggerUpdate(updated, 'table', '표(Table) 셀 여백');
  };

  const updateTableFontSize = (value: string) => {
    if (isSystemProfile) return;
    const tableRules = getTagRules('table');
    const thRules = getTagRules('th');
    const tdRules = getTagRules('td');
    const updatedRules = { ...currentProfile.rules };
    if (!value) {
      const { 'font-size': _, ...restTable } = tableRules;
      const { 'font-size': __, ...restTh } = thRules;
      const { 'font-size': ___, ...restTd } = tdRules;
      updatedRules.table = { ...restTable, 'font-size': 'inherit' };
      updatedRules.th = { ...restTh, 'font-size': 'inherit' };
      updatedRules.td = { ...restTd, 'font-size': 'inherit' };
    } else {
      updatedRules.table = { ...tableRules, 'font-size': value };
      updatedRules.th = { ...thRules, 'font-size': value };
      updatedRules.td = { ...tdRules, 'font-size': value };
    }
    const updated = {
      ...currentProfile,
      rules: updatedRules
    };
    triggerUpdate(updated, 'table', '표(Table) 글자 크기');
  };

  // 프리셋 활성 상태 판별
  const rawT = currentProfile.rules.table || {};
  const rawTh = currentProfile.rules.th || {};
  const rawTd = currentProfile.rules.td || {};
  const ts = currentProfile.tableStructure || {
    outerBorderWidth: rawT['border-width'] || (rawT['border'] ? '1px' : (rawT['border-top'] ? '1px' : '0px')),
    rowBorderWidth: rawTh['border-width'] || (rawTh['border-bottom'] ? '1px' : '1px'),
    colBorderWidth: rawTd['border-left'] === 'none' ? '0px' : (rawTd['border-left'] ? '1px' : (rawTd['border-width'] || '0px')),
  };
  const outerW = parseInt(ts.outerBorderWidth || '0', 10) || 0;
  const colW = parseInt(ts.colBorderWidth || '0', 10) || 0;
  const tStyle = rawT['border-style'] || 'solid';
  const isMinimal = (outerW === 0 && colW === 0) || tStyle === 'none';
  const isGrid = !isMinimal && colW > 0 && tStyle !== 'none';
  const isHorizontal = !isMinimal && colW === 0 && tStyle !== 'none';

  const activeClass = 'bg-blue-600 text-white font-bold shadow-xs';
  const inactiveClass = 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50';

  return (
    <div className="space-y-4">
      {/* 1. 표 형태 프리셋 및 너비 */}
      <SectionCard
        title="표 (Table) 형태 프리셋 및 레이아웃"
        description="모든 테두리 격자선, 가로선 중심 보고서형, 미니멀 형태 중 하나를 선택합니다."
      >
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              const newT = { ...(currentProfile.rules.table || {}) };
              const newTh = { ...(currentProfile.rules.th || {}) };
              const newTd = { ...(currentProfile.rules.td || {}) };
              const color = newT['border-color'] || '#cbd5e1';
              const bStyle = (!newT['border-style'] || newT['border-style'] === 'none') ? 'solid' : newT['border-style'];
              newT['border-style'] = bStyle; newT['border-width'] = '1px'; newT['border-color'] = color;
              newTh['border-style'] = bStyle; newTh['border-width'] = '1px'; newTh['border-color'] = color;
              newTd['border-style'] = bStyle; newTd['border-width'] = '1px'; newTd['border-color'] = color;
              delete newT['border']; delete newTh['border']; delete newTd['border'];
              delete newT['border-top']; delete newT['border-bottom']; delete newT['border-left']; delete newT['border-right'];
              delete newTh['border-bottom']; delete newTh['border-top']; delete newTh['border-left']; delete newTh['border-right'];
              delete newTd['border-bottom']; delete newTd['border-top']; delete newTd['border-left']; delete newTd['border-right'];
              const nextTableStructure = { outerBorderWidth: '1px', rowBorderWidth: '1px', colBorderWidth: '1px' };
              triggerUpdate({ ...currentProfile, tableStructure: nextTableStructure, rules: { ...currentProfile.rules, table: newT, th: newTh, td: newTd } }, 'table', '표 형태 (모든 테두리)');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isGrid ? activeClass : inactiveClass}`}
          >
            모든 테두리 (Grid)
          </button>

          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              const newT = { ...(currentProfile.rules.table || {}) };
              const newTh = { ...(currentProfile.rules.th || {}) };
              const newTd = { ...(currentProfile.rules.td || {}) };
              const color = newT['border-color'] || '#cbd5e1';
              const bStyle = (!newT['border-style'] || newT['border-style'] === 'none') ? 'solid' : newT['border-style'];
              newT['border-style'] = bStyle; newT['border-width'] = '2px'; newT['border-color'] = color;
              newTh['border-style'] = bStyle; newTh['border-width'] = '1px'; newTh['border-color'] = color;
              newTd['border-style'] = bStyle; newTd['border-width'] = '1px'; newTd['border-color'] = color;
              delete newT['border']; delete newTh['border']; delete newTd['border'];
              delete newT['border-top']; delete newT['border-bottom']; delete newT['border-left']; delete newT['border-right'];
              delete newTh['border-bottom']; delete newTh['border-top']; delete newTh['border-left']; delete newTh['border-right'];
              delete newTd['border-bottom']; delete newTd['border-top']; delete newTd['border-left']; delete newTd['border-right'];
              const nextTableStructure = { outerBorderWidth: '2px', rowBorderWidth: '1px', colBorderWidth: '0px' };
              triggerUpdate({ ...currentProfile, tableStructure: nextTableStructure, rules: { ...currentProfile.rules, table: newT, th: newTh, td: newTd } }, 'table', '표 형태 (가로선 강조)');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isHorizontal ? activeClass : inactiveClass}`}
          >
            가로선 강조 (보고서)
          </button>

          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              const newT = { ...(currentProfile.rules.table || {}) };
              const newTh = { ...(currentProfile.rules.th || {}) };
              const newTd = { ...(currentProfile.rules.td || {}) };
              newT['border'] = 'none'; newTh['border'] = 'none'; newTd['border'] = 'none';
              newT['border-style'] = 'none'; newT['border-width'] = '0px';
              newTh['border-style'] = 'none'; newTh['border-width'] = '0px';
              newTd['border-style'] = 'none'; newTd['border-width'] = '0px';
              newTh['background-color'] = newTh['background-color'] || '#f8fafc';
              delete newT['border-top']; delete newT['border-bottom']; delete newT['border-left']; delete newT['border-right'];
              delete newTh['border-bottom']; delete newTh['border-top']; delete newTh['border-left']; delete newTh['border-right'];
              delete newTd['border-bottom']; delete newTd['border-top']; delete newTd['border-left']; delete newTd['border-right'];
              const nextTableStructure = { outerBorderWidth: '0px', rowBorderWidth: '0px', colBorderWidth: '0px' };
              triggerUpdate({ ...currentProfile, tableStructure: nextTableStructure, rules: { ...currentProfile.rules, table: newT, th: newTh, td: newTd } }, 'table', '표 형태 (미니멀)');
            }}
            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${isMinimal ? activeClass : inactiveClass}`}
          >
            미니멀 (선 없음)
          </button>
        </div>

        {/* 표 전체 너비 & 테두리 모양 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
            <span className="text-zinc-650 dark:text-zinc-350 font-semibold text-xs">표 전체 너비</span>
            <select
              value={getTagRules('table')['width'] || '100%'}
              disabled={isSystemProfile}
              onChange={(e) => updateCssRule('table', 'width', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="100%">100% (최대)</option>
              <option value="auto">auto (맞춤)</option>
              <option value="50%">50% (반 너비)</option>
            </select>
          </div>

          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
            <span className="text-zinc-650 dark:text-zinc-350 font-semibold text-xs">선 모양</span>
            <select
              value={getTagRules('table')['border-style'] || 'solid'}
              disabled={isSystemProfile}
              onChange={(e) => updateTableBorder('border-style', e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
            >
              <option value="solid">실선</option>
              <option value="double">이중선</option>
              <option value="dotted">점선</option>
              <option value="dashed">대시선</option>
              <option value="none">없음</option>
            </select>
          </div>
        </div>

        {/* 외곽선, 행, 열 개별 두께 슬라이더 */}
        <div className="grid grid-cols-3 gap-2">
          <SliderWidget
            label="외곽 테두리"
            min={0}
            max={8}
            value={getNumValue(tableStructure.outerBorderWidth, 1)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateTableStructure('outerBorderWidth', v + 'px')}
          />
          <SliderWidget
            label="행(가로선)"
            min={0}
            max={8}
            value={getNumValue(tableStructure.rowBorderWidth, 1)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateTableStructure('rowBorderWidth', v + 'px')}
          />
          <SliderWidget
            label="열(세로선)"
            min={0}
            max={8}
            value={getNumValue(tableStructure.colBorderWidth, 1)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => updateTableStructure('colBorderWidth', v + 'px')}
          />
        </div>
      </SectionCard>

      {/* 2. 표 색상 및 여백 */}
      <SectionCard
        title="표 색상, 셀 여백 및 글자 크기"
        description="테두리 선 색상, 헤더/본문 배경색 및 셀 내부 여백을 조절합니다."
      >
        <ColorPickerWidget
          label="표 테두리 선 색상"
          value={getTagRules('table')['border-color'] || ''}
          disabled={isSystemProfile}
          onChange={(v) => updateTableBorder('border-color', v)}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <ColorPickerWidget
            label="헤더(TH) 배경색"
            value={getTagRules('th')['background-color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('th', 'background-color', v)}
          />
          <ColorPickerWidget
            label="본문(TD) 배경색"
            value={getTagRules('td')['background-color'] || ''}
            disabled={isSystemProfile}
            onChange={(v) => updateCssRule('td', 'background-color', v)}
          />
        </div>

        <SliderWidget
          label="셀 내부 여백 (Padding)"
          min={0}
          max={24}
          value={getNumValue(getTagRules('th')['padding'], 8)}
          unit="px"
          disabled={isSystemProfile}
          onChange={(v) => updateCellPadding(v + 'px')}
        />

        <FontSizeControl
          label="표 글자 크기"
          min={7}
          max={20}
          step={0.5}
          value={getTagRules('table')['font-size']}
          baseFontSize={baseFontSize}
          disabled={isSystemProfile}
          onChange={(v) => updateTableFontSize(v)}
        />

        {/* 상/하단 여백 */}
        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="표 위 여백"
            min={0}
            max={48}
            value={getNumValue(getTagRules('table')['margin-top'], 4)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const currentTagRules = currentProfile.rules['table'] || {};
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  table: { ...currentTagRules, 'margin-top': v + 'px' },
                },
              };
              triggerUpdate(updated, 'table', `표 상단 여백 (${v}px)`);
            }}
          />
          <SliderWidget
            label="표 아래 여백"
            min={0}
            max={48}
            value={getNumValue(getTagRules('table')['margin-bottom'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const currentTagRules = currentProfile.rules['table'] || {};
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  table: { ...currentTagRules, 'margin-bottom': v + 'px' },
                },
              };
              triggerUpdate(updated, 'table', `표 하단 여백 (${v}px)`);
            }}
          />
        </div>
      </SectionCard>
    </div>
  );
}
