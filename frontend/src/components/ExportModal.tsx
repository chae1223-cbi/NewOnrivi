"use client";
// 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 전용 출력 포맷('sns') 및 옵션 설정 패널 신설]: 인스타그램·쓰레드·링크드인 공유용 카드 비율(1:1 정사각 / 4:5 세로형 / 16:9 와이드), 카드 나누기 기준(자동/구분선/H1), 슬라이드 번호 표시, 저장 방식(낱장 PNG / ZIP 묶음) UI 추가

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PrintPaginationPreview from '@/components/PrintPaginationPreview';
import { readPaginationSettings, emptyPagination, type DocumentPaginationSettings, type PrintBreakAnchor } from '@/lib/documentPaginationSettings';
import { readEffectivePrintSettings, DocumentPrintSettings, DEFAULT_PRINT_SETTINGS, normalizePrintSettings, saveDefaultWatermarkSettings, hasDocumentPrintSettings } from '@/lib/documentPrintSettings';
import { createPortal } from 'react-dom';
import { Download, Printer, Globe, Image as ImageIcon, X, Check, BookOpen, FileText, Smartphone } from 'lucide-react';

/**
 * [ONR-UI-011] ExportModalProps 인터페이스
 * @description 완성된 마크다운을 타 포맷으로 내보내는 팝업창인 ExportModal에 주입되는 프롭 명세입니다.
 */
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'print' | 'docx' | 'hwpx' | 'html' | 'png' | 'epub' | 'sns', currentSettings?: any, pagination?:DocumentPaginationSettings) => void;
  isSnsCardProfile?: boolean;
  defaultSnsRatio?: '1:1' | '4:5';
  isDarkMode: boolean;
  isPicturebook?: boolean;
  documentId?:string;
  documentContent?:string;
  onPrintSettingsChange?:(settings:DocumentPrintSettings)=>void;
  onOpenWatermarkSettings?:()=>void;
  onPagePreview?:(settings:DocumentPrintSettings,signal:AbortSignal,pagination:DocumentPaginationSettings)=>Promise<string|void>;
  onPaginationSettingsChange?:(settings:DocumentPaginationSettings)=>void;
}

/**
 * [ONR-UI-012] ExportModal 컴포넌트 함수
 * @description 에디터에서 완성된 문서를 OS 인쇄(미리보기+PDF저장), Word(.docx), HTML, EPUB 전자책, PNG 이미지 포맷 중 선택하여 내보내기 요청을 처리하는 모달 창입니다.
 */
