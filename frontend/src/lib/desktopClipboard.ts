/** Native image paste can have no DOM paste event (for example a copied Explorer file). */
export function desktopClipboardImage(event: { key:string; ctrlKey:boolean; metaKey:boolean; altKey:boolean }): File | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'v') return null;
  const url = (window as any).electronAPI?.readClipboardImageSync?.();
  if (typeof url !== 'string') return null;
  const match = url.match(/^data:(image\/[^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  const raw = atob(match[2]);
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  return new File([bytes], 'clipboard-image', { type:match[1] });
}
