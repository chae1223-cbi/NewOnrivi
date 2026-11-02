/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-calendar-modal
 * ====================================================================
 * 📊 [OMD-UI-CalendarModal-0001] CalendarModal.tsx ➔ 달력 및 날짜/시간 선택 삽입 모달
 * 🎯 @KICK  : 인터랙티브 월별 달력과 다양한 날짜/시간 서식을 직관적으로 선택하여 본문 커서 위치에 삽입
 * 🛡️ @GUARD : isOpen/mounted false 시 null 반환, ESC 닫기 및 Enter 삽입 단축키 완비
 * 🚨 @PATCH : **2026-10-25** — [슬래시 커맨드 /calendar 등 모달 진입 시 Enter 키 조기 격발 방어 및 ESLint 경고 해소]:
 *             1) 슬래시 자동완성 메뉴나 단축키에서 Enter 키로 달력 호출 시 동일한 Enter 이벤트로 인해 오늘 날짜가 즉시 삽입·닫힘되는 현상 방어
 *             2) canSubmitRef 및 keyup / 200ms 디바운스 가드를 신설하여 달력 UI가 온전히 표시되도록 보장
 *             3) handleConfirm을 useCallback으로 감싸고 useEffect 의존성 배열에 등록하여 react-hooks/exhaustive-deps ESLint 경고 완전 해소
 * 🚨 @PATCH : **2026-10-13** — [전용 인터랙티브 달력 모달(CalendarModal) 신규 구축]:
 *             1) 연/월 이동 및 오늘 바로가기를 지원하는 인터랙티브 월별 달력 그리드 제공
 *             2) 6대 표준 날짜/시간 프리셋(한국어 서식, ISO 표준, 점 표기, 요일 포함) 및 실시간 미리보기 카드 제공
 *             3) 현재 시각(시:분:초) 포함 옵션 토글 및 에디터/문서보기 커서 위치 직접 삽입 지원
 *             4) Modern Technical Editorial 디자인 시스템(Cobalt #1d4ed8, 고대비, 깔끔한 테두리) 적용
 * 🔗 @CALLS : createPortal, Icon, X, ChevronLeft, ChevronRight, Calendar, Clock
 * ====================================================================
 */
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Check } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formattedDate: string) => void;
  isDarkMode?: boolean;
}

const WEEKDAYS = [
  { label: '일', isSunday: true },
  { label: '월' },
  { label: '화' },
  { label: '수' },
  { label: '목' },
  { label: '금' },
  { label: '토', isSaturday: true },
];

