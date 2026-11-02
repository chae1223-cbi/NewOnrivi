/** Freeze page/column geometry for EPUB readers without CSS grid support. */
export function preparePicturebookEpub(clone:HTMLElement, live:HTMLElement) {
  clone.querySelectorAll('.book-screen-only,button,style').forEach(element=>element.remove());
  const pages = Array.from(clone.querySelectorAll<HTMLElement>('.book-page'));
  const originals = Array.from(live.querySelectorAll<HTMLElement>('.book-page'));
  if (!pages.length) throw new Error('그림책 장면이 없습니다.');
  const width = Number(originals[0].dataset.paperWidth)*96/25.4;
  const height = Number(originals[0].dataset.paperHeight)*96/25.4;
  pages.forEach((page,index)=>{
    const source = originals[index];
    const rect = source.getBoundingClientRect();
    const scale = width/rect.width;
    const elements = [page,...Array.from(page.querySelectorAll<HTMLElement>('*'))];
    const sourceElements = [source,...Array.from(source.querySelectorAll<HTMLElement>('*')).filter(el=>!el.closest('.book-screen-only,button,style'))];
    elements.forEach((element,i)=>{
      if (!sourceElements[i]) return;
      const computed = getComputedStyle(sourceElements[i]);
      for (const key of ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','color','text-align','margin-top','margin-bottom','padding-top','padding-bottom','object-fit']) element.style.setProperty(key,computed.getPropertyValue(key));
      if (element.tagName === 'IMG') element.style.setProperty('object-fit',computed.objectFit,'important');
    });
    page.style.cssText += `;position:relative!important;display:block!important;box-sizing:border-box;width:${width}px!important;height:${height}px!important;zoom:1!important;margin:0!important;padding:0!important;outline:none!important;box-shadow:none!important;`;
    for (const name of ['book-image','book-text']) {
      const column = page.querySelector<HTMLElement>('.'+name);
      const original = source.querySelector<HTMLElement>('.'+name);
      if(!column || !original) continue;
      const box = original.getBoundingClientRect();
      column.style.cssText += `;position:absolute!important;box-sizing:border-box;left:${(box.left-rect.left)*scale}px!important;top:${(box.top-rect.top)*scale}px!important;width:${box.width*scale}px!important;height:${box.height*scale}px!important;overflow:hidden;`;
    }
  });
  return {width:Math.round(width),height:Math.round(height),css:`
    html,body,.epub-body {margin:0!important;padding:0!important;width:${width}px!important;height:${height}px!important;overflow:hidden!important;}
    .epub-body .book-image .markdown-viewer-root,.epub-body .book-image .markdown-viewer-root > div,.epub-body .book-image .onrivi-image-figure,.epub-body .book-image .onrivi-image-wrapper,.epub-body .book-image figure,.epub-body .book-image p {width:100%!important;height:100%!important;margin:0!important;padding:0!important;}
    .epub-body .book-page .book-image img {width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;}
    .epub-body .book-text .markdown-viewer-root {padding:0!important;min-height:0!important;}
  `};
}
