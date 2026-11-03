// ====================================================================
// 📊 [OMD-AUTH-dashboard-0001 ✅ FIXED] DashboardPage ➔ DashboardPage
// 🚨 @PATCH : **2026-11-03** — [오류 진단 로깅 3단계]: loadDashboardData, handleDeactivateDevice에 5대 메타데이터 기반 logError/logWarn 연동으로 구독/기기 관리 실패 정밀 추적
// 🚨 @PATCH : 2026-11-02 — [DB 접근 서버 API 일원화] 브라우저 직접 supabase.from(users, common_codes)를 서버 API(/api/common-codes, userCheck)로 전환
// 🚨 @PATCH : 2026-11-01 — 구독 신청 실패 시 요청 ID를 토스트에 표시해 서버 로그와 연결한다.
// 🎯 @KICK  : 로그인 유저 구독/라이선스/접속세션 관리 및 요금제 선택 대시보드
// 🛡️ @GUARD : getUser() 인증 가드, 비인증 진입 시 /login 리다이렉트
// 🚨 @PATCH : **2026-09-17** — [로그아웃/기기해제 시 환경설정(Gemini API 키 등) 영구 보존 및 선별적 세션 정리]: clearAuthSessionStorage 연동으로 API 키 및 사용자 설정 삭제 결함 해결
// 🚨 @PATCH : **2026-09-05** — 대시보드 기기 테이블에서 데스크탑 앱 명확한 상태 배지(정품 사용중/제한됨) 표시 및 웹에서 데스크탑 기기 원격 해제 기능 허용; 기기 해제 시 p_user_id 전달로 사용자 소유권 검증 연동, 로그아웃(handleLogout) 시 onrivi_* 및 sb-* 로컬스토리지 전량 파기로 계정 간 세션 오염 원천 차단; **2026-08-07** — DB `pricing_plans` 테이블을 기반으로 멤버십 데이터를 동적 조회(fetch)하여 렌더링하도록 마이그레이션 패치; **2026-07-22** — 사용자 요금제 변동 내역 테이블을 `subscriptions` 칼럼(`current_period_start`, `current_period_end`, `plan_name`, `billing_cycle`, `plan_status`) 및 DB 공통코드(`common_codes`) 1:1 매핑 변환 체계로 동동 조율 적용 완결 패치; 공통코드(common_codes) 명세(`PLAN_STATUS`: `ACTIVE`, `CANCELED`, `EXPIRED` / `PLAN_NAME`: `APPRENTICE`, `REGULAR`, `ELITEPRO`) 100% 동기화 적용 및 대시보드 상태 배지/히스토리 상태 라벨 정리 완료 패치; 요금제 등록/신청 시 대문자 코드값 표준화 규칙 적용 (`plan.name.toUpperCase().replace(/\s+/g, '')`) 및 OMD 규칙 1에 의거한 OMD 주석 동기화 패치; 무료 요금제(FREE)의 라이선스가 DB상 is_active=false로 입력되는 비즈니스 제약에 따라 현재 활성 구독(subData.id)을 기준으로 현재 요금제 여부(is_active_license)를 동적 매핑 식별하도록 판별 방식을 고도화 보완 패치; 사용자 ID에 매칭되는 모든 라이선스의 동시접속 레코드를 일괄적으로 불러와(Show all activations regardless of license), 현재 사용자가 활성 구독 중인 플랜의 현재 브라우저 세션만 "현재 상태(보안)"로 표기하고 그 외(과거 요금제 및 다른 브라우저)는 모두 "해제 대상(해제)"으로 일원화 표기/제어하도록 동시접속 기기 관리 테이블 고도화 패치; 복수 요금제 이력 존재 시 software_licenses 테이블 maybeSingle 조회 카드 크래시(cardinality violation)를 방지하기 위해 is_active = true인 활성 라이선스를 우선 조회하고 없을 시 최신 등록 라이선스 순으로 fallback 탐색하도록 2단계 보완 패치; 동시접속자 기기 관리 목록을 특정 활성 요금제(subData) 존재 여부와 무관하게 사용자 ID(user_id) 단위로 직접 라이선스 테이블을 역추적 조회(Show activations by user_id)하여, 플랜 상태에 따라 동시접속 기기 제어 테이블이 화면에서 사라지지 않고 언제나 전체 표시/관리 가능하도록 개선 패치; 화면 내 고정식 {message} 경고 영역과 브라우저 alert 팝업을 모두 제거하고 모든 성공/오류/경고 안내를 공통 토스트 알람(showToast)으로 일괄 통합 개편 패치; 플랜 선택(handleSelectPlan) 처리를 프론트엔드 다중 DML에서 Supabase Stored Procedure (subscribe_user_plan RPC) 단일 호출 트랜잭션 방식으로 전환하여 보안 및 RLS 호환성을 확보하고, 각 단계별 트랜잭션 진행 상황 및 PostgreSQL 원천 예외 메시지를 사용자 에러 창에 구체적으로 표시(리턴)하도록 개편 패치; 기기 해제(handleDeactivateDevice) 및 로그아웃(handleLogout) 시의 직접 delete DML 작업을 Supabase stored procedure(delete_device_activation, deactivate_session_on_logout RPC) 호출 방식으로 위임 마이그레이션 패치; 요금제 선택 시 무료 플랜(FREE)을 제외한 모든 유료 요금제 카드를 비활성화하고 버튼을 '공사중' 상태로 노출하여 비즈니스 진입을 차단하는 임시 가드 패치; 구독 및 무료 체험 신청 이력이 한 번이라도 존재(`historyList.length > 0`)하면 무료 플랜으로의 재가입/재신청을 원천 차단하는 재가입 방지 가드 패치
// 🔗 @CALLS : supabase.auth, supabase.from, useRouter, plans constants, useToast, fetch(/api/license/check-session, /api/subscription/subscribe-desktop), clearAuthSessionStorage
// ====================================================================
"use client";

import { reportClientLog } from '@/lib/clientLogs';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import React, { useEffect, useState, useCallback, useRef } from 'react'; // 🔗 React 코어 — 상태관리(useState), 부수효과(useEffect), 콜백 메모이제이션(useCallback), DOM/타이머 참조(useRef)
import { useRouter } from 'next/navigation'; // 🔗 Next.js 라우터 — 페이지 이동(router.push) 및 쿼리 파라미터 접근
import { supabase } from '@/lib/supabaseClient'; // 🔗 Supabase 클라이언트 — Auth 세션 관리, DB 쿼리(from), RPC 호출
import { clearAuthSessionStorage } from '@/lib/authSessionHelper';
import { logoutCurrentWebSession } from '@/lib/logoutWebSession';
import {
  Laptop, Power, RefreshCw, Key, ShieldCheck, AlertCircle,
  LogOut, ArrowRight, User, Calendar, CreditCard,
  CheckCircle, XCircle, Zap, Crown, Loader2
} from 'lucide-react'; // 🎨 아이콘 세트 — 기기/전원/새로고침/라이선스/보안/경고/로그아웃/화살표/사용자/달력/결제/성공/실패/번개/왕관
import Link from 'next/link'; // 🔗 Next.js 링크 — 클라이언트 사이드 내비게이션 (<Link href=...>)
import { useToast } from '@/components/ToastProvider'; // 🛡️ 토스트 알림 — 사용자 피드백 (showToast: success/error/info/warning)
import ConfirmModal from '@/components/ConfirmModal';

interface SubscriptionInfo {
  id: string;
  plan_status: string;
  max_devices: number;
  active_device_count?: number;
  plan_name: string;
  plan_name_kr?: string;
  billing_cycle_kr?: string;
  plan_status_kr?: string;
  is_active?: boolean;
  created_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_start_at?: string;
  trial_end_at?: string;
  billing_cycle?: string;
  billing_interval?: string;
}

interface LicenseInfo {
  id: string;
  license_key: string;
  verify_key: string;
  payment_no: string;
}

interface DeviceActivation {
  id: string;
  device_uuid: string;
  device_name: string;
  activated_at: string;
  updated_at?: string;
  license_id?: string;
  payment_no?: string;
  is_active_license?: boolean;
  is_active?: boolean;
  is_current_placeholder?: boolean;
}

