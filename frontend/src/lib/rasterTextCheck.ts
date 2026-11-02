/** Foreign-object SVG capture can finish successfully while web-font text is blank. */
export async function rasterContainsText(root: HTMLElement, dataUrl: string): Promise<boolean> {
  const image = new Image();image.src = dataUrl;await image.decode();
  const bounds = root.getBoundingClientRect(), scale = image.width / bounds.width;
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const canvas = document.createElement('canvas'),context = canvas.getContext('2d', {willReadFrequently:true});
  if (!context || !scale) return true;
  let checked = 0;
  while (walker.nextNode() && checked < 8) {
    const node = walker.currentNode,parent = node.parentElement;
    if (!parent || !node.textContent?.trim() || node.textContent.trim().length < 6 || parent.closest('style,script,code,figure,svg')) continue;
    const range = document.createRange();range.selectNodeContents(node);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width < 15 || rect.height < 8) continue;
    const css = getComputedStyle(parent), color = css.color.match(/[\d.]+/g)?.map(Number);
    if (!color || color.length < 3 || css.visibility === 'hidden') continue;
    const x = Math.max(0,Math.round((rect.left-bounds.left)*scale)),y = Math.max(0,Math.round((rect.top-bounds.top+rect.height*.2)*scale));
    const width = Math.min(Math.round(rect.width*scale),image.width-x),height = Math.min(Math.round(rect.height*.6*scale),image.height-y);
    if(width<1 || height<1)continue;
    checked++;canvas.width=width;canvas.height=height;
    context.drawImage(image,x,y,width,height,0,0,width,height);
    const pixels=context.getImageData(0,0,width,height).data;let ink=0;
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]>128 && Math.abs(pixels[i]-color[0])+Math.abs(pixels[i+1]-color[1])+Math.abs(pixels[i+2]-color[2])<110)ink++;
    }
    if(ink>8)return true;
  }
  return checked===0;
}
