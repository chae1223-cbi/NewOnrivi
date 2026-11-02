import { useCallback, useEffect, useRef, useState } from 'react';

// Native drag completion events can be lost when crossing Electron/OS windows.
// Keep the indicator alive only while dragover events continue arriving.
export function useDragHighlight() {
  const [active, setActive] = useState(false);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    if (expiry.current !== null) clearTimeout(expiry.current);
    expiry.current = null;
    setActive(false);
  }, []);
  const show = useCallback(() => {
    if (expiry.current !== null) clearTimeout(expiry.current);
    setActive(true);
    expiry.current = setTimeout(clear, 1200);
  }, [clear]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clear();
    };
    const events = ['dragend', 'drop', 'blur', 'pointerdown', 'pointermove', 'mousemove'] as const;
    for (const name of events) window.addEventListener(name, clear, true);
    window.addEventListener('keydown', cancel, true);
    return () => {
      for (const name of events) window.removeEventListener(name, clear, true);
      window.removeEventListener('keydown', cancel, true);
      if (expiry.current !== null) clearTimeout(expiry.current);
    };
  }, [clear]);
  const setHighlight = useCallback((value: boolean) => value ? show() : clear(), [show, clear]);
  return [active, setHighlight] as const;
}
