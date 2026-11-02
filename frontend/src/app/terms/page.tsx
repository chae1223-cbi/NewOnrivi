// ====================================================================
// 📊 [OMD-CORE-terms-page-0001] page ➔ TermsPage
// 🎯 @KICK  : 서비스 이용약관 화면 - 요금제 환불 규정 및 세션 한도 준수 규정 고지
// 🛡️ @GUARD : React Server Component 구조로 고속 로딩
// 🚨 @PATCH : **2026-06-21** — 푸터 이용약관 페이지 신설 및 미려한 CSS 가이드북 이식 패치
// 🔗 @CALLS : Navbar, Footer
// ====================================================================
import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-850 dark:text-gray-200 transition-colors duration-200">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          
          {/* 헤더 */}
          <div className="border-b border-gray-200 dark:border-gray-800 pb-6 mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">서비스 이용약관</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">최종 수정일: 2026년 6월 30일</p>
          </div>

          {/* 본문 약관 내용 */}
          <div className="space-y-8 text-xs md:text-sm leading-relaxed text-gray-600 dark:text-gray-300">

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제1조 (목적)</h2>
              <p>
                본 약관은 &quot;Onrivi Author&quot;(이하 &quot;서비스&quot; 또는 &quot;회사&quot;)가 제공하는 에디터 소프트웨어, 웹 대시보드 및 이에 부수되는 모든 서비스의 이용과 관련하여, 회사와 회원(이하 &quot;이용자&quot;) 간의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제2조 (정의)</h2>
              <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>서비스:</strong> 이용자가 텍스트, 마크다운 등을 작성, 편집, 인쇄 양식으로 미리보기할 수 있도록 제공하는 웹 에디터 및 일렉트론(Electron) 데스크톱 애플리케이션 전체를 의미합니다.</li>
                <li><strong>이용자:</strong> 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                <li><strong>구독 요금제:</strong> 서비스의 특정 기능(예: 에디트 모드 활성화, 다중 기기 연동 등)을 이용하기 위해 이용자가 정기적으로 지불하는 결제 모델을 의미하며, &quot;무료 체험&quot;, &quot;웹 월간&quot;, &quot;웹 연간&quot;, &quot;데스크탑 연간&quot; 요금제로 구분됩니다.</li>
                <li><strong>기기 식별자(UUID/Device UUID):</strong> 이용자의 단말기(PC, 노트북, 태블릿 등)를 고유하게 식별하기 위해 앱 내부에서 자동으로 생성 및 캐싱하는 고유 식별 정보입니다.</li>
                <li><strong>라이선스 키/검증 키:</strong> 서비스 연동 및 정품 인증 상태를 로컬과 백엔드 서버 간에 대조하기 위해 발급되는 고유 암호화 토큰입니다.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제3조 (약관의 명시와 개정)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 가입 화면 또는 대시보드 마이페이지 화면에 게시합니다.</li>
                <li>회사는 약관의 규제에 관한 법률, 전자문서 및 전자거래기본법, 전자서명법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
                <li>약관을 개정할 경우, 개정 적용일자 7일 전(이용자에게 불리한 개정의 경우 30일 전)에 공지사항 또는 이메일을 통해 개정 사유와 함께 알립니다. 개정 약관에 대해 명시적으로 거부 의사를 표시하지 않은 이용자는 개정 약관에 동의한 것으로 간주합니다.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제4조 (이용계약의 성립 및 제한)</h2>
              <p>서비스 이용계약은 이용자가 본 약관의 내용에 동의하고 가입 절차를 완료함으로써 성립합니다.</p>
              <p>회사는 다음 각 호에 해당하는 신청에 대하여는 승인을 하지 않거나 사전 통지 없이 서비스를 제한 또는 해지할 수 있습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>타인의 명의나 이메일을 도용하여 가입한 경우</li>
                <li>서비스의 기술적 보호조치를 우회하거나 무단 크랙, 디컴파일을 시도한 경우</li>
                <li>영리 목적으로 서비스의 취약점을 공격하거나 트래픽을 비정상적으로 유발하는 경우</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제5조 (구독 요금제 및 결제 정책)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>이용자는 회사가 제공하는 요금제 가격에 따라 서비스를 구독할 수 있습니다.</li>
                <li>요금 결제는 매월 또는 매년 정기적으로 자동 결제되며, 결제 성공 즉시 소프트웨어 라이선스(software_licenses)가 활성화됩니다.</li>
                <li>요금제 업그레이드는 대시보드에서 즉시 반영되며 차액 또는 재정산 비율에 맞춰 적용됩니다. 다운그레이드는 다음 정기 결제일부터 반영됩니다.</li>
                <li>청약철회 및 환불은 전자상거래법 등 관련 법령에 따릅니다. 결제 후 서비스를 전혀 이용하지 않은 경우 결제일로부터 7일 이내에 전액 환불을 요청할 수 있습니다. 단, 결제 이후 라이선스가 기기에 정상 등록되어 에디터 기능을 사용한 이력이 존재할 경우 환불이 제한될 수 있습니다.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제6조 (동시접속 및 라이선스 세션 제어 규정)</h2>
              <p>서비스는 부정한 복제 및 라이선스 유출을 방지하기 위해 요금제 등급별로 최대 동시 접속 기기(세션)의 개수를 엄격히 제한합니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>무료 체험: 최대 동시 접속 기기 1대 (체험 기간 14일 제공)</li>
                <li>웹 월간 요금제: 최대 동시 접속 기기 3대</li>
                <li>웹 연간 요금제: 최대 동시 접속 기기 3대</li>
                <li>데스크탑 연간 요금제: 윈도우 데스크탑 1카피 (1 PC 오프라인 전용)</li>
              </ul>
              <p>이용자는 가용 한도를 초과하여 새로운 기기에서 에디터를 기동할 수 없습니다. 한도가 초과될 경우 에디터는 읽기 전용(미리보기 모드)으로 일시 제한됩니다.</p>
              <p>이용자는 웹 대시보드 마이페이지의 세션 관리 도구를 통해, 과거에 등록되어 동작 중인 기기의 세션을 언제든지 원격으로 즉시 해제(delete_device_activation)할 수 있습니다. 세션 해제 완료 즉시 새로운 기기에서 정품 편집 기능을 사용하실 수 있습니다.</p>
              <p>좀비 세션 방지를 위한 자동 롤백 하트비트(Heartbeat) 시스템에 따라, 5분 이내에 별도의 활성화 갱신 신호가 수집되지 않은 기기의 접속 기록은 백엔드 엔진에 의해 임시 제외 처리되거나 해제 승인될 수 있습니다.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제7조 (서비스의 변경 및 면책)</h2>
              <p>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
              <p>회사는 다음 각 호의 사유로 서비스를 제공할 수 없는 경우 이에 대한 책임을 지지 않습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>천재지변, 전쟁, 국가비상사태, 해결할 수 없는 기술적 결함 등 불가항력적 사유</li>
                <li>이용자의 단말기 환경 오염, 로컬 DB 손상, 또는 방화벽 설정 오류로 인한 접속 불능</li>
                <li>클라우드 인프라 제공사(Supabase, Cloudflare 등)의 전역 장애 및 네트워크 일시 정지</li>
              </ul>
              <p>회사는 이용자가 서비스 상에 수록하여 작성 및 저장하는 마크다운 파일 내용물의 정합성, 유실 여부에 대해 민사상의 무한 책임을 지지 않습니다. 중요 문서 데이터는 수시로 로컬 또는 외부 클라우드에 이중 백업할 것을 권장합니다.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제8조 (준거법 및 재판관할)</h2>
              <p>회사와 이용자 간에 발생한 분쟁에 대하여는 대한민국 법률을 준거법으로 합니다.</p>
              <p>회사와 이용자 간에 발생한 분쟁의 소송은 회사의 본사 소재지를 관할하는 법원을 합의 관할 법원으로 합니다.</p>
            </section>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>공고일자: 2026년 06월 30일</p>
              <p>시행일자: 2026년 06월 30일</p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
