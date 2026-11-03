/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.2.0
 * 프로그램 ID : oaar-bibliography-summary
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-11-03** — [참고문헌 삭제 버튼(개별/전체) 신설 및 디자인 시스템 완전 통합]:
 *             1) 각 참고문헌 카드 우측에 호버 삭제 버튼(✕)을 배치하여 클릭 시 본문 인용 태그 자동 제거 및 목록 즉시 삭제 연동
 *             2) 참고문헌 헤더 우측에 '전체 삭제' 버튼을 신설하여 문서 내 모든 참고문헌을 한 번에 정리 가능하도록 지원
 *             3) 각주(Footnotes) 영역과 100% 동일한 규격의 '📖 참고문헌 (References)' 배지 헤더, 구분선, 라운드 카드 서식 적용
 */

import React from 'react';
import { citedKeys, parseBibliography } from '@/lib/bibliography';

interface BibliographySummaryProps {
  source: string;
  content: string;
  onDeleteCitation?: (key: string) => void;
  onDeleteAll?: () => void;
}

/**
 * 📊 [OMD-COMPONENT-BIBLIOGRAPHY-0001] BibliographySummary
 * 🎯 @KICK  : 문서 내 인용된 서지 정보를 분석하여 문서 하단에 디자인 시스템 표준에 맞춘 참고문헌 목록 렌더링 및 삭제 제어
 */
export default function BibliographySummary({ source, content, onDeleteCitation, onDeleteAll }: BibliographySummaryProps) {
  const parsed = React.useMemo(() => parseBibliography(content), [content]);
  const keys = citedKeys(source);
  const used = new Set(keys.map(k => k.toLowerCase()));
  const entries = parsed.entries
    .filter(e => used.has(e.key.toLowerCase()))
    .sort((a, b) => (a.author || a.key).localeCompare(b.author || b.key, 'ko'));
  const missing = keys.filter(k => !parsed.entries.some(e => e.key.toLowerCase() === k.toLowerCase()));

  if (!keys.length) return null;

  return (
    <section className="visual-bibliography-area references mt-8 pt-4 select-text" aria-label="참고문헌" contentEditable={false}>
      {/* 📌 참고문헌 헤더 구분선 (각주 영역 헤더와 100% 통일) */}
      <div className="visual-bibliography-area-header select-none mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="visual-bibliography-area-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold whitespace-nowrap">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
              <path d="M6 6h10"/>
              <path d="M6 10h10"/>
            </svg>
            <span className="visual-bibliography-area-title">참고문헌 (References)</span>
          </span>
          <div className="flex-1 border-t-2 border-slate-300/80 dark:border-slate-700/80"></div>
          {onDeleteAll && (
            <button
              type="button"
              onClick={onDeleteAll}
              className="text-xs font-medium text-slate-400 hover:text-red-500 px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
              title="문서 내 모든 참고문헌 인용 삭제"
            >
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {/* 에러 및 경고 안내 */}
      {parsed.error && (
        <div role="alert" className="p-2 mb-2 text-xs rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          {parsed.error}
        </div>
      )}
      {parsed.duplicates.length > 0 && (
        <div role="alert" className="p-2 mb-2 text-xs rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          중복 인용키: {parsed.duplicates.join(', ')}
        </div>
      )}
      {missing.length > 0 && (
        <div role="alert" className="p-2 mb-2 text-xs rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          등록된 문헌 없음: {missing.join(', ')}. 참조문헌 관리에서 등록해 주세요.
        </div>
      )}

      {/* 📖 참고문헌 목록 카드 */}
      <div className="space-y-1.5">
        {entries
          .filter(e => !parsed.duplicates.some(k => k.toLowerCase() === e.key.toLowerCase()))
          .map((e, index) => (
            <div
              id={'bib-' + encodeURIComponent(e.key)}
              key={e.key}
              className="visual-bibliography-entry group flex items-start gap-2.5 px-3 py-2 rounded-md bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-blue-400/60 dark:hover:border-blue-600/60 transition-all text-sm leading-relaxed text-slate-700 dark:text-slate-200"
            >
              <span className="visual-bibliography-badge font-bold text-blue-700 dark:text-blue-400 select-none whitespace-nowrap pt-0.5 shrink-0">
                [{index + 1}]
              </span>
              <div className="flex-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1.5">{e.author || e.key}</span>
                {e.year && <span className="text-slate-500 dark:text-slate-400 mr-1.5">({e.year}).</span>}
                <span className="font-medium text-slate-800 dark:text-slate-200 mr-1.5">{e.title}.</span>
                {(e.journal || e.publisher) && (
                  <span className="italic text-slate-600 dark:text-slate-300 mr-1.5">{e.journal || e.publisher}.</span>
                )}
                {e.doi ? (
                  <a
                    href={`https://doi.org/${e.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    https://doi.org/{e.doi}
                  </a>
                ) : e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {e.url}
                  </a>
                ) : null}
              </div>
              {onDeleteCitation && (
                <button
                  type="button"
                  onClick={() => onDeleteCitation(e.key)}
                  className="visual-bibliography-delete-btn p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer transition-colors shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  title={`참고문헌 [${e.key}] 본문 인용 삭제`}
                  aria-label={`참고문헌 ${e.key} 삭제`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
