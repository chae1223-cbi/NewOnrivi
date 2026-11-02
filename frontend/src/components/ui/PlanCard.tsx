// ====================================================================
// 📊 [OMD-UI-PlanCard-0012] PlanCard ➔ PlanCard
// 🎯 @KICK  : 요금제 카드 UI 컴포넌트로 가격, 타겟 카피, 주요 기능 목록 렌더링 및 결제 이동 버튼 제공
// 🛡️ @GUARD : 연간/월간(isAnnual) 스위칭에 따른 가격 텍스트 포맷 포지셔닝; Highlighted 상태일 때 모달 레이아웃 스케일업 처리
// 🚨 @PATCH : **2026-06-21** — OMDLanding UI 디자인 이식에 따른 신규 컴포넌트 생성 패치 및 회원가입 경로 '/signup' 대응 패치; 연간 결제 시 10개월 요금 곱연산 처리 및 무료 요금제 문구 동적 매핑 패치; 기기 대수 용어를 접속 횟수(최대 접속 횟수)로 용어 개편 패치
// 🔗 @CALLS : lucide-react, Link
// ====================================================================
import { CheckCircle2 } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceMonthly?: number;
  priceUSD?: string;
  isFree?: boolean;
  isEnterprise?: boolean;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  cta: string;
}

interface PlanCardProps {
  plan: Plan;
  isAnnual: boolean;
}

function fmtKRW(amount: number, suffix?: string) {
  return `₩${amount.toLocaleString()}${suffix || ""}`;
}

export function PlanCard({ plan, isAnnual }: PlanCardProps) {
  const isHighlighted = plan.highlighted;
  const textColor = isHighlighted ? "text-white" : "text-gray-900 dark:text-white";
  const mutedText = isHighlighted ? "text-gray-400" : "text-gray-500 dark:text-gray-400";
  const borderStyle = isHighlighted
    ? "bg-gray-900 text-white shadow-2xl relative transform lg:-translate-y-4 lg:scale-105 border border-indigo-500"
    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm";

  let ctaLink = "/signup";
  if (plan.isFree) {
    ctaLink = "/signup?plan=free";
  } else if (plan.isEnterprise) {
    ctaLink = "mailto:support@onrivi.com";
  }

  return (
    <div className={`p-8 rounded-3xl ${borderStyle}`}>
      {plan.badge && (
        <div className="absolute top-0 right-8 transform -translate-y-1/2">
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            {plan.badge}
          </span>
        </div>
      )}

      <h3 className={`text-2xl font-bold mb-2 ${textColor}`}>{plan.name}</h3>
      <p className={`mb-6 text-sm ${mutedText}`}>{plan.tagline}</p>

      {/* Free plan */}
      {plan.isFree && (
        <div className="mb-6">
          <div className={`text-4xl font-extrabold ${textColor}`}>0원</div>
          <p className={`text-sm mt-2 leading-relaxed ${mutedText}`}>
            가입 즉시 2주일(14일) 동안<br />최대 접속 1회로 무료로 체험하세요.
          </p>
        </div>
      )}

      {/* PRO plans pricing */}
      {!plan.isFree && !plan.isEnterprise && plan.priceMonthly && (
        <div className="mb-6">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-extrabold ${textColor}`}>
              {fmtKRW(isAnnual ? plan.priceMonthly * 10 : plan.priceMonthly, isAnnual ? "/년" : "/월")}
            </span>
            {plan.priceUSD && (
              <span className={`text-sm font-semibold ${mutedText}`}>
                ({isAnnual ? `${parseInt(plan.priceUSD.replace('$', '')) * 10}$` : plan.priceUSD}{isAnnual ? "/년" : "/월"})
              </span>
            )}
          </div>
          <p className={`text-xs mt-2 leading-relaxed ${mutedText}`}>
            {isAnnual ? "연간 결제 시 2개월 요금 할인 혜택!" : "합리적인 요금으로 누리는 최고의 마크다운 몰입 환경"}
          </p>
        </div>
      )}

      {/* Enterprise pricing */}
      {plan.isEnterprise && (
        <div className="mb-6">
          <div className={`text-3xl font-extrabold ${textColor}`}>별도 문의</div>
          <p className={`text-sm mt-2 leading-relaxed ${mutedText}`}>
            독립된 사내망 또는 대규모 서버 배포 환경을 구축해 드립니다.
          </p>
        </div>
      )}

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isHighlighted ? "text-indigo-400" : "text-indigo-500"}`} />
            <span className={`text-sm ${isHighlighted ? "text-gray-200" : "text-gray-700 dark:text-gray-300"}`}>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="pt-2">
        <Link href={ctaLink} className="block w-full">
          <Button
            variant={isHighlighted ? "primary" : "secondary"}
            size="md"
            className="w-full text-center py-3 rounded-xl text-sm"
          >
            {plan.cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}
