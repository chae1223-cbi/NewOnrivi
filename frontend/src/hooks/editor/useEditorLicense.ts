// ====================================================================
// 📊 [OMD-HOOK-useEditorLicense] frontend/src/hooks/editor/useEditorLicense.ts
// 🎯 @KICK  : 에디터 라이선스 검증, 다중 기기 세션 감시(Heartbeat/Takeover), 게스트 체험 타이머, 활성화 수신 관리 훅
// 🛡️ @GUARD : 비인증 진입 시 자동 게스트 모드 전환 및 세션 탈취 시 즉각적인 읽기 전용/미리보기 제어
// 🚨 @PATCH : 2026-11-05 — [데스크톱 로컬 우선 라이선스 즉시 활성화 및 검증 타임아웃 단축]:
//             1) 로컬 정품 라이선스 캐시 존재 시 0ms 즉시 활성화로 UI 락(멈춤/깜빡임) 원천 방어
//             2) 데스크톱 온라인 검증 타임아웃 10초에서 2.5초로 대폭 단축하여 네트워크 지연 시 멈춤 체감 제거
// 🚨 @PATCH : 2026-11-05 — [온라인 검증 오탐 완화]: 다중 DB 조회에 2.5초 제한이 짧아 8초로 조정하고 실패 소요 시간을 기록한다.
// 🚨 @PATCH : 2026-11-05 — [검증 실패 시간 노출]: 개발자 콘솔에 경과 시간과 오류 종류를 남겨 네트워크 지연과 서버 거절을 구분한다.
// 🚨 @PATCH : 2026-11-04 — [표준화 및 에러 처리 강화] logError/logWarn 5대 진단 필드 선제 기록 및 2단계 함수 JSDoc 표준화
//             2026-11-04 — [formatTime 반환 추가] 게스트 체험 모드 남은 시간 포맷 함수(formatTime) 반환 목록에 추가하여 ReferenceError 해결
//             2026-11-04 — [MainEditorApp 모듈화] MainEditorApp에서 1,044줄의 라이선스/세션/게스트 관리 로직을 독립 훅으로 분리
// 🔗 @CALLS : supabase, api.loadLicenseFull, api.saveLicenseFull, saveSecureData, loadSecureData, getApiUrl, browserSessionPolling, logError, logWarn
// ====================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { browserSessionPolling } from '@/lib/sessionPolling';
import { clearAuthSessionStorage, parseDateStringToMs } from '@/lib/authSessionHelper';
import { LicenseStatus } from '@/hooks/editor/useEditorAuth';
import { logError, logWarn } from '@/lib/errorDiagnostics';

export interface UseEditorLicenseOptions {
  deviceId: string;
  licenseKey: string;
  setLicenseKey: (key: string) => void;
  licenseStatus: LicenseStatus;
  setLicenseStatus: React.Dispatch<React.SetStateAction<LicenseStatus>>;
  isLicenseChecking: boolean;
  setIsLicenseChecking: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  previewModeRef: React.MutableRefObject<string>;
  lastGeneralPreviewModeRef: React.MutableRefObject<string>;
  isGuestMode: boolean;
  setIsGuestMode: React.Dispatch<React.SetStateAction<boolean>>;
  isGuestExpired: boolean;
  setIsGuestExpired: React.Dispatch<React.SetStateAction<boolean>>;
  guestRemainingSeconds: number;
  setGuestRemainingSeconds: React.Dispatch<React.SetStateAction<number>>;
  setPreviewModeRaw: (mode: 'edit' | 'both' | 'preview' | 'css-style') => void;
  mounted: boolean;
  isDuplicateInstance: boolean;
  takeOverControl: () => void;
}

