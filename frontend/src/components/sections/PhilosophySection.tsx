// ====================================================================
// 📊 [OMD-UI-PhilosophySection-0026] PhilosophySection ➔ PhilosophySection
// 🎯 @KICK  : Onrivi Author가 꼭 필요한 4대 핵심 직업군(기획자·PM, 개발자·엔지니어, 마케터·작가, 연구원·학생)의 일상 속 고민과 해결 가치를 시각화하는 추천 대상 섹션
// 🛡️ @GUARD : 반응형 4열 그리드 렌더링 및 모바일 가독성 가드
// 🚨 @PATCH : **2026-09-26** — [외부 노트 내보내기 마크다운 서식 복원 카피 강화]: 특정 경쟁사명 배제 및 외부 노트 내보내기 파일의 깨진 표·서식 복원 가치 반영
//             **2026-09-12** — 랜딩페이지 섹션 교차(#EFEFFF / #FFFFFF) 배경 순서 반전 적용 (PhilosophySection: #FFFFFF)
//             **2026-09-11** — 4단계 프로세스를 '온리비가 꼭 필요한 4대 핵심 직업군(기획자, 개발자, 마케터, 연구원)' 추천 카드 섹션으로 전면 개편하여 Experience 섹션과의 중복 완전 해소
//             **2026-09-11** — 간편한 4단계 작성 카드 4종 전체를 사용자 지정 고화질 실사형 그래픽 이미지(/steps/step-1~4.jpg)로 전면 교체 반영
//             **2026-09-11** — STEP 01(자유로운 기록) 카드를 사용자 지정 고화질 그래픽 이미지(/steps/step-1.jpg)로 교체 반영
//             **2026-09-11** — 간편한 4단계 작성 카드를 사용자 지정 그래픽 이미지 카드(/steps/step-1~4.png)로 교체 탑재
//             **2026-09-11** — PhilosophySection 문구를 실생활 친화적이고 직관적인 일상 언어(자유로운 기록, AI 문장 다듬기 등)로 전면 개편
//             **2026-09-11** — 랜딩페이지 섹션 교차(#FFFFFF / #EFEFFF) 배경 및 헤어라인 보더(#E2E4F6) 적용
//             **2026-09-11** — 랜딩페이지 서피스 배경 Primary #DCE1FF 및 헤어라인 보더(#C5CEF8) 적용
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-03** — Onrivi Author Premium V2 랜딩페이지 개편: HOW IT WORKS 및 생각-AI-구조화-문서 파이프라인 시각화 신규 구현
// 🔗 @CALLS : motion.div, Layers, Code2, PenTool, GraduationCap, Check
// ====================================================================
"use client";

import { motion } from "framer-motion";
import { Layers, Code2, PenTool, GraduationCap, Check } from "lucide-react";

interface AudienceCard {
  role: string;
  badge: string;
  tagline: string;
  painPoint: string;
  solutions: string[];
  icon: any;
}

