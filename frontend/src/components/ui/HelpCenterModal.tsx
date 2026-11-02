// ====================================================================
// 📊 [OMD-UI-HelpCenterModal-0002] HelpCenterModal ➔ HelpCenterModal
// 🎯 @KICK  : Onrivi Author 도움말 문서를 아코디언 메뉴와 함께 딤드 배경 모달 형식으로 노출하고 markdown 실시간 렌더링 지원
// 🛡️ @GUARD : 모달 비활성 상태(open이 false)일 때 로딩 방지; 네트워크 에러 시 오류 메시지 표시 처리
// 🚨 @PATCH : **2026-10-11** — [랜딩 도움말 모달 30개 공식 챕터 전면 현행화 및 내부 링크 점프 연동]:
//             1) articles 목록을 HELP-01~29 및 00_시작하기 30종 공식 목록으로 동기화
//             2) 마크다운 내부 링크 클릭 시 해당 챕터로 즉각 점프하도록 인터셉트 핸들러 추가
// 🚨 @PATCH : **2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치
// 🔗 @CALLS : loadArticle, stripFrontmatter, mdToHtml
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import ReactMarkdown from 'react-markdown';
import { useEffect, useState, useCallback, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Loader2, Book } from "lucide-react";

const articles = [
  { id: "00_시작하기", file: "00_시작하기.md", title: "시작하기" },
  { id: "HELP-01", file: "HELP-01_온리비_어서_소개와_시작하기.md", title: "HELP-01: 온리비 어서 소개와 시작하기" },
  { id: "HELP-02", file: "HELP-02_에디터_화면_구성과_3단_레이아웃.md", title: "HELP-02: 에디터 화면 구성과 3단 레이아웃" },
  { id: "HELP-03", file: "HELP-03_문서_저장과_세션_자동_복구의_차이.md", title: "HELP-03: 문서 저장과 세션 자동 복구의 차이" },
  { id: "HELP-04", file: "HELP-04_작업_환경_연결.md", title: "HELP-04: 작업 환경 연결" },
  { id: "HELP-05", file: "HELP-05_3대_본문_입력_방식.md", title: "HELP-05: 3대 본문 입력 방식" },
  { id: "HELP-06", file: "HELP-06_마크다운_기본_문법과_줄바꿈_링크.md", title: "HELP-06: 마크다운 기본 문법과 줄바꿈·링크" },
  { id: "HELP-07", file: "HELP-07_목록과_할_일_체크리스트.md", title: "HELP-07: 목록과 할 일 체크리스트" },
  { id: "HELP-08", file: "HELP-08_인용구와_콜아웃_알림_상자.md", title: "HELP-08: 인용구와 콜아웃 알림 상자" },
  { id: "HELP-09", file: "HELP-09_표_작성과_텍스트_정렬_가이드.md", title: "HELP-09: 표 작성과 텍스트 정렬 가이드" },
  { id: "HELP-10", file: "HELP-10_이미지_미디어_첨부와_리소스_경로_관리.md", title: "HELP-10: 이미지·미디어 첨부와 리소스 경로 관리" },
  { id: "HELP-11", file: "HELP-11_서식_관리_센터와_시스템_제공_서식.md", title: "HELP-11: 서식 관리 센터와 시스템 제공 서식" },
  { id: "HELP-12", file: "HELP-12_시니어_독자를_위한_추천_조판_가이드.md", title: "HELP-12: 시니어 독자를 위한 추천 조판 가이드" },
  { id: "HELP-13", file: "HELP-13_나만의_커스텀_서식_설계와_설정.md", title: "HELP-13: 나만의 커스텀 서식 설계와 설정" },
  { id: "HELP-14", file: "HELP-14_서식_백업_가져오기와_AI_맞춤_서식_생성.md", title: "HELP-14: 서식 백업·가져오기와 AI 맞춤 서식 생성" },
  { id: "HELP-15", file: "HELP-15_AI_글쓰기_어시스턴트_활용법.md", title: "HELP-15: AI 글쓰기 어시스턴트 활용법" },
  { id: "HELP-16", file: "HELP-16_AI_설정과_API_키_보안_안내.md", title: "HELP-16: AI 설정과 API 키 보안 안내" },
  { id: "HELP-17", file: "HELP-17_지식보관함_색인과_참조_검색.md", title: "HELP-17: 지식보관함 색인과 참조 검색" },
  { id: "HELP-18", file: "HELP-18_수학_수식_작성하기.md", title: "HELP-18: 수학 수식 작성하기" },
  { id: "HELP-19", file: "HELP-19_다이어그램과_차트_그리기.md", title: "HELP-19: 다이어그램과 차트 그리기" },
  { id: "HELP-20", file: "HELP-20_각주와_주석_달기.md", title: "HELP-20: 각주와 주석 달기" },
  { id: "HELP-21", file: "HELP-21_전자책_EPUB_제작과_제출_전_점검_사항.md", title: "HELP-21: 전자책(EPUB) 제작과 제출 전 점검 사항" },
  { id: "HELP-22", file: "HELP-22_인쇄_출판용_고품질_PDF_내보내기.md", title: "HELP-22: 인쇄/출판용 고품질 PDF 내보내기" },
  { id: "HELP-23", file: "HELP-23_Word_HWP_가져오기와_DOCX_HWPX_내보내기.md", title: "HELP-23: Word·HWP 문서 가져오기와 DOCX·HWPX 내보내기" },
  { id: "HELP-24", file: "HELP-24_블로그_포스팅용_HTML_간편_복사.md", title: "HELP-24: 블로그 포스팅용 HTML 간편 복사" },
  { id: "HELP-25", file: "HELP-25_슬래시_명령어와_플로팅_서식_툴바.md", title: "HELP-25: 슬래시 명령어와 플로팅 서식 툴바" },
  { id: "HELP-26", file: "HELP-26_키보드_단축키_마스터와_사용자_정의.md", title: "HELP-26: 키보드 단축키 마스터와 사용자 정의" },
  { id: "HELP-27", file: "HELP-27_환경_설정.md", title: "HELP-27: 환경 설정" },
  { id: "HELP-28", file: "HELP-28_라이선스_등록_및_기기_세션_동시접속_관리.md", title: "HELP-28: 라이선스 등록 및 기기 세션 동시접속 관리" },
  { id: "HELP-29", file: "HELP-29_문제_해결과_자주_묻는_질문.md", title: "HELP-29: 문제 해결과 자주 묻는 질문" }
];