export default function CalendarModal({
  isOpen,
  onClose,
  onInsert,
  isDarkMode = false
}: CalendarModalProps) {
  useModalEscape(isOpen, onClose);
  const [mounted, setMounted] = useState(false);
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0 ~ 11
  const [selectedDate, setSelectedDate] = useState(today);
  const [includeTime, setIncludeTime] = useState(false);
  const [includeSeconds, setIncludeSeconds] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('YYYY-MM-DD');
  const [customFormat, setCustomFormat] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDate(now);
      setIncludeTime(false);
      setIncludeSeconds(false);
      setCustomFormat('');
    }
  }, [isOpen]);


  // 이전/다음 월 이동
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(now);
  };

  // 날짜 그리드 셀 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0(일) ~ 6(토)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];

    // 이전 달 날짜
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        year: viewMonth === 0 ? viewYear - 1 : viewYear,
        month: viewMonth === 0 ? 11 : viewMonth - 1,
        date: prevMonthDays - i,
        isCurrentMonth: false,
      });
    }

    // 이번 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        year: viewYear,
        month: viewMonth,
        date: i,
        isCurrentMonth: true,
      });
    }

    // 다음 달 날짜 (6주 42칸 완성)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        year: viewMonth === 11 ? viewYear + 1 : viewYear,
        month: viewMonth === 11 ? 0 : viewMonth + 1,
        date: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // 날짜 포맷팅 헬퍼
  const formatDateString = (dateObj: Date, formatPattern: string, withTime: boolean, withSec: boolean): string => {
    const YYYY = String(dateObj.getFullYear());
    const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const M = String(dateObj.getMonth() + 1);
    const DD = String(dateObj.getDate()).padStart(2, '0');
    const D = String(dateObj.getDate());

    const dayIndex = dateObj.getDay();
    const dayNamesShort = ['일', '월', '화', '수', '목', '금', '토'];
    const dayNamesFull = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const ddd = dayNamesShort[dayIndex];
    const dddd = dayNamesFull[dayIndex];

    const now = new Date();
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    let base = formatPattern
      .replace(/YYYY/g, YYYY)
      .replace(/MM/g, MM)
      .replace(/M/g, M)
      .replace(/DD/g, DD)
      .replace(/D/g, D)
      .replace(/dddd/g, dddd)
      .replace(/ddd/g, ddd);

    if (withTime) {
      const timePart = withSec ? `${HH}:${mm}:${ss}` : `${HH}:${mm}`;
      base += ` ${timePart}`;
    }

    return base;
  };

  // 포맷 프리셋 목록
  const formatPresets = [
    { id: 'YYYY-MM-DD', label: 'ISO 표준', pattern: 'YYYY-MM-DD' },
    { id: 'YYYY년 M월 D일', label: '한글 서식', pattern: 'YYYY년 M월 D일' },
    { id: 'YYYY. MM. DD.', label: '점 표기', pattern: 'YYYY. MM. DD.' },
    { id: 'YYYY-MM-DD (ddd)', label: '요일 약칭', pattern: 'YYYY-MM-DD (ddd)' },
    { id: 'YYYY년 M월 D일 dddd', label: '상세 한글', pattern: 'YYYY년 M월 D일 dddd' },
  ];

  // 최종 결과물 텍스트 계산
  const previewResult = useMemo(() => {
    const pattern = customFormat.trim() || selectedFormat;
    return formatDateString(selectedDate, pattern, includeTime, includeSeconds);
  }, [selectedDate, selectedFormat, customFormat, includeTime, includeSeconds]);

  const handleConfirm = useCallback(() => {
    onInsert(previewResult);
    onClose();
  }, [onInsert, previewResult, onClose]);

  const canSubmitRef = useRef(false);

  // 키보드 ESC 및 Enter 핸들러
  useEffect(() => {
    if (!isOpen) {
      canSubmitRef.current = false;
      return;
    }

    canSubmitRef.current = false;
    const timer = setTimeout(() => {
      canSubmitRef.current = true;
    }, 200);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        canSubmitRef.current = true;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        if (!canSubmitRef.current) return;
        // 인풋 포커스 상태가 아닐 때만 Enter 즉시 삽입
        const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (activeTag !== 'input') {
          e.preventDefault();
          handleConfirm();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handleConfirm]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none"
      style={{ overflowY: 'auto' }}
    >
      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />

      {/* 모달 윈도우 쉘 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
        className={`relative w-full max-w-[620px] rounded-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200 ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* 상단 헤더 */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 id="calendar-modal-title" className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                달력 및 날짜 삽입
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                원하는 날짜와 서식을 선택하여 본문에 삽입합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="닫기 (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 그리드: 좌측 달력 + 우측 서식 옵션 */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* ── 좌측 달력 영역 (7칸) ── */}
          <div className="md:col-span-7 flex flex-col">
            {/* 연/월 네비게이터 */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                  {viewYear}년 {viewMonth + 1}월
                </span>
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors"
                >
                  오늘
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  title="이전 달"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-md text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  title="다음 달"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400 dark:text-zinc-500">
              {WEEKDAYS.map(w => (
                <div
                  key={w.label}
                  className={`py-1 ${w.isSunday ? 'text-red-500' : w.isSaturday ? 'text-blue-500' : ''}`}
                >
                  {w.label}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {calendarDays.map((d, idx) => {
                const isSelected =
                  selectedDate.getFullYear() === d.year &&
                  selectedDate.getMonth() === d.month &&
                  selectedDate.getDate() === d.date;

                const isToday =
                  today.getFullYear() === d.year &&
                  today.getMonth() === d.month &&
                  today.getDate() === d.date;

                const dayOfWeek = idx % 7;
                const isSun = dayOfWeek === 0;
                const isSat = dayOfWeek === 6;

                return (
                  <button
                    key={`${d.year}-${d.month}-${d.date}-${idx}`}
                    type="button"
                    onClick={() => {
                      const newDate = new Date(d.year, d.month, d.date);
                      setSelectedDate(newDate);
                      if (!d.isCurrentMonth) {
                        setViewYear(d.year);
                        setViewMonth(d.month);
                      }
                    }}
                    className={`h-8 w-8 mx-auto rounded-lg flex items-center justify-center font-medium transition-all ${
                      isSelected
                        ? 'bg-[#1d4ed8] text-white font-bold shadow-md scale-105'
                        : isToday
                        ? 'border border-[#1d4ed8] text-[#1d4ed8] font-bold hover:bg-[#1d4ed8]/10'
                        : d.isCurrentMonth
                        ? `hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                            isSun ? 'text-red-600 dark:text-red-400' : isSat ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-zinc-200'
                          }`
                        : 'text-slate-300 dark:text-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    {d.date}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 우측 서식 및 옵션 영역 (5칸) ── */}
          <div className="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 dark:border-zinc-800 md:pl-6 pt-4 md:pt-0">
            <div className="space-y-4">
              {/* 서식 프리셋 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-2">
                  표시 서식 선택
                </label>
                <div className="space-y-1.5">
                  {formatPresets.map(preset => {
                    const sample = formatDateString(selectedDate, preset.pattern, false, false);
                    const isChecked = selectedFormat === preset.pattern && !customFormat;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedFormat(preset.pattern);
                          setCustomFormat('');
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                          isChecked
                            ? 'border-[#1d4ed8] bg-[#1d4ed8]/10 text-[#1d4ed8] font-bold'
                            : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                            {preset.label}
                          </span>
                          <span className="truncate">{sample}</span>
                        </div>
                        {isChecked && <Check size={14} className="text-[#1d4ed8] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 시간 옵션 토글 */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeTime}
                    onChange={(e) => setIncludeTime(e.target.checked)}
                    className="rounded border-slate-300 text-[#1d4ed8] focus:ring-[#1d4ed8]"
                  />
                  <Clock size={14} className="text-slate-400" />
                  <span>현재 시간 포함 (시:분)</span>
                </label>

                {includeTime && (
                  <label className="flex items-center gap-2 cursor-pointer pl-6 text-[11px] text-slate-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={includeSeconds}
                      onChange={(e) => setIncludeSeconds(e.target.checked)}
                      className="rounded border-slate-300 text-[#1d4ed8] focus:ring-[#1d4ed8]"
                    />
                    <span>초(ss) 단위까지 포함</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 하단 실시간 미리보기 및 버튼 바 ── */}
        <div
          className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDarkMode ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          {/* 삽입될 텍스트 미리보기 */}
          <div className="w-full sm:w-auto flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 shrink-0">
              삽입 결과:
            </span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 font-mono font-bold text-xs truncate max-w-[280px]">
              {previewResult}
            </span>
          </div>

          {/* 액션 버튼 */}
          <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>본문에 삽입</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
