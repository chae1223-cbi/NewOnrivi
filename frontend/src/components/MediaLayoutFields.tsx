// ====================================================================
// 📊 [OMD-UI-MediaLayoutFields-0001] MediaLayoutFields.tsx ➔ 미디어 레이아웃/크기/정렬 및 캡션 설정 위젯
// 🚨 @PATCH : **2026-10-24** — [미디어 컨트롤 접근성 탭 오더(tabIndex) 지원]:
//             1) MediaCaptionControl, MediaSizeInputs, MediaAlignmentControl에 tabIndexStart 속성을 지원하여 모달 내 순차적 키보드 탭 이동 보장
// 🚨 @PATCH : **2026-10-24** — [미디어 컨트롤 UI 컴팩트화 및 공간 최적화]:
//             1) 패딩 및 여백 축소(p-3), 캡션/크기/정렬 컨트롤 컴팩트화로 모달 창 세로 초과 방지 및 삽입 버튼 상시 노출 보장
// 🚨 @PATCH : **2026-10-24** — [이미지 URL 쿼리에 캡션 위치(caption=top|bottom) 인코딩 지원]:
//             1) imagePathWithDimensions에 captionPos 인자를 추가하여 이미지 쿼리스트링에 캡션 위치를 안전하게 보존
// 🚨 @PATCH : **2026-10-21** — [미디어 설명(캡션) 위치 및 표현 구문 제어 위젯(MediaCaptionControl) 신설]:
//             1) 그림/지도/영상 공용 캡션 제목, 순번, 상단/하단 배치 토글, 표현 구문(표준/대괄호/화살괄호/일반/제목만/커스텀) 선택 UI 탑재
//             2) 실시간 포맷 미리보기 칩 제공으로 사용자가 문서 삽입 전 결과를 직관적으로 확인하도록 지원
// ====================================================================

import React, { useEffect, useState } from 'react';
import { formatMediaCaption } from '@/lib/aiFriendlyReport';

export type MediaAlign = 'left' | 'center' | 'right';
export type MediaCaptionFormat = 'standard' | 'bracket' | 'angle' | 'plain' | 'title-only' | 'custom' | 'none';

export function imagePathWithDimensions(path:string,width:string,height:string,align:string,captionPos?:string):string {
  const hashIndex=path.indexOf('#'),hash=hashIndex<0?'':path.slice(hashIndex);
  const main=hashIndex<0?path:path.slice(0,hashIndex),queryIndex=main.indexOf('?');
  const base=queryIndex<0?main:main.slice(0,queryIndex);
  const params=new URLSearchParams(queryIndex<0?'':main.slice(queryIndex+1));
  for(const key of ['width','w','height','h','align','a','caption','captionPos','captionPosition'])params.delete(key);
  if(width.trim())params.set('width',width.trim());
  if(height.trim())params.set('height',height.trim());
  if(align)params.set('align',align);
  if(captionPos)params.set('caption',captionPos);
  const query=params.toString();return base+(query?'?'+query:'')+hash;
}

interface MediaSizeInputsProps {
  width: string;
  height: string;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  isDarkMode: boolean;
  imageSizing?: boolean;
  tabIndexStart?: number;
}

interface MediaAlignmentControlProps {
  align: MediaAlign;
  onChange: (align: MediaAlign) => void;
  isDarkMode: boolean;
  tabIndexStart?: number;
}

