"use client";

// ====================================================================
// 📊 [OMD-CORE-docs-page-0001] page ➔ HelpCenterPage
// 🎯 @KICK  : 공식 도움말 웹 센터 (https://onrivi.com/docs)
// 🛡️ @GUARD : 30개 공식 챕터(HELP-01~29 + 00_시작하기) 전면 현행화 및 내부 링크 100% 무결점 점프
// 🚨 @PATCH : **2026-10-11** — [관리자 페이지 R2 게시본 실시간 무인 동기화 파이프라인 탑재]:
//             1) /api/help를 통해 R2 클라우드에 게시(Publish)된 최신 문서를 실시간 취득하여 정적 파일보다 1순위로 즉시 렌더링
//             2) 관리자 페이지에서 도움말 수정/게시 시 코드 재배포 없이 웹(/docs)에 0초 즉각 자동 반영 확립
// 🚨 @PATCH : **2026-10-11** — [공식 도움말 센터 전면 현행화 및 마크다운 내부 링크 점프 인터셉트 결함 완벽 해결]:
//             1) HELP_DOCS_LIST를 신규 29개 챕터(HELP-01~HELP-29) 및 00_시작하기 30종 체계로 전면 현행화
//             2) 8대 파트(PART 1~8) 카테고리 그룹핑 및 목차 실시간 검색 필터 추가
//             3) decodeURIComponent 및 지능형 챕터 번호 매칭을 적용하여 본문 내 링크(/help/HELP-XX...md) 클릭 시 100% 정상 점프 확립
//             4) 문서 전환 시 뷰어 상단 스크롤 리셋 및 URL 쿼리 파라미터(?doc=...) 양방향 동기화 탑재
// 🚨 @PATCH : **2026-07-06** — 도움말 센터를 HelpModal과 동일한 마크다운 동적 렌더링 2-Pane 구조로 전면 개편 패치
// 🔗 @CALLS : Navbar, Footer, MarkdownViewer
// ====================================================================
import React, { useEffect, useState, useRef, MouseEvent, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookOpen, ChevronRight, Search, FileText } from "lucide-react";
import HelpDocument from '@/components/HelpDocument';
import { stripFrontmatter } from "@/lib/editorUtils";
import initialHelpAssets from '@/lib/helpAssets.json';

interface HelpCategory {
  title: string;
  docs: string[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    title: "목차 및 빠른 안내",
    docs: [
      "00_시작하기.md"
    ]
  },
  {
    title: "PART 1. 빠른 시작",
    docs: [
      "HELP-01_온리비_어서_소개와_시작하기.md",
      "HELP-02_에디터_화면_구성과_3단_레이아웃.md",
      "HELP-03_문서_저장과_세션_자동_복구의_차이.md",
      "HELP-04_작업_환경_연결.md"
    ]
  },
  {
    title: "PART 2. 마크다운 기본 입력",
    docs: [
      "HELP-05_3대_본문_입력_방식.md",
      "HELP-06_마크다운_기본_문법과_줄바꿈_링크.md",
      "HELP-07_목록과_할_일_체크리스트.md",
      "HELP-08_인용구와_콜아웃_알림_상자.md",
      "HELP-09_표_작성과_텍스트_정렬_가이드.md",
      "HELP-10_이미지_미디어_첨부와_리소스_경로_관리.md"
    ]
  },
  {
    title: "PART 3. 출판 서식 & 조판 테마",
    docs: [
      "HELP-11_서식_관리_센터와_시스템_제공_서식.md",
      "HELP-12_시니어_독자를_위한_추천_조판_가이드.md",
      "HELP-13_나만의_커스텀_서식_설계와_설정.md",
      "HELP-14_서식_백업_가져오기와_AI_맞춤_서식_생성.md"
    ]
  },
  {
    title: "PART 4. AI 어시스턴트 & 지식보관함",
    docs: [
      "HELP-15_AI_글쓰기_어시스턴트_활용법.md",
      "HELP-16_AI_설정과_API_키_보안_안내.md",
      "HELP-17_지식보관함_색인과_참조_검색.md"
    ]
  },
  {
    title: "PART 5. 고급 수식 & 다이어그램",
    docs: [
      "HELP-18_수학_수식_작성하기.md",
      "HELP-19_다이어그램과_차트_그리기.md",
      "HELP-20_각주와_주석_달기.md"
    ]
  },
  {
    title: "PART 6. 출판 내보내기 & 문서 변환",
    docs: [
      "HELP-21_전자책_EPUB_제작과_제출_전_점검_사항.md",
      "HELP-22_인쇄_출판용_고품질_PDF_내보내기.md",
      "HELP-23_Word_HWP_가져오기와_DOCX_HWPX_내보내기.md",
      "HELP-24_블로그_포스팅용_HTML_간편_복사.md"
    ]
  },
  {
    title: "PART 7. 생산성 & 단축키",
    docs: [
      "HELP-25_슬래시_명령어와_플로팅_서식_툴바.md",
      "HELP-26_키보드_단축키_마스터와_사용자_정의.md"
    ]
  },
  {
    title: "PART 8. 설정 & 관리",
    docs: [
      "HELP-27_환경_설정.md",
      "HELP-28_라이선스_등록_및_기기_세션_동시접속_관리.md",
      "HELP-29_문제_해결과_자주_묻는_질문.md"
    ]
  },
  {
    title: "PART 9. 코드·그림책·문서 도구",
    docs: [
      "HELP-30_코드블록_입력_편집_복사.md",
      "HELP-31_그림책_장면_편집과_내보내기.md",
      "HELP-32_문서_연결_달력_날짜_이모지.md"
    ]
  }
];

