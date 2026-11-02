// Generate small, real videos without downloading media or installing codecs.
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname,'..');
const req = createRequire(path.join(root,'frontend/package.json'));
const {chromium} = req('playwright-core');
(async()=>{
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage();
    await page.setContent('<canvas width="640" height="360"></canvas>');
    for(const [directory,label,color] of [['original','QA VIDEO V1','#245dbe'],['replacement','QA VIDEO V2','#d15e23']]) {
      const encoded = await page.evaluate(async ({label,color})=>{
        const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
        const stream=canvas.captureStream(15);
        const mimeType=['video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
        if(!mimeType)throw new Error('WebM MediaRecorder unavailable');
        const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:250000});
        const chunks=[];
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        const done=new Promise(resolve=>recorder.onstop=resolve);
        let frame=0;
        const paint=()=>{
          ctx.fillStyle=color;ctx.fillRect(0,0,640,360);
          ctx.fillStyle='white';ctx.font='bold 44px sans-serif';ctx.fillText(label,110,145);
          ctx.font='26px sans-serif';ctx.fillText('Frame '+frame++,235,215);
        };
        paint();recorder.start();
        const timer=setInterval(paint,66);
        await new Promise(resolve=>setTimeout(resolve,2000));
        clearInterval(timer);recorder.stop();await done;stream.getTracks().forEach(track=>track.stop());
        const data=new Uint8Array(await new Blob(chunks,{type:mimeType}).arrayBuffer());
        let binary='';for(const byte of data)binary+=String.fromCharCode(byte);
        return btoa(binary);
      },{label,color});
      const dest=path.join(root,'docs/testing/integration-60min/fixtures/assets',directory,'qa-video.webm');
      fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.from(encoded,'base64'));
      // Decode the saved file as well: a container header alone is insufficient.
      const decoded=await page.evaluate(async data=>{
        const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
        const url=URL.createObjectURL(new Blob([bytes],{type:'video/webm'}));
        const video=document.createElement('video');video.muted=true;video.src=url;
        await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Fixture video decode failed'));});
        const result={width:video.videoWidth,height:video.videoHeight};URL.revokeObjectURL(url);return result;
      },encoded);
      if(decoded.width!==640 || decoded.height!==360)throw new Error('Unexpected video dimensions');
      console.log('PASS: generated and decoded '+directory+'/qa-video.webm (640x360)');
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