function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\n*/, "");
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpCenterModal({ open, onClose }: Props) {
  useModalEscape(open, onClose);
  const [selected, setSelected] = useState(articles[0]);
  const [publishedDocs, setPublishedDocs] = useState<Array<{id:string;title:string;content:string}>>([]);
  useEffect(() => {
    if(!open) return;
    let active = true;
    void fetch('/api/help')
      .then(r => { if(!r.ok) throw Error(); return r.json(); })
      .then(data => {
        if(active && data.documents?.length) {
          setPublishedDocs(data.documents);
          setSelected({id:data.documents[0].id, file:data.documents[0].id, title:data.documents[0].title});
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [open]);

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const loadArticle = useCallback(async (article: typeof articles[0]) => {
    setLoading(true);
    try {
      const published = publishedDocs.find(doc => doc.id === article.id);
      if (published) {
        setContent(stripFrontmatter(published.content));
        setLoading(false);
        return;
      }
      const res = await fetch(`/help/${encodeURIComponent(article.file)}`);
      if (!res.ok) {
        const fbRes = await fetch(`/help/${article.file}`);
        if (!fbRes.ok) throw new Error();
        const text = await fbRes.text();
        setContent(stripFrontmatter(text));
      } else {
        const text = await res.text();
        setContent(stripFrontmatter(text));
      }
    } catch {
      setContent("내용을 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [publishedDocs]);

  useEffect(() => {
    if (!open) return;
    loadArticle(selected);
  }, [selected, open, loadArticle]);

  // 내부 링크 클릭 인터셉트
  const handleLinkClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('http://') || href.startsWith('https://')) return;

    if (href.includes('.md') || href.includes('/help/')) {
      e.preventDefault();
      const cleanHref = href.replace(/[<>]/g, '').trim();
      const [pathOnly] = cleanHref.split('#');
      const [cleanPath] = pathOnly.split('?');
      let baseName = cleanPath.split('/').pop() || '';
      try { baseName = decodeURIComponent(baseName); } catch (_) {}
      if (!baseName.endsWith('.md')) baseName += '.md';

      const found = articles.find(a => a.file === baseName) ||
                    articles.find(a => {
                      const num = baseName.match(/^HELP-\d+/i)?.[0]?.toUpperCase();
                      return num && a.file.toUpperCase().startsWith(num);
                    });
      if (found) {
        setSelected(found);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ overflowY: "auto" }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-5xl bg-white dark:bg-gray-950 rounded-2xl shadow-2xl flex border border-gray-200 dark:border-gray-800"
            style={{ maxHeight: "90dvh" }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="w-72 flex-shrink-0 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-6 pt-2">
                <Book className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-gray-900 dark:text-white">도움말 목차 (30)</span>
              </div>
              <nav className="space-y-1">
                {(publishedDocs.length ? publishedDocs.map(doc=>({id:doc.id,file:doc.id,title:doc.title})) : articles).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between gap-1.5 ${
                      selected.id === a.id
                        ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                    }`}
                  >
                    <span className="truncate">{a.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${selected.id === a.id ? "text-indigo-500" : "text-transparent"}`} />
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{selected.title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6" onClick={handleLinkClick}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <div className="prose prose-gray dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