// 전체 33종 공식 문서 목록
const HELP_DOCS_LIST = HELP_CATEGORIES.flatMap(c => c.docs);

// 파일명에서 표시용 제목 추출
const formatDocTitle = (filename: string) => {
  return filename
    .replace(/^HELP-(\d+)_/, 'HELP-$1: ')
    .replace(/^\d+_/, '')
    .replace(/\.md$/, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
};

export default function HelpCenterPage() {
  const [mounted, setMounted] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<string>(HELP_DOCS_LIST[0]);
  const [publishedDocs, setPublishedDocs] = useState<Array<{ id: string; title: string; content: string; order?: number }>>([]);
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // R2 클라우드에 게시(Publish)된 최신 도움말 목록 실시간 취득
  useEffect(() => {
    let active = true;
    void fetch('/api/help')
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => {
        if (active && Array.isArray(data.documents) && data.documents.length > 0) {
          setPublishedDocs(data.documents);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // 초기 URL 쿼리 파라미터(?doc=...) 반영
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get('doc');
    if (docParam) {
      try {
        const decodedParam = decodeURIComponent(docParam);
        const targetParam = decodedParam.endsWith('.md') ? decodedParam : `${decodedParam}.md`;
        const matched = HELP_DOCS_LIST.find(d => d === targetParam) ||
                        HELP_DOCS_LIST.find(d => d.replace(/\.md$/, '') === decodedParam) ||
                        HELP_DOCS_LIST.find(d => {
                          const num = targetParam.match(/^HELP-\d+/i)?.[0]?.toUpperCase();
                          return num && d.toUpperCase().startsWith(num);
                        });
        if (matched) {
          setCurrentDoc(matched);
        }
      } catch (_) {}
    }
  }, []);

  // 문서 로딩 (1순위: 관리자 R2 게시본 -> 2순위: 정적 마크다운 파일)
  useEffect(() => {
    let isMounted = true;
    const fetchDoc = async () => {
      setIsLoading(true);
      let rawMd = '';
      
      // 1순위: 관리자가 관리자 페이지에서 게시(Publish)한 R2 문서 우선 매칭
      const targetNum = currentDoc.match(/^HELP-(\d+)/i)?.[1];
      const published = publishedDocs.find(doc => {
        if (doc.id === currentDoc || doc.id === currentDoc.replace(/\.md$/, '')) return true;
        const asset = initialHelpAssets.find(a => a.file_name === currentDoc);
        if (asset && doc.id === asset.id) return true;
        if (targetNum) {
          const docNum = doc.id.match(/^HELP-(\d+)/i)?.[1] || doc.title.match(/^HELP-(\d+)/i)?.[1];
          if (docNum && parseInt(docNum, 10) === parseInt(targetNum, 10)) return true;
        }
        return false;
      });

      if (published && published.content) {
        rawMd = published.content;
      } else {
        // 2순위: R2 게시본이 없는 경우 정적 파일 로드
        try {
          const res = await fetch(`/help/${encodeURIComponent(currentDoc)}`);
          if (!res.ok) {
            // 인코딩 없는 원본 경로 폴백 시도
            const fallbackRes = await fetch(`/help/${currentDoc}`);
            if (!fallbackRes.ok) throw new Error('Not found');
            rawMd = await fallbackRes.text();
          } else {
            rawMd = await res.text();
          }
        } catch (e) {
          rawMd = '## 문서를 불러올 수 없습니다.\n\n해당 도움말 파일을 찾을 수 없습니다.';
        }
      }

      if (isMounted) {
        setDocContent(stripFrontmatter(rawMd));
        setIsLoading(false);
      }
    };

    fetchDoc();
    return () => { isMounted = false; };
  }, [currentDoc, publishedDocs]);

  // 문서 변경 핸들러
  const handleSelectDoc = (doc: string) => {
    setCurrentDoc(doc);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?doc=${encodeURIComponent(doc.replace(/\.md$/, ''))}`);
      contentContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 내부 링크 클릭 인터셉트 (마크다운 내부 링크 완전 연결)
  const handleLinkClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // 외부 웹 링크는 브라우저 기본 이동/새창에 위임
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return;
    }

    // 마크다운 내부 링크 처리 (.md, /help/, 상대경로 등)
    if (href.includes('.md') || href.includes('/help/') || href.startsWith('#')) {
      e.preventDefault();
      
      // 인라인 앵커(#)만 있는 경우 부드러운 스크롤 점프
      if (href.startsWith('#')) {
        const id = decodeURIComponent(href.slice(1));
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      // 1. 쿼리/해시 분리 및 불필요 문자 제거
      const cleanHref = href.replace(/[<>]/g, '').trim();
      const [pathOnly] = cleanHref.split('#');
      const [cleanPath] = pathOnly.split('?');
      let baseName = cleanPath.split('/').pop() || '';
      try {
        baseName = decodeURIComponent(baseName);
      } catch (_) {}

      if (!baseName.endsWith('.md')) {
        baseName += '.md';
      }

      // 2. 지능형 챕터 매칭
      // a) 완전 일치
      let matched = HELP_DOCS_LIST.find(d => d === baseName);

      // b) HELP-XX 번호 기반 매칭
      if (!matched) {
        const matchNum = baseName.match(/^HELP-\d+/i)?.[0]?.toUpperCase();
        if (matchNum) {
          matched = HELP_DOCS_LIST.find(d => d.toUpperCase().startsWith(matchNum));
        }
      }

      // c) 파일명 핵심 키워드 매칭
      if (!matched) {
        const pureName = baseName.replace(/\.md$/, '').replace(/^HELP-\d+_/, '');
        matched = HELP_DOCS_LIST.find(d => d.includes(pureName));
      }

      // d) 시작하기 매칭
      if (!matched && (baseName.includes('시작') || baseName.includes('00_'))) {
        matched = "00_시작하기.md";
      }

      if (matched) {
        handleSelectDoc(matched);
      }
    }
  };

  // 검색어 필터링 카테고리 계산
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return HELP_CATEGORIES;
    const term = searchTerm.toLowerCase();
    return HELP_CATEGORIES.map(category => {
      const filteredDocs = category.docs.filter(doc => {
        const title = formatDocTitle(doc).toLowerCase();
        return title.includes(term) || doc.toLowerCase().includes(term);
      });
      return {
        ...category,
        docs: filteredDocs
      };
    }).filter(category => category.docs.length > 0);
  }, [searchTerm]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 transition-colors duration-200">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 히어로 헤더 */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="text-[#1d4ed8] dark:text-blue-400 text-xs font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-100/50 dark:border-blue-900/30">
              ONRIVI HELP CENTER
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mt-4 tracking-tight leading-tight">
              Onrivi Author 사용 설명서
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-4 leading-relaxed font-medium">
              마크다운 기초부터 전문 출판 조판, 전자책(EPUB)·PDF 사출, AI 어시스턴트 및 트러블슈팅까지 총 29개 공식 챕터를 제공합니다.
            </p>
          </div>

          {/* 2-Pane 레이아웃 */}
          <div className="flex flex-col md:flex-row bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[750px]">
            
            {/* 좌측 사이드바 네비게이션 */}
            <aside className="w-full md:w-80 lg:w-88 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/70 shrink-0 p-4 flex flex-col gap-3">
              
              {/* 검색창 */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="도움말 검색 (예: 수식, PDF, AI)..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:border-[#1d4ed8] text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* 목차 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto max-h-[700px] [scrollbar-gutter:stable] pr-1 space-y-4">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    검색 결과가 없습니다.
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div key={category.title} className="space-y-1">
                      <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                        {category.title}
                      </div>
                      <div className="space-y-0.5">
                        {category.docs.map((doc) => {
                          const isSelected = currentDoc === doc;
                          const title = formatDocTitle(doc);
                          const isHelpChapter = doc.startsWith('HELP-');
                          const chapterNum = isHelpChapter ? doc.match(/^HELP-(\d+)/)?.[1] : null;

                          return (
                            <button
                              key={doc}
                              onClick={() => handleSelectDoc(doc)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                                isSelected 
                                  ? 'bg-[#1d4ed8] text-white shadow-xs font-bold' 
                                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {chapterNum ? (
                                  <span className={`text-[10px] font-black shrink-0 px-1.5 py-0.5 rounded ${
                                    isSelected 
                                      ? 'bg-white/20 text-white' 
                                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                  }`}>
                                    {chapterNum}
                                  </span>
                                ) : (
                                  <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                )}
                                <span className="truncate">{title.replace(/^HELP-\d+:\s*/, '')}</span>
                              </div>
                              {isSelected && <ChevronRight size={14} className="text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* 우측 본문 마크다운 뷰어 */}
            <div 
              ref={contentContainerRef}
              className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto max-h-[850px]"
              onClick={handleLinkClick}
            >
              {isLoading ? (
                <div className="animate-pulse flex flex-col gap-4 max-w-3xl">
                  <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded w-1/3 mb-6"></div>
                  <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-4/6"></div>
                </div>
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-[#1d4ed8] dark:prose-a:text-blue-400 prose-a:font-bold hover:prose-a:underline">
                  <HelpDocument 
                    content={docContent || "도움말 내용이 없습니다."}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