export function MediaSizeInputs({ width, height, onWidthChange, onHeightChange, isDarkMode, imageSizing=false, tabIndexStart }: MediaSizeInputsProps) {
  const [widthUnit,setWidthUnit]=useState(width ? (width.endsWith('%')?'%':'px') : '%');
  useEffect(()=>{if(width)setWidthUnit(width.endsWith('%')?'%':'px');},[width]);
  const inputClass = `w-full font-mono text-xs border rounded px-3 py-2.5 outline-none focus:ring-1 transition-all ${
    isDarkMode
      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600 focus:border-[#1d4ed8] focus:ring-[#1d4ed8]/30'
      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#1d4ed8] focus:ring-[#1d4ed8]/20'
  }`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1 block">가로 {imageSizing?'':'(PX)'}</label>
        {imageSizing ? <div className="flex gap-2">
          <input
            aria-label="이미지 가로 크기"
            type="text"
            inputMode="decimal"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart : undefined}
            value={width.replace(/(?:px|%)$/i,'')}
            onChange={e=>{
              const value=e.target.value.trim();
              if(!value){onWidthChange('');return;}
              if(/^\d*(?:\.\d*)?$/.test(value))onWidthChange(value+widthUnit);
              else if(/^\d+(?:\.\d+)?(?:px|%)$/i.test(value))onWidthChange(value.toLowerCase());
            }}
            placeholder={widthUnit==='%'?'100':'600'}
            className={inputClass}
          />
          <select
            aria-label="이미지 가로 단위"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart + 1 : undefined}
            value={widthUnit}
            className={inputClass+' !w-20 shrink-0'}
            onChange={e=>{
              const unit=e.target.value;setWidthUnit(unit);
              if(width)onWidthChange(width.replace(/(?:px|%)$/i,'')+unit);
            }}
          >
            <option value="%">%</option>
            <option value="px">px</option>
          </select>
        </div> : (
          <input
            type="text"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart : undefined}
            value={width}
            onChange={e => onWidthChange(e.target.value)}
            placeholder="600px 또는 100%"
            className={inputClass}
          />
        )}
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1 block">세로 {imageSizing?'(자동 / px)':'(PX)'}</label>
        <input
          aria-label={imageSizing?'이미지 세로 크기':undefined}
          type="text"
          tabIndex={tabIndexStart !== undefined ? (imageSizing ? tabIndexStart + 2 : tabIndexStart + 1) : undefined}
          value={height}
          onChange={e => onHeightChange(e.target.value)}
          placeholder="auto 또는 400px"
          className={inputClass}
        />
      </div>
      {imageSizing&&<p className="col-span-2 text-[10px] text-slate-400 dark:text-zinc-500">※ 가로 기본 100%, 세로 비움 시 원본 비율 유지</p>}
    </div>
  );
}

export function MediaAlignmentControl({ align, onChange, isDarkMode, tabIndexStart }: MediaAlignmentControlProps) {
  return (
    <div className={`rounded-lg p-3 border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1.5 block">정렬</label>
      <div className="flex gap-2">
        {(['left', 'center', 'right'] as const).map((option, idx) => (
          <button
            type="button"
            key={option}
            tabIndex={tabIndexStart !== undefined ? tabIndexStart + idx : undefined}
            onClick={() => onChange(option)}
            aria-pressed={align === option}
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all border ${
              align === option
                ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm'
                : isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  : 'border-slate-300 bg-slate-50 text-slate-500 hover:text-slate-700 hover:border-slate-400'
            }`}
          >
            {option === 'left' ? '⬅ 왼쪽' : option === 'center' ? '↔ 가운데' : '오른쪽 ➡'}
          </button>
        ))}
      </div>
    </div>
  );
}

// HTML 임베드에는 단위가 필요하다. 이미지 입력과 동일하게 숫자, px, %, auto를 받는다.
export function normalizeMediaDimension(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  if (/^\d+(?:\.\d+)?(?:px|%)$/i.test(trimmed) || trimmed.toLowerCase() === 'auto') return trimmed;
  return fallback;
}

export interface MediaCaptionControlProps {
  kind: '그림' | '지도' | '영상';
  title: string;
  onTitleChange: (value: string) => void;
  number: number;
  onNumberChange: (value: number) => void;
  position: 'top' | 'bottom';
  onPositionChange: (value: 'top' | 'bottom') => void;
  format: MediaCaptionFormat;
  onFormatChange: (value: MediaCaptionFormat) => void;
  customTemplate?: string;
  onCustomTemplateChange?: (value: string) => void;
  isDarkMode: boolean;
  tabIndexStart?: number;
}

