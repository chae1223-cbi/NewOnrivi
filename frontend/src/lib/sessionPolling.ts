export function startSessionPolling(options: {
  check: () => Promise<boolean | 'skip'>;
  visible: () => boolean;
  now: () => number;
  random: () => number;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
}) {
  let stopped = false, busy = false, failures = 0;
  let lastStarted = -Infinity;
  let timer: number | undefined;
  const schedule = (delay: number) => {
    if (timer !== undefined) options.cancel(timer);
    if (!stopped) timer = options.schedule(() => { void run(); }, delay);
  };
  const run = async () => {
    if (stopped || busy) return;
    const elapsed = options.now() - lastStarted;
    if (elapsed < 10000) { schedule(10000 - elapsed); return; }
    busy = true; lastStarted = options.now();
    let result: boolean | 'skip' = false;
    try { result = await options.check(); } catch { /* Retry without signing out on transport errors. */ }
    finally { busy = false; }
    if (stopped) return;
    if (result === 'skip') lastStarted = -Infinity;
    failures = result === false ? failures + 1 : 0;
    const base = options.visible() ? 60000 : 90000;
    schedule(Math.min(240000, base * Math.pow(2, Math.min(failures, 2))) + Math.floor(options.random() * 5000));
  };
  void run();
  return {
    request: () => { if (!stopped && !busy) { if (timer !== undefined) options.cancel(timer); void run(); } },
    stop: () => { stopped = true; if (timer !== undefined) options.cancel(timer); }
  };
}

export function browserSessionPolling(check: () => Promise<boolean | 'skip'>) {
  const polling = startSessionPolling({ check, visible: () => document.visibilityState === 'visible',
    now: Date.now, random: Math.random,
    schedule: (callback, delay) => window.setTimeout(callback, delay), cancel: timer => window.clearTimeout(timer) });
  const resume = () => { if (document.visibilityState === 'visible') polling.request(); };
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
  document.addEventListener('visibilitychange', resume);
  return { request: polling.request, stop: () => {
    polling.stop(); window.removeEventListener('focus', resume); window.removeEventListener('online', resume);
    document.removeEventListener('visibilitychange', resume);
  } };
}