// ====================================================================
// 📊 [OMD-IO-ExportModal-0001] ExportModal ➔ ExportModal
// 🎯 @KICK  : OS 인쇄(미리보기+PDF저장)/Word/HTML/EPUB/PNG 포맷 선택 및 내보내기 요청을 처리하는 모달 창
// 🛡️ @GUARD : isOpen 및 mounted 상태 모두 true일 때만 포털 렌더링
// 🚨 @PATCH : **2026-10-27** — [내보내기 모달 'SNS 카드뉴스 출력(sns)' 포맷 및 비율·분할·저장 방식 제어 UI 신설]: 인스타그램·쓰레드·링크드인용 카드별 PNG 일괄 출력(1:1 / 4:5 / 16:9, 구분선/H1 분할, 낱장 PNG / ZIP 묶음 저장) 옵션 탑재
// 🚨 @PATCH : **2026-10-21** — [모달 진입 시 무한 대기 프리즈 방어 및 인쇄/저장 즉시 실행 보장]:
//             1) 모달 오픈 시 쪽 윤곽(Paged.js) 미리보기 자동 실행(setPreviewOpen=true)을 비활성화(false)하여 무거운 페이지 계산으로 인한 모달 멈춤 원천 차단
//             2) 쪽 윤곽 미리보기를 사용자가 원할 때만 실행할 수 있도록 '쪽 윤곽 미리보기 펼치기/접기' 토글 버튼 UI 개선
//             3) 쪽 윤곽 계산 중(busy)이거나 미리보기 실패 시에도 메인 [인쇄 / PDF 저장] 버튼이 잠기지 않도록 개선하여 즉시 인쇄/저장 가능 보장
// 🚨 @PATCH : **2026-10-20** — [ESLint react-hooks/exhaustive-deps 경고 해소]: 모달 오픈 및 문서 변경 초기화 effect에서 contentRef/isPicturebookRef를 활용하여 의존성 누락 경고 및 불필요한 포맷 리셋 방어
// 🚨 @PATCH : **2026-10-20** — [내보내기 모달 워터마크 사용 여부(토글) 및 종류(문구/이미지) 즉석 선택 UI 탑재]:
//             1) 내보내기(ExportModal) 화면에서 워터마크 사용/미사용 및 문구(텍스트)/이미지 종류를 즉시 선택할 수 있는 직관적인 세그먼트 컨트롤 배치
//             2) 문구 선택 시 출력 텍스트 직접 입력창 노출 및 진하기(투명도 5%~60%) 슬라이더 간편 조절 기능 제공
//             3) 변경 시 saveDefaultWatermarkSettings 및 onrivi:watermark_changed 이벤트 연동으로 쪽 윤곽 미리보기 실시간 갱신 및 PDF/인쇄 즉각 반영
// 🚨 @PATCH : **2026-10-19** — [useEffect cleanup 시점 generation ref 캡처를 통한 ESLint react-hooks 경고 해소]: cleanup 클로저 내부에서 변경 가능한 generation.current 대신 로컬 캡처 변수 gen 참조
// 🚨 @PATCH : **2026-10-19** — [모달 뒷배경 고농도 암전(bg-black/80) 제거 및 은은한 반투명 딤(bg-black/25) 최적화]: 과도하게 시커멓게 뒤덮이던 80% 블랙 오버레이를 25% 초미세 블러(backdrop-blur-xs)로 개선하여 에디터 화면 시인성 확보
// 🚨 @PATCH : **2026-10-19** — [워터마크 미지정 시 기본 엠블럼 및 Onrivi Author 자동 연동]: 이미지 미등록 시 기본 엠블럼 자동 적용, 문구 미입력 시 Onrivi Author 자동 적용
// 🚨 @PATCH : **2026-10-19** — [EPUB 전자책 내보내기 워터마크 지원 및 환경설정 기본 워터마크 자동 반영]: ExportModal에서 EPUB 선택 시에도 워터마크 설정 노출, 문서 설정 부재 시 readEffectivePrintSettings(환경설정 기본값) 자동 계승
// 🚨 @PATCH : **2026-10-01** — [한글(.hwpx) 내보내기 옵션 삭제]: 모달 선택 옵션에서 한글 문서(.hwpx) 항목 제거
// 🚨 @PATCH : **2026-09-30** — Word 문서(.docx) 내보내기 옵션 추가
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-07-18** — 워터마크 입력창 타이핑 시 keydown 이벤트가 document.body로 전파되어 Monaco getModifierState 크래시가 발생하는 결함 해결을 위해 최외각 wrapper에 stopPropagation 가드 장착; 인쇄 모달 내 즉석 워터마크(pdfUseWatermark, pdfWatermark, pdfWatermarkOpacity) 설정 UI 추가 개편
//             PDF/HTML → OS 인쇄(print) 통합 후 HTML 파일 저장 별도 추가; icon/label/desc 변경
// 🔗 @CALLS : 없음
// ====================================================================
export default function ExportModal({ 
  isOpen, 
  onClose, 
  onExport, 
  isDarkMode,
  isPicturebook = false,
  isSnsCardProfile = false,
  defaultSnsRatio = '1:1',
  documentId,documentContent='',onPrintSettingsChange,onPagePreview,onOpenWatermarkSettings,onPaginationSettingsChange,
}: ExportModalProps) {
  useModalEscape(isOpen, onClose);
  const [selectedFormat, setSelectedFormat] = useState<'print' | 'docx' | 'hwpx' | 'html' | 'png' | 'epub' | 'sns'>('print');
  const [snsRatio, setSnsRatio] = useState<'1:1' | '4:5' | '16:9'>(defaultSnsRatio);
  const [snsSplitMode, setSnsSplitMode] = useState<'auto' | 'hr' | 'h1'>('auto');
  const [snsShowPageNumber, setSnsShowPageNumber] = useState<boolean>(true);
  const [snsSaveMode, setSnsSaveMode] = useState<'files' | 'zip'>('files');
  const [mounted, setMounted] = useState(false);
  const [settings,setSettings]=useState<DocumentPrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [pagination,setPagination]=useState<DocumentPaginationSettings>(emptyPagination);
  const [appliedPagination,setAppliedPagination]=useState('');
  const [adjusting,setAdjusting]=useState(false);
  const [largePreview,setLargePreview]=useState(false),[showOutputSettings,setShowOutputSettings]=useState(false);
  const [past,setPast]=useState<DocumentPaginationSettings[]>([]),[future,setFuture]=useState<DocumentPaginationSettings[]>([]);
  const changePagination=useCallback((next:DocumentPaginationSettings)=>{
    setPast(previous=>[...previous,pagination]);setFuture([]);setPagination(next);
  },[pagination]);
  const toggleBreak=useCallback((anchor:PrintBreakAnchor,existingId?:string)=>{
    const id=existingId || anchor.id;
    const exists=pagination.breaks.some(a=>a.id===id);
    changePagination({version:1,breaks:exists?pagination.breaks.filter(a=>a.id!==id):[...pagination.breaks,anchor]});
  },[pagination,changePagination]);
  const [pageHtml,setPageHtml]=useState(''),[previewOpen,setPreviewOpen]=useState(false),[busy,setBusy]=useState(false),[printError,setPrintError]=useState(''),[isExporting,setIsExporting]=useState(false);
  const generation=useRef(0),currentDocument=useRef(documentId),previewCallback=useRef(onPagePreview);
  const settingsRef=useRef(settings);settingsRef.current=settings;
  const contentRef=useRef(documentContent);contentRef.current=documentContent;
  const isPicturebookRef=useRef(isPicturebook);isPicturebookRef.current=isPicturebook;
  currentDocument.current=documentId;previewCallback.current=onPagePreview;
  const isSnsCardProfileRef=useRef(isSnsCardProfile);isSnsCardProfileRef.current=isSnsCardProfile;
  const defaultSnsRatioRef=useRef(defaultSnsRatio);defaultSnsRatioRef.current=defaultSnsRatio;
  useEffect(()=>{generation.current++;const value=normalizePrintSettings(readEffectivePrintSettings(contentRef.current));settingsRef.current=value;setSettings(value);setSelectedFormat(isSnsCardProfileRef.current ? 'sns' : 'print');setSnsRatio(defaultSnsRatioRef.current || '1:1');setPageHtml('');setPreviewOpen(false);setPrintError('');setBusy(false);setIsExporting(false);},[isOpen,documentId]);
  useEffect(()=>{
    const value=readPaginationSettings(contentRef.current);
    setPagination(value);setAppliedPagination(JSON.stringify(value));setAdjusting(false);setPast([]);setFuture([]);
    setLargePreview(false);setShowOutputSettings(false);
  },[isOpen,documentId]);
  useEffect(()=>{
    if(!isOpen)return;
    const refresh=()=>setSettings(normalizePrintSettings(readEffectivePrintSettings(documentContent)));
    window.addEventListener('onrivi:watermark_changed',refresh);
    return()=>window.removeEventListener('onrivi:watermark_changed',refresh);
  },[isOpen,documentContent]);
  useEffect(()=>{
    if(!isOpen || !previewOpen || selectedFormat!=='print' || isPicturebook || !previewCallback.current)return;
    const request=++generation.current;setBusy(true);setPrintError('');
    const controller=new AbortController();
    const timer=setTimeout(()=>{void previewCallback.current?.(settings,controller.signal,pagination).then(html=>{
      if(generation.current!==request)return;
      if(!html)throw new Error('미리보기를 준비하지 못했습니다.');
      setPageHtml(html);setBusy(false);
    }).catch(error=>{if(generation.current===request){setPrintError(error.message);setBusy(false);}});},500);
    const gen = generation;
    return ()=>{clearTimeout(timer);controller.abort();if(gen.current===request)gen.current++;};
  },[isOpen,previewOpen,selectedFormat,settings,documentContent,isPicturebook,pagination]);

  const updateWatermarkSettings = (updater: (prev: DocumentPrintSettings) => DocumentPrintSettings) => {
      const next = normalizePrintSettings(updater(settingsRef.current));
      settingsRef.current = next;
      setSettings(next);
      saveDefaultWatermarkSettings(next);
      if (documentContent && hasDocumentPrintSettings(documentContent)) {
        onPrintSettingsChange?.(next);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('onrivi:watermark_changed', { detail: next }));
      }
  };

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => { if (isPicturebook && (selectedFormat === 'docx' || selectedFormat === 'hwpx')) setSelectedFormat('print'); }, [isPicturebook, selectedFormat]);

  if (!isOpen) return null;
  if (!mounted) return null;
  const pageView=previewOpen && selectedFormat==='print' && !isPicturebook;

  const formats = [
    { id: 'print', label: "인쇄 / PDF 출력", desc: "OS 인쇄 미리보기 후 프린터 출력 또는 PDF 저장", icon: <Printer size={20} className="text-red-500" /> },
    { id: 'docx', label: "Word 문서 (.docx)", desc: "MS Word 및 구글 Docs 완벽 호환 문서", icon: <FileText size={20} className="text-blue-600" /> },
    { id: 'hwpx', label: "한글 문서 (.hwpx)", desc: "한컴오피스에서 편집할 수 있는 문서", icon: <FileText size={20} className="text-cyan-600" /> },
    { id: 'html', label: "HTML 파일", desc: "웹 브라우저에서 바로 열기용 (.html)", icon: <Globe size={20} className="text-blue-500" /> },
    { id: 'epub', label: "EPUB 전자책", desc: "eBook 리더 및 태블릿 기기용", icon: <BookOpen size={20} className="text-purple-500" /> },
    { id: 'png', label: "PNG 이미지 (단일 통이미지)", desc: "문서 전체를 세로로 긴 1장의 이미지로 저장", icon: <ImageIcon size={20} className="text-green-500" /> },
    { id: 'sns', label: "SNS 카드뉴스 출력", desc: "인스타그램·쓰레드·링크드인용 카드별 PNG 일괄 저장 (1:1 / 4:5)", icon: <Smartphone size={20} className="text-pink-500" /> },
  ].filter(format => !isPicturebook || (format.id !== 'docx' && format.id !== 'hwpx'));

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/25 dark:bg-black/50 backdrop-blur-xs animate-in fade-in duration-200" 
      style={{ overflowY: "auto" }}
      onKeyDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <div 
        className={`w-full ${previewOpen?'max-w-6xl':'max-w-lg'} rounded-2xl shadow-2xl border flex flex-col ${
          isDarkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-black/5 text-zinc-900'
        } animate-in zoom-in-95 duration-200`}
        style={{ display:'flex',flexDirection:'column',maxHeight: pageView && largePreview?'96dvh':'90dvh', height:pageView?(largePreview?'96dvh':'90dvh'):undefined, maxWidth:pageView && largePreview?'none':undefined, overflow: "hidden" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEFEF] dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <Download size={18} />
            </div>
            <h2 className="text-base font-bold tracking-tight text-[#1d4ed8]">{pageView?'인쇄 미리보기':'내보내기'}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2" style={{ fontFamily: "Pretendard, sans-serif",flex:1,minHeight:0, display:pageView && !showOutputSettings?'flex':undefined,flexDirection:'column',overflow:pageView && !showOutputSettings?'hidden':undefined }}>
          {pageView && <div style={{flexShrink:0}}><button type="button" onClick={()=>setShowOutputSettings(v=>!v)} className="text-xs border rounded px-2 py-1">{showOutputSettings?'출력 설정 접기':'출력 설정 펼치기'}</button></div>}
          {(!pageView || showOutputSettings) && <>
          <p className="text-[13px] opacity-60 px-1 mb-3">저장할 파일 형식을 선택해주세요.</p>
          
          <div className="grid grid-cols-1 gap-2">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id as any)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                  selectedFormat === format.id 
                    ? (isDarkMode ? 'bg-[#1d4ed8]/20 border-[#1d4ed8]/60' : 'bg-[#1d4ed8]/10 border-[#1d4ed8]')
                    : (isDarkMode ? 'bg-black/20 border-white/5 hover:border-white/20' : 'bg-black/5 border-black/5 hover:border-black/20')
                }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${isDarkMode ? 'bg-black/40' : 'bg-white shadow-sm'}`}>
                  {format.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm flex items-center justify-between">
                    {format.label}
                    {selectedFormat === format.id && <Check size={16} className="text-[#1d4ed8]" />}
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5">{format.desc}</div>
                </div>
              </button>
            ))}
          </div>
          </>}
          {selectedFormat === 'sns' && (
            <section className="mt-4 space-y-3 border-t border-slate-200 dark:border-white/10 pt-4" aria-label="SNS 카드뉴스 출력 설정">
              <div className="rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50/50 dark:bg-pink-950/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-pink-500" />
                    <span>SNS 카드뉴스 규격 및 분할 설정</span>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold font-mono">
                    {snsRatio === '1:1' ? '1080×1080px' : snsRatio === '4:5' ? '1080×1350px' : '1920×1080px'}
                  </span>
                </div>

                {/* 1. 카드 비율 */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">1. SNS 카드 비율</span>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: '1:1', label: '1:1 정사각형', sub: '인스타·쓰레드 표준' },
                      { id: '4:5', label: '4:5 세로형', sub: '인스타 피드 확장' },
                      { id: '16:9', label: '16:9 와이드', sub: '슬라이드·유튜브' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSnsRatio(opt.id as any)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          snsRatio === opt.id
                            ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] font-extrabold shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold'
                        }`}
                      >
                        <div>{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 ${snsRatio === opt.id ? 'text-blue-100' : 'text-slate-500 dark:text-zinc-400'}`}>{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. 카드 나누기 기준 */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">2. 카드(장면) 나누기 기준</span>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'auto', label: '자동 감지 (추천)', sub: '--- 구분선 / # 대제목' },
                      { id: 'hr', label: '구분선 (---)', sub: '수평선마다 새 카드' },
                      { id: 'h1', label: '대제목 (# H1)', sub: '# 제목마다 새 카드' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSnsSplitMode(opt.id as any)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          snsSplitMode === opt.id
                            ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] font-extrabold shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold'
                        }`}
                      >
                        <div>{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 ${snsSplitMode === opt.id ? 'text-blue-100' : 'text-slate-500 dark:text-zinc-400'}`}>{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 저장 방식 및 페이지 번호 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-pink-200/60 dark:border-pink-900/40">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snsShowPageNumber}
                      onChange={e => setSnsShowPageNumber(e.target.checked)}
                      className="rounded accent-[#1d4ed8]"
                    />
                    <span>슬라이드 번호 표시 (01 / 05)</span>
                  </label>

                  <div className="inline-flex p-0.5 rounded-lg bg-slate-200/90 dark:bg-zinc-700/90 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSnsSaveMode('files')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        snsSaveMode === 'files'
                          ? 'bg-[#1d4ed8] text-white font-bold shadow-xs'
                          : 'text-slate-700 dark:text-zinc-300 font-medium'
                      }`}
                    >
                      낱장 PNG 저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnsSaveMode('zip')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        snsSaveMode === 'zip'
                          ? 'bg-[#1d4ed8] text-white font-bold shadow-xs'
                          : 'text-slate-700 dark:text-zinc-300 font-medium'
                      }`}
                    >
                      ZIP 묶음 저장
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
          {(selectedFormat==='print' || selectedFormat==='epub') && !isPicturebook && <section className="mt-4 space-y-3 border-t border-slate-200 dark:border-white/10 pt-4" style={pageView?{display:'flex',flexDirection:'column',flex:1,minHeight:showOutputSettings?undefined:0,marginTop:0,paddingTop:8}:undefined} aria-label="페이지 및 워터마크 설정">
            {(!pageView || showOutputSettings) && <>
            <p className="text-xs opacity-75">{selectedFormat==='print' ? '아래 쪽 윤곽이 실제 인쇄/PDF 기준입니다. 용지·방향·여백은 서식관리 설정을 사용합니다.' : 'EPUB의 워터마크는 아래 설정을 적용하여 사출합니다.'}</p>

            {/* 🛡️ 워터마크 인터랙티브 설정 컨트롤 카드 */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-slate-50/80 dark:bg-zinc-800/60 p-3.5 space-y-3">
              {/* 1. 워터마크 사용 여부 선택 토글 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">워터마크 적용</span>
                  {settings.enabled && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold">
                      {settings.kind === 'text' ? '문구' : '이미지'} · {settings.opacity}%
                    </span>
                  )}
                </div>
                <div className="inline-flex p-0.5 rounded-lg bg-slate-200/90 dark:bg-zinc-700/90 text-xs">
                  <button
                    type="button"
                    onClick={() => updateWatermarkSettings(prev => ({ ...prev, enabled: false }))}
                    className={`px-3 py-1 rounded-md transition-all ${!settings.enabled ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'}`}
                  >
                    사용 안 함
                  </button>
                  <button
                    type="button"
                    onClick={() => updateWatermarkSettings(prev => ({ ...prev, enabled: true }))}
                    className={`px-3 py-1 rounded-md transition-all ${settings.enabled ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'}`}
                  >
                    사용
                  </button>
                </div>
              </div>

              {/* 2. 워터마크 사용 시 세부 설정 */}
              {settings.enabled && (
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-700 space-y-2.5">
                  {/* 종류 선택 (문구 vs 이미지) */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">워터마크 종류</span>
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-200/90 dark:bg-zinc-700/90 text-xs">
                      <button
                        type="button"
                        onClick={() => updateWatermarkSettings(prev => ({ ...prev, kind: 'text' }))}
                        className={`px-3 py-1 rounded-md transition-all ${settings.kind === 'text' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'}`}
                      >
                        문구 (텍스트)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWatermarkSettings(prev => ({ ...prev, kind: 'image' }))}
                        className={`px-3 py-1 rounded-md transition-all ${settings.kind === 'image' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 font-medium'}`}
                      >
                        이미지
                      </button>
                    </div>
                  </div>

                  {/* 세부 입력창: 문구일 때 */}
                  {settings.kind === 'text' ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">출력 문구</label>
                      <input
                        type="text"
                        value={settings.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateWatermarkSettings(prev => ({ ...prev, text: val }));
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="워터마크 문구 입력"
                        maxLength={100}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-slate-200/70 dark:border-zinc-700/60 text-xs">
                      <p className="text-slate-700 dark:text-zinc-300 font-medium">🖼️ 리소스 이미지 워터마크</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">공식 엠블럼 또는 Onrivi_Asset 폴더의 워터마크 이미지가 사출됩니다.</p>
                    </div>
                  )}

                  {/* 진하기(투명도) 슬라이더 */}
                  <div className="flex items-center justify-between gap-3 text-xs pt-1">
                    <span className="text-slate-600 dark:text-zinc-400 shrink-0">
                      진하기: <strong className="text-slate-900 dark:text-zinc-100">{settings.opacity}%</strong>
                    </span>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={settings.opacity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateWatermarkSettings(prev => ({ ...prev, opacity: val }));
                      }}
                      className="w-32 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* 하단 환경설정 링크 */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-500 dark:text-zinc-400">
                <span>상세 위치·각도 설정</span>
                <button
                  type="button"
                  onClick={onOpenWatermarkSettings}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  환경설정에서 관리 ➔
                </button>
              </div>
            </div>
            </>}
            {selectedFormat==='print' && (
              <div className="mt-3 flex flex-col gap-2" style={pageView?{display:'flex',flexDirection:'column',flex:1,minHeight:showOutputSettings?540:0}:undefined}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={()=>{setPreviewOpen(v=>!v);setLargePreview(false);setShowOutputSettings(false);}}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-zinc-300"
                  >
                    <span>{previewOpen ? '쪽 윤곽 미리보기 접기 ▲' : '쪽 윤곽 미리보기 펼치기 ▼'}</span>
                  </button>
                  {previewOpen && pageHtml && !busy && !printError && (
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      총 {pageHtml.match(/data-onrivi-pages="(\d+)"/)?.[1] || '—'}페이지
                    </span>
                  )}
                </div>

                {previewOpen && busy && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 py-1 font-medium">
                    <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>페이지를 계산하고 있습니다...</span>
                  </div>
                )}
                {previewOpen && printError && (
                  <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                    쪽 윤곽 미리보기를 불러올 수 없습니다 ({printError}). 설정을 확인한 뒤 다시 시도해 주세요.
                  </div>
                )}
                {previewOpen && pageHtml && !printError && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button type="button" aria-pressed={adjusting} onClick={()=>setAdjusting(v=>!v)} className="border rounded-lg px-3 py-2">{adjusting?'조정 마치기':'페이지 나누기 조정'}</button>
                      <button type="button" disabled={!past.length||busy} onClick={()=>{setFuture(next=>[pagination,...next]);setPagination(past[past.length-1]);setPast(p=>p.slice(0,-1));}} className="border rounded px-2 py-1 disabled:opacity-40">실행취소</button>
                      <button type="button" disabled={!future.length||busy} onClick={()=>{setPast(p=>[...p,pagination]);setPagination(future[0]);setFuture(f=>f.slice(1));}} className="border rounded px-2 py-1 disabled:opacity-40">다시실행</button>
                      <button type="button" disabled={!pagination.breaks.length||busy} onClick={()=>changePagination(emptyPagination())} className="border rounded px-2 py-1 disabled:opacity-40">출력용 나누기 전체 해제</button>
                      <button type="button" disabled={JSON.stringify(pagination)===appliedPagination||!onPaginationSettingsChange||busy} onClick={()=>{onPaginationSettingsChange?.(pagination);setAppliedPagination(JSON.stringify(pagination));}} className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-40">문서에 적용</button>
                    </div>
                    {adjusting && <p className="text-xs text-slate-500">+ 위치부터 다음 페이지로 보냅니다. ×는 나누기를 해제합니다. Tab으로 이동하고 Enter로 선택할 수 있습니다.</p>}
                    <p className="text-xs text-slate-500">원본 본문은 분리하지 않습니다. 적용한 설정은 문서를 저장하면 함께 보관됩니다. 미적용 조정은 이번 출력에만 사용됩니다.</p>
                    {Number(pageHtml.match(/data-onrivi-unresolved-count="(\d+)"/)?.[1] || 0)>0 && <p role="status" className="text-xs text-amber-700">위치 확인이 필요한 나누기가 있습니다. 목록에서 해제하거나 위치를 다시 지정한 뒤 출력해 주세요.</p>}
                    {Number(pageHtml.match(/data-onrivi-oversized-count="(\d+)"/)?.[1] || 0)>0 && <p role="status" className="text-xs text-amber-700">용지 높이를 넘는 표 행·그림·수식이 있습니다. 내용이나 용지 설정을 조정해 주세요.</p>}
                    {!!pagination.breaks.length && <details className="text-xs" style={{maxHeight:100,overflowY:'auto',flexShrink:0}}><summary>지정한 나누기 {pagination.breaks.length}개</summary><ul>{pagination.breaks.map(anchor=><li key={anchor.id} className="flex gap-2 py-1"><span>{(pageHtml.match(/data-onrivi-unresolved-ids="([^"]*)"/)?.[1]||'').split(',').includes(anchor.id)?'위치 확인 필요 · ':''}{anchor.text.slice(0,70)||'빈 코드 줄'}</span><button type="button" onClick={()=>toggleBreak(anchor,anchor.id)}>해제</button></li>)}</ul></details>}
                    <PrintPaginationPreview html={pageHtml} editing={adjusting} busy={busy} onToggle={toggleBreak} onEscape={onClose} expanded={largePreview} onExpand={()=>{setLargePreview(v=>!v);setShowOutputSettings(false);}} />
                  </>
                )}
              </div>
            )
          }</section>}
        </div>

        <div className={`flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-black/5 bg-black/5'}`}>
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'
            }`}
          >
            취소
          </button>
          <button 
            disabled={isExporting}
            onClick={async () => {
              if (isExporting) return;
              setIsExporting(true);
              try {
                await onExport(
                  selectedFormat as any,
                  selectedFormat === 'sns'
                    ? { ratio: snsRatio, splitMode: snsSplitMode, showPageNumber: snsShowPageNumber, saveMode: snsSaveMode }
                    : settings,
                  pagination
                );
              } finally {
                setIsExporting(false);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-[#1d4ed8]/20 transition-all flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>처리 중...</span>
              </>
            ) : (
              <>
                {selectedFormat === 'print' ? <Printer size={16} /> : <Download size={16} />}
                <span>{selectedFormat === 'print' ? '인쇄 / PDF 저장' : selectedFormat === 'sns' ? 'SNS 카드뉴스 출력하기' : '파일 생성 및 저장'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
