// ====================================================================
// 📊 [OMD-CORE-privacy-page-0001] page ➔ PrivacyPage
// 🎯 @KICK  : 개인정보처리방침 화면 - 계정 정보 및 OAuth 인증 세션 데이터 수집 및 안전 고지
// 🛡️ @GUARD : React Server Component 구조로 고속 로딩
// 🚨 @PATCH : **2026-06-21** — 푸터 개인정보처리방침 페이지 신설 및 미려한 CSS 가이드북 이식 패치
// 🔗 @CALLS : Navbar, Footer
// ====================================================================
import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-850 dark:text-gray-200 transition-colors duration-200">
      <Navbar />

      <main className="flex-grow pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          
          {/* 헤더 */}
          <div className="border-b border-gray-200 dark:border-gray-800 pb-6 mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">개인정보처리방침</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">최종 수정일: 2026년 6월 30일</p>
          </div>

          {/* 본문 처리방침 내용 */}
          <div className="space-y-8 text-xs md:text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            
            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제1조 (개인정보의 처리 목적)</h2>
              <p>회사는 다음의 목적을 위해서만 최소한의 개인정보를 수집 및 처리하며, 목적 외의 용도로는 절대 사용하지 않습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>이용자 가입 및 식별:</strong> 가입 이메일(Email) 및 소셜 로그인 제공자(OAuth Provider) 연동 확인</li>
                <li><strong>라이선스 검증 및 계약 이행:</strong> 구독 요금제 등급 확인, 결제번호 발급, 정품 라이선스 키(license_key, verify_key) 매핑 및 유효성 대조</li>
                <li><strong>안전한 동시접속 제어:</strong> 기기별 고유 식별값(Device UUID) 및 단말기 환경 정보(Device Name, OS, User Agent 등) 매핑을 통한 부정사용 방지 및 세션 자동 갱신 처리</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제2조 (처리하는 개인정보의 항목)</h2>
              <p>회사는 서비스 제공을 위해 이용자의 가입 및 정품 인증 과정에서 아래와 같은 최소한의 정보를 수집합니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>회원 가입 및 로그인 시 (필수):</strong> 이메일 주소, 소셜 로그인 연동 제공처 정보 (GitHub, Google, Kakao 등)</li>
                <li><strong>라이선스 등록 및 앱 활성화 시 (자동 수집):</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>기기 고유 식별값 (로컬 환경에서 난수 생성된 UUID)</li>
                    <li>기기 환경 정보 (운영체제 유형, 기기 디바이스 이름, 접속 브라우저/앱 환경 정보)</li>
                    <li>결제 정보 (결제 고유번호 PAY_ 난수 값, 선택 요금제 정보, 구매 기간)</li>
                  </ul>
                </li>
                <li><strong>인터넷 서비스 이용 과정에서 자동 생성되어 저장될 수 있는 항목:</strong> IP 주소, 서비스 이용 기록, 접속 로그, 쿠키</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제3조 (개인정보의 처리 및 보유기간)</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터 수집 시에 동의받은 보유·이용기간 내에서 개인정보를 처리 및 보유합니다.</p>
              <p>각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>회원 가입 및 관리 정보:</strong> 회원 탈퇴 즉시 파기. 단, 부정 이용 및 요금 분쟁 방지를 위해 탈퇴 후 30일간 임시 보관 후 완전 삭제.</li>
                <li><strong>라이선스 결제 및 정기 구독 내역:</strong> 상법 및 전자상거래법 등 관련 법령에 의거하여 5년간 보관 (계약 또는 청약철회 등에 관한 기록, 대금결제 및 재화 등의 공급에 관한 기록).</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제4조 (개인정보의 제3자 제공 및 위탁에 관한 사항)</h2>
              <p>회사는 원활한 데이터 통신 및 서비스 인프라 가동을 위해 아래의 신뢰도 높은 전문 글로벌 인프라 기업에 개인정보 및 서비스 연동 로그 처리를 위탁하고 있습니다. 이 위탁 정보는 인프라 공급 및 트랜잭션 처리 목적 외에는 절대 가용되지 않습니다.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-700 mt-2">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left font-semibold">수탁업체</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left font-semibold">위탁 대상 개인정보 항목</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left font-semibold">위탁 업무 내용</th>
                      <th className="border border-gray-300 dark:border-gray-700 px-3 py-2 text-left font-semibold">정보 보유 및 이용 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium">Supabase Inc.</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">가입 이메일, 요금제 가입일, 기기 식별자(UUID), 기기명, 라이선스 원장</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">클라우드 데이터베이스(DB) 저장 및 라이선스 연동 RPC 함수 실행</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">회원 탈퇴 시 혹은 위탁 계약 종료 시까지</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium">Cloudflare Inc.</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">IP 주소, API 통신 헤더 정보, 접속 기기 정보</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">웹 트래픽 라우팅, 프론트엔드 호스팅 및 CDN 전송 가속, 디도스(DDoS) 보안 방어</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">웹 서버 로그 보존 정책에 따름 (최대 1년)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2 font-medium">PG 결제대행사 (Portone 등)</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">이메일, 주문명, 결제 수단 정보</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">정기 결제 승인 및 영수증 번호 발급 처리</td>
                      <td className="border border-gray-300 dark:border-gray-700 px-3 py-2">결제 대행사 내부 보유 정책 및 관련 법령에 따름</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제5조 (정보주체의 권리·의무 및 그 행사방법)</h2>
              <p>이용자는 회사에 대해 언제든지 마이페이지 화면을 통해 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>개인정보 열람요구 및 세션 삭제 요구 (delete_device_activation 실행)</li>
                <li>가입 오류 정보의 정정 요구</li>
                <li>개인정보 수집 동의 철회 및 회원 탈퇴 요구</li>
              </ul>
              <p>권리 행사는 마이페이지 내 직접 삭제/수정 메뉴 또는 고객센터 이메일 접수를 통해 서면, 전자우편 등을 통하여 즉시 수행할 수 있으며 회사는 이에 대해 지체 없이 조치합니다.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제6조 (개인정보의 안전성 확보 조치)</h2>
              <p>회사는 이용자의 개인정보를 취급함에 있어 분실, 도난, 누출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적·관리적 대책을 강구하고 있습니다:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>비밀번호 및 토큰 암호화:</strong> 이메일 로그인 정보는 암호화(Hashed) 저장되어 관리자도 복구할 수 없습니다.</li>
                <li><strong>접근 제어 정책(SECURITY DEFINER / RLS):</strong> 수파베이스 데이터베이스 단에서 불법적인 외부 타격을 원천 봉쇄하고, 승인받은 사용자 및 백엔드 RPC 함수 내부에서만 정보 주체를 안전하게 읽고 쓸 수 있도록 롤 레벨 시큐리티(Row Level Security) 접근 차단을 보강하였습니다.</li>
                <li><strong>데이터 보안 전송:</strong> 모든 API 통신 구간 및 외부 브라우저 딥링크 파이프라인은 전송 구간 SSL(HTTPS) 암호화를 거치도록 설계하여 스니핑 등 가로채기 위협을 원천 차단합니다.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">제7조 (개인정보 보호책임자 및 고충처리 부서)</h2>
              <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>개인정보 보호책임자</strong></li>
                <li>담당 부서: Onrivi 개발운영팀 (Security &amp; DevOps)</li>
                <li>연락처/이메일: <a href="mailto:support@onrivi.com" className="text-[#6366f1] hover:underline">support@onrivi.com</a></li>
                <li>문의 대응 가능 시간: 평일 10:00 ~ 18:00 (주말 및 공지 휴일 제외)</li>
              </ul>
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
