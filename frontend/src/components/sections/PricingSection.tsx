// ====================================================================
// 📊 [OMD-UI-PricingSection-0023 ✅ FIXED] PricingSection ➔ PricingSection
// 🎯 @KICK  : Onrivi Author 서비스 멤버십 가격표 출력
// 🚨 @PATCH : **2026-09-30** — [랜딩 섹션 교차 배경색 표준화]: PricingSection 배경색을 #F9FAFC로 적용하여 상하 화이트 섹션(LocalFirst, CTA)과 1:1 교차 대비 완성
// 🚨 @PATCH : **2026-09-11** — 플랜 카드 배경색을 #EEF0FF(소프트 페리윙클)으로 변경 및 섹션 배경 #FFFFFF 동기화
//             **2026-09-11** — 요금표 카드 배경색을 #B3FFF3(민트/아쿠아마린)으로 변경 및 고대비(Rule 8) 가독성 강화
//             **2026-09-11** — DocumentGallerySection 제거에 따른 랜딩페이지 섹션 교차(#FFFFFF / #EFEFFF) 배경 유지(Pricing: #EFEFFF)
//             **2026-09-11** — 요금제 카드 목록에서 Reader(제한사용자) 제거 및 하단에 '회원가입 후 무료 사용 가능' 별도 안내 박스 연동
//             **2026-09-11** — 랜딩페이지 섹션 교차(#FFFFFF / #EFEFFF) 배경 및 헤어라인 보더(#E2E4F6) 적용
//             **2026-09-11** — 랜딩페이지 서피스 배경 Primary #DCE1FF 및 헤어라인 보더(#C5CEF8) 적용
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — Onrivi Author Premium V2 랜딩페이지 개편: 초록색 풀 채움 카드 제거, White/Surface 베이스에 Regular 플랜 얇은 Green 테두리 및 MOST POPULAR 뱃지/elevation 고급화 적용
//             **2026-08-07** — DB pricing_plans 테이블을 기반으로 멤버십 데이터를 동적 조회(fetch)하여 렌더링하도록 마이그레이션 패치; **2026-07-09** — 4계급 멤버십 구조 (Reader/Apprentice/Regular/Elite Pro) 전면 개편
// 🔗 @CALLS : plans constants, BookOpen, Link
// ====================================================================
"use client"; // "use client" : 클라이언트 사이드 렌더링을 위한 지시어 

import { useState, useEffect } from "react"; // useState, useEffect : 상태 관리 및 데이터 패치를 위해 임포트 
import { motion } from "framer-motion"; // framer-motion : 애니메이션을 위한 라이브러리 
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal"; // ConfirmModal : 확인 모달 컴포넌트 

