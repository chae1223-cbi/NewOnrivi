// ====================================================================
// 📊 [OMD-PAGE-knowledgeLayout-0001] layout.tsx ➔ Knowledge Engine Standalone Page Layout
// 🎯 @KICK  : /knowledge 독립 페이지 레이아웃 및 메타데이터 정의
// 🛡️ @GUARD : 풀스크린 뷰포트 보장, LDSG v5.0 테마 준수
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 모달 대신 독립 전용 페이지(/knowledge) 제공을 위한 레이아웃 신규 생성
// 🔗 @CALLS : 없음
// ====================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onrivi Knowledge Engine - 로컬 지식 관리 센터 | 온리비 어서',
  description: '중앙 서버 비개입 100% 로컬 SQLite FTS5 기반 대량 문서 수집, 분석, 색인, 하이브리드 검색 및 AI 질의응답 허브',
};

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen overflow-hidden bg-[#FAFBFC] dark:bg-[#121316] text-zinc-900 dark:text-zinc-100 flex flex-col">
      {children}
    </div>
  );
}