const AUDIENCE_CARDS: AudienceCard[] = [
  {
    role: "기획자 · PM",
    badge: "01 PLANNER",
    tagline: "아이디어 구체화 & 기능명세서",
    painPoint: "“외부 노트에서 마크다운을 내보내면 표와 서식이 깨져서, 보고서 규격으로 다시 다듬느라 시간이 너무 걸려요.”",
    solutions: [
      "외부 노트 내보내기 파일의 깨진 표·서식 1초 만에 깔끔 정돈",
      "회의록·요구사항 정의서를 키보드로 빠르게 작성",
      "팀원과 경영진에게 즉시 공유하는 PDF/웹 출력",
    ],
    icon: Layers,
  },
  {
    role: "개발자 · 엔지니어",
    badge: "02 DEVELOPER",
    tagline: "코드 블록 & 기술 문서 표준화",
    painPoint: "“무거운 워드보다 키보드만으로 빠르게 마크다운을 쓰고 로컬 파일로 안전하게 관리하고 싶어요.”",
    solutions: [
      "손이 키보드를 떠나지 않는 완벽한 마크다운 환경",
      "코드 하이라이트·다이어그램(Mermaid) 완벽 지원",
      "내 PC 로컬 파일 1:1 직결로 Git 연동 최적화",
    ],
    icon: Code2,
  },
  {
    role: "마케터 · 작가",
    badge: "03 WRITER",
    tagline: "막힘없는 초안 & AI 문장 다듬기",
    painPoint: "“글 쓸 때마다 어색한 문장과 맞춤법을 다듬느라 퇴근 시간이 늦어지고 머리가 지끈거려요.”",
    solutions: [
      "생각나는 대로 빠르게 초안을 타이핑",
      "AI가 어색한 문장과 띄어쓰기를 실시간 교정",
      "블로그·뉴스레터·SNS 규격에 맞춰 원클릭 변환",
    ],
    icon: PenTool,
  },
  {
    role: "연구원 · 학생",
    badge: "04 RESEARCHER",
    tagline: "논문 요약, 리포트 & 지식 정리",
    painPoint: "“수식, 표, 각주 맞추느라 밤새 서식과 씨름하고 흩어진 자료 찾기가 너무 번거로워요.”",
    solutions: [
      "복잡한 수식(LaTeX)과 표를 규격 양식으로 자동 조판",
      "강의 노트와 방대한 연구 자료를 체계적으로 자산화",
      "학회나 교수님께 바로 제출하는 출판급 A4 인쇄",
    ],
    icon: GraduationCap,
  },
];

export function PhilosophySection() {
  return (
    <section
      id="philosophy"
      className="py-24 sm:py-32 bg-[#FFFFFF] dark:bg-[#15171A] border-y border-[#E2E4F6] dark:border-white/5 text-[#1A1A18] dark:text-[#E8ECE9]"
      style={{ fontFamily: "Pretendard, sans-serif" }}
    >
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFEFFF] dark:bg-zinc-800 border border-[#E2E4F6] text-[11px] font-bold text-[#1d4ed8] dark:text-blue-400 tracking-wider uppercase mb-4 shadow-2xs">
            누구에게 필요할까요?
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 text-[#111413] dark:text-white">
            글 쓸 일 많은 모든 분들을 위해,<br className="hidden sm:inline" />
            <span className="text-[#1d4ed8]"> 온리비가 든든한 파트너가 됩니다.</span>
          </h2>
          <p className="text-[#2D3748] dark:text-zinc-300 text-base sm:text-lg leading-relaxed font-normal">
            복잡한 서식 설정과 씨름하던 시간을 줄이고 생각의 본질에 집중할 수 있도록,<br className="hidden sm:inline" />
            문서 작성이 일상인 4대 핵심 직업군의 업무 방식을 세심하게 담았습니다.
          </p>
        </div>

        {/* 4 Professional Groups Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {AUDIENCE_CARDS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="group relative rounded-2xl overflow-hidden border border-[#E2E4F6] dark:border-white/10 bg-white dark:bg-[#1A1D22] p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-[0_16px_36px_-10px_rgba(29,78,216,0.18)] hover:border-[#1d4ed8] transition-all duration-300 transform hover:-translate-y-1.5 text-left"
              >
                <div>
                  {/* Card Header: Icon & Step Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#1d4ed8]/10 dark:bg-blue-900/30 text-[#1d4ed8] dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#1d4ed8] group-hover:text-white transition-all duration-300">
                      <Icon size={22} strokeWidth={2.2} />
                    </div>
                    <span className="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">
                      {item.badge}
                    </span>
                  </div>

                  {/* Title & Role */}
                  <h3 className="text-xl font-extrabold text-[#111413] dark:text-white mb-1.5 tracking-tight">
                    {item.role}
                  </h3>
                  <p className="text-xs font-semibold text-[#1d4ed8] dark:text-blue-400 mb-4">
                    {item.tagline}
                  </p>

                  {/* Pain Point Quote Box */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/60 border border-[#E2E8F0] dark:border-white/5 mb-5">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                      {item.painPoint}
                    </p>
                  </div>
                </div>

                {/* Solutions List */}
                <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/5">
                  {item.solutions.map((sol, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#1d4ed8]/10 dark:bg-blue-900/30 text-[#1d4ed8] dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-snug">
                        {sol}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