// DB에 저장되는 웹 기기명만 대시보드에서 해제 대상으로 취급한다.
const isWebDevice = (device: DeviceActivation) => ['web saas', 'web browser'].includes((device.device_name || '').trim().toLowerCase());
const isDesktopDevice = (device: DeviceActivation) => (device.device_name || '').toLowerCase().includes('desktop');
// 하트비트가 끊긴 과거 기록은 현재 웹 사용 건수로 세지 않는다.
const isLiveWebDevice = (device: DeviceActivation) => isWebDevice(device) && device.is_active === true &&
  Date.now() - new Date(device.updated_at || device.activated_at).getTime() < 2 * 60 * 1000;

// ── 공통 스타일 토큰 ──────────────────────────────────────
const T = {
  font: "Inter, sans-serif",
  bg: "#f7f9fb",
  surface: "rgba(255,255,255,0.6)",
  surfaceHigh: "rgba(255,255,255,0.9)",
  border: "rgba(99,102,241,0.12)",
  borderSolid: "#e2e8f0",
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  onSurface: "#0f172a",
  muted: "#475569",
  subtle: "#6e7881",
  success: "#10b981",
  danger: "#ef4444",
};

const glassCard = {
  background: T.surface,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: `1px solid rgba(255,255,255,0.45)`,
  borderRadius: "1.5rem",
  boxShadow: "8px 8px 16px rgba(0, 0, 0, 0.04), -8px -8px 16px rgba(255, 255, 255, 0.8)",
} as React.CSSProperties;

