// ====================================================================
// 📊 [OMD-PAGE-Home-0025] app/page.tsx ➔ HomePage
// 🎯 @KICK  : Onrivi Author 공식 랜딩페이지 — AI가 만든 글, 바로 문서로 완성하세요 (전체 12개 섹션 구성)
// 🛡️ @GUARD : 헤더(Navbar) 및 풋터(Footer), 기존 요금제(PricingSection) 100% 보존
// 🚨 @PATCH : **2026-09-30** — [REAL-TIME DOCUMENT AUTHORING 및 VERSATILE DOCUMENT RESULTS 섹션 순서 교체]: 사용자 요청에 따라 'VERSATILE DOCUMENT RESULTS(DocumentResultsSection)'를 05번으로 승격하고 'REAL-TIME DOCUMENT AUTHORING(ProductExperienceSection)'를 06번으로 배치하여 파이프라인 이후 즉각적인 결과물 쇼케이스 전개
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: WorkflowSection부터 흰색(#FFFFFF)과 첨부 이미지 색상(#F9FAFC) 1:1 교차 시스템 적용 (Workflow: #FFFFFF, Experience: #F9FAFC, Results: #FFFFFF, Features: #F9FAFC, LocalFirst: #FFFFFF, Pricing: #F9FAFC, CTA: #FFFFFF)
// 🚨 @PATCH : **2026-09-30** — [TransformationSection 제거]: 사용자 요청에 따라 인위적인 Before/After 섹션을 제거하고, 실제 사출 결과물(DocumentResultsSection) 중심의 전문 문서 쇼케이스로 정돈
// 🚨 @PATCH : **2026-09-30** — [랜딩페이지 전체 개선 구현계획서 전면 반영]:
//             01. Navigation (기존 Navbar 유지)
//             02. HERO (AI가 만든 글, 바로 문서로 완성하세요 + 실제 영상 randing_hero.mp4)
//             03. Positioning (AI는 콘텐츠를 만들고, Onrivi는 문서를 완성합니다)
//             04. Workflow (INPUT -> AI -> MARKDOWN -> ONRIVI -> DOCUMENT 5단계)
//             05. Core Product Experience (작성하면서 결과를 바로 확인하세요 + 강릉 여행 문서 + SPLIT VIEW 인터랙티브)
//             06. Document Results (하나의 콘텐츠, 다양한 문서로 — PDF, EPUB, HTML, Print)
//             07. Core Features (6대 핵심 기능 2x3 Grid)
//             08. Local First (내 문서는, 내 컴퓨터에)
//             09. Pricing (현행 요금제 유지)
//             10. Final CTA (AI가 만든 콘텐츠를 당신의 문서로 완성하세요)
//             11. Footer (기존 Footer 유지)
// ====================================================================
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { PositioningSection } from "@/components/sections/PositioningSection";
import { WorkflowSection } from "@/components/sections/WorkflowSection";
import { ProductExperienceSection } from "@/components/sections/ProductExperienceSection";
import { DocumentResultsSection } from "@/components/sections/DocumentResultsSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { LocalFirstSection } from "@/components/sections/LocalFirstSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { BetaModal } from "@/components/ui/BetaModal";

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Onrivi Author",
            "operatingSystem": "Windows, macOS",
            "applicationCategory": "BusinessApplication",
            "description": "AI가 만든 글, 바로 문서로 완성하세요. Markdown으로 작성하고 실시간으로 확인하는 출판급 조판 문서 저작 도구.",
            "offers": {
              "@type": "Offer",
              "price": "구독형",
              "priceCurrency": "KRW"
            },
            "author": {
              "@type": "Organization",
              "name": "Onrivi"
            }
          })
        }}
      />
      <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#0A0D14] text-[#0F172A] dark:text-[#E8ECE9] font-sans selection:bg-[#1d4ed8]/20 selection:text-[#1d4ed8]">
        {/* 01. Navigation */}
        <Navbar />

        {/* 02. HERO */}
        <HeroSection />

        {/* 03. Positioning */}
        <PositioningSection />

        {/* 04. Workflow */}
        <WorkflowSection />

        {/* 05. Document Results (VERSATILE DOCUMENT RESULTS) */}
        <DocumentResultsSection />

        {/* 06. Core Product Experience (REAL-TIME DOCUMENT AUTHORING) */}
        <ProductExperienceSection />

        {/* 07. Core Features */}
        <FeaturesSection />

        {/* 09. Local First */}
        <LocalFirstSection />

        {/* 10. Pricing */}
        <PricingSection />

        {/* 11. Final CTA */}
        <CtaSection />

        {/* 12. Footer */}
        <Footer />
      </div>
      <BetaModal />
    </>
  );
}