export function MediaCaptionControl({
  kind,
  title,
  onTitleChange,
  number,
  onNumberChange,
  position,
  onPositionChange,
  format,
  onFormatChange,
  customTemplate = '**{kind} {n}. {title}**',
  onCustomTemplateChange,
  isDarkMode,
  tabIndexStart
}: MediaCaptionControlProps) {
  const previewCaption = formatMediaCaption(kind, number, title.trim() || '제목 예시', format === 'none' ? 'standard' : format, customTemplate);

  const inputClass = `w-full text-xs border rounded px-3 py-2 outline-none focus:ring-1 transition-all ${
    isDarkMode
      ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-[#1d4ed8] focus:ring-[#1d4ed8]/30'
      : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#1d4ed8] focus:ring-[#1d4ed8]/20'
  }`;

  return (
    <div className={`rounded-lg p-3 border space-y-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
          {kind} 설명(캡션) 설정
        </label>
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
          {position === 'top' ? '상단 배치' : '하단 배치'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-3">
          <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1 block">
            {kind} 제목 (선택)
          </label>
          <input
            type="text"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart : undefined}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={`예: ${kind === '그림' ? '안양예술공원 산책로 풍경' : kind === '지도' ? '서울시청 위치' : '시스템 소개 영상'}`}
            className={inputClass}
          />
        </div>
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1 block">
            순번
          </label>
          <input
            type="number"
            min={1}
            tabIndex={tabIndexStart !== undefined ? tabIndexStart + 1 : undefined}
            value={number}
            onChange={(e) => onNumberChange(Math.max(1, Number(e.target.value) || 1))}
            className={inputClass + ' font-mono text-center'}
          />
        </div>
      </div>

      {/* 위치 토글 (상단 vs 하단) */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 block">
          설명(캡션) 위치
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart + 2 : undefined}
            onClick={() => onPositionChange('top')}
            className={`py-1.5 rounded text-xs font-bold transition-all border ${
              position === 'top'
                ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm'
                : isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-800'
            }`}
          >
            ⬆ 상단 (AI 친화 표준)
          </button>
          <button
            type="button"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart + 3 : undefined}
            onClick={() => onPositionChange('bottom')}
            className={`py-1.5 rounded text-xs font-bold transition-all border ${
              position === 'bottom'
                ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-sm'
                : isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-800'
            }`}
          >
            ⬇ 하단 (전통 출판)
          </button>
        </div>
      </div>

      {/* 표현 구문 (Format) 선택 */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 block">
          표현 구문 포맷
        </label>
        <select
          value={format}
          tabIndex={tabIndexStart !== undefined ? tabIndexStart + 4 : undefined}
          onChange={(e) => onFormatChange(e.target.value as MediaCaptionFormat)}
          className={inputClass + ' font-medium cursor-pointer'}
        >
          <option value="standard">표준 볼드: **{kind} {number}. {title || '제목'}**</option>
          <option value="bracket">대괄호형: **[{kind} {number}] {title || '제목'}**</option>
          <option value="angle">화살괄호형: **&lt;{kind} {number}&gt; {title || '제목'}**</option>
          <option value="plain">일반 텍스트: {kind} {number}. {title || '제목'}</option>
          <option value="title-only">제목만: **{title || '제목'}**</option>
          <option value="custom">직접 정의 (커스텀 템플릿)</option>
          <option value="none">설명 미포함 (단독 삽입)</option>
        </select>
      </div>

      {format === 'custom' && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 block">
            커스텀 템플릿 ({'{kind}'}: 구분, {'{n}'}: 번호, {'{title}'}: 제목)
          </label>
          <input
            type="text"
            tabIndex={tabIndexStart !== undefined ? tabIndexStart + 5 : undefined}
            value={customTemplate}
            onChange={(e) => onCustomTemplateChange?.(e.target.value)}
            placeholder="예: **{kind} {n}. {title}**"
            className={inputClass + ' font-mono'}
          />
        </div>
      )}

      {/* 실시간 구문 미리보기 안내 */}
      {format !== 'none' && (
        <div className="rounded p-2.5 bg-blue-500/5 border border-blue-500/20 text-[11px] flex items-center justify-between text-blue-700 dark:text-blue-300">
          <span className="font-semibold">결과 미리보기:</span>
          <span className="font-bold">{previewCaption}</span>
        </div>
      )}
    </div>
  );
}