export default function DashboardPage() { // 🎯 @KICK : 로그인 유저 구독/라이선스/접속세션 관리 및 요금제 선택 대시보드

  const router = useRouter();                           // 🔗 Next.js 라우터 — 페이지 이동(router.push)
  const { showToast } = useToast();                     // 🛡️ 토스트 알림 — 성공/오류 사용자 피드백
  const [user, setUser] = useState<any>(null);                                      // 🧑 현재 로그인 유저 (Supabase Auth user 객체)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);     // 📋 현재 활성 구독 정보 (plan_name/plan_status/period_end 등)
  const [license, setLicense] = useState<LicenseInfo | null>(null);                    // 🔑 현재 활성 라이선스 (license_key/payment_no)
  const [devices, setDevices] = useState<DeviceActivation[]>([]);                    // 💻 접속 기기 세션 목록 (device_uuid/device_name)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);       // 현재 브라우저 기기는 일괄 해제에서 제외한다.
  const [userMeta, setUserMeta] = useState<any>(null);                                   // 👤 users 테이블 메타데이터 (email/provider)
  const [isLoading, setIsLoading] = useState(true);                                        // ⏳ 최초 데이터 로딩 상태
  const [dashboardError, setDashboardError] = useState<string | null>(null);              // 조회 실패와 실제 빈 데이터를 구분한다.
  const [actionLoading, setActionLoading] = useState<string | null>(null);               // 🔄 개별 액션(기기해제 등) 로딩 중인 항목 ID

  const [historyList, setHistoryList] = useState<any[]>([]);                           // 📜 과거 구독 이력 목록 (재가입 방지 검증용)
  const [commonCodes, setCommonCodes] = useState<Record<string, Record<string, string>>>({}); // 🗂️ DB common_codes 매핑 (PLAN_NAME, BILLING_CYCLE)
  const subscriptionRef = useRef(subscription);                                        // 📋 클로저 안전 참조용 subscription 복제 (stale closure 방지)
  const [desktopDevice, setDesktopDevice] = useState<string | null>(null);
  const [desktopEmail, setDesktopEmail] = useState<string | null>(null);
  const [desktopLicense, setDesktopLicense] = useState<LicenseInfo | null>(null);
  const [desktopSubscription, setDesktopSubscription] = useState<SubscriptionInfo | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [dbPlans, setDbPlans] = useState<any[]>([]); // DB에서 가져온 요금제 정보
  const [plansError, setPlansError] = useState(false); // 요금제 로드 실패를 목록 없음과 구분한다.

  useEffect(() => {
    // Read URL params
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const device = params.get('device');
    if (email) setDesktopEmail(email);
    if (device) setDesktopDevice(device);
  }, []);

  useEffect(() => { subscriptionRef.current = subscription; }, [subscription]);         // 🔄 subscription 변경 시 ref 동기화
  const [confirmModal, setConfirmModal] = useState<{                                     // ⚠️ 확인 컨펌 모달 상태 (isOpen/title/message/resolve)
    isOpen: boolean; title: string; message: string;
    confirmText?: string; isDanger?: boolean;
    resolve?: (value: boolean) => void;
  }>({ isOpen: false, title: '', message: '' });

  const showConfirm = useCallback((title: string, message: string, options?: { confirmText?: string; isDanger?: boolean }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({ isOpen: true, title, message, ...options, resolve });
    });
  }, []);

  const loadDashboardData = async () => {                                                  // 🚨 최초 데이터 로딩 함수 (Supabase Auth, 구독/라이선스/기기목록 병렬 Fetch)
    setIsLoading(true);                                                                    // ⏳ 최초 로딩 플래그
    setDashboardError(null);
    // 탭마다 별도 ID를 유지한다. 공유 localStorage 값은 다른 탭의 ID일 수 있으므로 현재 탭 판정에 쓰지 않는다.
    let tabSessionId = sessionStorage.getItem('onrivi_tab_session_id');
    if (!tabSessionId) {
      tabSessionId = crypto.randomUUID();
      sessionStorage.setItem('onrivi_tab_session_id', tabSessionId);
    }
    setCurrentSessionId(tabSessionId);
    try {
      const { data: { user: currentUser }, error: authErr } = await supabase.auth.getUser(); // 🔗 Supabase Auth 세션 조회
      if (authErr || !currentUser) { router.push(`/login${window.location.search}`); return; }                      // 🚫 인증 실패 시 로그인 페이지로 리다이렉트
      setUser(currentUser);                                                                // 🧑 로그인 유저 정보 저장

      // 👤 users / users 테이블 존재 확인 (API 호출)
      const checkRes = await fetch('/api/user/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_email: currentUser.email })
      });
      if (!checkRes.ok) throw new Error('계정 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      const userCheck = await checkRes.json();

      if (!userCheck?.exists || userCheck.is_deleted) {
        showToast(!userCheck?.exists ? '회원가입이 필요한 계정입니다.' : '탈퇴한 계정입니다. 회원가입을 진행해주세요.', 'warning');
        await supabase.auth.signOut({ scope: 'local' });
        router.push('/signup');
        return;
      }

      const targetUserId = userCheck?.id || currentUser.id;

      // 👤 users 테이블 메타데이터 조회
      const userData = userCheck;
      setUserMeta(userData);                                                                 // 👤 users 테이블 메타데이터 저장

      // 🗂️ common_codes 공통코드 동적 조회 (PLAN_NAME, BILLING_CYCLE 명칭 매핑용)
      let codesData: Array<{ group_code: string; code_value: string; code_name: string }> = [];
      try {
        const codesRes = await fetch('/api/common-codes');
        const codesJson = await codesRes.json();
        if (codesRes.ok && codesJson.success && Array.isArray(codesJson.data)) {
          codesData = codesJson.data;
        }
      } catch (err) {
        logWarn({
          file: 'frontend/src/app/dashboard/page.tsx',
          func: 'loadDashboardData',
          doing: '공통 코드 목록 조회(/api/common-codes) 중',
          target: '/api/common-codes',
          error: err
        });
      }
      if (codesData) {
        const codeMap: Record<string, Record<string, string>> = {};
        codesData.forEach(c => {
          if (!codeMap[c.group_code]) codeMap[c.group_code] = {};
          codeMap[c.group_code][c.code_value] = c.code_name;
        });
        setCommonCodes(codeMap);
      }

      // 🛒 요금제 정보 패치
      setPlansError(false);
      try {
        const plansRes = await fetch('/api/plans');
        if (!plansRes.ok) throw new Error(`요금제 조회 실패 (${plansRes.status})`);
        const plansData = await plansRes.json();
        if (!Array.isArray(plansData)) throw new Error('요금제 응답 형식이 올바르지 않습니다.');
        setDbPlans(plansData);
      } catch (err) {
        logWarn({
          file: 'frontend/src/app/dashboard/page.tsx',
          func: 'loadDashboardData',
          doing: '요금제 목록 조회(/api/plans) 중',
          target: '/api/plans',
          error: err
        });
        setDbPlans([]);
        setPlansError(true);
      }      // RLS 우회를 위해 서버사이드 API 라우트(/api/subscription/get) 호출
      const dashRes = await fetch(`/api/subscription/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId })
      });
      
      if (!dashRes.ok) throw new Error(`구독 정보를 불러올 수 없습니다. (${dashRes.status})`);
      const dashData = await dashRes.json();
      if (!dashData?.success) throw new Error(dashData?.message || '구독 정보를 불러올 수 없습니다.');

      if (dashData && dashData.success) {
        const sub = dashData.subscription || null;
        setSubscription(sub);
        setHistoryList(dashData.historyList || []);
        setLicense(dashData.license || null);
        const activeDesktop = sub?.plan_name === 'ELITEPRO' && sub?.is_active && sub?.plan_status === 'ACTIVE';
        setDesktopSubscription(activeDesktop ? sub : null);
        setDesktopLicense(activeDesktop ? dashData.license || null : null);

        // 🚨 새로 자동 생성된 요금제(READER 등)가 있을 경우, 
        // 에디터(MainEditorApp)가 인식할 수 있도록 즉시 localStorage 에 동기화
        if (sub && typeof window !== 'undefined') {
          if (!localStorage.getItem('onrivi_payment_no') || localStorage.getItem('onrivi_payment_no') !== sub.payment_no) {
            localStorage.setItem('onrivi_payment_no', sub.payment_no || '');
            localStorage.setItem('onrivi_license_key', sub.license_key || '');
            localStorage.setItem('onrivi_verify_key', sub.verify_key || '');
            localStorage.setItem('onrivi_user_id', targetUserId);
          }
        }

        const fetchedDevices: DeviceActivation[] = dashData.devices || [];
        setDevices(fetchedDevices);
      }

    } catch (err: any) { // ❌ 에러 핸들링
      logError({
        file: 'frontend/src/app/dashboard/page.tsx',
        func: 'loadDashboardData',
        doing: '대시보드 데이터(사용자, 구독, 기기 목록) 일괄 로딩 중',
        target: 'DashboardData',
        error: err
      });
      setDashboardError(err?.message || '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally { // ⏳ 로딩 플래그 해제
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDashboardData(); }, []);   // ⏳ 최초 렌더링 시 로딩

    // [OMD-DASHBOARD-POLLING] 삭제됨: 대시보드에서는 기기 관리 용도로만 접속하며, 세션이 없다고 해서 강제로 로그아웃시키지 않습니다.

  // 📊 [OMD-AUTH-dashboard-0005] 로그아웃 시 license_activation 제거
  // 🚨 @PATCH : 2026-09-05 — 로그아웃 시 온리비 관련 모든 로컬스토리지 키 완전 파기 (계정 간 오염 차단)
  //             2026-06-22 — 로그아웃 시 접속 세션 자동 제거 (Navbar와 동일 로직)
  const handleLogout = async () => { // 🚪 수동 로그아웃 — 세션 제거 + DB 정리 + signOut
    try {
      await logoutCurrentWebSession();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '웹 세션 해제에 실패했습니다.', 'error');
      return;
    }
    // 🚨 @PATCH : 2026-09-17 환경설정(Gemini API 키 등)을 안전하게 보존하고 인증 세션만 선별 삭제
    try {
      await supabase.auth.signOut({ scope: 'local' }); // 🚪 토큰이 남아 있을 때 로그아웃
    } finally {
      clearAuthSessionStorage();
    }
    router.push('/'); // 🏠 루트 페이지로 이동
  };

  const handleCancelSubscription = async () => { // ⏳ 구독 해지 함수
    if (!subscription || !user) { showToast('해지할 구독 정보가 없습니다.', 'warning'); return; } // 🛡️ 구독/유저 정보 존재 여부 확인
    const confirmed = await showConfirm('구독 해지', '정말로 현재 요금제를 해지하시겠습니까?', { confirmText: '해지', isDanger: true }); // ⚠️ 해지 확인 컨펌
    if (!confirmed) return;
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_subscription_id: subscription.id, p_user_id: user.id }) });
      const result = await res.json();
      const error = !result.success ? new Error(result.message) : null;
      if (error) throw new Error(error.message); // ❌ API 에러
      if (!result || !result.success) throw new Error(result?.message || '구독 해지에 실패했습니다.'); // ❌ API 실패 응답
      showToast('요금제가 해지되었습니다.', 'success'); // ✅ 성공 토스트
      await loadDashboardData(); // 🔄 대시보드 데이터 새로고침
    } catch (err: any) {
      showToast(`구독 해지 실패: ${err.message}`, 'error'); // ❌ 에러 토스트
    }
  };

  const handleCancelDesktopSubscription = async () => {
    if (!desktopSubscription || !user) { showToast('해지할 구독 정보가 없습니다.', 'warning'); return; }
    const confirmed = await showConfirm('구독 해지', '정말로 데스크탑 요금제를 해지하시겠습니까?', { confirmText: '해지', isDanger: true });
    if (!confirmed) return;
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_subscription_id: desktopSubscription.id, p_user_id: user.id }) });
      const result = await res.json();
      const error = !result.success ? new Error(result.message) : null;
      if (error) throw new Error(error.message);
      if (!result || !result.success) throw new Error(result?.message || '구독 해지에 실패했습니다.');
      showToast('데스크탑 요금제가 해지되었습니다.', 'success');
      await loadDashboardData();
    } catch (err: any) {
      showToast(`구독 해지 실패: ${err.message}`, 'error');
    }
  };

  const handleDeleteAccount = async () => { // 🗑️ 회원 탈퇴 — 구독 없을 때만 진행 가능
    if (!user) { showToast('사용자 정보가 없습니다.', 'warning'); return; } // 🛡️ 유저 정보 확인
    if (subscription) { // 📋 구독 존재 시 탈퇴 차단 → 먼저 계약 해지 유도
      showToast('계약이 존재합니다. 먼저 계약을 해지하신 후 다시 회원탈퇴를 진행해주세요.', 'warning');
      return;
    }
    const c1 = await showConfirm('회원 탈퇴', '정말로 회원 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.', { confirmText: '탈퇴', isDanger: true }); // ⚠️ 1차 확인
    if (!c1) return;
    const c2 = await showConfirm('최종 확인', '되돌릴 수 없습니다. 정말 탈퇴하시겠습니까?', { confirmText: '탈퇴', isDanger: true }); // ⚠️ 2차 최종 확인
    if (!c2) return;
    try {
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ p_user_id: user.id })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result?.message || '회원 탈퇴에 실패했습니다.');
      await supabase.auth.signOut({ scope: 'local' }); // 🚪 Supabase Auth 로컬 로그아웃
      // Other accounts in this browser keep their private workspace settings.
      const accountPrefix = `onrivi:account:${user.id}:`;
      Object.keys(localStorage).forEach(key => {
        if (!key.startsWith('onrivi:account:') || key.startsWith(accountPrefix)) localStorage.removeItem(key);
      });
      router.push('/signup?deleted=true');
    } catch (err: any) {
      showToast(`회원 탈퇴 실패: ${err.message}`, 'error');
    }
  };

  // 대시보드 해제 API는 검증된 사용자 소유의 웹 세션만 삭제한다. 데스크톱은 이 경로에서 삭제할 수 없다.
  const deleteDashboardWebSessions = async (targetDeviceUuid?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !currentSessionId) throw new Error('현재 브라우저 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
    const response = await fetch('/api/device/dashboard-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ target_device_uuid: targetDeviceUuid || null, current_device_uuid: currentSessionId }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || '웹 세션 해제에 실패했습니다.');
    return result.deleted as number;
  };

  const handleDeactivateDevice = async (activationId: string) => {
    const target = devices.find(device => device.id === activationId);
    if (!target || !isWebDevice(target) || target.device_uuid === currentSessionId) return;
    const confirmed = await showConfirm('웹 세션 해제', '선택한 웹 브라우저의 접속을 해제하시겠습니까?', { confirmText: '해제', isDanger: true });
    if (!confirmed) return;
    setActionLoading(activationId);
    try {
      await deleteDashboardWebSessions(target.device_uuid);
      showToast('웹 세션을 해제했습니다.', 'success');
      await loadDashboardData();
    } catch (err: any) {
      logError({
        file: 'frontend/src/app/dashboard/page.tsx',
        func: 'handleDeactivateDevice',
        doing: '단일 웹 세션 해제 처리 중',
        target: target.device_uuid,
        error: err
      });
      showToast(`웹 세션 해제 실패: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateOtherWebSessions = async () => {
    if (!currentSessionId) return;
    const confirmed = await showConfirm('다른 웹 세션 모두 해제', '현재 브라우저와 데스크톱은 유지하고, 이 계정의 다른 웹 세션과 과거 웹 기록을 모두 해제하시겠습니까?', { confirmText: '모두 해제', isDanger: true });
    if (!confirmed) return;
    setActionLoading('web_bulk');
    try {
      const deleted = await deleteDashboardWebSessions();
      showToast(`${deleted}개의 다른 웹 세션을 해제했습니다.`, 'success');
      await loadDashboardData();
    } catch (err: any) {
      showToast(`웹 세션 일괄 해제 실패: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------------------------------
  // 🚨 @PATCH : 2026-06-26 — 원리비 설치 유도(딥링크)
  // -------------------------------------------------------------------------------------
  const handleDesktopActivate = async () => {
    let currentDesktopPaymentNo = desktopLicense?.payment_no;
    let currentVerifyKey = desktopLicense?.verify_key;
    let currentLicenseKey = desktopLicense?.license_key;

    if (!currentDesktopPaymentNo) {
      showToast('먼저 Elite Pro 요금제를 선택해 주세요.', 'warning');
      return;
    }
    if (desktopEmail && user?.email !== desktopEmail) {
      showToast('로그인 계정과 데스크톱 가입 이메일이 다릅니다.', 'error');
      return;
    }

    // 딥링크 호출
    const deepLinkUrl = `onriviauthor://activate?key=${encodeURIComponent(currentVerifyKey || '')}&user=${encodeURIComponent(user?.email || '')}&paymentNo=${encodeURIComponent(currentDesktopPaymentNo || '')}&licenseKey=${encodeURIComponent(currentLicenseKey || '')}`;
    window.location.href = deepLinkUrl;
  };

  // -------------------------------------------------------------------------------------
  // 🚨 @PATCH : 2026-06-26 — 남은 일수 계산 함수
  // -------------------------------------------------------------------------------------
  const getRemainingDays = () => {
    if (!subscription) return 0; // 🛡️ 구독 정보가 없을 때
    const d = subscription.trial_end_at || subscription.current_period_end;
    if (!d) return 0; // 🛡️ 종료일이 없을 때
    return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)); // ⏱️ 남은 일수 계산
  };
  const isReaderPlan = (subscription?.plan_name || '').toUpperCase() === 'READER';
  const periodEnd = subscription?.trial_end_at || subscription?.current_period_end;
  const hasUnlimitedPeriod = isReaderPlan || !!periodEnd?.startsWith('9999-12-31');

  // -------------------------------------------------------------------------------------
  // 🚨 @PATCH : 2026-06-26 — 무료 체험 만료 여부
  // -------------------------------------------------------------------------------------
  const isTrialExpired = subscription?.plan_status === 'FREE' && getRemainingDays() <= 0;   // 🛡️ 무료 체험 만료 여부

  // -------------------------------------------------------------------------------------
  // 🚨 @PATCH : 2026-06-26 — 라이선스 유효 여부
  // -------------------------------------------------------------------------------------
  const upperPlanStatus = (subscription?.plan_status || '').toUpperCase();
  const isLicenseValid = !!subscription && (subscription.is_active ?? true) && upperPlanStatus !== 'EXPIRED' && upperPlanStatus !== 'CANCELED' && (hasUnlimitedPeriod || (periodEnd ? new Date(periodEnd).getTime() > Date.now() : upperPlanStatus === 'ACTIVE')); // 🛡️ 상태와 실제 종료일 모두 확인한다.

  // ------------------------------------------------------------------------------------------------  
  // 상태 배지 컴포넌트
  // ------------------------------------------------------------------------------------------------
  const getStatusBadge = () => {
    if (!subscription) return { label: '라이선스 미인증', color: T.danger, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)', icon: <XCircle size={13} /> };
    const upperPlanName = (subscription.plan_name || '').toUpperCase();
    if (isLicenseValid && isReaderPlan)
      return { label: '무료 읽기 플랜 이용 중', color: T.primary, bg: 'rgba(14,165,233,0.10)', border: 'rgba(14,165,233,0.25)', icon: <CheckCircle size={13} /> };
    const isFreeOrTrial = upperPlanName === 'APPRENTICE' || upperPlanName === 'FREE';
    if (isLicenseValid && isFreeOrTrial)
      return { label: `무료 체험 중 (${getRemainingDays()}일 남음)`, color: T.primary, bg: 'rgba(14,165,233,0.10)', border: 'rgba(14,165,233,0.25)', icon: <Zap size={13} /> };
    if (isLicenseValid)
      return { label: '정품 인증 완료', color: T.success, bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', icon: <CheckCircle size={13} /> };
    return { label: '라이선스 만료 / 미인증', color: T.danger, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)', icon: <XCircle size={13} /> };
  };
  const badge = getStatusBadge();
  // 구독 이력의 비활성 레코드와 데스크톱 기기는 웹 동시접속 수에 포함하지 않는다.
  const activeWebSessions = devices.filter(isLiveWebDevice);
  // 제한된 현재 탭도 보여 줘야 다른 브라우저의 활성 세션과 구분할 수 있다.
  const currentWebSession = devices
    .filter(device => isWebDevice(device) && device.device_uuid === currentSessionId)
    .sort((a, b) => new Date(b.updated_at || b.activated_at).getTime() - new Date(a.updated_at || a.activated_at).getTime())[0];
  const currentPlaceholder: DeviceActivation | null = currentSessionId && !currentWebSession ? {
    id: 'current-browser-no-session', device_uuid: currentSessionId, device_name: 'Web Browser',
    activated_at: '', is_active: false, is_current_placeholder: true,
  } : null;
  // 데스크톱 지정 장치는 참고용으로만 표시하고 웹 편집 좌석에는 포함하지 않는다.
  const visibleSessions = [
    ...activeWebSessions,
    ...(currentWebSession && !activeWebSessions.some(device => device.id === currentWebSession.id) ? [currentWebSession] : []),
    ...(currentPlaceholder ? [currentPlaceholder] : []),
    ...devices.filter(device => isDesktopDevice(device) && device.is_active === true),
  ];

  // -------------------------------------------------------------------------------------
  // 🚨 @PATCH : 2026-06-26 — 요금제 선택
  // -------------------------------------------------------------------------------------
  const handleSelectPlan = async (plan: any) => { // 🎯 요금제 선택
    if (!user) return; // 🛡️ 유저 정보가 없을 때
    if (['REGULAR', 'ELITEPRO'].includes(String(plan.plan_code).toUpperCase())) return;
    reportClientLog('요금제 선택·활성화 요청', 'INFO', 'PLAN_SELECT');
    setActionLoading('plan_' + plan.id); // ⏳ 로딩 상태 설정

    try {
      // 🚨 [재가입 가드]: 과거 이력(무료/유료/만료/해지 상관없이)이 1건이라도 존재하는 경우 무료 요금제 신청 전면 차단 (단, 자동 발급되는 READER는 제외)
      const hasAnyHistory = historyList && historyList.filter(h => h.plan_name?.toUpperCase() !== 'READER').length > 0;
      if (plan.is_free && hasAnyHistory && plan.plan_code !== 'READER') {
        throw new Error("이미 유료/무료(Apprentice) 구독 이용 이력이 존재하는 계정이므로 무료 요금제 재가입이 불가능합니다. 유료 플랜을 선택해 주세요.");
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !currentSessionId) throw new Error('로그인 또는 현재 브라우저 정보를 확인할 수 없습니다.');
      const interval = plan.is_free ? 'trial' : (plan.price_monthly > 0 && plan.price_yearly > 0 ? billingInterval : plan.price_yearly > 0 ? 'year' : 'month');

      // 📢 API 라우트 호출 (subscriptions, software_licenses, license_activations 업데이트/생성 단일 트랜잭션 처리)
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          p_user_id: user.id,
          p_plan_name: plan.plan_code,
          p_billing_interval: interval,
          p_device_uuid: currentSessionId,
        })
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        const requestId = result?.requestId || res.headers.get('X-Request-ID');
        throw new Error(`${result?.message || '플랜 활성화 실패'}${requestId ? ` (오류번호: ${requestId})` : ''}`);
      }

      // -------------------------------------------------------------------------------------------
      // 로컬 스토리지 정보 동기화
      // -------------------------------------------------------------------------------------------
      localStorage.setItem('onrivi_license_key', result.license_key || ''); // 🔒 라이선스 키 저장
      localStorage.setItem('onrivi_verify_key', result.verify_key || ''); // 🔒 인증 키 저장
      localStorage.setItem('onrivi_user_id', user.email || user.id); // 🔒 사용자 ID 저장
      localStorage.setItem('onrivi_payment_no', result.payment_no || ''); // 🔒 결제 번호 저장
      localStorage.setItem('onrivi_license_id', result.subscription_id || '');
      localStorage.setItem('onrivi_last_run_time', Date.now().toString()); // 🔒 마지막 실행 시간 저장
      // -------------------------------------------------------------------------------------------

      reportClientLog('요금제 활성화 완료', 'INFO', 'PLAN_CHANGE');
      showToast(`${plan.name} 플랜이 성공적으로 활성화되었습니다!`, 'success'); // 📢 토스트 알림
      await loadDashboardData(); // 🔄 대시보드 데이터 로드
      router.refresh(); // 🔄 페이지 컴포넌트 리프레시
    } catch (err: any) {
      console.error("❌ [Onrivi Purchase Terminal Critical Error]:", err); // ❌ 에러 로깅
      reportClientLog(err.message || '요금제 활성화 실패', 'ERROR', 'PLAN_CHANGE');
      showToast(`플랜 활성화 실패: ${err.message}`, 'error'); // 📢 에러 토스트
    } finally {
      setActionLoading(null); // ❌ 로딩 상태 해제
    }
  };

  // ── 로딩 ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <RefreshCw size={32} style={{ color: T.primary, animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          <p style={{ fontSize: 14, color: T.muted, fontWeight: 500 }}>마이페이지 정보 불러오는 중...</p>
        </div>
      </div>
    );
  }
  if (dashboardError) {
    return (
      <main style={{ minHeight: '100vh', background: T.bg, display: 'grid', placeItems: 'center', padding: 24, fontFamily: T.font }}>
        <div role="alert" style={{ ...glassCard, width: '100%', maxWidth: 480, padding: 32, textAlign: 'center' }}>
          <AlertCircle size={30} style={{ color: T.danger, margin: '0 auto 14px' }} />
          <h1 style={{ color: T.onSurface, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>대시보드를 불러오지 못했습니다</h1>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{dashboardError}</p>
          <button type="button" onClick={() => void loadDashboardData()} className="btn-primary" style={{ padding: '10px 20px' }}>다시 시도</button>
        </div>
      </main>
    );
  }

  // ── 메인 레이아웃 ──────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>

      {/* ── 상단 네비게이션 ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.80)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <img src="/icon.png" alt="Onrivi" style={{ width: 30, height: 30, borderRadius: 8 }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: T.onSurface }}>Onrivi Author</span>
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }} className="hidden sm:block">{user?.email} 님</span>
            <Link href="/editor" className="btn-primary" style={{ fontSize: 12, padding: "6px 14px", textDecoration: 'none' }}>에디터 열기</Link>
            <button
              onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.muted, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(71,85,105,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <LogOut size={13} /> 로그아웃
            </button>
          </div>
        </div>
      </nav>

      {/* ── 본문 ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: T.primaryDark, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>내 계정</p>
          <h1 style={{ color: T.onSurface, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>대시보드</h1>
          <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>현재 이용 상태를 확인하고, 기기와 멤버십을 관리하세요.</p>
          <nav aria-label="대시보드 섹션" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {[
              ['#account', '계정·구독'],
              ['#devices', '기기 관리'],
              ['#plans', '멤버십'],
              ['#history', '이용 내역'],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${T.borderSolid}`, background: '#fff', color: T.muted, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>{label}</a>
            ))}
          </nav>
        </div>

        {/* 환영 카드 */}
        <div id="account" style={{ ...glassCard, padding: "24px 28px", marginBottom: 24, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, scrollMarginTop: 76 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "1rem", background: "linear-gradient(135deg, #006591 0%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", fontWeight: 700, boxShadow: "0 4px 14px rgba(14,165,233,0.25)", flexShrink: 0 }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.onSurface, marginBottom: 4, letterSpacing: "-0.01em" }}>
                {user?.email?.split('@')[0]}님, 환영합니다!
              </h2>
              <p style={{ fontSize: 12, color: T.subtle }}>
                {user?.email} · 가입일: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </p>
              <p style={{ fontSize: 13, color: badge.color, fontWeight: 700, marginTop: 8 }}>{badge.label}</p>
            </div>
          </div>
          <a href="#devices" style={{ fontSize: 13, color: T.primaryDark, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>내 기기 확인 <ArrowRight size={14} /></a>
        </div>

        {/* 정보 카드 3열 */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* 사용자 정보 */}
          <div style={{ ...glassCard, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <User size={14} style={{ color: T.subtle }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>사용자 정보</span>
            </div>
            {[
              ["이메일", user?.email || '-'],
              ["제공자", userMeta?.provider || user?.app_metadata?.provider || 'email'],
              ["가입일", user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'],
              ["UUID", user?.id?.substring(0, 12) + '...' || '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: T.subtle }}>{label}</span>
                <span style={{ color: T.onSurface, fontWeight: 500, maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
              <button
                onClick={handleDeleteAccount}
                style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s", textDecoration: "underline", textUnderlineOffset: 3 }}
                onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
              >
                회원 탈퇴
              </button>
            </div>
          </div>

          {/* 라이선스 상태 */}
          <div style={{ ...glassCard, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <ShieldCheck size={14} style={{ color: T.subtle }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>웹구독상품</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 9999, background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
              {badge.icon} {badge.label}
            </div>
            {[
              ["현재 플랜", (subscription ? (subscription.plan_name_kr || commonCodes['PLAN_NAME']?.[subscription.plan_name] || subscription.plan_name) : '없음')],
              ["웹 에디터 사용", `${activeWebSessions.length}명`],
              ["구독 식별번호", (license?.payment_no) ? license.payment_no.replace(/(?<=.{7})./g, '*') : '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: T.subtle }}>{label}</span>
                <span style={{ color: label === "웹 에디터 사용" ? T.primary : T.onSurface, fontWeight: label === "웹 에디터 사용" ? 700 : 500 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* 구독 내역 */}
          <div style={{ ...glassCard, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Calendar size={14} style={{ color: T.subtle }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>구독 내역</span>
            </div>
            {[
              ["시작일", (subscription?.current_period_start || subscription?.created_at) ? new Date(subscription.current_period_start || subscription.created_at!).toLocaleDateString() : '-'],
              ["만료일", (() => {
                const end = subscription?.trial_end_at || subscription?.current_period_end;
                if (!end) return '-';
                if (hasUnlimitedPeriod) return '기한 없음';
                return new Date(end).toLocaleDateString();
              })()],
              ["남은 기간", subscription ? (hasUnlimitedPeriod ? '기한 없음' : `${getRemainingDays()}일`) : '-'],
              ["청구 주기", (subscription ? (subscription.billing_cycle_kr || (subscription.billing_cycle ? commonCodes['BILLING_CYCLE']?.[subscription.billing_cycle] : undefined) || subscription.billing_cycle || subscription.billing_interval || '-') : '-')],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: T.subtle }}>{label}</span>
                <span style={{ color: label === "남은 기간" ? (!isTrialExpired ? T.success : T.danger) : T.onSurface, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            {subscription && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                <button
                  onClick={handleCancelSubscription}
                  style={{ fontSize: 12, color: T.muted, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                >
                  구독 해지
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 원클릭 연동 + 세션 관리 */}
        <div id="devices" className="grid md:grid-cols-2 gap-6 mb-6" style={{ scrollMarginTop: 76 }}>
          {/* Desktop Connector */}
          <div style={{ ...glassCard, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>데스크탑구독상품</span>
              <Key size={16} style={{ color: T.primary }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>데스크톱 앱 원클릭 정품인증</h2>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: "20px", marginBottom: 16 }}>
              사용 중인 로컬 PC에 설치된 Onrivi Author 데스크톱 앱의 잠금을 해제합니다.
            </p>
            {((subscription?.plan_name || '').toUpperCase() === 'ELITEPRO' || !!desktopSubscription || !!desktopLicense || !!desktopDevice) ? (
              desktopDevice ? (
                <div style={{ padding: "12px 14px", background: "rgba(14,165,233,0.05)", border: `1px solid rgba(14,165,233,0.15)`, borderRadius: "0.75rem", marginBottom: 16, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: T.subtle }}>기기 식별자</span>
                    <span style={{ color: T.onSurface, fontWeight: 600 }}>{desktopDevice.substring(0, 20)}...</span>
                  </div>
                  {desktopLicense?.payment_no && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: T.subtle }}>구독 식별번호</span>
                      <span style={{ color: T.onSurface, fontWeight: 600, fontFamily: "monospace" }}>{desktopLicense.payment_no.replace(/(?<=.{7})./g, '*')}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: T.subtle }}>연동 준비</span>
                    <span style={{ color: T.success, fontWeight: 600 }}>✓ 데스크탑 앱 대기중</span>
                  </div>
                  {desktopSubscription && (
                    <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid rgba(14,165,233,0.1)`, textAlign: 'right' }}>
                      <button
                        onClick={handleCancelDesktopSubscription}
                        style={{ fontSize: 12, color: T.danger, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        구독 해지
                      </button>
                    </div>
                  )}
                </div>
              ) : desktopSubscription && desktopLicense ? (
                <div style={{ padding: "12px 14px", background: "rgba(14,165,233,0.05)", border: `1px solid rgba(14,165,233,0.15)`, borderRadius: "0.75rem", marginBottom: 16, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: T.subtle }}>구독 식별번호</span>
                    <span style={{ color: T.onSurface, fontWeight: 600, fontFamily: "monospace" }}>{desktopLicense.payment_no.replace(/(?<=.{7})./g, '*')}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: T.subtle }}>인증 상태</span>
                    <span style={{ color: T.success, fontWeight: 600 }}>✓ 데스크탑 연동 활성화됨</span>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid rgba(14,165,233,0.1)`, textAlign: 'right' }}>
                    <button
                      onClick={handleCancelDesktopSubscription}
                      style={{ fontSize: 12, color: T.danger, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      구독 해지
                    </button>
                  </div>
                </div>
              ) : license ? (
                <div style={{ padding: "12px 14px", background: "rgba(14,165,233,0.05)", border: `1px solid rgba(14,165,233,0.15)`, borderRadius: "0.75rem", marginBottom: 16, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: T.subtle }}>구독 식별번호</span>
                    <span style={{ color: T.onSurface, fontWeight: 600, fontFamily: "monospace" }}>{license.payment_no.replace(/(?<=.{7})./g, '*')}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: T.subtle }}>인증 상태</span>
                    <span style={{ color: T.success, fontWeight: 600 }}>✓ 대시보드 준비완료</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.05)", border: `1px solid rgba(239,68,68,0.15)`, borderRadius: "0.75rem", marginBottom: 16, fontSize: 12, display: "flex", alignItems: "center", gap: 8, color: T.danger }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  데스크탑 앱에서 [구독 페이지 이동] 버튼을 클릭해 주세요.
                </div>
              )
            ) : (
              <div style={{ padding: "12px 14px", background: "rgba(99,102,241,0.05)", border: `1px solid rgba(99,102,241,0.15)`, borderRadius: "0.75rem", marginBottom: 16, fontSize: 12, display: "flex", alignItems: "center", gap: 8, color: T.muted }}>
                <AlertCircle size={14} style={{ color: T.primary, flexShrink: 0 }} />
                데스크톱 전용 앱 연동 기능은 <b>Elite Pro</b> 플랜에서만 지원됩니다.
              </div>
            )}
            <button
              onClick={handleDesktopActivate}
              disabled={!desktopLicense?.payment_no}
              style={{
                width: "100%", padding: "10px", borderRadius: "0.75rem",
                background: !desktopLicense?.payment_no ? "rgba(14,165,233,0.05)" : T.primary,
                color: !desktopLicense?.payment_no ? T.subtle : "#fff",
                border: `1px solid ${!desktopLicense?.payment_no ? T.border : "transparent"}`,
                fontSize: 13, fontWeight: 600, cursor: !desktopLicense?.payment_no ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s", opacity: !desktopLicense?.payment_no ? 0.6 : 1,
              }}
            >
              <ShieldCheck size={15} /> 
              {desktopLicense?.payment_no ? "프로그램 실행하기 ↗" : "Elite Pro 선택 후 실행"}
            </button>
          </div>

          {/* 세션 관리 */}
          <div style={{ ...glassCard, padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12, flexShrink: 0, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.onSurface }}>
                  기기 현황 · 웹 에디터 사용 중 ({activeWebSessions.length})
                </h2>
                <p style={{ fontSize: 12, color: T.subtle, marginTop: 2 }}>현재 브라우저와 다른 활성 웹 세션을 구분해 표시합니다. 괄호 안 숫자는 편집 중인 웹 세션 수이며 데스크톱은 포함하지 않습니다.</p>
              </div>
              <button type="button" onClick={handleDeactivateOtherWebSessions}
                disabled={!currentSessionId || actionLoading !== null}
                style={{ border: `1px solid ${T.borderSolid}`, background: '#fff', color: T.danger, borderRadius: 8, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: (!currentSessionId || actionLoading !== null) ? 'not-allowed' : 'pointer', opacity: (!currentSessionId || actionLoading !== null) ? 0.5 : 1 }}>
                {actionLoading === 'web_bulk' ? '해제 중...' : '다른 웹 세션 모두 해제'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: 180, border: "1px solid rgba(14,165,233,0.1)", borderRadius: "0.5rem" }} className="custom-scrollbar">
              {(!subscription || visibleSessions.length === 0) ? (
                <div style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: T.subtle }}>
                  표시할 웹 세션이나 데스크톱 지정 장치가 없습니다.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(14,165,233,0.05)", borderBottom: "1px solid rgba(14,165,233,0.1)" }}>
                      <th style={{ padding: "8px 12px", color: T.muted, fontWeight: 600 }}>접속 기기</th>
                      <th style={{ padding: "8px 12px", color: T.muted, fontWeight: 600 }}>최근 접속시간</th>
                      <th style={{ padding: "8px 12px", color: T.muted, fontWeight: 600, textAlign: "right" }}>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                       const sortedDevices = [...visibleSessions].sort((a, b) => {
                        const aIsCurrent = isWebDevice(a) && a.device_uuid === currentSessionId;
                        const bIsCurrent = isWebDevice(b) && b.device_uuid === currentSessionId;
                        if (aIsCurrent && !bIsCurrent) return -1;
                        if (!aIsCurrent && bIsCurrent) return 1;
                        return 0;
                      });
                      return sortedDevices.map((device) => {
                        // 현재 브라우저 세션과 동일하면 보호 (상태 무관)
                         const isCurrent = isWebDevice(device) && currentSessionId === device.device_uuid;
                         const isDesktop = isDesktopDevice(device);
                         const isWeb = isWebDevice(device);
                         const cannotDeactivate = isCurrent || !isWeb || !currentSessionId;
                        return (
                          <tr
                            key={device.id}
                            style={{
                              borderBottom: "1px solid rgba(14,165,233,0.06)",
                              background: isCurrent ? "rgba(16,185,129,0.03)" : isDesktop ? "rgba(99,102,241,0.04)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Laptop size={14} style={{ color: isCurrent ? T.success : isDesktop ? "#4D73FF" : T.primary, flexShrink: 0 }} />
                                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                  <span style={{ fontWeight: 700, color: T.onSurface, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 140 }} title={device.device_name}>
                                     {isDesktop ? '🖥️ 데스크탑 프로그램' : isWeb ? (device.device_name || 'Web SaaS') : (device.device_name || '기타 기기')}
                                  </span>
                                  <span style={{ fontSize: 9, color: T.subtle, fontFamily: "monospace", marginTop: 1 }}>
                                    {device.device_uuid}
                                  </span>
                                  {isCurrent && (
                                    <span style={{ fontSize: 9, fontWeight: 700, color: device.is_active ? T.success : T.muted, alignSelf: "flex-start", marginTop: 2 }}>
                                      {device.is_current_placeholder ? '[현재 브라우저 · 편집 세션 없음]' : isLiveWebDevice(device) ? '[현재 브라우저 · 편집 중]' : '[현재 브라우저 · 읽기 전용]'}
                                    </span>
                                  )}
                                  {isDesktop && (
                                    <span style={{ fontSize: 9, fontWeight: 700, color: device.is_active !== false ? "#4D73FF" : T.danger, alignSelf: "flex-start", marginTop: 2 }}>
                                      [데스크톱 지정 장치 · 웹 편집 건수 제외]
                                    </span>
                                  )}
                                   {isWeb && !isCurrent && (
                                    <span style={{ fontSize: 9, fontWeight: 700, color: T.primary, alignSelf: "flex-start", marginTop: 2 }}>
                                      [다른 브라우저/탭 · 편집 중]
                                    </span>
                                  )}
                                  {device.is_active === false && !isDesktop && !isCurrent && (
                                    <span style={{ fontSize: 9, fontWeight: 700, color: T.danger, alignSelf: "flex-start", marginTop: 2 }}>
                                      [제한됨 (읽기전용)]
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", color: T.subtle, fontFamily: "monospace", verticalAlign: "middle" }}>
                               {device.is_current_placeholder ? '편집 접속 기록 없음' : <>{new Date(device.updated_at || device.activated_at).toLocaleDateString()}<br />
                               {new Date(device.updated_at || device.activated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right", verticalAlign: "middle" }}>
                              {isDesktop ? (
                                <span style={{ color: T.subtle, fontSize: 11, fontWeight: 600 }}>해제 불가</span>
                              ) : <button
                                onClick={() => handleDeactivateDevice(device.id)}
                                disabled={actionLoading === device.id || cannotDeactivate}
                                style={{
                                  padding: "4px 8px", borderRadius: "0.375rem", fontSize: 11, fontWeight: 600,
                                  cursor: (actionLoading === device.id || cannotDeactivate) ? "not-allowed" : "pointer",
                                  background: cannotDeactivate ? "transparent" : "rgba(239,68,68,0.06)",
                                  color: cannotDeactivate ? T.subtle : T.danger,
                                  border: `1px solid ${cannotDeactivate ? "transparent" : "rgba(239,68,68,0.20)"}`,
                                  opacity: (actionLoading === device.id || cannotDeactivate) ? 0.5 : 1,
                                  transition: "all 0.15s",
                                }}
                              >
                                 {actionLoading === device.id ? '...' : isCurrent ? '현재 기기' : isWeb ? '해제' : '해제 불가'}
                              </button>
                              }
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        {/* 멤버십 선택 */}
        <div id="plans" style={{ ...glassCard, padding: "28px", marginBottom: 24, scrollMarginTop: 76 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}`, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: T.onSurface, display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={17} style={{ color: T.primary }} /> 멤버십 살펴보기
              </h2>
              <p style={{ fontSize: 12, color: T.subtle, marginTop: 4 }}>
                이용 가능한 멤버십을 확인하세요. 현재 플랜:{" "}
                <span style={{ color: T.primary, fontWeight: 600 }}>{subscription?.plan_name || '없음'}</span>
              </p>
            </div>
          </div>
          {plansError && <p role="status" style={{ padding: '14px 16px', marginBottom: 16, color: T.danger, background: 'rgba(239,68,68,0.06)', borderRadius: 12, fontSize: 13 }}>요금제 정보를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>}
          {!plansError && dbPlans.filter(plan => plan.plan_code !== 'READER').length === 0 && <p role="status" style={{ padding: '14px 16px', marginBottom: 16, color: T.muted, background: '#fff', borderRadius: 12, fontSize: 13 }}>현재 선택할 수 있는 멤버십이 없습니다.</p>}
          <div className="grid md:grid-cols-3 gap-4">
            {dbPlans.filter(p => p.plan_code !== 'READER').map((plan) => {
              const planInterval = plan.is_free ? 'trial' : (plan.price_monthly > 0 && plan.price_yearly > 0 ? billingInterval : plan.price_yearly > 0 ? 'year' : 'month');
              const isSameInterval = plan.is_free ? true : subscription?.billing_cycle === (planInterval === 'year' ? 'YEARLY' : 'MONTHLY');
              const planCode = plan.plan_code;
              const isComingSoon = ['REGULAR', 'ELITEPRO'].includes(String(planCode).toUpperCase());
              const isCurrentPlan = (subscription?.plan_name === planCode) && (subscription?.plan_status === 'ACTIVE' || subscription?.plan_status === 'FREE') && isSameInterval;

              const priceVal = plan.is_free ? 0
                : (planInterval === 'year' ? (plan.price_yearly || 0) : (plan.price_monthly || 0));
              const suffix = plan.is_free ? "" : (planInterval === 'year' ? "/년" : "/월");

              const freeAlreadyUsed = plan.is_free && historyList.some(h => String(h.plan_name).toUpperCase() !== 'READER');
              const invalidPrice = !plan.is_free && !(planInterval === 'year' ? plan.price_yearly > 0 : plan.price_monthly > 0);

              return (
                <div
                  key={plan.id}
                  style={{
                    position: "relative",
                    background: plan.is_highlighted ? "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.12) 100%)" : "rgba(255,255,255,0.5)",
                    border: `1px solid ${isCurrentPlan ? "rgba(16,185,129,0.35)" : plan.is_highlighted ? "rgba(99,102,241,0.35)" : T.border}`,
                    borderRadius: "1rem",
                    padding: "20px 16px",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    boxShadow: plan.is_highlighted ? "0 4px 16px rgba(99,102,241,0.12)" : "none",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(99,102,241,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = plan.is_highlighted ? "0 4px 16px rgba(99,102,241,0.12)" : "none"; }}
                >
                  {plan.badge && (
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", padding: "2px 12px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", borderRadius: 9999, fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
                      {plan.badge}
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div style={{ position: "absolute", top: 8, right: 8, padding: "2px 8px", background: "rgba(16,185,129,0.12)", color: T.success, borderRadius: 9999, fontSize: 10, fontWeight: 700, border: "1px solid rgba(16,185,129,0.25)" }}>
                      현재 플랜
                    </div>
                  )}
                  {isComingSoon && (
                    <div style={{ alignSelf: 'flex-start', marginBottom: 10, padding: '3px 9px', borderRadius: 9999, background: 'rgba(148,163,184,0.14)', color: T.muted, fontSize: 11, fontWeight: 700 }}>
                      공사중 · 결제 서비스 준비 중
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{plan.tier_emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.onSurface }}>{plan.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 9999, background: "rgba(14,165,233,0.08)", color: T.primary }}>
                      {plan.environment_name || plan.sys_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.onSurface, marginBottom: 2 }}>
                    {plan.is_free ? '무료' : `${priceVal?.toLocaleString()}원`}
                    {!plan.is_free && <span style={{ fontSize: 12, fontWeight: 400, color: T.subtle }}>{suffix}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: T.subtle, marginBottom: 14 }}>{plan.tagline}</p>

                  {/* Billing interval toggle for Regular */}
                  {!plan.is_free && plan.price_monthly > 0 && plan.price_yearly > 0 && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                      <button
                        onClick={() => setBillingInterval('month')}
                        disabled={isComingSoon}
                        style={{
                          flex: 1, padding: "4px 0", fontSize: 11, fontWeight: 600, borderRadius: "0.5rem",
                          border: `1px solid ${billingInterval === 'month' ? T.primary : T.border}`,
                          background: billingInterval === 'month' ? T.primary : "transparent",
                          color: billingInterval === 'month' ? "#fff" : T.subtle,
                          cursor: isComingSoon ? "not-allowed" : "pointer", opacity: isComingSoon ? 0.6 : 1, transition: "all 0.15s",
                        }}
                      >
                        월간 {plan.price_monthly?.toLocaleString()}원
                      </button>
                      <button
                        onClick={() => setBillingInterval('year')}
                        disabled={isComingSoon}
                        style={{
                          flex: 1, padding: "4px 0", fontSize: 11, fontWeight: 600, borderRadius: "0.5rem",
                          border: `1px solid ${billingInterval === 'year' ? T.primary : T.border}`,
                          background: billingInterval === 'year' ? T.primary : "transparent",
                          color: billingInterval === 'year' ? "#fff" : T.subtle,
                          cursor: isComingSoon ? "not-allowed" : "pointer", opacity: isComingSoon ? 0.6 : 1, transition: "all 0.15s",
                        }}
                      >
                        연간 {plan.price_yearly?.toLocaleString()}원
                      </button>
                    </div>
                  )}

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 6, flexGrow: 1 }}>
                    {(plan.features || []).map((f: string, i: number) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: T.muted }}>
                        <CheckCircle size={12} style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  
                  {(() => {
                    const unavailable = isComingSoon || isCurrentPlan || freeAlreadyUsed || invalidPrice || actionLoading === 'plan_' + plan.id;
                    return (
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={unavailable}
                        style={{
                          width: "100%", padding: "9px 0", borderRadius: "0.75rem",
                          fontSize: 12, fontWeight: 700,
                          cursor: unavailable ? "not-allowed" : "pointer",
                          transition: "all 0.15s",
                          background: isCurrentPlan
                            ? "rgba(16,185,129,0.1)"
                            : (plan.is_highlighted ? T.primary : "rgba(99,102,241,0.06)"),
                          color: isCurrentPlan
                            ? T.success
                            : (plan.is_highlighted ? "#fff" : T.primaryDark),
                          border: `1px solid ${
                            isCurrentPlan ? "rgba(16,185,129,0.3)" :
                            plan.is_highlighted ? "transparent" : "rgba(99,102,241,0.25)"
                          }`,
                          opacity: unavailable ? 0.6 : 1,
                        }}
                      >
                        {isComingSoon ? '공사중' : actionLoading === 'plan_' + plan.id ? '처리 중...' : isCurrentPlan ? '✓ 현재 플랜' : freeAlreadyUsed ? '무료 재신청 불가' : invalidPrice ? '가격 설정 필요' : plan.cta || '요금제 선택'}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
           <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(99,102,241,0.04)", border: `1px solid rgba(99,102,241,0.10)`, borderRadius: "0.75rem", fontSize: 12, color: T.subtle, lineHeight: "18px" }}>
             <strong style={{ color: T.primary }}>이용 안내:</strong> Regular와 Elite Pro는 결제 서비스 연결 후 신청할 수 있습니다. 무료 플랜은 기존 조건에 따라 이용할 수 있습니다.
           </div>
        </div>

        {/* 요금제 변동 히스토리 테이블 */}
        <div id="history" style={{ ...glassCard, padding: "28px", scrollMarginTop: 76 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.onSurface, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={17} style={{ color: T.primary }} /> 사용자 요금제 변동내역
          </h2>
          <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: "0.75rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.05)", borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "12px 16px", color: T.muted, fontWeight: 600 }}>계약시작일</th>
                  <th style={{ padding: "12px 16px", color: T.muted, fontWeight: 600 }}>요금제</th>
                  <th style={{ padding: "12px 16px", color: T.muted, fontWeight: 600 }}>청구 주기</th>
                  <th style={{ padding: "12px 16px", color: T.muted, fontWeight: 600 }}>종료/갱신일</th>
                  <th style={{ padding: "12px 16px", color: T.muted, fontWeight: 600, textAlign: "right" }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "32px 0", textAlign: "center", color: T.subtle }}>
                      요금제 변동 내역이 아직 없습니다.
                    </td>
                  </tr>
                ) : (
                  historyList.map((hist) => {
                    // 공통코드 조회를 대소문자 구분 없이 안전하게 매핑 헬퍼
                    const getCodeName = (groupCode: string, codeVal?: string) => {
                      if (!codeVal) return '';
                      const group = commonCodes[groupCode];
                      if (!group) return codeVal;
                      if (group[codeVal]) return group[codeVal];
                      // 대소문자 다를 경우 fallback 매핑
                      const upper = codeVal.toUpperCase();
                      if (group[upper]) return group[upper];
                      const matchedKey = Object.keys(group).find(k => k.toUpperCase() === upper);
                      return matchedKey ? group[matchedKey] : codeVal;
                    };

                    const statusName = hist.plan_status_kr || getCodeName('PLAN_STATUS', hist.plan_status);
                    const planName = hist.plan_name_kr || getCodeName('PLAN_NAME', hist.plan_name);
                    const cycleName = hist.billing_cycle_kr || getCodeName('BILLING_CYCLE', hist.billing_cycle);

                    let badgeColor = T.muted;
                    let badgeBg = "rgba(71,85,105,0.08)";
                    
                    const upperStatus = (hist.plan_status || '').toUpperCase();
                    if (upperStatus === 'ACTIVE') {
                      badgeColor = T.success;
                      badgeBg = "rgba(16,185,129,0.08)";
                    } else if (upperStatus === 'CANCELED') {
                      badgeColor = '#f59e0b';
                      badgeBg = "rgba(245,158,11,0.08)";
                    } else if (upperStatus === 'EXPIRED') {
                      badgeColor = T.danger;
                      badgeBg = "rgba(239,68,68,0.08)";
                    }

                    // 날짜 표시 포맷터 (current_period_start / current_period_end 기준)
                    const formatDateVal = (dateVal?: string) => {
                      if (!dateVal) return '-';
                      if (dateVal.startsWith('9999-12-31')) return '기한 없음';
                      try {
                        const d = new Date(dateVal);
                        if (isNaN(d.getTime())) return dateVal;
                        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
                      } catch {
                        return dateVal;
                      }
                    };

                    return (
                      <tr key={hist.id} style={{ borderBottom: `1px solid rgba(99,102,241,0.05)` }}>
                        <td style={{ padding: "12px 16px", color: T.onSurface }}>
                          {formatDateVal(hist.current_period_start || hist.created_at)}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: T.onSurface }}>
                          {planName}
                        </td>
                        <td style={{ padding: "12px 16px", color: T.muted }}>
                          {cycleName || '-'}
                        </td>
                        <td style={{ padding: "12px 16px", color: T.muted }}>
                          {formatDateVal(hist.current_period_end)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "9999px", fontSize: 11, fontWeight: 600, color: badgeColor, background: badgeBg }}>
                            {statusName}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || '확인'}
        cancelText="취소"
        isDanger={confirmModal.isDanger}
        onConfirm={() => { confirmModal.resolve?.(true); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
        onCancel={() => { confirmModal.resolve?.(false); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
      />
    </div>
  );
}
