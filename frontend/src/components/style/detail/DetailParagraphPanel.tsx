// ====================================================================
// 📊 [OMD-STYLE-DETAIL-PARAGRAPH-0001] DetailParagraphPanel.tsx
// 🎯 @KICK  : 본문 문단 여백, 글자 사이 틈(자간), 인쇄 여백, 탭 너비 및 인라인 강조 서식 세부 조판 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [본문 이탤릭 모양 단순화 및 프리셋 버튼 일괄 갱신·고대비 활성화]:
//             1) 기울임 모양 드롭다운에서 불필요한 중복 옵션인 '비스듬히(oblique)' 소거
//             2) 활자크기/행간 및 여백 4방향 프리셋 버튼 클릭 시 Partial<CssPageStyle> 일괄 원자적 갱신으로 상태 덮어쓰기 버그 박멸
//             3) 프리셋 버튼 활성 스타일을 고대비 코발트 블루 솔리드(bg-blue-600 text-white font-bold)로 표준화하여 명확한 시인성 확보
// 🚨 @PATCH : **2026-10-26** — [본문 활자 크기 pt 단위 표준화 및 제어기 신설]:
//             본문 활자 크기(pt) 4대 규격 프리셋 및 0.5pt 슬라이더, 행간 조절기를 세부 패널 상단에 통합
// ====================================================================

import React, { useState } from 'react';
import type { CssProfile } from '@/types/cssProfile';

type CssPageStyle = CssProfile['pageStyle'];
import { SectionCard, SliderWidget, ColorPickerWidget, getNumValue, parsePt } from './DetailWidgets';

interface DetailParagraphPanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  onUpdateProfile: (profile: CssProfile) => void;
  triggerUpdate: (profile: CssProfile, tag?: string, label?: string) => void;
  handlePageStyleChange: (propOrChanges: keyof CssPageStyle | Partial<CssPageStyle>, val?: any) => void;
  updateCssRule: (tag: string, prop: string, val: string) => void;
}

