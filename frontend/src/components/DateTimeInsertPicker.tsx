/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-datetime-picker
 * ====================================================================
 * 📊 [OMD-UI-DateTimeInsertPicker-0001] DateTimeInsertPicker.tsx ➔ 커서 위치 날짜/시간 스마트 입력 및 서식 변환 팝업
 * 🎯 @KICK  : 문서보기/에디터 커서 위치에 노출되어, 포맷 없이 자유 입력한 날짜/시간에 원하는 서식을 적용하여 즉시 삽입
 * 🛡️ @GUARD : isOpen false 시 null 반환, 뷰포트 경계 자동 클램핑, 바깥 클릭/ESC 닫기 및 Enter 즉시 삽입 지원
 * 🚨 @PATCH : **2026-10-13** — [문서보기 커서 위치 날짜/시간 자유 입력 및 스마트 서식 변환 팝업 신규 구축]:
 *             1) 문서보기(VisualDocumentEditor) 내 현재 위지윅 커서 위치에 정확히 팝업 배치
 *             2) 포맷 없이(예: 20261013, 2026-10-13, 14:30 등) 자유롭게 날짜/시간을 입력할 수 있는 입력란 및 '지금' 리셋 버튼 제공
 *             3) 입력된 날짜/시간을 기반으로 8대 표준 서식 프리셋 실시간 변환 미리보기 및 선택 형식 적용
 *             4) 최종 변환된 결과를 실시간 확인 후 [본문에 삽입] 또는 Enter로 커서 위치에 즉시 반영
 * 🔗 @CALLS : createPortal, Icon, Calendar, Clock, RotateCcw, Check, X
 * ====================================================================
 */
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, RotateCcw, Check, X } from 'lucide-react';

interface DateTimeInsertPickerProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onInsert: (formattedDate: string) => void;
  isDarkMode?: boolean;
}

// 8대 주요 날짜/시간 서식 프리셋
const FORMAT_PRESETS = [
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { id: 'YYYY. MM. DD.', label: 'YYYY. MM. DD.' },
  { id: 'YYYY년 M월 D일', label: 'YYYY년 M월 D일' },
  { id: 'YYYY-MM-DD (ddd)', label: 'YYYY-MM-DD (요일)' },
  { id: 'HH:mm', label: 'HH:mm (시간만)' },
  { id: 'HH:mm:ss', label: 'HH:mm:ss (초까지)' },
  { id: 'YYYY-MM-DD HH:mm', label: 'YYYY-MM-DD HH:mm' },
  { id: 'YYYY년 M월 D일 HH:mm', label: 'YYYY년 M월 D일 HH:mm' },
];

// 지능형 날짜/시간 파서: 포맷 없는 숫자나 문자열을 Date 객체로 변환
export function parseRawDateTime(raw: string): Date {
  const clean = raw.trim();
  if (!clean) return new Date();

  const digitsOnly = clean.replace(/\D/g, '');

  // 1) 순수 숫자: 8자리 (YYYYMMDD)
  if (/^\d{8}$/.test(digitsOnly)) {
    const y = parseInt(digitsOnly.slice(0, 4), 10);
    const m = parseInt(digitsOnly.slice(4, 6), 10) - 1;
    const d = parseInt(digitsOnly.slice(6, 8), 10);
    const now = new Date();
    const date = new Date(y, m, d, now.getHours(), now.getMinutes(), now.getSeconds());
    if (!isNaN(date.getTime())) return date;
  }

  // 2) 순수 숫자: 12자리 (YYYYMMDDHHmm)
  if (/^\d{12}$/.test(digitsOnly)) {
    const y = parseInt(digitsOnly.slice(0, 4), 10);
    const m = parseInt(digitsOnly.slice(4, 6), 10) - 1;
    const d = parseInt(digitsOnly.slice(6, 8), 10);
    const h = parseInt(digitsOnly.slice(8, 10), 10);
    const min = parseInt(digitsOnly.slice(10, 12), 10);
    const date = new Date(y, m, d, h, min, 0);
    if (!isNaN(date.getTime())) return date;
  }

  // 3) 순수 숫자: 14자리 (YYYYMMDDHHmmss)
  if (/^\d{14}$/.test(digitsOnly)) {
    const y = parseInt(digitsOnly.slice(0, 4), 10);
    const m = parseInt(digitsOnly.slice(4, 6), 10) - 1;
    const d = parseInt(digitsOnly.slice(6, 8), 10);
    const h = parseInt(digitsOnly.slice(8, 10), 10);
    const min = parseInt(digitsOnly.slice(10, 12), 10);
    const s = parseInt(digitsOnly.slice(12, 14), 10);
    const date = new Date(y, m, d, h, min, s);
    if (!isNaN(date.getTime())) return date;
  }

  // 4) 시간만: 4자리 (HHmm) 또는 HH:mm
  if ((/^\d{4}$/.test(digitsOnly) && clean.includes(':')) || /^\d{4}$/.test(digitsOnly) && clean.length <= 5) {
    const now = new Date();
    const h = parseInt(digitsOnly.slice(0, 2), 10);
    const min = parseInt(digitsOnly.slice(2, 4), 10);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, 0);
  }

  // 5) 일반적인 구분자 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD)
  const normalized = clean.replace(/\./g, '-').replace(/\//g, '-');
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date();
}

