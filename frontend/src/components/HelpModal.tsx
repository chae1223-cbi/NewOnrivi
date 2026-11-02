// ====================================================================
// 📊 [OMD-HELP-MODAL-0001] HelpModal.tsx ➔ 오프라인/온라인 도움말 센터 모달
// 🎯 @KICK  : 공식 도움말 문서 열람, 네비게이션 및 내부 링크 인터셉트
// 🛡️ @GUARD : Electron IPC 및 브라우저 fetch 안전 폴백
// 🚨 @PATCH : **2026-10-10** — [HELP-27~29 신규 도움말 챕터 등록 및 PART 8 설정 & 관리 동기화]:
//             1) HELP_DOCS_LIST에 HELP-27~HELP-29 신규 챕터 등록하여 오프라인 데스크톱 앱 및 기본 도움말 목록에 직결 반영
//             2) formatDocTitle에서 HELP-XX_ 접두사 및 언더스코어(_)를 사람이 읽기 좋은 깔끔한 제목으로 자동 변환 처리
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useEffect, useState, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import HelpDocument from '@/components/HelpDocument';
import { stripFrontmatter } from "@/lib/editorUtils";

// 💡 하드코딩된 도움말 파일 목록
const HELP_DOCS_LIST = [
  "00_시작하기.md",
  "HELP-01_온리비_어서_소개와_시작하기.md",
  "HELP-02_에디터_화면_구성과_3단_레이아웃.md",
  "HELP-03_문서_저장과_세션_자동_복구의_차이.md",
  "HELP-04_작업_환경_연결.md",
  "HELP-05_3대_본문_입력_방식.md",
  "HELP-06_마크다운_기본_문법과_줄바꿈_링크.md",
  "HELP-07_목록과_할_일_체크리스트.md",
  "HELP-08_인용구와_콜아웃_알림_상자.md",
  "HELP-09_표_작성과_텍스트_정렬_가이드.md",
  "HELP-10_이미지_미디어_첨부와_리소스_경로_관리.md",
  "HELP-11_서식_관리_센터와_시스템_제공_서식.md",
  "HELP-12_시니어_독자를_위한_추천_조판_가이드.md",
  "HELP-13_나만의_커스텀_서식_설계와_설정.md",
  "HELP-14_서식_백업_가져오기와_AI_맞춤_서식_생성.md",
  "HELP-15_AI_글쓰기_어시스턴트_활용법.md",
  "HELP-16_AI_설정과_API_키_보안_안내.md",
  "HELP-17_지식보관함_색인과_참조_검색.md",
  "HELP-18_수학_수식_작성하기.md",
  "HELP-19_다이어그램과_차트_그리기.md",
  "HELP-20_각주와_주석_달기.md",
  "HELP-21_전자책_EPUB_제작과_제출_전_점검_사항.md",
  "HELP-22_인쇄_출판용_고품질_PDF_내보내기.md",
  "HELP-23_Word_HWP_가져오기와_DOCX_HWPX_내보내기.md",
  "HELP-24_블로그_포스팅용_HTML_간편_복사.md",
  "HELP-25_슬래시_명령어와_플로팅_서식_툴바.md",
  "HELP-26_키보드_단축키_마스터와_사용자_정의.md",
  "HELP-27_환경_설정.md",
  "HELP-28_라이선스_등록_및_기기_세션_동시접속_관리.md",
  "HELP-29_문제_해결과_자주_묻는_질문.md",
  "HELP-30_코드블록_입력_편집_복사.md",
  "HELP-31_그림책_장면_편집과_내보내기.md",
  "HELP-32_문서_연결_달력_날짜_이모지.md"
];