export interface UseEditorLicenseReturn {
  isTakingOver: boolean;
  handleTakeover: () => Promise<void>;
  handleSuccessActivation: (verifyKey: string, userId: string, paymentNo: string, explicitLicenseKey?: string) => Promise<void>;
  loadAndVerifyLicense: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

/**
 * ========================================================================================
 * [함수명] useEditorLicense - 에디터 라이선스 검증, 다중 기기 세션 감시, 제어권 인수 전담 훅
 *
 * @param {UseEditorLicenseOptions} options - 기기 ID, 라이선스 상태, 게스트 모드 상태 및 콜백
 * @returns {UseEditorLicenseReturn} 라이선스 검증/활성화/제어권 인수 핸들러 및 타이머 포맷 함수
 * ==========================================================================================
 */
export function useEditorLicense({
  deviceId,
  licenseKey,
  setLicenseKey,
  licenseStatus,
  setLicenseStatus,
  isLicenseChecking,
  setIsLicenseChecking,
  showToast,
  previewModeRef,
  lastGeneralPreviewModeRef,
  isGuestMode,
  setIsGuestMode,
  isGuestExpired,
  setIsGuestExpired,
  guestRemainingSeconds,
  setGuestRemainingSeconds,
  setPreviewModeRaw,
  mounted,
  isDuplicateInstance,
  takeOverControl,
}: UseEditorLicenseOptions): UseEditorLicenseReturn {
  /**
   * ========================================================================================
   * [함수명] loadAndVerifyLicense - 데스크톱(Electron) 및 웹(SaaS) 라이선스·세션 유효성을 검증하고 상태를 갱신합니다.
   *
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const loadAndVerifyLicense = useCallback(async () => {
    if (typeof window === 'undefined' || !deviceId) return;
    
    // 🛡️ [무인증 진입 시 자동 게스트 모드 전환 가드]
    // 로그인 세션이 없고 등록된 라이선스 결제 정보도 없는 비인증 사용자가 /editor로 접근한 경우,
    // 로그인 화면으로 튕구는 대신 즉석에서 편리하게 체험할 수 있도록 즉시 게스트 모드로 자동 부팅시켜 줍니다.
    const initialGuestCheck = localStorage.getItem('onrivi_guest_mode') === 'Y';
    const hasPayment = !!localStorage.getItem('onrivi_payment_no');
    const hasLicense = !!localStorage.getItem('onrivi_license_key');
    let hasSession = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) hasSession = true;
    } catch (_) {}

    // 🌟 [정식 회원 로그인 가드] 회원 로그인 세션이 정상적으로 확인되는 경우,
    // 혹시라도 남아 있을 수 있는 게스트 체험판 플래그를 즉시 소멸하여 체험판 작동을 완전히 중단시킵니다!
    if (hasSession) {
      localStorage.removeItem('onrivi_guest_mode');
      localStorage.removeItem('onrivi_guest_expired');
      localStorage.removeItem('onrivi_guest_start_time');
      setIsGuestMode(false);
      setIsGuestExpired(false);
    }

    if (!hasSession && !hasPayment && !hasLicense && !initialGuestCheck) {
      // 🛡️ [비로그인 무단 접근 차단]
      // 데스크톱 앱(Electron)이 아닌 웹 브라우저 환경에서 로그인 아이디도 없고 체험하기 플래그도 없으면 진입 차단!
      if (!(window as any).electronAPI) {
        console.warn('[ONRIVI GUARD] 로그인 세션 또는 라이선스가 없습니다. 에디터 진입을 차단하고 로그인 화면으로 이동합니다.');
        window.location.replace('/login?redirect=/editor');
        return;
      }
    }

    // 🛡️ [게스트 즉시 체험 모드 가드] 게스트 모드로 동작 시 라이선스 검증 스킵하고 활성화 처리
    const isGuestMode = localStorage.getItem('onrivi_guest_mode') === 'Y';
    if (isGuestMode) {
      setLicenseStatus({
        isActivated: true,
        isExpired: false,
        remainingDays: 999,
        userId: 'GUEST_USER',
        licenseKey: 'GUEST_LICENSE_KEY',
        paymentNo: 'GUEST_PAYMENT_NO',
        planName: '체험판 게스트 요금제',
        nextPaymentDate: '2999-12-31'
      });
      return;
    }

    console.log('[LICENSE] loadAndVerifyLicense START deviceId=%o', deviceId);
    const api = (window as any).electronAPI;
    const isDesktop = !!api;
    let savedKey = '';
    let savedPaymentNo = '';
    let savedUserId = '';
    let savedLastRunTime = 0;

    let savedNextPaymentDate = '';
    let savedLicenseKey = '';
    let savedPlanName = '';

    // A. 스토리지 로드 (로컬스토리지를 최우선 단일 진실 공급원(SSOT)으로 사용)
    savedKey = localStorage.getItem('onrivi_license_key') || '';
    savedUserId = localStorage.getItem('onrivi_user_id') || '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // 🚨 [결함 교정] UUID(session.user.id)로 이메일을 덮어쓰면 서버 verify-desktop에서 NOT_FOUND 발생!
      // 따라서 session.user.email을 최우선으로 취득하고, 없을 때만 fallback
      if (session?.user?.email) {
        savedUserId = session.user.email;
      } else if (!savedUserId && session?.user?.id) {
        savedUserId = session.user.id;
      }
    } catch (e) {}
    savedPaymentNo = localStorage.getItem('onrivi_payment_no') || '';
    savedLastRunTime = parseInt(localStorage.getItem('onrivi_last_run_time') || '0', 10);

    const cachedStatus = loadSecureData<any>('onrivi_license_status');
    if (cachedStatus && cachedStatus.userId === savedUserId) {
      savedNextPaymentDate = cachedStatus.nextPaymentDate || '';
      savedPlanName = cachedStatus.planName || '';
      // 캐시된 라이선스 키가 있으면 병합
      if (!savedKey && cachedStatus.licenseKey) savedKey = cachedStatus.licenseKey;
    }

    if (isDesktop) {
      if (typeof api.loadLicenseFull === 'function') {
        const fullData = await api.loadLicenseFull();
        if (fullData) {
          // 데스크톱 license.json에 유효한 이메일 계정이 있으면 최우선 채택
          if (fullData.userId && fullData.userId.includes('@')) {
            savedUserId = fullData.userId;
          } else if (fullData.userId && !savedUserId) {
            savedUserId = fullData.userId;
          }
          savedLastRunTime = fullData.lastRunTime || savedLastRunTime;
          savedNextPaymentDate = fullData.nextPaymentDate || savedNextPaymentDate;
          savedLicenseKey = fullData.licenseKey || savedKey;
          savedPlanName = fullData.planName || savedPlanName;
        }
      }
    } else {
      savedLicenseKey = savedKey;
    }

    const nowTime = Date.now();

    // B. 시간 조작 가드
    if (savedLastRunTime > 0 && nowTime < savedLastRunTime) {
      logError({
        file: 'frontend/src/hooks/editor/useEditorLicense.ts',
        func: 'loadAndVerifyLicense',
        doing: '로컬 시스템 실행 시각과 마지막 실행 시각(savedLastRunTime) 무결성 비교 검증 중',
        target: savedUserId || deviceId,
        error: new Error(`System clock rollback detected: now=${nowTime} < savedLastRunTime=${savedLastRunTime}`),
      });
      showToast("⚠️ 로컬 시스템 시간 조작이 감지되었습니다. 에디터 편집 기능이 제한됩니다.", "error");
      setLicenseStatus(prev => ({
        ...prev, isActivated: false, isExpired: true, planName: '시간 역전 제한 모드'
      }));
      return;
    }

    // ============================================
    // 🚨 데스크탑 전용 로직: 무조건 DB 조회 (USERID + DeviceID)
    // ============================================
    if (isDesktop) {
      // 시스템 실행 시간 갱신 및 기존 라이선스 오프라인 토큰 유지
      if (typeof api.saveLicenseFull === 'function') {
        await api.saveLicenseFull({
          userId: savedUserId,
          lastRunTime: nowTime,
          nextPaymentDate: savedNextPaymentDate,
          licenseKey: savedLicenseKey,
          planName: savedPlanName
        });
      }

      if (!savedUserId) {
        setLicenseStatus({
          isActivated: false, isExpired: true, remainingDays: 0,
          userId: '', licenseKey: '', paymentNo: '',
          planName: '제한사용자', nextPaymentDate: ''
        });
        return;
      }

      // 🚀 [Local-First Fast Activation] 이미 로컬 PC에 유효한 라이선스(Elite Pro 등)가 있으면 즉시 활성화하여 UI 락 원천 방어!
      if (savedNextPaymentDate) {
        const localExpiryMs = parseDateStringToMs(savedNextPaymentDate);
        const localRemainingDays = Math.max(0, Math.ceil((localExpiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
        if (localRemainingDays > 0) {
          console.log('[loadAndVerifyLicense] 🚀 Local-First 즉시 활성화 (D-%d, %s)', localRemainingDays, savedPlanName || 'Elite Pro 플랜');
          setLicenseStatus({
            isActivated: true, isExpired: false, remainingDays: localRemainingDays,
            userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: savedPaymentNo || '',
            planName: savedPlanName || 'Elite Pro 플랜',
            nextPaymentDate: savedNextPaymentDate
          });
          setIsLicenseChecking(false);
        }
      }

      const verifyStartedAt = performance.now();
      try {
        const verifyRes = await fetch(getApiUrl('/api/license/verify-desktop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_email: savedUserId, p_device_uuid: deviceId }),
          signal: AbortSignal.timeout(8000)
        });
        console.info('[STARTUP timing] desktop license verification ms=%d', Math.round(performance.now() - verifyStartedAt));
        const data = verifyRes.ok ? await verifyRes.json() : null;
        const error = !verifyRes.ok ? new Error('서버 오류') : null;

        if (error || !data) {
          console.warn('[loadAndVerifyLicense] Desktop verification network error:', error);
          // 오프라인 유예기간(Grace Period) 검증 (네트워크 오류 시에만 작동)
          if (savedNextPaymentDate) {
            const expiryMs = parseDateStringToMs(savedNextPaymentDate);
            const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
            if (remainingDays > 0) {
              console.log('[loadAndVerifyLicense] Offline grace period active. Days remaining:', remainingDays);
              showToast(`네트워크 오프라인 모드로 실행 중입니다. (구독 만료까지 D-${remainingDays})`, "warning");
              setLicenseStatus({
                isActivated: true, isExpired: false, remainingDays,
                userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: '',
                planName: savedPlanName || '오프라인 프리미엄 요금제',
                nextPaymentDate: savedNextPaymentDate
              });
              setIsLicenseChecking(false);
              return;
            }
          }
          setLicenseStatus({
            isActivated: false, isExpired: true, remainingDays: 0,
            userId: savedUserId, licenseKey: '', paymentNo: '',
            planName: '제한사용자', nextPaymentDate: ''
          });
        } else if (!data.success) {
          console.warn('[loadAndVerifyLicense] Desktop verification explicitly rejected:', data.message);
          if (data.code === 'ERR_MAX_DEVICES_EXCEEDED') {
            setLicenseStatus({
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: savedUserId, licenseKey: '', paymentNo: data.payment_no || '',
              isRestricted: true,
              isConcurrentLimited: true,
              hasEditorSubscription: true,
              planName: data.message, nextPaymentDate: data.next_payment_date || ''
            });
          } else {
            // 🚨 만약 로컬에 아직 유효기간이 남아있는 라이선스가 있다면, 일시적 식별자 불일치나 네트워크/서버 일시 오류로 즉시 로컬 라이선스를 영구 파기하지 않고 오프라인 유예기간으로 안전하게 보호
            if (savedNextPaymentDate) {
              const expiryMs = parseDateStringToMs(savedNextPaymentDate);
              const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
              if (remainingDays > 0) {
                console.warn('[loadAndVerifyLicense] Desktop verification rejected (' + data.code + '), but local license is valid until ' + savedNextPaymentDate + '. Fallback to offline grace mode.');
                showToast(`서버 라이선스 확인 중 일시적 오류가 발생하여 오프라인 모드로 안전 전환되었습니다. (만료 D-${remainingDays})`, "warning");
                setLicenseStatus({
                  isActivated: true, isExpired: false, remainingDays,
                  userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: '',
                  planName: savedPlanName || '오프라인 프리미엄 요금제',
                  nextPaymentDate: savedNextPaymentDate
                });
                setIsLicenseChecking(false);
                return;
              }
            }

            // 만료일도 지났거나 라이선스가 전혀 없는 경우에만 완전 초기화
            if (typeof api !== 'undefined' && api.saveLicenseFull) {
              await api.saveLicenseFull({});
            }
            localStorage.removeItem('onrivi_license_key');
            localStorage.removeItem('onrivi_payment_no');
            localStorage.removeItem('onrivi_verify_key');
            localStorage.removeItem('onrivi_user_id');
            setLicenseStatus({
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: '', licenseKey: '', paymentNo: '',
              planName: '제한사용자', nextPaymentDate: ''
            });
          }
        } else {
          const expiryMs = data.next_payment_date ? parseDateStringToMs(data.next_payment_date) : 0;
          const isExpired = expiryMs === 0 ? true : (Date.now() > expiryMs);
          const remainingDays = expiryMs === 0 ? 0 : Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));

          if (isExpired) {
            setLicenseStatus({
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: savedUserId, licenseKey: '', paymentNo: '',
              planName: '기간 만료 (제한 사용자)', nextPaymentDate: ''
            });

            if (typeof api.saveLicenseFull === 'function') {
              await api.saveLicenseFull({
                userId: savedUserId,
                lastRunTime: Date.now(),
                nextPaymentDate: data.next_payment_date || '',
                licenseKey: '',
                planName: '기간 만료 (제한 사용자)'
              });
            }
            
            localStorage.setItem('onrivi_license_key', '');
            localStorage.setItem('onrivi_last_run_time', Date.now().toString());
            saveSecureData('onrivi_license_status', {
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: savedUserId, licenseKey: '', paymentNo: '',
              planName: '기간 만료 (제한 사용자)', nextPaymentDate: data.next_payment_date || '',
              lastVerifiedAt: Date.now()
            });
          } else {
            const newStatus = {
              isActivated: true, isExpired: false, remainingDays,
              userId: savedUserId, licenseKey: data.license_key || '', paymentNo: data.payment_no || '',
              planName: data.plan_name || '프리미엄 요금제',
              nextPaymentDate: data.next_payment_date || data.trial_end_at || ''
            };

            setLicenseStatus(newStatus);

            // 인증 성공 시 최신 라이선스 정보로 로컬 오프라인 토큰 갱신
            if (typeof api.saveLicenseFull === 'function') {
              await api.saveLicenseFull({
                userId: savedUserId,
                lastRunTime: Date.now(),
                nextPaymentDate: newStatus.nextPaymentDate,
                licenseKey: newStatus.licenseKey,
                paymentNo: newStatus.paymentNo,
                planName: newStatus.planName
              });
            }
            
            // 데스크탑 환경에서도 로컬스토리지를 최신 DB 정보로 완벽하게 동기화 (오프라인 폴백 용도)
            localStorage.setItem('onrivi_license_key', newStatus.licenseKey);
            localStorage.setItem('onrivi_payment_no', newStatus.paymentNo);
            localStorage.setItem('onrivi_user_id', newStatus.userId);
            localStorage.setItem('onrivi_last_run_time', Date.now().toString());
            
            saveSecureData('onrivi_license_status', {
              ...newStatus,
              lastVerifiedAt: Date.now()
            });
          }
        }
      } catch (err) {
        logWarn({
          file: 'frontend/src/hooks/editor/useEditorLicense.ts',
          func: 'loadAndVerifyLicense',
          doing: '데스크톱 라이선스 서버 검증 응답 대기 중',
          target: '/api/license/verify-desktop',
          error: err,
          context: { elapsedMs: Math.round(performance.now() - verifyStartedAt) }
        });
        console.warn('[STARTUP timing] desktop license verification failed ms=%d reason=%s', Math.round(performance.now() - verifyStartedAt), err instanceof Error ? err.name : typeof err);

        // 🚨 오프라인 유예기간(Grace Period) 검증 🚨
        if (savedNextPaymentDate) {
          const expiryMs = parseDateStringToMs(savedNextPaymentDate);
          const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));

          if (remainingDays > 0) {
            console.log('[loadAndVerifyLicense] Offline grace period active. Days remaining:', remainingDays);
            showToast(`네트워크 오프라인 모드로 실행 중입니다. (구독 만료까지 D-${remainingDays})`, "warning");
            setLicenseStatus({
              isActivated: true, isExpired: false, remainingDays,
              userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: '',
              planName: savedPlanName || '오프라인 프리미엄 요금제',
              nextPaymentDate: savedNextPaymentDate
            });
            return;
          }
        }

        setLicenseStatus({
          isActivated: false, isExpired: true, remainingDays: 0,
          userId: savedUserId, licenseKey: '', paymentNo: '',
          planName: '제한사용자', nextPaymentDate: ''
        });
      }
      return; // 데스크탑은 여기서 검증 완전 종료!
    }

    // ============================================
    // ── 웹 SaaS 전용 기존 로직 ──
    // ============================================
    if (!savedPaymentNo) {
      savedKey = '';
      savedUserId = '';
      savedPaymentNo = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const res = await fetch(getApiUrl('/api/subscription/get'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: session.user.id })
          });
          if (res.ok) {
            const data = await res.json();
            const userSub = data?.subscription;
            if (userSub?.payment_no) {
              savedPaymentNo = userSub.payment_no;
              savedKey = userSub.license_key || '';
              savedUserId = session.user.id;
            }
          }
        }
      } catch (e) {
        console.warn('[loadAndVerifyLicense] user_id fallback failed:', e);
      }
    }

    // chromeStorage.set 로직 완전 제거 (순수 localStorage만 유지)
    localStorage.setItem('onrivi_license_key', savedKey);
    localStorage.setItem('onrivi_user_id', savedUserId);
    localStorage.setItem('onrivi_payment_no', savedPaymentNo);
    localStorage.setItem('onrivi_last_run_time', nowTime.toString());

    if (!savedKey) savedKey = '';
    setLicenseKey(savedKey);

    if (savedPaymentNo) {
      // 🛡️ 웹 전용: savedPaymentNo가 localStorage에 남아있어도 Supabase 세션이 유효한지 다시 확인 (데스크탑은 라이선스 기반, Supabase 불필요)
      const isDesktop = typeof window !== 'undefined' && (!!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop');
      let currentAuthUser: any = null;
      if (!isDesktop) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            clearAuthSessionStorage();
            window.location.href = '/login';
            return;
          }
          currentAuthUser = session.user;
        } catch (_) {
          clearAuthSessionStorage();
          window.location.href = '/login';
          return;
        }
      }
      try {
        // 🚨 @PATCH : 2026-09-16 웹 환경에서는 동일 브라우저의 다중 탭/창을 독립 격리하기 위해 sessionStorage를 우선 사용
        let sessionId = !isDesktop ? (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) : null;
        if (!sessionId) {
          sessionId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
          if (!isDesktop && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('onrivi_tab_session_id', sessionId);
          }
        }
        localStorage.setItem('onrivi_session_id', sessionId);

        let license: any = null;
        if (currentAuthUser?.id) {
          try {
            const subRes = await fetch(getApiUrl('/api/subscription/get'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: currentAuthUser.id })
            });
            if (subRes.ok) {
              const subData = await subRes.json();
              license = subData?.subscription || null;
              if (license?.payment_no) {
                savedPaymentNo = license.payment_no;
                localStorage.setItem('onrivi_payment_no', savedPaymentNo);
                if (license.license_key) {
                  savedKey = license.license_key;
                  localStorage.setItem('onrivi_license_key', savedKey);
                }
              }
            }
          } catch (e) {
            console.warn('[loadAndVerifyLicense] subscription fetch failed:', e);
          }
        }

          if (!license) {
            console.warn('[loadAndVerifyLicense] web: license not found for payment_no. Auto-clearing cache...');
            localStorage.removeItem('onrivi_payment_no');
            localStorage.removeItem('onrivi_license_key');
            localStorage.removeItem('onrivi_session_id');
            return;
          } else {
            let sub = license;
            let currentLicenseId = sub.id;
            let currentPaymentNo = savedPaymentNo;

            let expiryMs = 0;
            if (sub) {
              if (sub.plan_name && (sub.plan_name.toUpperCase() === 'DESKTOP_ONLY' || sub.plan_name.toUpperCase().includes('DESKTOP'))) {
                console.warn('[loadAndVerifyLicense] Desktop plan cannot be used in Web SaaS.');
                setLicenseStatus({
                  isActivated: false, isExpired: true, remainingDays: 0, userId: savedUserId,
                  licenseKey: '', paymentNo: savedPaymentNo || license?.payment_no || '',
                  planName: '데스크탑 전용 플랜 (웹 사용 불가)', nextPaymentDate: ''
                });
                return;
              }
              const targetDate = sub.current_period_end;
              if (targetDate) expiryMs = parseDateStringToMs(targetDate);
              else expiryMs = Number.MAX_SAFE_INTEGER;
              
              if (sub.plan_status === 'FREE' && sub.created_at) {
                if (expiryMs === 0 || expiryMs === Number.MAX_SAFE_INTEGER) {
                  expiryMs = new Date(sub.created_at).getTime() + 14 * 24 * 60 * 60 * 1000;
                }
              }
            }

            let isExpired = expiryMs === 0 ? true : (Date.now() > expiryMs);

            // 🚨 @PATCH : 만료된 경우 API를 호출하여 상태를 EXPIRED로 변경하고 새로운 READER 발급
            if (isExpired && sub.plan_status !== 'EXPIRED') {
              try {
                const expireRes = await fetch(getApiUrl('/api/subscription/expire'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ p_subscription_id: sub.id, p_user_id: savedUserId })
                });
                const expireData = await expireRes.json();
                if (expireData.success && expireData.new_subscription_id) {
                  currentLicenseId = expireData.new_subscription_id;
                  if (expireData.new_payment_no) {
                    currentPaymentNo = expireData.new_payment_no;
                    localStorage.setItem('onrivi_payment_no', currentPaymentNo);
                    savedPaymentNo = currentPaymentNo;
                  }
                  sub.plan_name = 'READER';
                  sub.plan_status = 'ACTIVE';
                  isExpired = false; // 새로운 READER 구독이 활성화되었으므로 만료 아님 (하지만 READER 플랜이므로 insert시 제한됨)
                }
              } catch (err) {
                logError({
                  file: 'frontend/src/hooks/editor/useEditorLicense.ts',
                  func: 'loadAndVerifyLicense',
                  doing: '만료된 구독을 EXPIRED로 전환하고 READER 플랜을 발급하는 API(/api/subscription/expire) 호출 중',
                  target: sub.id || savedUserId,
                  error: err,
                });
              }
            }

            const remainingDays = expiryMs === 0 ? 0 : Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
            const isFreeTrial = sub?.plan_name === 'FREE' || sub?.plan_name === 'APPRENTICE' || currentPaymentNo.startsWith('FREE_TRIAL_') || currentPaymentNo.startsWith('TRIAL-');
            let planName = isFreeTrial ? '무료 체험판 플랜 (Apprentice)' : (sub?.plan_name === 'READER' ? '기간 만료 (제한 사용자)' : `${sub?.plan_name || 'PRO'} 프리미엄 플랜`);

            let activationFailed = false;
            let activationError = '';
            let isDeviceLimitHit = false; // 기기 초과 여부 (try 블록 바깥에서도 참조)

            const currentDeviceName = isDesktop ? 'Desktop App' : 'Web SaaS';
            const isValidUUID = (id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const reqUserId = (sub?.user_id && isValidUUID(sub.user_id))
              ? sub.user_id
              : (currentAuthUser?.id && isValidUUID(currentAuthUser.id) ? currentAuthUser.id : savedUserId);

            console.log('[loadAndVerifyLicense] insert: user=', reqUserId, 'session=', sessionId, 'device=', currentDeviceName, 'licenseId=', currentLicenseId, 'isREADER=', sub?.plan_name === 'READER');
            try {
              const activationToken = !isDesktop ? (await supabase.auth.getSession()).data.session?.access_token : null;
              const actRes = await fetch(getApiUrl('/api/license/activate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(activationToken ? { Authorization: `Bearer ${activationToken}` } : {}) },
                body: JSON.stringify({ p_license_id: currentLicenseId, p_device_uuid: sessionId, p_device_name: currentDeviceName, p_user_id: reqUserId, p_is_expired: sub?.plan_name === 'READER' })
              });

              if (!actRes.ok) {
                activationFailed = true;
                activationError = '세션 확인 오류 - 읽기 전용';
                console.warn('[loadAndVerifyLicense] activation API error status=%o', actRes.status);
                showToast('편집 권한을 확인할 수 없어 읽기 전용으로 열었습니다.', 'warning');
              } else {
                const actResult = await actRes.json();
                if (actResult?.activation_id) {
                  localStorage.setItem('onrivi_activation_id', actResult.activation_id);
                }

                const isDeviceLimitHitLocal = actResult?.code === 'ERR_MAX_DEVICES_EXCEEDED' || actResult?.code === 'EXCEED_MAX_DEVICES';
                isDeviceLimitHit = isDeviceLimitHitLocal;
                if (!actResult?.success) {
                  activationFailed = true;
                  activationError = isDeviceLimitHit
                    ? `동시 접속 초과 (${actResult?.max_devices || '?'}대) - 제한 사용자`
                    : `라이선스 오류: ${actResult?.message || '알 수 없는 오류'}`;
                }
                console.log('[loadAndVerifyLicense] insert result: success=%o code=%o', actResult?.success, actResult?.code);
              }
            } catch (insertFetchErr) {
              activationFailed = true;
              activationError = '세션 확인 오류 - 읽기 전용';
              console.warn('[loadAndVerifyLicense] insert API fetch failed (network?):', insertFetchErr);
              showToast('편집 권한을 확인할 수 없어 읽기 전용으로 열었습니다.', 'warning');
            }

            const isRestricted = activationFailed || sub?.plan_name === 'READER';

            if (activationFailed) {
              isExpired = true;
              planName = activationError;
            }

            const isActivated = !isExpired && !isRestricted;

            if (currentLicenseId) {
              localStorage.setItem('onrivi_license_id', currentLicenseId);
            }

            const hasEditorSub = sub?.plan_name !== 'READER' && sub?.plan_name !== 'FREE_TRIAL_EXPIRED';

            console.log('[LICENSE] VERIFIED setLicenseStatus isActivated=%o isExpired=%o isRestricted=%o isConcurrentLimited=%o planName=%o', isActivated, isExpired, isRestricted, isDeviceLimitHit, planName);
            setLicenseStatus({
              isActivated, isExpired, remainingDays, userId: savedUserId,
              isRestricted, // 💡 제한 상태 명시적 반영
              isConcurrentLimited: isDeviceLimitHit,
              hasEditorSubscription: hasEditorSub,
              licenseKey: isActivated ? savedKey : '', paymentNo: currentPaymentNo || '',
              planName, nextPaymentDate: sub?.current_period_end || sub?.trial_end_at || (expiryMs > 0 ? new Date(expiryMs).toISOString() : '')
            });

            saveSecureData('onrivi_license_status', {
              isActivated, isExpired, remainingDays, userId: savedUserId,
              isRestricted, // 💡 로컬 보안 캐시에도 제한 상태 밀봉
              licenseKey: isActivated ? savedKey : '', paymentNo: currentPaymentNo || '',
              planName, nextPaymentDate: sub?.current_period_end || sub?.trial_end_at || (expiryMs > 0 ? new Date(expiryMs).toISOString() : ''),
              lastVerifiedAt: Date.now()
            });
            return;
        }
      } catch (err) {
        console.warn('[loadAndVerifyLicense] web unexpected error:', err);
      }
    }

    // 웹 버전에서도 3일 캐시를 사용하지 않고 매번 DB/서버를 통해 인증을 진행하도록 수정 (요청 사항 반영)
    const cached = loadSecureData<any>('onrivi_license_status');

    const finalPlanName = cached?.planName || (savedPaymentNo ? '프리미엄 요금제' : '미인증 라이선스');
    console.log('[LICENSE] FINAL setLicenseStatus isExpired=true planName=%o', finalPlanName);
    setLicenseStatus({
      isActivated: false, isExpired: true, remainingDays: 0, userId: savedUserId,
      licenseKey: savedKey || cached?.licenseKey || '', paymentNo: savedPaymentNo,
      planName: finalPlanName,
      nextPaymentDate: cached?.nextPaymentDate || (savedPaymentNo ? '-' : undefined)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // ⚡ 다른 브라우저/기기 동시 접속 초과 시 현재 화면으로 편집 권한 인수 처리
  const [isTakingOver, setIsTakingOver] = useState(false);

  /**
   * ========================================================================================
   * [함수명] handleCrossDeviceTakeover - 다른 기기/브라우저 동시 접속 초과 시 현재 화면으로 편집 제어권을 강제 인수합니다.
   *
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const handleCrossDeviceTakeover = useCallback(async () => {
    if (isTakingOver) return;
    setIsTakingOver(true);
    try {
      const isDesktopEnv = typeof window !== 'undefined' && (!!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop');
      const savedUserId = localStorage.getItem('onrivi_user_id') || localStorage.getItem('onrivi_auth_user_id') || licenseStatus.userId || '';
      const sessionId = (!isDesktopEnv && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) || localStorage.getItem('onrivi_session_id') || localStorage.getItem('onrivi_device_id') || deviceId;

      if (isDesktopEnv) {
        // 데스크탑 환경 제어권 인수
        const res = await fetch(getApiUrl('/api/license/verify-desktop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p_email: savedUserId,
            p_device_uuid: deviceId,
            p_force_takeover: true
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast("🎉 현재 화면으로 편집 권한을 성공적으로 가져왔습니다!", "success");
          await loadAndVerifyLicense();
        } else {
          logError({
            file: 'frontend/src/hooks/editor/useEditorLicense.ts',
            func: 'handleCrossDeviceTakeover',
            doing: '데스크톱 환경 편집 제어권 강제 인수(/api/license/verify-desktop) 요청 중',
            target: deviceId,
            error: new Error(data.message || 'Desktop takeover failed'),
          });
          showToast(`편집 권한 가져오기 실패: ${data.message || '알 수 없는 오류'}`, "error");
        }
      } else {
        // 웹 SaaS 환경 제어권 인수
        let licenseId = localStorage.getItem('onrivi_license_id') || '';
        const { data: authSessionData } = await supabase.auth.getSession();
        const authUserId = authSessionData?.session?.user?.id;
        const isValidUUID = (id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const effectiveAuthUserId = (authUserId && isValidUUID(authUserId)) ? authUserId : (isValidUUID(savedUserId) ? savedUserId : null);

        if (!licenseId) {
          if (effectiveAuthUserId) {
            try {
              const subRes = await fetch(getApiUrl('/api/subscription/get'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: effectiveAuthUserId })
              });
              if (subRes.ok) {
                const subData = await subRes.json();
                if (subData?.subscription?.id) {
                  licenseId = subData.subscription.id;
                  localStorage.setItem('onrivi_license_id', licenseId);
                }
              }
            } catch (e) {
              logWarn({
                file: 'frontend/src/hooks/editor/useEditorLicense.ts',
                func: 'handleCrossDeviceTakeover',
                doing: '편집 권한 전환을 위한 사용자 구독 ID(/api/subscription/get) 조회 중',
                target: effectiveAuthUserId,
                error: e,
              });
            }
          }
        }

        if (!licenseId) {
          logError({
            file: 'frontend/src/hooks/editor/useEditorLicense.ts',
            func: 'handleCrossDeviceTakeover',
            doing: '웹 SaaS 편집 권한 전환을 위한 라이선스 ID 검증 중',
            target: effectiveAuthUserId || savedUserId,
            error: new Error('Missing licenseId for cross-device takeover'),
          });
          showToast("라이선스 정보를 찾을 수 없어 편집 권한을 전환할 수 없습니다.", "error");
          setIsTakingOver(false);
          return;
        }

        const res = await fetch(getApiUrl('/api/license/activate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSessionData?.session?.access_token || ''}` },
          body: JSON.stringify({
            p_license_id: licenseId,
            p_device_uuid: sessionId,
            p_device_name: 'Web SaaS',
            p_user_id: effectiveAuthUserId || savedUserId,
            p_is_expired: false,
            p_force_takeover: true
          })
        });
        const data = await res.json();
        if (data && data.success) {
          showToast("🎉 현재 화면으로 편집 권한을 성공적으로 가져왔습니다!", "success");
          await loadAndVerifyLicense();
        } else {
          logError({
            file: 'frontend/src/hooks/editor/useEditorLicense.ts',
            func: 'handleCrossDeviceTakeover',
            doing: '웹 SaaS 편집 제어권 강제 인수(/api/license/activate) 요청 중',
            target: licenseId,
            error: new Error(data?.message || 'Web takeover failed'),
          });
          showToast(`편집 권한 가져오기 실패: ${data?.message || '알 수 없는 오류'}`, "error");
        }
      }
    } catch (err: any) {
      logError({
        file: 'frontend/src/hooks/editor/useEditorLicense.ts',
        func: 'handleCrossDeviceTakeover',
        doing: '다른 기기/브라우저로부터 편집 제어권 인수 처리 중',
        target: deviceId,
        error: err,
      });
      showToast("편집 권한 전환 중 오류가 발생했습니다.", "error");
    } finally {
      setIsTakingOver(false);
    }
  }, [deviceId, isTakingOver, licenseStatus.userId, loadAndVerifyLicense, showToast]);

  /**
   * ========================================================================================
   * [함수명] handleTakeover - 동일 브라우저 중복 탭 또는 타 기기 동시 접속 상황에서 현재 화면으로 제어권을 가져옵니다.
   *
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const handleTakeover = useCallback(async () => {
    if (isDuplicateInstance) {
      takeOverControl();
    } else if (licenseStatus.isConcurrentLimited) {
      await handleCrossDeviceTakeover();
    }
    // 💡 제어권 획득 시 직전 뷰 모드(기본 'both')로 화면 즉시 복원
    const restoredMode = (lastGeneralPreviewModeRef.current || 'preview') as 'edit' | 'both' | 'preview' | 'css-style';
    setPreviewModeRaw(restoredMode);
    previewModeRef.current = restoredMode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDuplicateInstance, licenseStatus.isConcurrentLimited, takeOverControl, handleCrossDeviceTakeover]);

  /**
   * ========================================================================================
   * [함수명] formatTime - 초 단위 남은 시간을 MM:SS 형식 문자열로 변환합니다.
   *
   * @param {number} seconds - 남은 시간(초)
   * @returns {string} MM:SS 포맷 문자열
   * ==========================================================================================
   */
  const formatTime = (seconds: number) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    if (!deviceId) {
      console.log('[WELCOME-TRIGGER] skipped: deviceId empty');
      return;
    }
    const licenseStartedAt = performance.now();
    console.log('[WELCOME-TRIGGER] calling loadAndVerifyLicense deviceId=%o', deviceId);
    loadAndVerifyLicense().finally(() => {
      console.log('[WELCOME-TRIGGER] loadAndVerifyLicense done in %d ms, setting isLicenseChecking=false', Math.round(performance.now() - licenseStartedAt));
      setIsLicenseChecking(false);
    });
  }, [loadAndVerifyLicense, deviceId, setIsLicenseChecking]);

  // One adaptive monitor: web uses the root guard; desktop owns its monitor here.
  useEffect(() => {
    if (typeof window === 'undefined' || !deviceId || isLicenseChecking || isGuestMode) return;
    let disposed = false, ending = false;
    const isDesktopEnv = !!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop';
    const handleResult = (chk: any) => {
      if (disposed) return;
        if (chk) {
          if (chk.success && (chk.is_terminated || (chk.has_session === false && chk.is_restricted === false))) {
            // 세션 자체가 DB에서 완전히 삭제(DELETE)된 경우 (대시보드 기기 해제, 타 기기/관리자 세션 종료 등) -> 무조건 강제 로그아웃
            if (ending) return;
            ending = true;
            setLicenseStatus(prev => {
              showToast("🛑 다른 화면 또는 대시보드에서 세션이 해제되었습니다. 자동으로 로그아웃됩니다.", "error");
              setTimeout(async () => {
                const pNo = localStorage.getItem('onrivi_payment_no');
                const sId = isDesktopEnv ? deviceId :
                  (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) || localStorage.getItem('onrivi_session_id') || deviceId;
                if (pNo && sId) {
                  await fetch(getApiUrl('/api/device/deactivate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_payment_no: pNo, p_device_uuid: sId }) });
                }
                try {
                  await supabase.auth.signOut({ scope: 'local' });
                } finally {
                  clearAuthSessionStorage();
                }
                if (!isDesktopEnv) {
                  window.location.href = '/login';
                }
              }, 2500);
              return { ...prev, isActivated: false, isExpired: true, planName: '세션 해제 (로그아웃 중...)' };
            });
          } else if (chk.reason === 'PLAN_EXPIRED') {
            setLicenseStatus(prev => ({ ...prev, isActivated: false, isExpired: true, isRestricted: true, isConcurrentLimited: false }));
            if (previewModeRef.current !== 'preview') {
              lastGeneralPreviewModeRef.current = previewModeRef.current;
              setPreviewModeRaw('preview'); previewModeRef.current = 'preview';
            }
          } else if (chk.success && chk.has_session === false && chk.is_restricted !== false) {
            // 세션은 존재하지만 활성화되지 않은 제한 사용자 상태인 경우 (타 화면에서 제어권 인수했거나 동시접속 초과)
            setLicenseStatus(prev => {
              if (prev.isActivated) {
                showToast("⚠️ 다른 화면에서 편집 권한을 가져갔거나 동시접속 초과로 현재 화면은 제한 모드(읽기 전용)로 전환되었습니다.", "warning");
              }
              return {
                ...prev,
                isActivated: false,
                isExpired: true,
                isRestricted: true,
                isConcurrentLimited: true,
                hasEditorSubscription: prev.hasEditorSubscription ?? true,
                planName: prev.planName?.includes('동시 접속 초과') ? prev.planName : `동시 접속 초과 (${chk.max_devices || 1}대) - 제한 사용자`
              };
            });
            // 💡 [사용자 요청] 다른 세션에서 제어권을 가져갔을 때 현재 화면을 즉시 미리보기 모드로 자동 전환
            if (previewModeRef.current !== 'preview') {
              lastGeneralPreviewModeRef.current = previewModeRef.current;
              setPreviewModeRaw('preview');
              previewModeRef.current = 'preview';
            }
          } else {
            // 정상 복구/유지인 경우 상태 동기화
            setLicenseStatus(prev => {
              if (prev.isExpired) {
                // 🚨 @PATCH : 이미 날짜 만료로 판단되어 EXPIRED 처리된 경우 강제로 복구시키지 않도록 방어 로직 추가
                let isActuallyExpired = false;
                if (prev.nextPaymentDate) {
                  const expMs = parseDateStringToMs(prev.nextPaymentDate);
                  if (expMs > 0 && Date.now() > expMs) isActuallyExpired = true;
                } else if (prev.remainingDays === 0 && !(prev.planName || '').includes('캐시')) {
                  isActuallyExpired = true;
                }

                if (isActuallyExpired) {
                  return prev; // 날짜 만료로 판명되었으면 해제 불가
                }

                return {
                  ...prev,
                  isActivated: true,
                  isExpired: false,
                  isRestricted: false,
                  isConcurrentLimited: false,
                  planName: chk.plan_name || prev.planName || '프리미엄 요금제'
                };
              }
              return prev;
            });
          }
        }
    };
    if (!isDesktopEnv) {
      const receive = (event: Event) => {
        const message = event as CustomEvent;
        if (message.detail?.device_uuid !== sessionStorage.getItem('onrivi_tab_session_id')) return;
        event.preventDefault(); handleResult(message.detail);
      };
      window.addEventListener('onrivi:license-session', receive);
      window.dispatchEvent(new Event('onrivi:session-check-request'));
      return () => { disposed = true; window.removeEventListener('onrivi:license-session', receive); };
    }
    const polling = browserSessionPolling(async () => {
      if (ending || disposed) return 'skip';
      if (!navigator.onLine) return false;
      const paymentNo = localStorage.getItem('onrivi_payment_no');
      if (!paymentNo) return 'skip';
      const response = await fetch(getApiUrl('/api/license/check-session'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_payment_no: paymentNo, p_device_uuid: deviceId }), signal: AbortSignal.timeout(10000)
      });
      if (!response.ok || disposed) return false;
      const result = await response.json();
      if (!result.success) return false;
      handleResult(result); return true;
    });
    return () => { disposed = true; polling.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, isLicenseChecking, setLicenseStatus, showToast, isGuestMode]);


  // 📊 [OMD-LICENSE-MainEditorApp-POLLING]
  // 🚨 @PATCH: 2026-07-05 - 사용자 지시에 따라 무거운 백그라운드 실시간 감시(Polling) 및 강제 로그아웃 차단 로직 전면 제거.
  // 오직 초기 진입 시(loadAndVerifyLicense)에만 권한을 1회 판별하여 웰컴 페이지 제어로 대체합니다.

  // G. 만료일 자정(24:00) 차단 백그라운드 타이머 (유예 없이 즉시 차단)
  useEffect(() => {
    if (!licenseStatus.nextPaymentDate || licenseStatus.isActivated) return;

    const expiryDate = new Date(licenseStatus.nextPaymentDate);
    expiryDate.setHours(24, 0, 0, 0); // 만료일 자정
    const expiryTime = expiryDate.getTime();

    const checkExpiry = () => {
      const now = Date.now();
      if (now >= expiryTime && !licenseStatus.isExpired) {
        showToast("🔒 라이선스가 만료되었습니다. 에디터가 미리보기 전용 모드로 잠깁니다.", "error");
        setPreviewModeRaw('preview');
        setLicenseStatus(prev => ({ ...prev, isExpired: true }));
      }
    };

    const intervalId = setInterval(checkExpiry, 60 * 60 * 1000); // 1시간 주기 검사
    checkExpiry();

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseStatus.nextPaymentDate, licenseStatus.isActivated, licenseStatus.isExpired, showToast]);

  // ====================================================================
  // 📊 [OMD-LICENSE-MainEditorApp-0090] MainEditorApp.tsx ➔ license_force_preview
  // 🎯 @KICK  : 미인증 또는 계약만료 시 에디터 모드를 무조건 미리보기 전용으로 강제
  // 🛡️ @GUARD : mounted 이후에만 실행; 불필요한 재설정 방지를 위해 현재 모드와 목표 모드 비교;
  //             css-style 모드는 허용 (서식 설정 중에는 강제 전환하지 않음) → 미인증 시 preview만 허용
  //             유효 라이선스 시에는 모드 자유롭게 전환 가능 (preview 고정 해제)
  // 🚨 @PATCH : 2026-06-21 — 신규: 미인증/계약만료 시 preview 강제; previewMode deps 추가
  //             2026-06-22 — `else if` (유효 시 both 복원) 제거 → 유효 라이선스도 미리보기 전환 가능
  // 🔗 @CALLS : setPreviewModeRaw
  // ====================================================================
  useEffect(() => {
    if (!mounted || isLicenseChecking) return;

    if (licenseStatus.isExpired) {
      // 🔒 제한 사용자 (만료/미인증): 에디터 모드를 미리보기 전용으로 강제
      // (초기 웰컴 페이지 노출은 하단의 통합 라우팅 가드에서 담당합니다)
      if (previewModeRef.current !== 'preview') {
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseStatus.isExpired, mounted, isLicenseChecking]);

  // ====================================================================
  // 📊 [OMD-PAY-MainEditorApp-0017] MainEditorApp.tsx ➔ supabaseRealtime_license
  // 🎯 @KICK  : 실시간 활성화를 위해 license_activations의 Supabase postgres_changes 구독, 데스크톱 프로토콜 폴백 포함
  // 🛡️ @GUARD : 언마운트 시 채널 및 리스너 정리; device_uuid 필터로 중복 제거
  // 🚨 @PATCH : **2026-07-22** — Realtime 구독 테이블명 license_activations→license_activations 전환; Electron 환경을 위한 데스크톱 onLicenseActivated 백업 및 결제번호(paymentNo) 전달 보완
  // 🔗 @CALLS : supabase.channel, supabase.from.license_activations.select, handleSuccessActivation, showToast
  // ====================================================================
  useEffect(() => {
    if (!deviceId) return;

    const api = (window as any).electronAPI;
    const isDesktop = !!api;

    // 데스크탑: Electron IPC 리스너만 사용 (Supabase WebSocket 불필요)
    let removeListener: any = null;
    if (isDesktop) {
      if (typeof api.onLicenseActivated === 'function') {
        removeListener = api.onLicenseActivated(async (updatedData: any) => {
          await handleSuccessActivation(updatedData.verifyKey, updatedData.userId, updatedData.paymentNo || '', updatedData.licenseKey || '');
          showToast("🎉 정품 라이선스 연동 성공! 깨끗한 환경을 위해 에디터를 다시 시작합니다...", "success");
          setTimeout(() => { window.location.reload(); }, 2000);
        });
      }
      return () => {
        if (typeof removeListener === 'function') removeListener();
      };
    }

    // 웹 전용: Supabase Realtime 구독
    const channel = supabase
      .channel(`device-activation-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'license_activations',
          filter: `device_uuid=eq.${deviceId}`
        },
        async (payload: any) => {
          // 🚨 @PATCH : 2026-09-05 대시보드(기기 관리)에서 세션을 강제 해제(DELETE)할 경우,
          // 오직 현재 브라우저의 세션(activation_id 또는 sessionId/deviceId)이 삭제되었을 때만 강제 로그아웃
          if (payload.eventType === 'DELETE') {
            const currentActId = localStorage.getItem('onrivi_activation_id');
            const currentSessionId = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) || localStorage.getItem('onrivi_session_id') || deviceId;
            const deletedId = payload.old?.id;
            const deletedUuid = payload.old?.device_uuid;

            // 만약 삭제된 레코드가 현재 내 세션의 것이 아니라면 무시!
            const isMySessionDeleted = (currentActId && deletedId && currentActId === deletedId) ||
                                       (deletedUuid && (deletedUuid === currentSessionId || deletedUuid === deviceId));

            if (!isMySessionDeleted) {
              console.log('[Realtime] Ignored DELETE event for another device/user session:', payload.old);
              return;
            }

            showToast("🛑 동시접속 관리에 의해 현재 기기의 세션이 강제 해제되었습니다. 보호를 위해 로그아웃됩니다.", "error");
            setTimeout(async () => {
              // 🚨 @PATCH : 2026-09-17 환경설정(Gemini API 키 등)을 안전하게 보존하고 인증 세션만 선별 삭제
              try {
                await supabase.auth.signOut({ scope: 'local' });
              } finally {
                clearAuthSessionStorage();
              }
              const isDesktop = typeof window !== 'undefined' && (!!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop');
              if (!isDesktop) {
                window.location.href = '/login';
              }
            }, 3000);
            return;
          }

          const newRecord = payload.new;
          if (newRecord) {
            if (newRecord.is_active === false) {
              // 💡 다른 브라우저나 기기에서 편집 제어권을 가져간 경우
              showToast("다른 브라우저나 기기에서 편집을 시작하여 현재 화면은 읽기 전용(제한사용자) 모드로 전환되었습니다.", "info");
              setLicenseStatus(prev => ({
                ...prev,
                isActivated: false,
                isExpired: true,
                isRestricted: true,
                isConcurrentLimited: true,
                hasEditorSubscription: true,
                planName: '동시 접속 초과 - 제한 사용자'
              }));
              // 💡 [사용자 요청] 다른 세션에서 제어권을 가져갔을 때 현재 화면을 즉시 미리보기 모드로 자동 전환
              if (previewModeRef.current !== 'preview') {
                lastGeneralPreviewModeRef.current = previewModeRef.current;
                setPreviewModeRaw('preview');
                previewModeRef.current = 'preview';
              }
              return;
            }

            if (newRecord.subscription_id && newRecord.is_active === true) {
              try {
                const authUser = (await supabase.auth.getSession()).data.session?.user;
                const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('onrivi_user_id') || '' : '';
                const reqUserId = authUser?.id || savedUserId;
                if (reqUserId) {
                  const subRes = await fetch(getApiUrl('/api/subscription/get'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: reqUserId })
                  });
                  if (subRes.ok) {
                    const subData = await subRes.json();
                    const matched = subData?.subscription?.id === newRecord.subscription_id
                      ? subData.subscription
                      : subData?.historyList?.find((s: any) => s.id === newRecord.subscription_id);
                    if (matched && matched.verify_key) {
                      const userEmail = licenseStatus.userId || 'user@onrivi.com';
                      handleSuccessActivation(matched.verify_key, userEmail, matched.id || newRecord.subscription_id, matched.license_key || '');
                      setLicenseStatus(prev => ({
                        ...prev,
                        isConcurrentLimited: false,
                      }));
                      showToast("🎉 정품 라이선스가 결제 즉시 안전하게 승인되었습니다!", "success");
                    }
                  }
                }
              } catch (e) {
                console.warn('[Realtime license_activations] subscription lookup failed:', e);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, licenseKey, licenseStatus.userId]);

  /**
   * ========================================================================================
   * [함수명] handleSuccessActivation - 결제/활성화 완료 후 로컬·Electron 스토리지에 라이선스를 저장하고 즉시 검증합니다.
   *
   * @param {string} verifyKey - 라이선스 검증 키
   * @param {string} userId - 사용자 이메일 또는 ID
   * @param {string} paymentNo - 결제 번호
   * @param {string} [explicitLicenseKey] - 명시적 라이선스 키
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const handleSuccessActivation = async (verifyKey: string, userId: string, paymentNo: string, explicitLicenseKey?: string) => {
    const api = (window as any).electronAPI;
    const finalLicenseKey = explicitLicenseKey || licenseKey;

    if (api && typeof api.saveLicenseFull === 'function') {
      await api.saveLicenseFull({
        licenseKey: finalLicenseKey,
        verifyKey: verifyKey,
        userId: userId,
        paymentNo: paymentNo
      });
    } 
    
    // 데스크탑(Electron) 환경이라 하더라도 웹뷰 내부의 범용적인 활용 및 폴백을 위해 항상 로컬스토리지에 저장합니다.
    localStorage.setItem('onrivi_license_key', finalLicenseKey);
    localStorage.setItem('onrivi_verify_key', verifyKey);
    localStorage.setItem('onrivi_user_id', userId);
    localStorage.setItem('onrivi_payment_no', paymentNo);

    await loadAndVerifyLicense();
  };


  return {
    isTakingOver,
    handleTakeover,
    handleSuccessActivation,
    loadAndVerifyLicense,
    formatTime,
  };
}
