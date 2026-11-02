// ====================================================================
// 📊 [OMD-STYLE-DETAIL-WIDGETS-0001] DetailWidgets.tsx
// 🎯 @KICK  : 세부 서식 패널 공용 위젯 및 헬퍼 모음
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [미디어(이미지·동영상·지도) 설명(캡션) 위치 및 표현 구문 공용 위젯(MediaCaptionControl) 신설]:
//             1) 이미지뿐만 아니라 동영상, 지도에서도 상단/하단 배치 및 6종 표현 구문(표준/대괄호/화살괄호/일반/제목만/커스텀)을 제어하는 고대비 공용 위젯 추가
// 🚨 @PATCH : **2026-10-26** — [서식 글자 크기 pt 단위 표준화]:
//             1) FontSizeControl 및 세부 서식 패널 전반의 글자 크기를 pt(포인트) 단위로 전면 통일
//             2) px ↔ pt 상호 호환 파싱/포맷 헬퍼(parsePt, formatPt) 신설
//             3) 0.5pt 미세 조절 단계 지원 및 기본값/상속값 pt 표시 보장
// ====================================================================

import React from 'react';
import type { CssRuleSet } from '@/types/cssProfile';

// 0 또는 '0' 값(Falsy)을 누락시키지 않고 기본값을 안전하게 처리하는 헬퍼 함수
export const getNumValue = (val: string | number | undefined | null, defaultVal: number): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const parsed = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(parsed) ? defaultVal : parsed;
};

// pt 단위 안전 파싱 헬퍼 (px 호환 변환: 1px = 0.75pt, 16px = 12pt, 14px = 10.5pt)
export const parsePt = (sizeStr?: string | number, defaultVal: number = 11): number => {
  if (sizeStr === undefined || sizeStr === null || sizeStr === '') return defaultVal;
  if (typeof sizeStr === 'number') return isNaN(sizeStr) ? defaultVal : sizeStr;
  const trimmed = String(sizeStr).trim();
  if (trimmed.endsWith('pt')) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? defaultVal : num;
  }
  if (trimmed.endsWith('px')) {
    const num = parseFloat(trimmed);
    const converted = Math.round((num * 0.75) * 10) / 10;
    return isNaN(converted) ? defaultVal : converted;
  }
  const num = parseFloat(trimmed);
  return isNaN(num) ? defaultVal : num;
};

// pt 단위 문자열 포맷팅 헬퍼
export const formatPt = (val?: string | number, defaultVal: number = 11): string => {
  const num = parsePt(val, defaultVal);
  return `${num}pt`;
};

// 1. 공용 섹션 카드 래퍼
interface SectionCardProps {
  title: string;
  badge?: string;
  description?: string;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}

export function SectionCard({ title, badge, description, children, actionButton }: SectionCardProps) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-xs transition-all">
      <div className="p-3.5 bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[14.5px] text-zinc-900 dark:text-zinc-100">{title}</h3>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        {actionButton && <div className="shrink-0">{actionButton}</div>}
      </div>
      <div className="p-4 space-y-3.5">
        {children}
      </div>
    </div>
  );
}

// 2. HTML5 표준 슬라이더 위젯
export interface SliderWidgetProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number | string;
  unit: string;
  disabled: boolean;
  onChange: (val: string) => void;
}