// 파일명에서 표시용 제목 추출
const formatDocTitle = (filename: string) => {
  return filename
    .replace(/^HELP-(\d+)_/, 'HELP-$1: ')
    .replace(/^\d+_/, '')
    .replace(/\.md$/, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content?: string; // 이제 사용하지 않지만 하위호환을 위해 남겨둠
  isDarkMode: boolean;
}

export default function HelpModal({ isOpen, onClose, title = "도움말 센터", isDarkMode }: HelpModalProps) {
  useModalEscape(isOpen, onClose);
  const [mounted, setMounted] = useState(false);
  const [publishedDocs, setPublishedDocs] = useState<Array<{id:string;title:string;content:string}>>([]);
  useEffect(() => { if (!isOpen) return; let active=true; void fetch((window as any).electronAPI ? 'https://onrivi.com/api/help' : '/api/help').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(active && data.documents?.length){setPublishedDocs(data.documents);}}).catch(()=>{}); return ()=>{active=false;}; }, [isOpen]);
  const [currentDoc, setCurrentDoc] = useState<string>(HELP_DOCS_LIST[0]);
  const [docContent, setDocContent] = useState<string>('');
  const [rawContent, setRawContent] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 문서 로딩
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchDoc = async () => {
      setIsLoading(true);
      setSaveMessage('');
      const api = (window as any).electronAPI;
      let rawMd = '';
      
      try {
        const published = publishedDocs.find(doc => doc.id === currentDoc);
        if (published) { rawMd = published.content; } else if (api?.readFromPath) {
          const file = await api.readFromPath(`help/${currentDoc}`);
          rawMd = file.content;
        } else {
          const res = await fetch(`/help/${currentDoc}`);
          if (!res.ok) throw new Error('Not found');
          rawMd = await res.text();
        }
      } catch (e) {
        rawMd = '## 문서를 불러올 수 없습니다.\n\n해당 도움말 파일을 찾을 수 없습니다.';
      }

      if (isMounted) {
        setRawContent(rawMd);
        setDocContent(stripFrontmatter(rawMd));
        setIsLoading(false);
      }
    };

    fetchDoc();
    return () => { isMounted = false; };
  }, [currentDoc, isOpen, publishedDocs]);

  // 내부 링크 클릭 인터셉트
  const handleLinkClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // 상대 경로 마크다운 링크인 경우 (예: ./03_파일-관리.md 또는 01_마크다운에디트란.md)
    if (href.endsWith('.md') && !href.startsWith('http')) {
      e.preventDefault();
      // 파일명만 추출
      const filename = decodeURIComponent(href.split('/').pop() || '');
      if (filename && HELP_DOCS_LIST.includes(filename)) {
        setCurrentDoc(filename);
      }
    } else if (href.startsWith('http')) {
      // 외부 링크인 경우 데스크탑 앱은 외부 브라우저로 띄움
      const api = (window as any).electronAPI;
      if (api?.openExternal) {
        e.preventDefault();
        api.openExternal(href);
      }
    }
  };

  const saveDocumentCopy = async () => {
    try {
      const filename = currentDoc.endsWith('.md') ? currentDoc : `${currentDoc}.md`;
      const api = (window as any).electronAPI;
      if (api?.saveFileAs) {
        const saved = await api.saveFileAs(rawContent, filename);
        if (!saved) return;
      } else if ((window as any).showSaveFilePicker) {
        const handle = await (window as any).showSaveFilePicker({ suggestedName: filename, types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }] });
        const writer = await handle.createWritable();
        try { await writer.write(rawContent); await writer.close(); }
        catch (error) { await writer.abort().catch(() => {}); throw error; }
      } else {
        const url = URL.createObjectURL(new Blob([rawContent], { type: 'text/markdown;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setSaveMessage('도움말 사본을 저장했습니다.');
    } catch (error: any) {
      if (error?.name !== 'AbortError') setSaveMessage('저장하지 못했습니다. 저장 위치와 권한을 확인해 주세요.');
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity ${isDarkMode ? 'dark' : ''}`} style={{ overflowY: "auto" }}>
      <div 
        className="w-full max-w-6xl bg-white dark:bg-zinc-950 rounded-xl shadow-2xl flex flex-col ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEFEF] dark:border-zinc-800 bg-[#F7F8F9] dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <BookOpen size={18} />
            </div>
            <h2 className="text-base font-bold text-[#1d4ed8] tracking-tight">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
          <span role="status" className="text-xs text-zinc-500">{saveMessage}</span>
          <button onClick={() => void saveDocumentCopy()} disabled={isLoading || !rawContent}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-40">문서 저장</button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            title="닫기 (ESC)"
          >
            <X size={18} />
          </button>
          </div>
        </div>

        {/* 2-Pane 레이아웃 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 네비게이션 메뉴 */}
          <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 overflow-y-auto shrink-0 py-4 px-3 flex flex-col gap-1">
            {HELP_DOCS_LIST.map((doc) => {
              const isSelected = currentDoc === doc;
              const displayTitle = formatDocTitle(doc);
              return (
                <button
                  key={doc}
                  onClick={() => setCurrentDoc(doc)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate">{displayTitle}</span>
                  {isSelected && <ChevronRight size={16} className="text-blue-500 opacity-70 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* 우측 마크다운 뷰어 */}
          <div 
            className="flex-1 overflow-y-auto p-8 md:p-12 bg-white dark:bg-zinc-950 scroll-smooth"
            onClick={handleLinkClick}
          >
            {isLoading ? (
              <div className="animate-pulse flex flex-col gap-4 max-w-3xl">
                <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-4/6"></div>
              </div>
            ) : (
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <HelpDocument 
                  content={docContent || "도움말 내용이 없습니다."}
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
