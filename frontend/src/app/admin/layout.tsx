/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : app/admin/layout.tsx
 * -----------------------------------------------------------------------
 * 변경내역
 * 🚨 @PATCH : **2026-11-02** — [DB 접근 서버 API 일원화] 브라우저 직접 supabase.from('admins')를 서버 /api/admin/role 호출로 전환
 * 🚨 @PATCH : **2026-09-28** — [관리자 레이아웃 디자인 통일]: DESIGN.md 기준 캔버스·260px 사이드바·활성 메뉴·경계·반응형 여백 및 세션 모달 버튼 적용
 * ----------------------------------------------------------------------- * 🚨 @PATCH : **2026-09-26** — [기술 블로그 관리 네비게이션 추가]: 관리자 사이드바에 기술 블로그 관리(id: 'blog', BookOpen) 메뉴 신설
 *             2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
 *             2026-09-02** — 어드민 사이드바를 에디터 좌측 사이드바 디자인 시스템(경계선 border-slate-300, 폰트 패밀리, bg-sidebar-luxury, 선명한 하이라이트/호버)과 100% 일치화
 * *2026-09-02** — 좌측 상단 헤더 로고(/icon.png) 및 'Onrivi Admin' 타이포그래피를 랜딩페이지 브랜드 디자인 시스템 규격과 100% 일치화
 * *2026-09-02** — LINE Design System (LDSG v5.0) 표준 적용: 사이드바 .bg-sidebar-luxury 럭셔리 그라데이션 적용 및 LDSG Green(#1d4ed8)/Blue(#4D73FF) 컬러 시스템 통일
 * -----------------------------------------------------------------------
 */
'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, MonitorPlay, Settings, LogOut, Menu, X, MessageSquare, ShieldAlert, Ticket, Files, FileDown, Server, ShieldCheck, Tags, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);
  const currentTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (pathname === '/admin/login') return;
    let cancelled = false;
    setAuthReady(false);
    
    const checkAuth = async () => {
      try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        router.replace('/admin/login');
        return;
      }

      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;
      if (aal?.currentLevel !== 'aal2') {
        router.replace('/admin/login');
        return;
      }

      const roleRes = await adminFetch('/api/admin/role');
      const roleData = await roleRes.json();
      if (!roleRes.ok || !roleData?.admin_role || !['SUPER', 'SUPPORT'].includes(roleData.admin_role)) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }

      if (!cancelled) {
        setAdminRole(roleData.admin_role);
        setAdminEmail(session.user.email || '');
        setAuthReady(true);
      }
      } catch (error) {
        console.error('Admin layout authentication failed:', error);
        showToast('관리자 로그인 상태를 확인하지 못했습니다.', 'error');
        router.replace('/admin/login');
      }
    };
    
    checkAuth();
    return () => { cancelled = true; };
  }, [pathname, router]);

  // --- Session Extension ---
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const [extensionTimeLeft, setExtensionTimeLeft] = useState(120);

  useEffect(() => {
    if (pathname === '/admin/login') return;

    let sessionTimer: NodeJS.Timeout;
    let extensionInterval: NodeJS.Timeout;

    if (!showExtensionPrompt) {
      // 1시간 타이머 시작
      sessionTimer = setTimeout(() => {
        setShowExtensionPrompt(true);
        setExtensionTimeLeft(120);
      }, 3600000); // 1시간 (3600000ms)
    } else {
      // 2분 카운트다운 시작
      extensionInterval = setInterval(() => {
        setExtensionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(extensionInterval);
            (async () => {
              showToast('보안을 위해 세션이 만료되어 자동 로그아웃 되었습니다.', 'warning');
              await supabase.auth.signOut();
              router.replace('/admin/login');
              setShowExtensionPrompt(false);
            })();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (sessionTimer) clearTimeout(sessionTimer);
      if (extensionInterval) clearInterval(extensionInterval);
    };
  }, [pathname, router, showExtensionPrompt]);

  const handleExtendSession = () => {
    setShowExtensionPrompt(false);
    showToast('로그인 세션이 1시간 연장되었습니다.', 'success');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const navigation = [
    { name: '대시보드', href: '/admin?tab=dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: '사용자 관리', href: '/admin?tab=users', id: 'users', icon: Users },
    { name: '구독 및 라이선스', href: '/admin?tab=subscriptions', id: 'subscriptions', icon: CreditCard },
    { name: '요금제 관리', href: '/admin?tab=plans', id: 'plans', icon: Tags },
    { name: '자주 묻는 질문', href: '/admin?tab=faqs', id: 'faqs', icon: MessageSquare },
    ...(adminRole === 'SUPER' ? [{ name: '관리자 계정 관리', href: '/admin?tab=admins', id: 'admins', icon: ShieldCheck }] : []),
    { name: '문의 및 지원', href: '/admin?tab=support', id: 'support', icon: MessageSquare },
    { name: '공통 코드 관리', href: '/admin?tab=codes', id: 'codes', icon: Settings },
    { name: '감사 로그', href: '/admin?tab=audit', id: 'audit', icon: ShieldAlert },
    { name: '프로모션 관리', href: '/admin?tab=promotions', id: 'promotions', icon: Ticket },
    { name: '기술 블로그 관리', href: '/admin?tab=blog', id: 'blog', icon: BookOpen },
    { name: '콘텐츠 관리', href: '/admin?tab=contents', id: 'contents', icon: Files },
    { name: '리포트 추출', href: '/admin?tab=reports', id: 'reports', icon: FileDown },
    { name: '시스템 현황', href: '/admin?tab=system', id: 'system', icon: Server },
  ];

  if (pathname === '/admin/login') {
    return <div className="admin-theme min-h-screen">{children}</div>;
  }

  if (!authReady) {
    return <div className="admin-theme min-h-screen flex items-center justify-center text-sm text-zinc-500">관리자 권한 확인 중…</div>;
  }

  return (
    <div className="admin-theme flex h-screen overflow-hidden bg-[var(--admin-bg)]">
      {/* Sidebar for Desktop (.bg-sidebar-luxury 및 에디터 사이드바 기준 일치) */}
      <aside 
        className="hidden w-[260px] bg-sidebar-luxury border-r border-[#e2e8f0] select-none md:flex md:flex-col z-10"
      >
        <div className="flex items-center justify-start gap-3 h-16 border-b border-[#e2e8f0] px-6 shrink-0 bg-white/75 backdrop-blur-md">
          <Link href="/admin" className="flex items-center gap-2.5">
            <img src="/icon.png" alt="Onrivi" className="w-8 h-8 rounded-lg shadow-2xs" />
            <span className="font-extrabold text-lg text-zinc-950 tracking-tight">
              Onrivi Admin
            </span>
          </Link>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {navigation.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative group overflow-hidden ${
                  isActive
                    ? 'text-blue-700 font-extrabold bg-[#1d4ed8]/10 shadow-xs'
                    : 'text-zinc-700 hover:text-black hover:bg-zinc-200/70 font-bold'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1d4ed8]' : 'text-zinc-600'}`} />
                <span className="text-[13px] tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-3.5 border-t border-[#e2e8f0] shrink-0 space-y-2.5 bg-white/40">
          {/* Admin Info Card */}
          {adminEmail && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white border border-[#e2e8f0] shadow-xs">
              <div className="w-8 h-8 rounded-full bg-[#1d4ed8] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs">
                {adminEmail.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 truncate" title={adminEmail}>
                  {adminEmail}
                </p>
                <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
                  adminRole === 'SUPER'
                    ? 'bg-[#1d4ed8]/15 text-[#1d4ed8]'
                    : 'bg-[#4D73FF]/15 text-[#4D73FF]'
                }`}>
                  {adminRole === 'SUPER' ? '⚡ SUPER' : '🛡 SUPPORT'}
                </span>
              </div>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 w-full rounded-lg text-zinc-700 hover:bg-red-50 hover:text-red-600 transition-colors font-bold text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Session Extension Modal */}
      {showExtensionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="admin-glass-card p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300 shadow-xl">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">로그인 연장 안내</h2>
            <p className="text-zinc-600 mb-6 leading-relaxed text-sm">
              보안을 위해 1시간마다 로그인 상태를 확인합니다.<br/>
              세션을 1시간 연장하시겠습니까?
            </p>
            <div className="flex flex-col gap-2 mb-6">
              <span className="text-sm text-red-600 font-semibold animate-pulse">
                자동 로그아웃까지 남은 시간: {Math.floor(extensionTimeLeft / 60)}분 {(extensionTimeLeft % 60).toString().padStart(2, '0')}초
              </span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleLogout}
                className="admin-btn-secondary flex-1"
              >
                로그아웃
              </button>
              <button 
                onClick={handleExtendSession}
                className="flex-1 py-3 px-4 admin-btn-primary text-sm"
              >
                1시간 연장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-[#e2e8f0] z-20 shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5">
            <img src="/icon.png" alt="Onrivi" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-base text-zinc-900 tracking-tight">
              Onrivi Admin
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-black/5 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}>
            <aside
              className="absolute top-16 left-0 bottom-0 w-[260px] bg-sidebar-luxury border-r border-[#e2e8f0] flex flex-col shadow-2xl animate-in slide-in-from-left-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
                {navigation.map((item) => {
                   const isActive = currentTab === item.id;
                   return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-blue-700 font-extrabold bg-[#1d4ed8]/10 shadow-xs'
                        : 'text-zinc-700 hover:text-black hover:bg-zinc-200/70 font-bold'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-[#1d4ed8]' : 'text-zinc-600'}`} />
                    <span className="text-[13.5px] tracking-tight">{item.name}</span>
                  </Link>
                )})}
              </div>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 lg:py-8 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme">
      <Suspense fallback={<div className="min-h-screen bg-[var(--admin-bg)] flex items-center justify-center">Loading...</div>}>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </Suspense>
    </div>
  );
}
