const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');
const base = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(base, 'frontend/src/lib/picturebook.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exportsObject = {};
const frontmatterExports = {};
const frontmatterCode = ts.transpileModule(fs.readFileSync(path.join(base,'frontend/src/lib/frontmatter.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(frontmatterCode,{exports:frontmatterExports});
vm.runInNewContext(compiled, { exports: exportsObject, require: () => frontmatterExports });
const { parseBookScenes, replaceBookScene, normalizeBookLayout, BOOK_SAMPLE } = exportsObject;

const sample = parseBookScenes(BOOK_SAMPLE);
assert.equal(sample.scenes.length, 2);
assert.equal(sample.errors.length, 0);
assert.equal(sample.scenes[0].cover, true);
assert.equal(sample.scenes[1].image, '![첫 번째 장면](media/scene-01.png)');
const changed = replaceBookScene(BOOK_SAMPLE, sample.scenes[1], '![교체](media/new.png)\n\n새 이야기');
const imageChanged = exportsObject.replaceSceneImage(BOOK_SAMPLE,1,'media/changed.png','교체 그림',sample.scenes[1].raw);
assert.ok(imageChanged.includes('![표지 그림](media/cover.png)'));
assert.ok(imageChanged.includes('![교체 그림](<media/changed.png>)'));
assert.equal(parseBookScenes(imageChanged).scenes[1].body.trim(),sample.scenes[1].body.trim());
assert.throws(()=>exportsObject.replaceSceneImage(BOOK_SAMPLE,1,'media/changed.png','', 'stale scene'));
assert.ok(changed.includes('![표지 그림](media/cover.png)'));
assert.equal(parseBookScenes(changed).scenes[1].body.trim(), '새 이야기');
const referencesBetween = ':::scene\n![A][image1]\n\n첫 장면\n:::\n\n[image1]: media/a.png\n\n:::scene\n![B](media/b.png)\n\n두 번째 장면\n:::';
const reordered = exportsObject.moveBookSceneUp(referencesBetween,1);
assert.ok(reordered.includes('[image1]: media/a.png'));
assert.ok(reordered.indexOf('두 번째 장면') < reordered.indexOf('첫 장면'));
assert.equal(parseBookScenes(reordered).errors.length,0);
assert.ok(parseBookScenes(':::scene\n아직 작성 중').errors.some(e => e.includes('닫는')));
assert.ok(parseBookScenes('장면 밖의 원고\n' + BOOK_SAMPLE).errors.some(e => e.includes('장면 밖')));
assert.ok(parseBookScenes(':::scene\n글만 있음\n:::').errors.some(e => e.includes('그림이 없습니다')));
assert.ok(parseBookScenes(':::scene\n![그림][image1]\n\n본문\n:::\n\n[image1]: <media://local/serve?url=C%3A%5Ctest.png>').scenes[0].image.includes('[image1]:'));
assert.equal(parseBookScenes(':::scene\n![그림](media/a.png)\n```\n:::scene\n::: \n```\n:::').scenes.length, 1);
assert.equal(normalizeBookLayout(undefined), undefined);
assert.equal(normalizeBookLayout({ type: 'picturebook', imageRatio: 99 }).imageRatio, 0.7);
assert.throws(() => normalizeBookLayout({ type: 'picturebook', schemaVersion: 2 }));
assert.deepEqual(JSON.parse(JSON.stringify(normalizeBookLayout({ type: 'picturebook', cover: 'image-right', imageFit: 'contain' }))), {
  schemaVersion: 1, type: 'picturebook', cover: 'image-right', imageRatio: 0.5, imageFit: 'contain', gap: '6mm', pageNumbers: true,
});
console.log('PASS: scene parsing, references, code fences, safe editing, validation, layout round trip');
const profileExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(base, 'frontend/src/constants/cssProfile.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: profileExports, require: () => exportsObject, structuredClone });
const saved = profileExports.normalizeCssProfile({ ...profileExports.DEFAULT_PROFILE, id:'book-check', layout:normalizeBookLayout({type:'picturebook'}) });
assert.equal(profileExports.normalizeCssProfile(JSON.parse(JSON.stringify(saved))).layout.type, 'picturebook');
assert.equal(profileExports.resolveCssProfile(saved).id, 'book-check');
assert.equal(profileExports.resolveCssProfile(profileExports.DEFAULT_PROFILE).layout, undefined);
const named = frontmatterExports.updateCssProfileInFrontmatter(BOOK_SAMPLE,saved.id,saved.name);
const withSnapshot = named.replace('---\n','---\nonrivi_picturebook_profile: '+JSON.stringify(saved)+'\n');
const modified = {...saved,pageStyle:{...saved.pageStyle,orientation:'landscape'}};
assert.equal(exportsObject.documentBookProfile(withSnapshot,modified).pageStyle.orientation,'landscape');
assert.equal(exportsObject.documentBookProfile(withSnapshot,modified,true).pageStyle.orientation,'landscape');
assert.equal(exportsObject.legacyBookProfile(withSnapshot).id,saved.id);
assert.equal(exportsObject.documentBookProfile(withSnapshot,profileExports.DEFAULT_PROFILE).id,profileExports.DEFAULT_PROFILE.id);
assert.ok(!exportsObject.writeBookProfileSnapshot(withSnapshot,modified,true).includes('onrivi_picturebook_profile:'));
assert.equal(frontmatterExports.extractFrontmatter(exportsObject.writeBookProfileSnapshot(withSnapshot)).content,frontmatterExports.extractFrontmatter(withSnapshot).content);
assert.ok(!exportsObject.writeBookProfileSnapshot(withSnapshot).includes('onrivi_picturebook_profile:'));
console.log('PASS: existing profile normalization and picturebook profile persistence');

// Exercise the actual modal-to-document callbacks with a frozen portrait document.
const editorSource = fs.readFileSync(path.join(base, 'frontend/src/components/MainEditorApp.tsx'), 'utf8');
const applyBody = editorSource.match(/const handleProfileChange = useCallback\(([\s\S]*?)\n  }, \[setActiveProfileId, editorRef, profiles, updateContent\]\);/);
assert.ok(applyBody, 'Document profile callback must be available');
const modalSource = fs.readFileSync(path.join(base, 'frontend/src/components/editor/modals/ModalManager.tsx'), 'utf8');
const updateBody = modalSource.match(/onUpdateProfile=\{\(updated: any\) => \{([\s\S]*?)\n        \}\}/);
assert.ok(updateBody, 'Modal profile update callback must be available');
let currentDocument = withSnapshot;
let modifiedTab = false;
const callbackContext = {
  profiles: [saved], activeProfileId:saved.id, isEditorMountedRef:{current:false},
  editorRef:{current:{getModel(){throw new Error('Hidden editor must not be read');}}},
  contentRef:{current:withSnapshot}, activeTabIdRef:{current:'document'},
  updateCssProfileInFrontmatter:frontmatterExports.updateCssProfileInFrontmatter,
  writeBookProfileSnapshot:exportsObject.writeBookProfileSnapshot,
  updateContent:value=>{currentDocument=value;},
  setTabs:update=>{modifiedTab=update([{id:'document'}])[0].isModified;},
  setProfiles:update=>{callbackContext.profiles=update(callbackContext.profiles);},
  requireResourceSettings:()=>({}), isSystemProfileId:()=>false, showToast:()=>{},
  setActiveProfileId:(id,profile)=>{if(profile) callbackContext.apply(id,profile);},
  changedProfile:modified,
};
vm.createContext(callbackContext);
vm.runInContext(ts.transpileModule('var apply = '+applyBody[1]+'\n});\nvar update = (updated:any) => {'+updateBody[1]+'\n};', {
  compilerOptions:{target:ts.ScriptTarget.ES2020},
}).outputText,callbackContext);
vm.runInContext('update(changedProfile)',callbackContext);
assert.equal(exportsObject.documentBookProfile(currentDocument,callbackContext.profiles[0]).pageStyle.orientation,'landscape');
assert.ok(!currentDocument.includes('onrivi_picturebook_profile:'));
assert.equal(callbackContext.contentRef.current,currentDocument);
assert.equal(modifiedTab,true);
assert.equal(callbackContext.profiles[0].pageStyle.orientation,'landscape');
console.log('PASS: style modal updates file profile to landscape and keeps document metadata compact');

if (process.argv.includes('--visual')) {
  (async () => {
    const { chromium } = require('../frontend/node_modules/playwright-core');
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
      const react = fs.readFileSync(require.resolve('../frontend/node_modules/react/umd/react.development.js'), 'utf8');
      const reactDOM = fs.readFileSync(require.resolve('../frontend/node_modules/react-dom/umd/react-dom.development.js'), 'utf8');
      const component = ts.transpileModule(fs.readFileSync(path.join(base, 'frontend/src/components/PicturebookPreview.tsx'), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
      }).outputText;
      await page.setContent('<html><head><style>body{margin:0;background:#eee}#root{width:1000px;margin:auto}p{margin:0 0 16px} .markdown-viewer-root{box-sizing:border-box} @page{size:297mm 210mm;margin:0}</style></head><body><div id="root"></div></body></html>');
      await page.addScriptTag({ content: react });
      await page.addScriptTag({ content: reactDOM });
      await page.addScriptTag({ content: `window.bookFrontmatter=(()=>{const exports={};${frontmatterCode};return exports;})();window.bookLib=(()=>{const exports={};const require=()=>bookFrontmatter;${compiled};return exports;})();` });
      await page.addScriptTag({ content: `window.BookPreview=(()=>{const exports={};const require=(id)=>id==='react'?React:id.includes('paperSizes')?{PAPER_SIZES:{a4:{width:210,height:297}}}:bookLib;${component};return exports.default;})();` });
      await page.evaluate(() => {
        window.bookProfile = { layout: window.bookLib.normalizeBookLayout({ type:'picturebook' }), pageStyle:{ paperSize:'a4', orientation:'landscape', marginTop:'12mm',marginBottom:'12mm',marginLeft:'12mm',marginRight:'12mm',backgroundColor:'#fcfbf7',fontFamily:'Malgun Gothic, sans-serif',fontSize:'18px',lineHeight:'1.7' } };
        window.bookRoot = ReactDOM.createRoot(document.getElementById('root'));
        window.renderBook = (text) => window.bookRoot.render(React.createElement(window.BookPreview,{content:text,profile:window.bookProfile,fingerprint:'test',onImageEdit:i=>window.chosenImage=i,renderMarkdown:(md)=>React.createElement('div',{className:'markdown-viewer-root'},React.createElement('div',{className:'print:!block'},md.startsWith('!')?React.createElement('div',{className:'onrivi-image-figure',style:{display:'flex',flexDirection:'column'}},React.createElement('div',{className:'onrivi-image-wrapper',style:{display:'inline-flex',flexDirection:'column',padding:'16px'}},React.createElement('img',{style:{height:'auto',objectFit:'contain'},src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#2d6b58"/><circle cx="400" cy="260" r="120" fill="#ffdf7a"/></svg>')}))):React.createElement('p',null,md)))}));
        window.renderBook(':::scene {cover}\n![표지](cover.png)\n\n별빛 모험\n::: \n\n:::scene\n![장면](scene.png)\n\n할머니 집에서 만난 별빛이 창문을 비추었습니다.\n:::');
      });
      await page.waitForSelector('.book-page');
      await page.waitForFunction(() => document.querySelector('.picturebook-root')?.dataset.bookInvalid === 'false');
      assert.equal(await page.locator('.book-page').count(), 2);
      await page.locator('.book-image').last().click();
      assert.equal(await page.evaluate(()=>window.chosenImage),undefined);
      await page.locator('.book-image').last().hover();
      await page.locator('.book-image-edit').last().click();
      assert.equal(await page.evaluate(()=>window.chosenImage),1);
      assert.equal(await page.locator('.book-image-selected').count(),0);
      assert.equal(await page.locator('.book-image').last().evaluate(el=>getComputedStyle(el).outlineStyle),'none');
      const landscapePage = await page.locator('.book-page').first().evaluate(el => {
        const rect = el.getBoundingClientRect();
        return {width:rect.width,height:rect.height};
      });
      assert.ok(Math.abs(landscapePage.width / landscapePage.height - 297 / 210) < .01, JSON.stringify(landscapePage));
      const dimensions = await page.locator('.book-image img').last().evaluate(img => ({ width: img.clientWidth, height: img.clientHeight }));
      assert.ok(dimensions.height > 500 && dimensions.width > 400, JSON.stringify(dimensions));
      const fill = await page.locator('.book-image').last().evaluate(area => {
        const image = area.querySelector('img').getBoundingClientRect();
        const region = area.getBoundingClientRect();
        return { imageHeight:image.height, regionHeight:region.height, imageWidth:image.width, regionWidth:region.width };
      });
      assert.ok(Math.abs(fill.imageHeight-fill.regionHeight)<2 && Math.abs(fill.imageWidth-fill.regionWidth)<2, JSON.stringify(fill));
      const initialTop = await page.locator('.book-page').first().evaluate(el=>el.getBoundingClientRect().top);
      await page.evaluate(()=>{const image=document.querySelector('.book-image img');window.testImageSource=image.src;image.src='data:image/png;base64,AAAA';});
      await page.waitForFunction(()=>document.querySelector('.picturebook-root').dataset.bookInvalid==='true');
      assert.ok(Math.abs((await page.locator('.book-page').first().evaluate(el=>el.getBoundingClientRect().top))-initialTop)<2,'Loading/error notices must not move pages');
      await page.evaluate(()=>{document.querySelector('.book-image img').src=window.testImageSource;});
      await page.waitForFunction(()=>document.querySelector('.picturebook-root').dataset.bookInvalid==='false');
      const output = path.join(base, '.tmp/picturebook-qa'); fs.mkdirSync(output, { recursive: true });
      await page.screenshot({ path:path.join(output,'landscape.png'), fullPage:true });
      await page.pdf({ path:path.join(output,'picturebook.pdf'), preferCSSPageSize:true, printBackground:true });
      const preparation = ts.transpileModule(fs.readFileSync(path.join(base,'frontend/src/lib/exportPreparation.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
      const exportCode = ts.transpileModule(fs.readFileSync(path.join(base,'frontend/src/lib/exportHandlers.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
      await page.addScriptTag({content:`window.bookPreparation=(()=>{const exports={};${preparation};return exports;})();`});
      await page.addScriptTag({content:`window.bookExporter=(()=>{const exports={};const require=(id)=>{
        if(id.includes('exportPreparation'))return bookPreparation;
        if(id.includes('exportFonts'))return {embedExportFonts:async()=>''};
        if(id.includes('exportProgress'))return {startExportProgress:()=>({update(){},finish(){}})};
        if(id.includes('exportPagination'))return {PRINT_TABLE_FLOW_CSS:'',unwrapPrintTables(){}};
        if(id.includes('docxFormatting'))return {cssPx:v=>parseFloat(v)*3.78,EXPORT_FIGURE_HEIGHT_RATIO:.8,EXPORT_LEAD_FIGURE_HEIGHT_RATIO:.9,markLeadExportFigure(){}};
        if(id.includes('systemMessages'))return {msg:{error(){}}};
        if(id.includes('paperSizes'))return {PAPER_SIZES:{a4:{width:210,height:297}}};
        return {};
      };${exportCode};return exports;})();`});
      await page.evaluate(async () => {
        window.exportNotices=[];
        window.electronAPI={showSaveDialog:async()=>({filePath:'fixture.pdf'}),saveBinaryFile:async()=>{},printHTMLToPDF:async html=>{window.capturedBookHTML=html;return new Uint8Array([1]);}};
        await bookExporter.exportPDF({previewEl:document.getElementById('root'),currentFileName:'그림책.md',showToast:(message,type)=>window.exportNotices.push({message,type}),activeProfile:bookProfile,
          orientation:'landscape',paperSize:'a4',dynamicCssString:'body { color:#222; }',marginTop:'12mm',marginBottom:'12mm',marginLeft:'12mm',marginRight:'12mm'});
      });
      const exported = await page.evaluate(() => ({html:window.capturedBookHTML,notices:window.exportNotices}));
      assert.ok(exported.html, JSON.stringify(exported.notices));
      fs.writeFileSync(path.join(output,'actual-export.html'),exported.html);
      const printPage = await browser.newPage();
      await printPage.route('https://**/*',route=>route.abort());
      await printPage.setContent(exported.html);
      await printPage.emulateMedia({media:'print'});
      console.log('Print page geometry:',await printPage.locator('.book-page').evaluateAll(pages=>pages.map(p=>({width:p.getBoundingClientRect().width,height:p.getBoundingClientRect().height,box:getComputedStyle(p).boxSizing,padding:getComputedStyle(p).padding,overflow:p.scrollHeight}))));
      await printPage.pdf({path:path.join(output,'actual-export.pdf'),preferCSSPageSize:true,printBackground:true});
      await printPage.close();
      await page.evaluate(() => window.renderBook(':::scene\n![장면](scene.png)\n\n'+ '긴 이야기를 확인합니다. '.repeat(1000)+'\n:::'));
      await page.waitForFunction(() => !!document.querySelector('[data-book-overflow]'));
      assert.equal(await page.locator('.book-page').count(),1);
      await page.evaluate(() => { window.bookProfile={...window.bookProfile,pageStyle:{...window.bookProfile.pageStyle,orientation:'portrait'},layout:{...window.bookProfile.layout,cover:'image-right',imageFit:'contain'}};window.renderBook(':::scene {cover}\n![표지](cover.png)\n\n표지 제목\n:::'); });
      await page.waitForFunction(() => document.querySelector('.book-page')?.style.width === '210mm');
      await page.waitForFunction(() => document.querySelector('.picturebook-root')?.dataset.bookInvalid === 'false');
      await page.screenshot({ path:path.join(output,'portrait-right-cover.png'),fullPage:true });
      console.log('PASS: browser layout, image sizing, two cover layouts, portrait/landscape, overflow detection, PDF fixture');
    } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode=1; });
}



const editableBody=exportsObject.sceneEditableBody(sample.scenes[1]);
assert.ok(!editableBody.includes('![첫 번째 장면]'));
const bodyUpdated=exportsObject.replaceSceneBody(BOOK_SAMPLE,1,'## Updated\n\nNew text',sample.scenes[1].raw);
assert.equal(parseBookScenes(bodyUpdated).scenes[0].raw,sample.scenes[0].raw);
assert.equal(parseBookScenes(bodyUpdated).scenes[1].image,sample.scenes[1].image);
assert.match(parseBookScenes(bodyUpdated).scenes[1].body,/New text/);
assert.throws(()=>exportsObject.replaceSceneBody(bodyUpdated,1,'stale',sample.scenes[1].raw));
const duplicate=exportsObject.duplicateBookScene(BOOK_SAMPLE,0);
assert.equal(parseBookScenes(duplicate).scenes.length,3);
assert.equal(parseBookScenes(duplicate).scenes[1].cover,false);
const refScene=parseBookScenes(referencesBetween).scenes[0];
const refsUpdated=exportsObject.replaceSceneBody(referencesBetween,0,'Updated reference scene',refScene.raw);
assert.ok(refsUpdated.includes('[image1]: media/a.png'));
assert.equal(parseBookScenes(refsUpdated).scenes[1].raw,parseBookScenes(referencesBetween).scenes[1].raw);
console.log('PASS: scene body editing, stale target guard, duplication and reference preservation');
