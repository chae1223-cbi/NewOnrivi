// ====================================================================
// 📊 [OMD-UI-PreviewToolbar-0001] PreviewToolbar ➔ PreviewToolbar
// 🎯 @KICK  : 미리보기(Preview) 전용 컨트롤러 — 텍스트 찾기, 배율 확대/축소(50%~200%), 100% 리셋 및 마크다운/서식 복사 지원
// 🛡️ @GUARD : 인쇄 시 no-print로 자동 숨김 처리, 문서 가독성을 해치지 않도록 미세 투명도 및 호버 시 완전 노출
// 🚨 @PATCH : **2026-10-24** — [복사 핸들러 비동기 연동 및 복사 실패 시 체크마크 오표시 방지]:
//             1) onCopyPreview 및 onCopyMarkdown에 Promise<void> 비동기 지원
//             2) try/catch로 복사 완료 시에만 녹색 체크마크 표시하여 실제 복사 성공 여부 100% 일치
// 🚨 @PATCH : **2026-10-20** — [미리보기 전용 컨트롤 툴바에 '마크다운(MD) 원본 복사' 버튼 추가]:
//             1) onCopyMarkdown 프롭 및 Lucide 디자인 표준 규격의 정밀한 Markdown(M↓) 라인 아이콘 신설
//             2) 마크다운 원본 복사(onCopyMarkdown) 및 서식 본문 복사(onCopyPreview)를 분리하여 원클릭 선택 복사 편의성 강화
//             3) 복사 성공 시 각각 녹색 체크(Check) 아이콘 피드백 2초간 제공 및 직관적인 툴팁 분리 안내
// 🚨 @PATCH : **2026-10-15** — [미리보기 전용 컨트롤 툴바에 '바꾸기(Replace)' 버튼 추가 및 화면 흔들림 방어]:
//             1) 찾기(Search) 버튼 바로 우측에 바꾸기(Replace, Ctrl+H) 원클릭 토글 버튼 신설
//             2) 찾기(Find) 및 바꾸기(Replace) 모드 간 상호 전환 및 활성 상태 하이라이트 분리 지원
//             3) 버튼 활성화 시 font-semibold로 인한 폰트 폭 팽창 및 transition-all 제거로 툴바 미세 떨림 방지
// 🚨 @PATCH : **2026-09-30** — [미리보기 전용 컨트롤 툴바 단축키 툴팁 최신화 및 충돌 방지]:
//             1. 🔍 찾기: Ctrl+Alt+F (전역 직접 토글) / 미리보기 포커스 시 Ctrl+F
//             2. ➖ 축소: Ctrl+- (Ctrl+Wheel), 🏷️ 배율 리셋: Ctrl+0, ➕ 확대: Ctrl+= (Ctrl+Wheel)
//             3. 📋 클립보드 복사 원클릭 버튼 연동
// 🔗 @CALLS : ZoomIn, ZoomOut, RotateCcw, Search, Replace, Copy, Check, MarkdownIcon
// ====================================================================
"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, Search, Replace, Copy, Check } from "lucide-react";

/**
 * Lucide 아이콘 표준 규격(24x24 그리드, 2px stroke, round caps/joins)과 100% 일치하는 라인 스타일 Markdown(M↓) 아이콘
 */
function MarkdownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15V9l2.5 3L12 9v6" />
      <path d="M16 9v6" />
      <path d="M14 13l2 2 2-2" />
    </svg>
  );
}

interface PreviewToolbarProps {
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleFind: () => void;
  isFindOpen: boolean;
  onToggleReplace?: () => void;
  isReplaceOpen?: boolean;
  onCopyPreview?: () => void | Promise<void>;
  onCopyMarkdown?: () => void | Promise<void>;
}

export function PreviewToolbar({
  zoomScale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleFind,
  isFindOpen,
  onToggleReplace,
  isReplaceOpen,
  onCopyPreview,
  onCopyMarkdown,
}: PreviewToolbarProps) {
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const handleCopyPreview = async () => {
    if (onCopyPreview) {
      try {
        await onCopyPreview();
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      } catch (err) {
        console.warn('[PreviewToolbar] onCopyPreview failed:', err);
      }
    }
  };

  const handleCopyMarkdown = async () => {
    if (onCopyMarkdown) {
      try {
        await onCopyMarkdown();
        setCopiedMarkdown(true);
        setTimeout(() => setCopiedMarkdown(false), 2000);
      } catch (err) {
        console.warn('[PreviewToolbar] onCopyMarkdown failed:', err);
      }
    }
  };

  const percentage = Math.round(zoomScale * 100);

  return (
    <div
      aria-label="미리보기 제어 도구 모음"
      className="preview-toolbar-root no-print absolute top-3 right-4 z-40 flex items-center gap-0.5 p-1 bg-white/85 dark:bg-zinc-800/85 backdrop-blur-md border border-slate-200/90 dark:border-zinc-700/80 shadow-md rounded-xl text-slate-700 dark:text-zinc-200 opacity-70 hover:opacity-100 transition-opacity duration-200 select-none"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      {/* 🔍 텍스트 찾기 토글 버튼 */}
      <button
        type="button"
        onClick={onToggleFind}
        title="미리보기에서 찾기 (단축키: Ctrl+Alt+F / 미리보기 포커스 시 Ctrl+F)"
        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
          isFindOpen && !isReplaceOpen
            ? "bg-blue-600 text-white font-semibold shadow-xs"
            : "hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200"
        }`}
      >
        <Search className="w-3.5 h-3.5" />
      </button>

      {/* 🔀 텍스트 바꾸기 토글 버튼 */}
      {onToggleReplace && (
        <button
          type="button"
          onClick={onToggleReplace}
          title="미리보기에서 바꾸기 (단축키: Ctrl+H)"
          className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
            isFindOpen && isReplaceOpen
              ? "bg-blue-600 text-white font-semibold shadow-xs"
              : "hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200"
          }`}
        >
          <Replace className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 구분선 */}
      <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-zinc-700 mx-0.5" />

      {/* ➖ 축소 버튼 */}
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoomScale <= 0.5}
        title="미리보기 축소 (Ctrl + - / 미리보기 위 Ctrl + Wheel)"
        className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* 🏷️ 배율 리셋 (100% 버튼) */}
      <button
        type="button"
        onClick={onZoomReset}
        title="원래 크기(100%)로 복귀 (Ctrl + 0)"
        className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        {percentage}%
      </button>

      {/* ➕ 확대 버튼 */}
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoomScale >= 2.0}
        title="미리보기 확대 (Ctrl + = / 미리보기 위 Ctrl + Wheel)"
        className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      {/* 복사 버튼 그룹 */}
      {(onCopyMarkdown || onCopyPreview) && (
        <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-zinc-700 mx-0.5" />
      )}

      {/* 📝 마크다운 원본 복사 버튼 */}
      {onCopyMarkdown && (
        <button
          type="button"
          onClick={handleCopyMarkdown}
          title={copiedMarkdown ? "마크다운 복사 완료!" : "마크다운(MD) 원본 복사"}
          aria-label="마크다운 원본 복사"
          className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors flex items-center gap-1"
        >
          {copiedMarkdown ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <MarkdownIcon className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* 📋 미리보기 서식 본문 복사 (HTML/블로그용) 버튼 */}
      {onCopyPreview && (
        <button
          type="button"
          onClick={handleCopyPreview}
          title={copiedHtml ? "서식 복사 완료!" : "미리보기 서식 본문 복사 (HTML/블로그용)"}
          aria-label="미리보기 서식 본문 복사"
          className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors flex items-center gap-1"
        >
          {copiedHtml ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
