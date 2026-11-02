/** Renew only during the last three minutes, while the user is active. */
export function startActiveTokenRenewal(options: {
  expiresAt: number;
  now: () => number;
  isActive: () => boolean;
  save: () => Promise<void>;
  renew: () => Promise<unknown>;
  schedule: (callback: () => void, delay: number) => number;
  cancel: (timer: number) => void;
}) {
  let stopped = false;
  let timer: number;
  const tick = async () => {
    const remaining = options.expiresAt - options.now();
    if (stopped || remaining <= 1000) return;
    if (remaining <= 180000 && options.isActive()) {
      try {
        await options.save();
        if (!stopped && options.expiresAt - options.now() > 1000 && options.isActive()) {
          if (await options.renew()) return;
        }
      } catch { /* Keep the current token and retry within its remaining lifetime. */ }
    }
    if (!stopped) timer = options.schedule(() => { void tick(); }, Math.min(10000, Math.max(1, options.expiresAt - options.now() - 1000)));
  };
  timer = options.schedule(() => { void tick(); }, Math.max(0, options.expiresAt - options.now() - 180000));
  return () => { stopped = true; options.cancel(timer); };
}
