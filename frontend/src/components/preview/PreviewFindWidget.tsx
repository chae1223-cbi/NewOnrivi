"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collectDocumentMatches, replaceDocumentMatches, type DocumentMatch } from '@/lib/documentFind';

interface Props {
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onClose: () => void;
  replaceMode?: boolean;
  replaceEnabled?: boolean;
  documentKey?: string | null;
}

export function PreviewFindWidget({ previewContainerRef, isOpen, onClose, replaceMode = false, replaceEnabled = true, documentKey }: Props) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [showReplace, setShowReplace] = useState(replaceMode);
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useRef<DocumentMatch[]>([]);
  const active = useRef(0);
  const composing = useRef(false);

  const clear = useCallback(() => {
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      (CSS as any).highlights.delete('preview-search');
      (CSS as any).highlights.delete('preview-search-active');
    }
  }, []);
  const reveal = useCallback((next: number, scroll = true) => {
    clear();
    const list = matches.current;
    active.current = list.length ? (next + list.length) % list.length : 0;
    setIndex(list.length ? active.current + 1 : 0);
    if (!list.length) return;
    if ('highlights' in CSS && (window as any).Highlight) {
      const Highlight = (window as any).Highlight;
      (CSS as any).highlights.set('preview-search', new Highlight(...list.map(match => match.range)));
      (CSS as any).highlights.set('preview-search-active', new Highlight(list[active.current].range));
    }
    if (scroll) {
      const range = list[active.current].range;
      const container = previewContainerRef.current;
      if (container && container.scrollHeight > container.clientHeight) {
        const matchRect = range.getBoundingClientRect(), bounds = container.getBoundingClientRect();
        container.scrollTop += matchRect.top - bounds.top - container.clientHeight / 2 + matchRect.height / 2;
      } else range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [clear, previewContainerRef]);
  const search = useCallback((scroll = false) => {
    const container = previewContainerRef.current;
    matches.current = container && query ? collectDocumentMatches(container, query, matchCase) : [];
    setCount(matches.current.length);
    reveal(Math.min(active.current, Math.max(0, matches.current.length - 1)), scroll);
  }, [previewContainerRef, query, matchCase, reveal]);

  useEffect(() => {
    if (!isOpen) { clear(); matches.current = []; setCount(0); return; }
    setShowReplace(replaceMode);
    active.current = 0;
    const timer = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, replaceMode, documentKey, clear]);
  useEffect(() => {
    if (!isOpen) return;
    active.current = 0;
    const initialTimer = setTimeout(() => { if (!composing.current) search(true); }, 100);
    const container = previewContainerRef.current;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (!composing.current) search(); }, 80);
    });
    if (container) observer.observe(container, { childList: true, characterData: true, subtree: true });
    return () => { observer.disconnect(); clearTimeout(initialTimer); clearTimeout(timer); clear(); };
  }, [isOpen, documentKey, search, clear, previewContainerRef]);

  const replace = (all: boolean) => {
    const previousIndex = active.current;
    const selected = all ? matches.current : matches.current.slice(active.current, active.current + 1);
    if (!replaceEnabled || !selected.length) return;
    const viewport = previewContainerRef.current;
    const top = viewport?.scrollTop, left = viewport?.scrollLeft;
    const changed = replaceDocumentMatches(selected, replacement);
    setNotice(changed ? `${changed}곳을 바꿨습니다.` : '본문이 변경되었거나 직접 편집할 수 없는 영역입니다. 다시 찾아 주세요.');
    search(false);
    if (changed && !all) {
      const original = selected[0];
      const next = matches.current.findIndex((match, i) => i >= previousIndex && (match.view !== original.view || match.from >= original.from + replacement.length));
      reveal(next < 0 ? 0 : next, false);
    }
    if (viewport && top !== undefined) { viewport.scrollTop = top; viewport.scrollLeft = left || 0; }
  };
  const keyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || composing.current) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); reveal(active.current + (event.shiftKey ? -1 : 1)); }
  };
  if (!isOpen) return null;
  const currentEditable = !!matches.current[active.current]?.view?.editable;
  const allEditable = count > 0 && matches.current.every(match => match.view?.editable);
  return <section role="search" aria-label="문서 찾기 및 바꾸기" className="preview-find-widget absolute top-3 right-4 z-50 max-w-[calc(100%-2rem)] rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-xl p-3 text-sm" onKeyDown={keyDown}>
    <div className="flex items-center gap-2 flex-wrap">
      <input ref={inputRef} aria-label="문서에서 찾기" placeholder="문서에서 찾기" value={query} onChange={event => { matches.current = []; setCount(0); clear(); setQuery(event.target.value); setNotice(''); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; search(true); }} className="w-44 rounded border p-1 bg-transparent" />
      <span aria-live="polite">{query ? count ? `${index} / ${count}` : '결과 없음' : ''}</span>
      <button type="button" aria-label="이전 찾기" disabled={!count} onClick={() => reveal(active.current - 1)}>↑</button>
      <button type="button" aria-label="다음 찾기" disabled={!count} onClick={() => reveal(active.current + 1)}>↓</button>
      <button type="button" aria-label="닫기" onClick={onClose}>✕</button>
    </div>
    <div className="flex items-center gap-3 mt-2">
      <label><input type="checkbox" checked={matchCase} onChange={event => setMatchCase(event.target.checked)} /> 대소문자 구분</label>
      {replaceEnabled && <button type="button" aria-expanded={showReplace} onClick={() => setShowReplace(value => !value)}>바꾸기 {showReplace ? '접기' : '열기'}</button>}
    </div>
    {showReplace && replaceEnabled && <div className="flex items-center gap-2 mt-2 flex-wrap">
      <input aria-label="바꿀 내용" placeholder="바꿀 내용 (비우면 삭제)" value={replacement} onChange={event => setReplacement(event.target.value)} className="w-44 rounded border p-1 bg-transparent" />
      <button type="button" disabled={!currentEditable} onClick={() => replace(false)}>바꾸기</button>
      <button type="button" disabled={!allEditable} onClick={() => replace(true)}>모두 바꾸기</button>
    </div>}
    {showReplace && count > 0 && !currentEditable && <p className="mt-2 text-xs">직접 편집 가능한 본문에서 바꿀 수 있습니다.</p>}
    {notice && <p role="status" className="mt-2 text-xs">{notice}</p>}
    <style>{`::highlight(preview-search){background:#fde68a;color:#111827}::highlight(preview-search-active){background:#f97316;color:#111827}`}</style>
  </section>;
}