export function SliderWidget({ label, min, max, step = 1, value, unit, disabled, onChange }: SliderWidgetProps) {
  const parsedVal = getNumValue(value, min);
  const clampedVal = Math.min(Math.max(parsedVal, min), max);
  const displayVal = step < 1 ? Number(clampedVal.toFixed(step < 0.1 ? 2 : 1)) : clampedVal;
  return (
    <div className="space-y-2 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
      <div className="flex items-center justify-between">
        <span className="text-zinc-700 dark:text-zinc-300 font-semibold text-[13px]">{label}</span>
        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
          {displayVal}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedVal}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-650 disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// 3. 글자 크기 듀얼 모드 제어 위젯 (상속 vs 개별 설정, pt 표준화)
export interface FontSizeControlProps {
  label: string;
  value: string | undefined;
  baseFontSize: string;
  disabled: boolean;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultCustomValue?: number;
}

export function FontSizeControl({
  label,
  value,
  baseFontSize,
  disabled,
  onChange,
  min = 7,
  max = 24,
  step = 0.5,
  defaultCustomValue,
}: FontSizeControlProps) {
  const isInherited = !value || value === '' || value === 'inherit' || value === '0' || value === '0px' || value === '0pt';
  const parsedBasePt = parsePt(baseFontSize, 11);
  const currentNumVal = isInherited
    ? (defaultCustomValue ? parsePt(defaultCustomValue, 11) : parsedBasePt)
    : parsePt(value, parsedBasePt);
  const clampedNumVal = Math.min(Math.max(currentNumVal, min), max);

  return (
    <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 transition-all notranslate" translate="no">
      <div className="flex items-center justify-between gap-2 notranslate">
        <span className="text-zinc-700 dark:text-zinc-300 font-semibold text-[13px] notranslate">{label}</span>
        
        {/* 모드 선택 세그먼트 버튼 */}
        <div className="inline-flex rounded-lg p-0.5 bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300/80 dark:border-zinc-700/80 text-xs font-semibold shrink-0 notranslate">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className={`px-2.5 py-1 rounded-md transition-all notranslate ${
              isInherited
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            title="문서 전체 기본 글자 크기를 그대로 상속받습니다"
          >
            기본설정 유지
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(`${clampedNumVal}pt`)}
            className={`px-2.5 py-1 rounded-md transition-all notranslate ${
              !isInherited
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            title="이 태그에만 적용될 글자 크기를 직접 지정합니다"
          >
            직접 설정
          </button>
        </div>
      </div>

      {isInherited ? (
        <div key="fc-inherited-view" className="flex items-center justify-between py-2 px-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-md border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 notranslate">
          <div className="flex items-center gap-1.5 font-medium notranslate">
            <span className="notranslate">🔗</span>
            <span className="notranslate">문서 기본 글자 크기를 따릅니다</span>
          </div>
          <span className="font-mono font-bold px-2 py-0.5 bg-white dark:bg-blue-900/60 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shrink-0 notranslate">
            {`현재: ${parsedBasePt}pt`}
          </span>
        </div>
      ) : (
        <div key="fc-custom-view" className="space-y-1.5 pt-1 notranslate">
          <div className="flex items-center justify-between notranslate">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium notranslate">개별 지정 크기</span>
            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 notranslate">
              {`${clampedNumVal}pt`}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={clampedNumVal}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value + 'pt')}
            className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-650 disabled:opacity-50 disabled:cursor-not-allowed notranslate"
          />
        </div>
      )}
    </div>
  );
}

// 4. 브라우저 내장 컬러 피커 연동 위젯
export interface ColorPickerWidgetProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (val: string) => void;
}