export default function DetailParagraphPanel({
  currentProfile,
  isSystemProfile,
  triggerUpdate,
  handlePageStyleChange,
  updateCssRule,
}: DetailParagraphPanelProps) {
  const [activeInlineTab, setActiveInlineTab] = useState<'strong' | 'em' | 'u' | 'del'>('strong');
  return (
    <div className="space-y-4">
      {/* 1. 본문 활자 크기 (Font Size) 및 줄 간격 (Line Height) */}
      <SectionCard
        title="본문 활자 크기 (Font Size) 및 줄 간격 (Line Height)"
        badge="pt 단위 표준"
        description="문서 및 출판 조판의 기준이 되는 본문 활자 크기(pt)와 줄 간격(행간)을 설정합니다."
        actionButton={
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              handlePageStyleChange({ fontSize: '11pt', lineHeight: '1.75' });
            }}
            className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-zinc-850 border border-zinc-250 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors cursor-pointer font-bold shadow-2xs"
            title="출판 표준(11pt / 행간 1.75)으로 되돌리기"
          >
            ⟲ 표준(11pt) 복원
          </button>
        }
      >
        {/* 4대 대표 표준 규격 버튼 */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '작게 (10pt)', pt: 10, lh: '1.6' },
            { label: '행정 (10.5pt)', pt: 10.5, lh: '1.65' },
            { label: '표준 (11pt)', pt: 11, lh: '1.75' },
            { label: '크게 (12pt)', pt: 12, lh: '1.85' },
          ].map((preset) => {
            const curPt = parsePt(currentProfile.pageStyle.fontSize, 11);
            const isSel = Math.abs(curPt - preset.pt) < 0.25;
            return (
              <button
                key={preset.label}
                type="button"
                disabled={isSystemProfile}
                onClick={() => {
                  handlePageStyleChange({ fontSize: `${preset.pt}pt`, lineHeight: preset.lh });
                }}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                  isSel
                    ? 'bg-blue-600 text-white font-bold shadow-xs border-blue-600 dark:border-blue-500'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="본문 활자 크기"
            min={8}
            max={18}
            step={0.5}
            value={parsePt(currentProfile.pageStyle.fontSize, 11)}
            unit="pt"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('fontSize', `${v}pt`)}
          />
          <SliderWidget
            label="본문 줄 간격 (행간)"
            min={1.3}
            max={2.4}
            step={0.05}
            value={getNumValue(currentProfile.pageStyle.lineHeight, 1.75)}
            unit="배"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('lineHeight', String(v))}
          />
        </div>
      </SectionCard>
      {/* 1. 글자 사이 틈 (자간) */}
      <SectionCard
        title="글자 사이 틈 (자간 간격)"
        badge={currentProfile.pageStyle.letterSpacing || '0em'}
        description="글자와 글자 사이의 미세한 간격을 조절하여 가독성을 높입니다."
        actionButton={
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => handlePageStyleChange('letterSpacing', '0em')}
            className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-zinc-850 border border-zinc-250 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors cursor-pointer font-bold shadow-2xs"
            title="기본값(0em)으로 되돌리기"
          >
            ⟲ 원래대로
          </button>
        }
      >
        {/* 3단계 친절 버튼 */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: '좁게 (-0.02)', val: '-0.02em' },
            { label: '보통 (0.00)', val: '0em' },
            { label: '넓게 (+0.02)', val: '0.02em' },
          ].map((btn) => {
            const current = currentProfile.pageStyle.letterSpacing || '0em';
            const isSel = current === btn.val || (btn.val === '0em' && (current === '0' || current === '0em' || !current));
            return (
              <button
                key={btn.label}
                type="button"
                disabled={isSystemProfile}
                onClick={() => handlePageStyleChange('letterSpacing', btn.val)}
                className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isSel
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        <SliderWidget
          label="자간 미세 조절"
          min={-0.05}
          max={0.05}
          step={0.01}
          value={getNumValue(currentProfile.pageStyle.letterSpacing, 0)}
          unit="em"
          disabled={isSystemProfile}
          onChange={(v) => handlePageStyleChange('letterSpacing', v + 'em')}
        />
      </SectionCard>

      {/* 2. 페이지 인쇄 여백 (Page Margins) */}
      <SectionCard
        title="페이지 인쇄 여백 (Page Margins)"
        badge="mm 단위"
        description="출판 및 PDF 인쇄 시 페이지 상·하·좌·우의 바깥 공백을 정밀하게 지정합니다."
        actionButton={
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              handlePageStyleChange({
                marginTop: '18mm',
                marginBottom: '18mm',
                marginLeft: '12mm',
                marginRight: '12mm',
              });
            }}
            className="text-[11px] px-2 py-1 rounded-md bg-white dark:bg-zinc-850 border border-zinc-250 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors cursor-pointer font-bold shadow-2xs"
            title="표준 여백(상하 18mm, 좌우 12mm)으로 되돌리기"
          >
            ⟲ 표준 여백 복원
          </button>
        }
      >
        {/* 3단계 규격 프리셋 */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: '공문서·보고서 (18/12mm)', top: 18, left: 12 },
            { label: '단행본·도서 (25/20mm)', top: 25, left: 20 },
            { label: '밀착 컴팩트 (10/10mm)', top: 10, left: 10 },
          ].map((preset) => {
            const curTop = getNumValue(currentProfile.pageStyle.marginTop, 18);
            const curLeft = getNumValue(currentProfile.pageStyle.marginLeft, 12);
            const isSel = curTop === preset.top && curLeft === preset.left;
            return (
              <button
                key={preset.label}
                type="button"
                disabled={isSystemProfile}
                onClick={() => {
                  handlePageStyleChange({
                    marginTop: `${preset.top}mm`,
                    marginBottom: `${preset.top}mm`,
                    marginLeft: `${preset.left}mm`,
                    marginRight: `${preset.left}mm`,
                  });
                }}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                  isSel
                    ? 'bg-blue-600 text-white font-bold shadow-xs border-blue-600 dark:border-blue-500'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="위 여백"
            min={5}
            max={50}
            value={getNumValue(currentProfile.pageStyle.marginTop, 18)}
            unit="mm"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('marginTop', v + 'mm')}
          />
          <SliderWidget
            label="아래 여백"
            min={5}
            max={50}
            value={getNumValue(currentProfile.pageStyle.marginBottom, 18)}
            unit="mm"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('marginBottom', v + 'mm')}
          />
          <SliderWidget
            label="왼쪽 여백"
            min={5}
            max={50}
            value={getNumValue(currentProfile.pageStyle.marginLeft, 12)}
            unit="mm"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('marginLeft', v + 'mm')}
          />
          <SliderWidget
            label="오른쪽 여백"
            min={5}
            max={50}
            value={getNumValue(currentProfile.pageStyle.marginRight, 12)}
            unit="mm"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('marginRight', v + 'mm')}
          />
        </div>
      </SectionCard>

      {/* 3. 본문 문단 여백 및 정렬 */}
      <SectionCard
        title="본문 문단 (Paragraph) 간격 및 정렬"
        description="문단과 문단 사이의 호흡, 본문 글자 정렬, 첫 줄 들여쓰기, 탭 간격을 설정합니다."
      >
        <ColorPickerWidget
          label="페이지 기본 배경색"
          value={currentProfile.pageStyle.backgroundColor || '#ffffff'}
          disabled={isSystemProfile}
          onChange={(v) => handlePageStyleChange('backgroundColor', v)}
        />

        {/* 본문 글자 정렬 */}
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
          <span className="text-zinc-700 dark:text-zinc-300 font-semibold text-[13.5px]">본문 글자 정렬</span>
          <select
            value={(currentProfile.rules.p || {})['text-align'] || 'left'}
            disabled={isSystemProfile}
            onChange={(e) => updateCssRule('p', 'text-align', e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
          >
            <option value="left">왼쪽 정렬</option>
            <option value="center">가운데 정렬</option>
            <option value="right">오른쪽 정렬</option>
            <option value="justify">양끝 정렬 (Justify)</option>
          </select>
        </div>

        {/* 첫 줄 들여쓰기 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">첫 줄 들여쓰기 (Text Indent)</span>
            <div className="flex gap-1">
              {[
                { label: '없음 (0)', val: 0 },
                { label: '1글자 (16px)', val: 16 },
                { label: '2글자 (32px)', val: 32 },
              ].map((step) => {
                const curVal = getNumValue((currentProfile.rules.p || {})['text-indent'], 0);
                const isSel = curVal === step.val;
                return (
                  <button
                    key={step.label}
                    type="button"
                    disabled={isSystemProfile}
                    onClick={() => {
                      const px = step.val + 'px';
                      const updated = {
                        ...currentProfile,
                        rules: {
                          ...currentProfile.rules,
                          p: { ...(currentProfile.rules.p || {}), 'text-indent': px },
                        },
                      };
                      triggerUpdate(updated, 'p', `첫 줄 들여쓰기 (${step.val}px)`);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>
          <SliderWidget
            label="들여쓰기 미세 조절"
            min={0}
            max={48}
            value={getNumValue((currentProfile.rules.p || {})['text-indent'], 0)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  p: { ...(currentProfile.rules.p || {}), 'text-indent': px },
                },
              };
              triggerUpdate(updated, 'p', `첫 줄 들여쓰기 (${v}px)`);
            }}
          />
        </div>

        {/* 탭 간격 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">코드 및 문단 탭 너비 (Tab Size)</span>
            <div className="flex gap-1">
              {[2, 4, 8].map((spaces) => {
                const isSel = getNumValue(currentProfile.pageStyle.tabSize, 4) === spaces;
                return (
                  <button
                    key={spaces}
                    type="button"
                    disabled={isSystemProfile}
                    onClick={() => handlePageStyleChange('tabSize', String(spaces))}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {spaces}칸{spaces === 4 ? '(표준)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <SliderWidget
            label="탭 너비 미세 조절"
            min={1}
            max={10}
            step={1}
            value={getNumValue(currentProfile.pageStyle.tabSize, 4)}
            unit="칸"
            disabled={isSystemProfile}
            onChange={(v) => handlePageStyleChange('tabSize', String(v))}
          />
        </div>

        {/* 문단 상/하 여백 및 문장 간격 */}
        <div className="grid grid-cols-2 gap-2.5">
          <SliderWidget
            label="문단 위 여백"
            min={0}
            max={48}
            value={getNumValue((currentProfile.rules.p || {})['margin-top'], 0)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  p: { ...(currentProfile.rules.p || {}), 'margin-top': px },
                },
              };
              triggerUpdate(updated, 'p', `문단 위 여백 (${v}px)`);
            }}
          />
          <SliderWidget
            label="문단 아래 여백"
            min={0}
            max={48}
            value={getNumValue((currentProfile.rules.p || {})['margin-bottom'], 16)}
            unit="px"
            disabled={isSystemProfile}
            onChange={(v) => {
              const px = v + 'px';
              const updated = {
                ...currentProfile,
                rules: {
                  ...currentProfile.rules,
                  p: { ...(currentProfile.rules.p || {}), 'margin-bottom': px },
                },
              };
              triggerUpdate(updated, 'p', `문단 아래 여백 (${v}px)`);
            }}
          />
        </div>

        <SliderWidget
          label="문장 사이 간격 (문단 내 줄바꿈 간격)"
          min={0}
          max={32}
          value={getNumValue((currentProfile.rules.p || {})['sentence-gap'], 0)}
          unit="px"
          disabled={isSystemProfile}
          onChange={(v) => {
            const px = v + 'px';
            const updated = {
              ...currentProfile,
              rules: {
                ...currentProfile.rules,
                p: { ...(currentProfile.rules.p || {}), 'sentence-gap': px },
              },
            };
            triggerUpdate(updated, 'p', `문장 사이 간격 (${v}px)`);
          }}
        />
      </SectionCard>

      {/* 5. 본문 내 인라인 강조 요소 (볼드, 기울임, 밑줄, 취소선) */}
      <SectionCard
        title="본문 내 인라인 강조 요소"
        description="굵은 글씨(Strong), 기울임(Em), 밑줄(U), 취소선(Del)의 스타일을 지정합니다."
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">강조 요소 선택</span>
            <div className="inline-flex bg-zinc-200/60 dark:bg-zinc-700/60 p-0.5 rounded-md text-xs font-semibold">
              {(['strong', 'em', 'u', 'del'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveInlineTab(tab)}
                  className={`px-3 py-1 rounded transition-all cursor-pointer ${
                    activeInlineTab === tab
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-800'
                  }`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800 space-y-3">
            {(() => {
              const tag = activeInlineTab;
              const tagRules = currentProfile.rules[tag] || {};

              switch (tag) {
                case 'strong':
                  return (
                    <>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-850 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800 shadow-2xs">
                        <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">굵기 (Font Weight)</span>
                        <select
                          value={tagRules['font-weight'] || 'bold'}
                          disabled={isSystemProfile}
                          onChange={(e) => updateCssRule('strong', 'font-weight', e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
                        >
                          <option value="normal">일반 (normal)</option>
                          <option value="bold">굵게 (bold)</option>
                          <option value="900">최대 굵게 (900)</option>
                        </select>
                      </div>
                      <ColorPickerWidget
                        label="강조 글자 색상"
                        value={tagRules['color'] || ''}
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('strong', 'color', v)}
                      />
                      <ColorPickerWidget
                        label="강조 배경 색상"
                        value={tagRules['background-color'] || ''}
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('strong', 'background-color', v)}
                      />
                    </>
                  );
                case 'em':
                  return (
                    <>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-850 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800 shadow-2xs">
                        <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">기울임 모양 (Font Style)</span>
                        <select
                          value={tagRules['font-style'] || 'italic'}
                          disabled={isSystemProfile}
                          onChange={(e) => updateCssRule('em', 'font-style', e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
                        >
                          <option value="normal">정체</option>
                          <option value="italic">이탤릭 (기울임)</option>
                        </select>
                      </div>
                      <ColorPickerWidget
                        label="기울임 글자 색상"
                        value={tagRules['color'] || ''}
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('em', 'color', v)}
                      />
                    </>
                  );
                case 'u':
                  return (
                    <>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-850 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800 shadow-2xs">
                        <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">밑줄 모양 (Underline)</span>
                        <select
                          value={tagRules['text-decoration-style'] || 'solid'}
                          disabled={isSystemProfile}
                          onChange={(e) => updateCssRule('u', 'text-decoration-style', e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
                        >
                          <option value="solid">실선</option>
                          <option value="dashed">대시선</option>
                          <option value="dotted">점선</option>
                          <option value="wavy">물결선</option>
                        </select>
                      </div>
                      <ColorPickerWidget
                        label="밑줄 색상"
                        value={tagRules['text-decoration-color'] || ''}
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('u', 'text-decoration-color', v)}
                      />
                      <SliderWidget
                        label="밑줄 간격"
                        min={0}
                        max={12}
                        value={getNumValue(tagRules['text-underline-offset'], 2)}
                        unit="px"
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('u', 'text-underline-offset', v + 'px')}
                      />
                    </>
                  );
                case 'del':
                  return (
                    <>
                      <ColorPickerWidget
                        label="취소선 색상"
                        value={tagRules['text-decoration-color'] || ''}
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('del', 'text-decoration-color', v)}
                      />
                      <SliderWidget
                        label="취소선 굵기"
                        min={1}
                        max={8}
                        value={getNumValue(tagRules['text-decoration-thickness'], 1)}
                        unit="px"
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('del', 'text-decoration-thickness', v + 'px')}
                      />
                      <SliderWidget
                        label="투명도"
                        min={10}
                        max={100}
                        step={5}
                        value={getNumValue(
                          tagRules['opacity'] !== undefined && tagRules['opacity'] !== ''
                            ? parseFloat(tagRules['opacity']) * 100
                            : undefined,
                          60
                        )}
                        unit="%"
                        disabled={isSystemProfile}
                        onChange={(v) => updateCssRule('del', 'opacity', (parseFloat(v) / 100).toString())}
                      />
                    </>
                  );
                default:
                  return null;
              }
            })()}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