// 날짜 포맷 적용기
export function applyDateFormat(date: Date, pattern: string): string {
  const YYYY = String(date.getFullYear());
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const M = String(date.getMonth() + 1);
  const DD = String(date.getDate()).padStart(2, '0');
  const D = String(date.getDate());

  const daysShort = ['일', '월', '화', '수', '목', '금', '토'];
  const daysFull = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayIdx = date.getDay();
  const ddd = daysShort[dayIdx];
  const dddd = daysFull[dayIdx];

  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return pattern
    .replace(/YYYY/g, YYYY)
    .replace(/MM/g, MM)
    .replace(/M/g, M)
    .replace(/DD/g, DD)
    .replace(/D/g, D)
    .replace(/dddd/g, dddd)
    .replace(/ddd/g, ddd)
    .replace(/HH/g, HH)
    .replace(/mm/g, mm)
    .replace(/ss/g, ss);
}

function getInitialDateTimeString(): string {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
}

export default function DateTimeInsertPicker({
  isOpen,
  position,
  onClose,
  onInsert,
  isDarkMode = false
}: DateTimeInsertPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('YYYY-MM-DD');
  const [customResult, setCustomResult] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const nowStr = getInitialDateTimeString();
      setRawInput(nowStr);
      setSelectedFormat('YYYY-MM-DD');
      setCustomResult('');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // 바깥 클릭 및 ESC 감지
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // 파싱된 기준 Date 객체
  const parsedDate = useMemo(() => {
    return parseRawDateTime(rawInput);
  }, [rawInput]);

  // 선택된 형식으로 적용된 최종 텍스트
  const formattedResult = useMemo(() => {
    if (customResult.trim()) return customResult.trim();
    return applyDateFormat(parsedDate, selectedFormat);
  }, [parsedDate, selectedFormat, customResult]);

  // "지금" 버튼 클릭 시 현재 시각으로 리셋
  const handleResetToNow = () => {
    const nowStr = getInitialDateTimeString();
    setRawInput(nowStr);
    setCustomResult('');
    inputRef.current?.focus();
  };

  const handleConfirm = () => {
    if (!formattedResult.trim()) return;
    onInsert(formattedResult);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  // 뷰포트 클램프 위치 계산
  const modalWidth = 350;
  const modalHeight = 440;
  const safeLeft = Math.max(16, Math.min(window.innerWidth - modalWidth - 16, position.left));
  const dropUp = window.innerHeight - position.top < modalHeight + 20;
  const safeTop = dropUp ? Math.max(16, position.top - modalHeight - 8) : Math.max(16, position.top + 6);

  return createPortal(
    <div
      ref={pickerRef}
      role="dialog"
      aria-modal="true"
      aria-label="날짜 및 시간 삽입"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        zIndex: 2147483647,
        top: safeTop,
        left: safeLeft,
        width: `${modalWidth}px`,
      }}
      className={`rounded-2xl shadow-2xl border animate-in zoom-in-95 duration-150 p-4 select-none ${
        isDarkMode
          ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100 backdrop-blur-md'
          : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md'
      }`}
    >
      {/* ── 1. 상단 타이틀 바 ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
            <Calendar size={14} />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">
            날짜 / 시간 삽입
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="닫기 (ESC)"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── 2. 날짜와 시간을 포맷 없이 입력하는 란 ── */}
      <div className="pt-3 pb-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
            <Clock size={12} className="text-[#1d4ed8]" />
            <span>날짜 · 시간 입력 (자유 서식)</span>
          </label>
          <button
            type="button"
            onClick={handleResetToNow}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors flex items-center gap-1"
            title="현재 시간으로 리셋"
          >
            <RotateCcw size={10} />
            <span>현재 시각</span>
          </button>
        </div>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              setCustomResult('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder="예: 20261013 또는 2026-10-13 14:30"
            className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-900 px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
          />
        </div>
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 pl-1">
          ※ 20261013, 14:30 등 자유롭게 입력하면 자동으로 감지됩니다.
        </p>
      </div>

      {/* ── 3. 형식 선택 버튼 그리드 (2열 4행) ── */}
      <div className="pt-2 pb-3">
        <label className="block text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
          적용할 서식 선택
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMAT_PRESETS.map((preset) => {
            const previewText = applyDateFormat(parsedDate, preset.id);
            const isSelected = selectedFormat === preset.id && !customResult;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedFormat(preset.id);
                  setCustomResult('');
                }}
                onDoubleClick={handleConfirm}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#1d4ed8] bg-[#1d4ed8]/10 text-[#1d4ed8] shadow-xs'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300'
                }`}
                title={`${preset.id} 서식 적용 (더블클릭 시 즉시 삽입)`}
              >
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500 truncate">
                  {preset.label}
                </span>
                <span className="block text-[11px] font-bold font-mono truncate mt-0.5">
                  {previewText}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. 적용된 형식 결과 및 삽입 바 ── */}
      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
            적용 결과:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-mono font-bold text-xs truncate max-w-[230px]">
            {formattedResult}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={13} />
            <span>본문에 삽입</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