export function ColorPickerWidget({ label, value, disabled, onChange }: ColorPickerWidgetProps) {
  const hexValue = value && value.startsWith('#') ? value : '#000000';
  return (
    <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
      <span className="text-zinc-700 dark:text-zinc-300 font-semibold text-[13px]">{label}</span>
      <div className="flex items-center gap-2.5">
        <input
          type="text"
          value={value || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="inherit"
          className="w-24 p-1.5 text-center font-mono text-xs text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded outline-none"
        />
        <div className="relative w-7 h-7 rounded-full border border-zinc-250 dark:border-zinc-700 overflow-hidden cursor-pointer shrink-0 shadow-2xs">
          <input
            type="color"
            value={hexValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            style={{ transform: 'scale(2)' }}
          />
          <div
            className="w-full h-full rounded-full transition-transform hover:scale-105"
            style={{ backgroundColor: value || 'transparent' }}
          />
        </div>
      </div>
    </div>
  );
}

// 5. 복합 태그용 CSS 룰셋 직접 편집 에디터
export interface TagRuleEditorProps {
  tag: string;
  label: string;
  rules: CssRuleSet;
  isSystemProfile: boolean;
  onUpdateRule: (tag: string, property: string, value: string) => void;
  onRemoveRule: (tag: string, property: string) => void;
}

export function TagRuleEditor({ tag, label, rules, isSystemProfile, onUpdateRule, onRemoveRule }: TagRuleEditorProps) {
  const entries = Object.entries(rules).filter(([, v]) => v !== '');

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-950 shadow-2xs">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2 mb-2">
        <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">{label}</span>
      </div>

      <div className="space-y-1.5">
        {entries.length === 0 && (
          <span className="text-xs text-zinc-400 italic block font-semibold">지정된 CSS 규칙 없음 (기본값 사용)</span>
        )}
        {entries.map(([prop, val]) => (
          <div key={prop} className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono text-[11px] w-32 shrink-0">{prop}:</span>
            <input
              type="text"
              value={val}
              onChange={(e) => onUpdateRule(tag, prop, e.target.value)}
              className="flex-1 p-1 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-900 font-mono text-xs text-blue-600 dark:text-blue-400"
              disabled={isSystemProfile}
            />
            {!isSystemProfile && (
              <button
                type="button"
                onClick={() => onRemoveRule(tag, prop)}
                className="text-zinc-400 hover:text-red-400 text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. 타이포그래피 및 스타일 옵션 상수 & 판별 헬퍼
export const ALIGN_OPTIONS = [
  { label: '왼쪽', value: 'left' },
  { label: '중앙', value: 'center' },
  { label: '오른쪽', value: 'right' },
  { label: '양끝', value: 'justify' },
] as const;

export const STYLE_OPTIONS = [
  { label: '굵게', property: 'font-weight', onVal: 'bold', offVal: 'normal' },
  { label: '기울임', property: 'font-style', onVal: 'italic', offVal: 'normal' },
  { label: '밑줄', property: 'text-decoration', onVal: 'underline', offVal: 'none' },
] as const;

export const BORDER_BOTTOM_OPTIONS = [
  { label: '선 없음', value: '' },
  { label: '실선', value: '1px solid' },
  { label: '관보선', value: '3px double' },
] as const;

export const isFontWeightBold = (v: string | undefined): boolean => {
  if (!v) return false;
  if (v === 'bold' || v === 'bolder') return true;
  const n = parseInt(v, 10);
  return !isNaN(n) && n >= 600;
};

export const isAlignActive = (v: string | undefined, target: string): boolean =>
  target === 'left' ? (!v || v === 'left') : v === target;

export const isStyleOptionActive = (
  rules: Record<string, string>,
  property: string,
  onVal: string
): boolean => {
  const v = rules[property];
  if (property === 'font-weight') return isFontWeightBold(v);
  if (property === 'font-style') return v === onVal;
  if (property === 'text-decoration') return !!v && v !== 'none' && v.includes(onVal);
  return v === onVal;
};

export const isBorderNone = (v: string | undefined): boolean =>
  !v || v.trim() === '' || v === 'none' || v.trim().startsWith('0');

export const isBorderMatch = (v: string | undefined, target: string): boolean => {
  if (target === '') return isBorderNone(v);
  if (isBorderNone(v)) return false;
  const lower = v!.toLowerCase();
  if (target.includes('double')) return lower.includes('double');
  if (target.includes('solid')) return lower.includes('solid') && !lower.includes('double');
  return lower.includes(target.toLowerCase());
};

// 7. 미디어(이미지, 동영상, 지도) 설명(캡션) 위치 및 표현 구문 공용 설정 위젯
export interface MediaCaptionControlProps {
  kind: 'image' | 'video' | 'map';
  kindLabel: string;
  mediaCaptionStructure?: import('@/types/cssProfile').MediaCaptionStructure;
  disabled: boolean;
  onChange: (key: string, value: string) => void;
}

export function MediaCaptionControl({
  kind,
  kindLabel,
  mediaCaptionStructure,
  disabled,
  onChange,
}: MediaCaptionControlProps) {
  const cfg = mediaCaptionStructure?.kindOverrides?.[kind] || mediaCaptionStructure || {
    position: 'top',
    format: 'standard',
    customTemplate: '**{kind} {n}. {title}**',
  };
  const position = cfg.position || mediaCaptionStructure?.position || 'top';
  const format = cfg.format || mediaCaptionStructure?.format || 'standard';
  const customTemplate = cfg.customTemplate || mediaCaptionStructure?.customTemplate || '**{kind} {n}. {title}**';

  const kindNoun = kind === 'image' ? '그림' : kind === 'video' ? '영상' : '지도';

  return (
    <SectionCard
      title={`🏷️ ${kindLabel} 설명(캡션) 위치 및 표현 구문`}
      description={`${kindLabel} 설명(캡션)의 배치 위치(상단/하단) 및 표기 번호 체계를 지정합니다.`}
    >
      <div className="space-y-3.5">
        {/* 위치 선택 */}
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800">
          <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">설명(캡션) 기본 위치</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('position', 'top')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                position === 'top'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              상단 (AI 친화 표준)
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('position', 'bottom')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                position === 'bottom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
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
            value={format}
            disabled={disabled}
            onChange={(e) => onChange('format', e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-right"
          >
            <option value="standard">{`표준: **${kindNoun} 1. 제목**`}</option>
            <option value="bracket">{`대괄호: **[${kindNoun} 1] 제목**`}</option>
            <option value="angle">{`화살괄호: <${kindNoun} 1> 제목`}</option>
            <option value="plain">{`일반: ${kindNoun} 1. 제목`}</option>
            <option value="title-only">제목만: **제목**</option>
            <option value="custom">직접 정의 (커스텀 템플릿)</option>
          </select>
        </div>

        {format === 'custom' && (
          <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800 space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
              커스텀 표현 템플릿 ({'{kind}'}: 구분, {'{n}'}: 번호, {'{title}'}: 제목)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={customTemplate}
              onChange={(e) => onChange('customTemplate', e.target.value)}
              placeholder="예: **{kind} {n}. {title}**"
              className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono text-zinc-800 dark:text-zinc-200"
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
}
