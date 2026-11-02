"use client";
import { useEffect } from 'react';
import { browserSessionPolling } from '@/lib/sessionPolling';

/** One web monitor for both editor and non-editor pages. */
export function WebSessionRevocationGuard() {
  useEffect(() => {
    if ((window as any).electronAPI || /electron/i.test(navigator.userAgent) ||
        new URLSearchParams(window.location.search).get('env') === 'desktop') return;
    let observedKey = '', hadSession = false, signingOut = false, disposed = false;
    const polling = browserSessionPolling(async () => {
      if (disposed || signingOut) return 'skip';
      if (!navigator.onLine) return false;
      const deviceUuid = sessionStorage.getItem('onrivi_tab_session_id');
      if (!deviceUuid) return 'skip';
      const [{ supabase }, { clearAuthSessionStorage }] = await Promise.all([
        import('@/lib/supabaseClient'), import('@/lib/authSessionHelper')
      ]);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session.user?.id || disposed) return 'skip';
      const key = `${session.user.id}:${deviceUuid}`;
      if (observedKey !== key) { observedKey = key; hadSession = false; }
      const response = await fetch('/api/license/check-session', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_device_uuid: deviceUuid }), cache: 'no-store', signal: AbortSignal.timeout(10000)
      });
      if (!response.ok || disposed) return false;
      const data = await response.json();
      if (disposed || sessionStorage.getItem('onrivi_tab_session_id') !== deviceUuid) return 'skip';
      if (!data.success) return false;
      if (data.exists) hadSession = true;
      const event = new CustomEvent('onrivi:license-session', { cancelable: true, detail: { ...data, device_uuid: deviceUuid } });
      window.dispatchEvent(event);
      // The editor handles its own read-only state and logout notification.
      if (event.defaultPrevented) return true;
      if (data.is_terminated === true && hadSession) {
        signingOut = true;
        try { await supabase.auth.signOut({ scope: 'local' }); }
        finally { clearAuthSessionStorage(); window.location.replace('/login?session=revoked'); }
      }
      return true;
    });
    const request = () => polling.request();
    window.addEventListener('onrivi:session-check-request', request);
    return () => { disposed = true; polling.stop(); window.removeEventListener('onrivi:session-check-request', request); };
  }, []);
  return null;
}
