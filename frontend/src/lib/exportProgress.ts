/** A single persistent status remains visible throughout an export. */
export function startExportProgress(format: string) {
  const panel = document.createElement('div');
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  panel.style.cssText = 'position:fixed;right:24px;bottom:64px;z-index:10000;padding:16px 20px;background:#fff;color:#1e293b;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 4px 20px #0002;min-width:260px;font:14px system-ui;';
  const heading = document.createElement('strong');
  heading.textContent = `${format} 내보내기`;
  const detail = document.createElement('div');
  detail.style.cssText = 'margin-top:8px;';
  panel.append(heading, detail);
  document.body.appendChild(panel);
  const started = Date.now();
  let stage = '준비 중';
  const render = () => { detail.textContent = `${stage} · ${Math.floor((Date.now() - started) / 1000)}초`; };
  const timer = setInterval(render, 1000);
  render();
  return {
    update(message: string) {
      stage = message;
      render();
      console.info(`[${format} export]`, message, { elapsedMs: Date.now() - started });
    },
    finish() { clearInterval(timer); panel.remove(); },
  };
}
