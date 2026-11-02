'use client';

import { useEffect, useRef } from 'react';

// One capture listener prevents a single Escape from closing multiple dialogs.
const dialogs: Array<{ close: () => void }> = [];
function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.isComposing || !dialogs.length) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  dialogs[dialogs.length - 1].close();
}

export function useModalEscape(open: boolean, onClose: (() => void) | undefined) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !close.current) return;
    const entry = { close: () => close.current?.() };
    if (!dialogs.length) window.addEventListener('keydown', handleEscape, true);
    dialogs.push(entry);
    return () => {
      const index = dialogs.indexOf(entry);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) window.removeEventListener('keydown', handleEscape, true);
    };
  }, [open]);
}