// ====================================================================
// 🎯 PricingSection ➔ PricingSection
// PricingSection : Onrivi Author 서비스 멤버십 가격표를 위한 컴포넌트  
// ====================================================================
export function PricingSection() {   // PricingSection : Onrivi Author 서비스 멤버십 가격표를 위한 컴포넌트  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  }); // modalConfig : 모달 설정을 위한 상태  

  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDbPlans(data);
        }
      })
      .catch(err => console.error("Failed to fetch plans:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section id="pricing" className="py-24 bg-[#F9FAFC] dark:bg-[#121417] text-on-surface" style={{ fontFamily: "Pretendard, sans-serif" }}>
        <div className="text-center text-text-secondary">요금제를 불러오는 중입니다...</div>
      </section>
    );
  }

  // 💡 요금제 카드 목록에서는 Reader(제한사용자) 플랜을 제외하고 아래 별도 안내 박스로 표기
  const visiblePlans = dbPlans.filter((plan) => {
    const code = (plan.plan_code || "").toUpperCase();
    const name = (plan.name || "").toLowerCase();
    return code !== "READER" && !name.includes("reader") && !name.includes("제한");
  });

  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 bg-[#F9FAFC] dark:bg-[#121417] border-y border-[#E2E4F6] dark:border-white/5 text-[#1A1A18] dark:text-[#E8ECE9]"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FF] dark:bg-zinc-800 border border-[#D2D8F8] text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-4 shadow-2xs">
            MEMBERSHIP
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-[#111413] dark:text-white">
            간단하고 투명한 요금제
          </h2>
          <p className="text-[#2D3748] dark:text-zinc-300 text-base sm:text-lg">
            문서 읽기부터 전문가 수준의 전 기능 출판까지, 필요한 만큼 시작하세요.
          </p>
        </div>

        {/* Plan List */}
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {visiblePlans.map((plan, i) => {
            const isRegular = plan.plan_code === "REGULAR" || plan.is_highlighted;
            const isFree = plan.is_free;

            const priceDisplay = isFree
              ? "0원"
              : plan.plan_code === "REGULAR" && plan.price_monthly
                ? `₩${(plan.price_monthly).toLocaleString()} / 월`
                : plan.plan_code === "ELITEPRO" && plan.price_yearly
                  ? `₩${(plan.price_yearly).toLocaleString()} / 년`
                  : plan.price_monthly ? `₩${(plan.price_monthly).toLocaleString()} / 월` : plan.price_yearly ? `₩${(plan.price_yearly).toLocaleString()} / 년` : "";

            const usdDisplay = isFree
              ? ""
              : plan.plan_code === "REGULAR" && plan.price_monthly_usd
                ? `($${plan.price_monthly_usd} / mo)`
                : plan.plan_code === "ELITEPRO" && plan.price_yearly_usd
                  ? `($${plan.price_yearly_usd} / yr)`
                  : plan.price_monthly_usd ? `($${plan.price_monthly_usd} / mo)` : plan.price_yearly_usd ? `($${plan.price_yearly_usd} / yr)` : "";

            const envLabel = plan.environment_name || plan.sys_type;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`relative p-6 sm:p-7 rounded-2xl transition-all duration-300 ${
                  isRegular
                    ? "bg-[#EEF0FF] dark:bg-[#161926] border-2 border-[#1d4ed8] shadow-[0_16px_40px_-10px_rgba(29,78,216,0.18)]"
                    : "bg-[#EEF0FF] dark:bg-[#161926] border border-[#D2D8F8] dark:border-white/10 hover:border-[#1d4ed8]/50 dark:hover:border-white/20 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Most Popular Badge */}
                {isRegular && (
                  <div className="absolute -top-3 right-6 bg-[#1d4ed8] text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs tracking-wider">
                    MOST POPULAR
                  </div>
                )}

                {/* Header: Tier emoji + Name + Environment + Price */}
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{plan.tier_emoji}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-[#111413] dark:text-white">
                          {plan.name}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isRegular
                            ? "bg-[#1d4ed8] text-white"
                            : "bg-white/90 dark:bg-zinc-800 text-[#1d4ed8] dark:text-blue-300 border border-[#D2D8F8]"
                        }`}>
                          {envLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#2D3748] dark:text-zinc-300 font-medium mt-1">
                        {plan.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl sm:text-2xl font-extrabold text-[#111413] dark:text-white">
                      {priceDisplay}
                    </div>
                    {usdDisplay && (
                      <span className="text-xs text-[#4A5568] dark:text-zinc-300 font-medium">
                        {usdDisplay}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="m-0 p-0 list-none space-y-1.5 pt-2 border-t border-[#D2D8F8]/80 dark:border-white/10">
                  {(plan.features || []).map((f: string, fi: number) => (
                    <li key={fi} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                      <span className="text-[#1d4ed8] font-extrabold text-sm">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Reader 플랜 별도 안내 박스 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-6 p-5 sm:p-6 rounded-2xl bg-[#EEF0FF]/80 hover:bg-[#EEF0FF] dark:bg-[#161926]/80 border border-[#D2D8F8] dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-2xs transition-all duration-300"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 text-[#1d4ed8] flex items-center justify-center shrink-0 border border-[#D2D8F8] shadow-2xs">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-[#111413] dark:text-white">
                  Reader (읽기 전용) 플랜
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                  FREE
                </span>
              </div>
              <p className="text-xs text-[#2D3748] dark:text-zinc-300 font-medium leading-relaxed">
                Reader 플랜은 별도 결제 없이 <strong className="text-[#111413] dark:text-white font-extrabold">회원가입 후 즉시 사용 가능</strong>합니다.
              </p>
            </div>
          </div>
          <Link href="/signup" className="shrink-0 w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-zinc-800 text-[#1d4ed8] dark:text-blue-400 border border-[#D2D8F8] dark:border-white/10 hover:bg-[#1d4ed8] hover:text-white transition-all shadow-2xs">
              회원가입하고 무료로 읽기 →
            </button>
          </Link>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen} // isOpen : 모달 열림 여부를 위한 상태
        title={modalConfig.title} // title : 모달 제목
        message={modalConfig.message} // message : 모달 메시지
        onConfirm={modalConfig.onConfirm} // onConfirm : 모달 확인 버튼 클릭 시 실행될 함수
      />
    </section>
  );
}
