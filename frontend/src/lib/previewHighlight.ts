const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** A navigation cue must expire instead of becoming part of the document style. */
export function flashPreviewHighlight(element: HTMLElement, duration = 2500): () => void {
  const previous = timers.get(element);
  if (previous !== undefined) clearTimeout(previous);
  element.classList.add('preview-highlight-line');
  const clear = () => {
    if (timers.get(element) !== timer) return;
    clearTimeout(timer);
    timers.delete(element);
    element.classList.remove('preview-highlight-line');
  };
  const timer = setTimeout(clear, duration);
  timers.set(element, timer);
  return clear;
}
