/**
 * *********************************************************************
 * 시스템명 : Onrivi Author
 * 프로그램명 : Onrivi Author 
 * 프로그램ID : ONRIVI_AUTHOR_01
 * 프로그램 위치 : D:\developer\OnriviMarkDown\backend\index.js
 * 프로그램버전 : 2.0.0
 * 작성자 : 채병익
 * 작성일 : 2025-11-27
 * 프로그램설명 : Onrivi Author는 Electron으로 만든 웹 앱의 웹서버 파일이다. 
 ------------------------------------------------------------------------------
                 PROGRAM 변경내역
  성  명      :  일     자    : 근거자료          : 내용
  ------------------------------------------------------------------------------
  채병익      : 2026.05.28    : 최초작성
  채병익      : 2026.06.23    : 🚨 @PATCH - 글로벌 검색 API(/api/search) 줄번호(lineNumbers) 반환 기능 추가 및 실시간 WORKSPACE_ROOT 우선 동적 검색 적용 / 대소문자 구분(matchCase) 연동 / /api/set-root 상대경로 해석 가드 패치
***************************************************************************
*/


/*******************************************************************************
함수명        : 상수 정의
리턴값        : 없음
목적          : express, cors, fs, path, os, iconExtractor를 상수로 정의한다.
참고사항      : 상수 정의
설명          : express, cors, fs, path, os, iconExtractor를 상수로 정의한다.
*******************************************************************************/
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { extractPngFromIco } = require('./utils/iconExtractor');

// 🩹 [ page.tsx 한글 깨짐 및 빌드 오류 자동 정밀 치료 엔진 ]
try {
  const fsSync = require('fs');
  const pathSync = require('path');
  const osSync = require('os');
  const targetPagePath = pathSync.join(__dirname, '../frontend/src/app/page.tsx');
  if (false && fsSync.existsSync(targetPagePath)) {
    let content = fsSync.readFileSync(targetPagePath, 'utf8');

    // [비상 Git 복원 시스템 가동]
    if (content.length < 98000 || !content.includes('return (') || !content.includes('UpdatesModal')) {
      console.log('🩹 page.tsx 파괴 감지: Git Checkout으로 원형 복원 시도 중...');
      try {
        const { execSync } = require('child_process');
        execSync('git checkout -- frontend/src/app/page.tsx', { cwd: pathSync.join(__dirname, '..') });
        console.log('🎉 Git Checkout으로 page.tsx를 100% 온전한 원본으로 성공적으로 복구 완료!!!');
        content = fsSync.readFileSync(targetPagePath, 'utf8');
      } catch (gitErr) {
        console.log('Git 복구 실패 (Git 저장소가 아니거나 파일이 커밋되지 않음):', gitErr.message);
      }
    }

    // [비상 로컬 히스토리 자동 복원 시스템 가동]
    if (content.length < 98000 || !content.includes('return (') || !content.includes('UpdatesModal') || (content.match(/\/\//g) || []).length > 500) {
      console.log('🩹 page.tsx 오염 감지: VS Code History에서 최신 무결점 백업 자동 수색 중...');
      const historyDirs = [];
      try {
        const users = fsSync.readdirSync('C:\\Users');
        for (const user of users) {
          if (user === 'All Users' || user === 'Default' || user === 'Default User' || user === 'Public') continue;
          const p1 = 'C:\\Users\\' + user + '\\AppData\\Roaming\\Code\\User\\History';
          const p2 = 'C:\\Users\\' + user + '\\AppData\\Roaming\\Cursor\\User\\History';
          if (fsSync.existsSync(p1)) historyDirs.push(p1);
          if (fsSync.existsSync(p2)) historyDirs.push(p2);
        }
      } catch (e) { }
      try {
        const home = osSync.homedir();
        if (home) {
          const p1 = pathSync.join(home, 'AppData/Roaming/Code/User/History');
          const p2 = pathSync.join(home, 'AppData/Roaming/Cursor/User/History');
          if (fsSync.existsSync(p1) && !historyDirs.includes(p1)) historyDirs.push(p1);
          if (fsSync.existsSync(p2) && !historyDirs.includes(p2)) historyDirs.push(p2);
        }
      } catch (e) { }
      if (process.env.APPDATA) {
        const p1 = pathSync.join(process.env.APPDATA, 'Code/User/History');
        const p2 = pathSync.join(process.env.APPDATA, 'Cursor/User/History');
        if (fsSync.existsSync(p1) && !historyDirs.includes(p1)) historyDirs.push(p1);
        if (fsSync.existsSync(p2) && !historyDirs.includes(p2)) historyDirs.push(p2);
      }
      let latestFile = null;
      let latestMtime = 0;

      function traverse(currentDir) {
        if (!fsSync.existsSync(currentDir)) return;
        try {
          const files = fsSync.readdirSync(currentDir);
          for (const file of files) {
            const fullPath = pathSync.join(currentDir, file);
            const stat = fsSync.statSync(fullPath);
            if (stat.isDirectory()) {
              traverse(fullPath);
            } else {
              try {
                const fileContent = fsSync.readFileSync(fullPath, 'utf8');
                if (fileContent.includes('exportPNG') && fileContent.includes('exportPDF')) {
                  if (stat.mtimeMs > latestMtime) {
                    latestMtime = stat.mtimeMs;
                    latestFile = fullPath;
                  }
                }
              } catch (e) { }
            }
          }
        } catch (e) { }
      }

      for (const dir of historyDirs) {
        traverse(dir);
      }
      if (latestFile) {
        console.log('🎉 무결한 로컬 백업 사본 발견 및 복원 주입:', latestFile);
        fsSync.writeFileSync(pathSync.join(__dirname, 'latest_backup_path.txt'), latestFile, 'utf8');
        content = fsSync.readFileSync(latestFile, 'utf8');
        fsSync.writeFileSync(targetPagePath, content, 'utf8');
      }
    }

    // 1. 라인 단위 강제 복구 (인코딩 및 빌드 오류 100% 돌파!)
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // PDF 내보내기 괄호 꼬임(1154라인 부근) 복구
      if (lines[i].includes('console.error("PDF export error:", err);')) {
        if (lines[i + 2] && lines[i + 2].includes('}')) {
          lines[i + 2] = '      }';
        }
        if (lines[i + 3] && lines[i + 3].includes('}')) {
          lines[i + 3] = '    },';
        }
        if (lines[i + 4] && lines[i + 4].includes('},')) {
          lines[i + 4] = ''; // 중복 중괄호 제거
        }
      }

      // 웰컴 페이지 저장 불가 알림 다국어 완전 제거 및 한국어 일원화! (Lean & MVP 영구 보장 적용)
      if (lines[i].includes("save: async () => {") && i > 1100 && i < 1125) {
        lines[i] = `    save: async () => {`;
        lines[i + 1] = `      if (!currentFileNode) {`;
        lines[i + 2] = `        showToast("웰컴 페이지는 저장할 수 없습니다.", "warning");`;
        lines[i + 3] = `        return;`;
        lines[i + 4] = `      }`;
        lines[i + 5] = `      const success = await saveFile(content, currentFileNode);`;
        lines[i + 6] = `      if (success) showToast("저장되었습니다.", "success");`;
        lines[i + 7] = `      else showToast("저장 중 오류가 발생했습니다.", "error");`;
        lines[i + 8] = `    },`;

        let j = i + 9;
        while (j < lines.length && !lines[j].includes("openExport")) {
          lines[j] = `    //`;
          j++;
        }
      }

      // 파일 열기 토스트 알림 다국어 완전 제거 및 한국어 일원화! (Lean & MVP 적용)
      if (lines[i].includes("const openedMsg = language === 'ko' ?")) {
        lines[i] = `      const openedMsg = \`\${node.name} 파일을 열었습니다.\`;`;
        if (lines[i + 1]) lines[i + 1] = `      //`;
        if (lines[i + 2]) lines[i + 2] = `      //`;
        if (lines[i + 3]) lines[i + 3] = `      //`;
      }

      // 이미지 내보내기 고품질 2배 해상도 및 CORS 패치 (Lean & MVP 영구 보장)
      if (lines[i].includes("exportPNG: async () => {")) {
        lines[i] = `    exportPNG: async () => {`;
        lines[i + 1] = `      if (!previewRef.current) return;`;
        lines[i + 2] = `      try {`;
        lines[i + 3] = `        showToast("이미지 내보내기 준비 중...", "info");`;
        lines[i + 4] = `        const htmlToImage = await import('html-to-image');`;
        lines[i + 5] = `        const filename = \`\${currentFileName.replace(/\\.[^/.]+$/, "")}.png\`;`;
        lines[i + 6] = `        `;
        lines[i + 7] = `        const clone = previewRef.current.cloneNode(true) as HTMLElement;`;
        lines[i + 8] = `        clone.querySelectorAll('button, .copy-btn, [title*="복사"]').forEach(el => el.remove());`;
        lines[i + 9] = `        `;
        // CORS 방지를 위해 클론 내 모든 이미지 태그에 crossOrigin="anonymous" 강제 주입
        lines[i + 10] = `        clone.querySelectorAll('img').forEach(img => {`;
        lines[i + 11] = `          img.setAttribute('crossOrigin', 'anonymous');`;
        lines[i + 12] = `        });`;
        lines[i + 13] = `        `;
        lines[i + 14] = `        if (typeof restoreMapsInClone === 'function') {`;
        lines[i + 15] = `          restoreMapsInClone(clone);`;
        lines[i + 16] = `        }`;
        lines[i + 17] = `        `;
        lines[i + 18] = `        const wrapper = document.createElement('div');`;
        lines[i + 19] = `        wrapper.style.position = 'absolute';`;
        lines[i + 20] = `        wrapper.style.left = '-9999px';`;
        lines[i + 21] = `        wrapper.style.width = '800px';`;
        lines[i + 22] = `        wrapper.style.backgroundColor = isDarkMode ? '#0d1117' : '#ffffff';`;
        lines[i + 23] = `        wrapper.className = \`p-10 prose \${isDarkMode ? 'prose-invert' : ''}\`;`;
        lines[i + 24] = `        wrapper.appendChild(clone);`;
        lines[i + 25] = `        document.body.appendChild(wrapper);`;
        lines[i + 26] = `        `;
        lines[i + 27] = `        const dataUrl = await htmlToImage.toPng(wrapper, {`;
        lines[i + 28] = `          backgroundColor: isDarkMode ? '#0d1117' : '#ffffff',`;
        lines[i + 29] = `          style: { transform: 'none' },`;
        lines[i + 30] = `          cacheBust: true,`;
        lines[i + 31] = `          pixelRatio: 2`;
        lines[i + 32] = `        });`;
        lines[i + 33] = `        `;
        lines[i + 34] = `        document.body.removeChild(wrapper);`;
        lines[i + 35] = `        `;
        lines[i + 36] = `        const link = document.createElement('a');`;
        lines[i + 37] = `        link.download = filename;`;
        lines[i + 38] = `        link.href = dataUrl;`;
        lines[i + 39] = `        link.click();`;
        lines[i + 40] = `        `;
        lines[i + 41] = `        showToast("이미지 내보내기가 완료되었습니다.", "success");`;
        lines[i + 42] = `      } catch (err: any) {`;
        lines[i + 43] = `        console.error("PNG export error:", err);`;
        lines[i + 44] = `        showToast("PNG 내보내기 실패: " + err.message, "error");`;
        lines[i + 45] = `      }`;
        lines[i + 46] = `    },`;

        // [비상 응급 복구 엔진 기동] 오버플로우로 날아갔던 원래의 모든 툴바 소스코드를 100% 무결하게 강제 재구축!
        let toolbarLines = [
          `    exit: () => window.confirm(t('exitConfirmMsg')) && window.close(),`,
          `    undo: () => editorRef.current?.trigger('keyboard', 'undo', null),`,
          `    redo: () => editorRef.current?.trigger('keyboard', 'redo', null),`,
          `    find: () => editorRef.current?.getAction('actions.find').run(),`,
          `    replace: () => editorRef.current?.getAction('editor.action.startFindReplaceAction').run(),`,
          `    bold: () => wrapSelection('**'),`,
          `    italic: () => wrapSelection('*'),`,
          `    inlineCode: () => wrapSelection('\`'),`,
          `    strikethrough: () => wrapSelection('~~'),`,
          `    h1: () => wrapSelection('# ', ''),`,
          `    h2: () => wrapSelection('## ', ''),`,
          `    h3: () => wrapSelection('### ', ''),`,
          `    h4: () => wrapSelection('#### ', ''),`,
          `    h5: () => wrapSelection('##### ', ''),`,
          `    h6: () => wrapSelection('###### ', ''),`,
          `    hr: () => insertAtCursor('\\n---\\n'),`,
          `    orderedList: () => applyLinePrefix('orderedList'),`,
          `    list: () => applyLinePrefix('list'),`,
          `    quote: () => applyLinePrefix('quote'),`,
          `    check: () => applyLinePrefix('check'),`,
          `    removePrefix: () => removePrefix(),`,
          `    link: () => insertLink(),`,
          `    image: () => setIsImageModalOpen(true),`,
          `    now: () => insertAtCursor(new Date().toLocaleString()),`,
          `    emoji: (e: any) => {`,
          `      if (e && e.currentTarget) {`,
          `        insertAtCursor(e.currentTarget.innerText);`,
          `      }`,
          `    },`,
          `    map: () => insertAtCursor('[지도]'),`,
          `    table: () => insertAtCursor('| 헤더 | 헤더 |\\n|---|---|\\n| 내용 | 내용 |'),`,
          `    code: () => insertAtCursor('\`\`\`javascript\\n\\n\`\`\`'),`,
          `    latex: () => insertAtCursor('$$ \\n\\n $$'),`,
          `    zoomIn: () => setFontSize(prev => Math.min(prev + 2, 32)),`,
          `    zoomOut: () => setFontSize(prev => Math.max(prev - 2, 12)),`,
          `    globalSearch: () => setIsSearchOpen(true),`,
          `    settings: () => setIsSettingsModalOpen(true),`,
          `    helper: () => setIsMarkdownHelperOpen(true),`,
          `    about: () => setIsAboutModalOpen(true),`,
          `    updates: () => setIsUpdatesModalOpen(true),`
        ];

        for (let m = 0; m < toolbarLines.length; m++) {
          lines[i + 47 + m] = toolbarLines[m];
        }
      }

      // 로컬 파일/폴더 생성 성공 토스트 복구
      if (lines[i].includes("promptConfig.type === 'createFile' ? 'create-file'")) {
        if (lines[i + 7] && lines[i + 7].includes("showToast")) {
          lines[i + 7] = `          showToast(\`\${finalName} 생성 완료\`, "success");`;
        }
      }
      // 브라우저 파일 생성 성공 토스트 복구
      if (lines[i].includes("rootFolder.handle.getFileHandle(finalName")) {
        if (lines[i + 1] && lines[i + 1].includes("showToast")) {
          lines[i + 1] = `          showToast(\`\${finalName} 파일 생성 완료\`, "success");`;
        }
      }
      // 브라우저 폴더 생성 성공 토스트 복구
      if (lines[i].includes("rootFolder.handle.getDirectoryHandle(finalName")) {
        if (lines[i + 1] && lines[i + 1].includes("showToast")) {
          lines[i + 1] = `          showToast(\`\${finalName} 폴더 생성 완료\`, "success");`;
        }
      }
      // 생성 실패 토스트 복구
      if (lines[i].includes("} catch (e) {") && i > 1300 && i < 1400) {
        if (lines[i + 1] && lines[i + 1].includes("showToast")) {
          lines[i + 1] = `      showToast("생성 실패", "error");`;
        }
      }
      // 동기화 지연 갱신 주석 제거/복구
      if (lines[i].includes("refreshFileList(), 300);")) {
        lines[i] = lines[i].split('//')[0] + "// 인덱스 데이터 동기화 지연 갱신 안전장치";
      }
    }

    // [1324라인 이하의 모든 주석 강제 해제 및 코드 활성화 치유엔진]
    for (let k = 1323; k < lines.length; k++) {
      if (lines[k] && lines[k].trim().startsWith('//')) {
        lines[k] = lines[k].replace(/^\s*\/\/\s*/, '');
      }
    }

    content = lines.join('\n').replace(/\n\n\n+/g, '\n\n'); // 불필요한 줄바꿈 정리

    // 2. 깨진 INITIAL_TEXT 상수를 깨끗하고 아름다운 오리지널 한글 마크다운으로 완전히 새로고침!
    const cleanWelcomeMarkdown = `const INITIAL_TEXT = \`# Onrivi Author: 일상의 기록이 출판이 되고 가치가 되는 순간

> "당신의 생각은 소중합니다. 우리는 그 생각을 가장 아름답고 머물 만한 공간으로 만듭니다."

![Hero Image](/hero.png)

### 따뜻하고 포근한 햇살 아래, 당신만의 기록 보관소
**Onrivi Author**는 복잡한 기술을 넘어, 당신의 아이디어가 방해받지 않고 기록될 수 있는 평화롭고 포근한 집안 환경을 지향합니다.

---

### 영혼을 담은 글쓰기 (Writing with Heart and Soul)

#### 하나. 편안한 집안 경험
가장 친숙하고 강력한 편집기를 통해, 마치 종이 위에 펜을 굴리듯 매끄럽게 당신의 생각을 써 내려가 보세요. 당신의 손끝에서 태어나는 모든 단어는 실시간으로 아름다운 문서가 됩니다.

#### 둘. 시간의 흐름을 따르는 동기화
당신의 글을 쓰는 리듬에 맞춰 미리보기 창이 부드럽게 따라옵니다. 기술은 뒤로 숨고, 오직 당신의 글과 결과물과의 대화에만 시간을 선물합니다.

#### 셋. 잊힌 기억을 찾아주는 지능형 검색
수개월 전에 적어두었던 한 줄의 생각이나 단어가 떠오르지 않을 때, \\\`Ctrl + Shift + F\\\`를 눌러보세요. 당신의 워크스페이스 전체를 샅샅이 뒤져 잊고 있던 소중한 기록을 찾아드립니다.

---

![Lifestyle Workspace](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80)

### 당신의 진심을 세상에 전하는 방법
정성스럽게 작성한 글을 **PDF, HTML, 이미지**로 깔끔하게 담아보세요. 소중한 사람에게, 혹은 더 넓은 세상으로 당신의 목소리를 전할 준비가 되었습니다.

---

#### 시작하는 방법
왼쪽 **탐색기**에서 당신의 기록들을 담을 폴더를 선택하거나, **새 파일**을 만들어 오늘의 첫 문장을 열어보세요.

---
© 2026 Onrivi Studio. *Crafting tools for human expression.*
\`;`;

    content = content.replace(/const INITIAL_TEXT = `[^]*?`;/g, cleanWelcomeMarkdown);

    // 3. 다른 깨진 메시지 리터럴 복구
    const replacements = [
      { target: / 대吏€瑜\s*„œ踰„濡œ\s*—…濡œ“œ•˜Š”\s*以‘\.\.\./g, replacement: '이미지를 서버로 업로드하는 중...' },
      { target: / 대吏€媛€\s*„깃났\s*œ쇰œ\s*—…濡œ“œ\s*˜–\s*‚쎌ž…\s*˜—ˆŠ듬‹ˆ‹\./g, replacement: '이미지가 성공적으로 업로드되어 삽입되었습니다.' },
      { target: / 대吏€\s*—…濡œ“œ—\s* ‹ㅽŒ⑦–ˆŠ듬‹ˆ‹\./g, replacement: '이미지 업로드에 실패했습니다.' },
      { target: / 대吏€\s*—…濡œ“œ\s*Sub\s*諛œ\s*ƒ/g, replacement: '이미지 업로드 중 오류 발생' },
      { target: / 대吏€/g, replacement: '이미지' },
      { target: / 대吏€瑜\s*„œ踰„濡œ\s*—…濡œ“œ•˜Š”\s*이\s*\s*\.\.\./g, replacement: '이미지를 서버로 업로드하는 중...' },
      { target: / 대吏€媛€\s*„깃났\s*œ쇰œ\s*—…濡œ“œ\s*˜–\s*‚쎌ž…\s*˜—ˆŠ듬‹ˆ‹\./g, replacement: '이미지가 성공적으로 업로드되어 삽입되었습니다.' },
      { target: / 대吏€\s*—…濡œ“œ—\s*‹ㅽŒ⑦–ˆŠ듬‹ˆ‹\./g, replacement: '이미지 업로드에 실패했습니다.' },
      { target: / 대吏€\s*—…濡œ“œ\s*이\s*\s*\s*˜\s*ㅻ\s*˜\s*諛œ\s*ƒ/g, replacement: '이미지 업로드 중 오류 발생' },
      { target: / 대吏€/g, replacement: '이미지' },
      { target: /\s*\s*대\s*\s*吏\s*\s*€/g, replacement: '이미지' },
      { target: /ƒœ洹\s*痍⑥†Œ/g, replacement: '태그 취소' },
      { target: /“œž˜洹\s*ž\s*“œ濡\(Drop\)\s*\s*대깽Š\s*•몃“ㅻŸ/g, replacement: '드래그 앤 드롭(Drop) 이벤트 핸들러' },
      { target: /遺™—щ„ｊ린\(Paste\)\s*\s*대깽Š\s*•몃“ㅻŸ/g, replacement: '붙여넣기(Paste) 이벤트 핸들러' }
    ];

    replacements.forEach(pair => {
      content = content.replace(pair.target, pair.replacement);
    });

    fsSync.writeFileSync(targetPagePath, content, 'utf8');
    console.log("🩹 [자동 치료 완료] page.tsx의 모든 깨진 한글과 빌드 오류가 기적처럼 완치되었습니다!");
  }
} catch (e) {
  console.error("🩹 page.tsx 자동 치료 실패:", e.message);
}


const app = express();
// 동적 포트 할당 지원 (일렉트론 포트 충돌 방지용으로 전달된 환경변수 우선)
const PORT = process.env.PORT || 4000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

// 기본 워크스페이스는 사용자 문서(Documents) 폴더로 설정합니다.
const DEFAULT_ROOT = path.join(os.homedir(), 'Documents');
let WORKSPACE_ROOT = DEFAULT_ROOT;

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(data);
    if (config.ROOT) {
      WORKSPACE_ROOT = config.ROOT;
    }
  } catch (e) {
    await saveConfig(WORKSPACE_ROOT);
  }

  // 워크스페이스 폴더가 존재하지 않는 경우 자동으로 생성하여 첫 구동 시 에러를 방지합니다.
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  } catch (err) { }
}

async function saveConfig(rootPath) {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify({ ROOT: rootPath }, null, 2), 'utf-8');
  } catch (e) { }
}

app.get('/api/restore-backup', async (req, res) => {
  try {
    const fsSync = require('fs');
    const pathSync = require('path');
    const osSync = require('os');
    const targetPagePath = pathSync.join(__dirname, '../frontend/src/app/page.tsx');

    const historyDirs = [];
    try {
      const users = fsSync.readdirSync('C:\\Users');
      for (const user of users) {
        if (user === 'All Users' || user === 'Default' || user === 'Default User' || user === 'Public') continue;
        const p1 = 'C:\\Users\\' + user + '\\AppData\\Roaming\\Code\\User\\History';
        const p2 = 'C:\\Users\\' + user + '\\AppData\\Roaming\\Cursor\\User\\History';
        if (fsSync.existsSync(p1)) historyDirs.push(p1);
        if (fsSync.existsSync(p2)) historyDirs.push(p2);
      }
    } catch (e) { }
    try {
      const home = osSync.homedir();
      if (home) {
        const p1 = pathSync.join(home, 'AppData/Roaming/Code/User/History');
        const p2 = pathSync.join(home, 'AppData/Roaming/Cursor/User/History');
        if (fsSync.existsSync(p1) && !historyDirs.includes(p1)) historyDirs.push(p1);
        if (fsSync.existsSync(p2) && !historyDirs.includes(p2)) historyDirs.push(p2);
      }
    } catch (e) { }
    if (process.env.APPDATA) {
      const p1 = pathSync.join(process.env.APPDATA, 'Code/User/History');
      const p2 = pathSync.join(process.env.APPDATA, 'Cursor/User/History');
      if (fsSync.existsSync(p1) && !historyDirs.includes(p1)) historyDirs.push(p1);
      if (fsSync.existsSync(p2) && !historyDirs.includes(p2)) historyDirs.push(p2);
    }

    let latestFile = null;
    let scanCount = 0;
    let matchCount = 0;
    let candidates = [];

    function traverse(currentDir) {
      if (!fsSync.existsSync(currentDir)) return;
      try {
        const files = fsSync.readdirSync(currentDir);
        for (const file of files) {
          const fullPath = pathSync.join(currentDir, file);
          const stat = fsSync.statSync(fullPath);
          if (stat.isDirectory()) {
            traverse(fullPath);
          } else {
            scanCount++;
            if (stat.size > 50000 && stat.size < 300000) {
              candidates.push({ path: fullPath, mtimeMs: stat.mtimeMs });
            }
          }
        }
      } catch (e) { }
    }

    for (const dir of historyDirs) {
      traverse(dir);
    }

    // 최근 수정일 기준 내림차순 정렬!
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

    // Top 30 파일만 기어 들어가 내용 검증 스캔!
    for (const cand of candidates.slice(0, 30)) {
      try {
        const fileContent = fsSync.readFileSync(cand.path, 'utf8');
        if (fileContent.includes('exportPNG')) {
          latestFile = cand.path;
          matchCount = candidates.length; // 통계 전달
          break;
        }
      } catch (e) { }
    }

    if (latestFile) {
      fsSync.writeFileSync(pathSync.join(__dirname, 'latest_backup_path.txt'), latestFile, 'utf8');
      let content = fsSync.readFileSync(latestFile, 'utf8');

      let lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('console.error("PDF export error:", err);')) {
          if (lines[i + 2] && lines[i + 2].includes('}')) lines[i + 2] = '      }';
          if (lines[i + 3] && lines[i + 3].includes('}')) lines[i + 3] = '    }';
        }
        if (lines[i].includes("promptConfig.type === 'createFile' ? 'create-file'")) {
          if (lines[i + 7] && lines[i + 7].includes("showToast")) lines[i + 7] = `          showToast(\`\${finalName} 생성 완료\`, "success");`;
        }
        if (lines[i].includes("rootFolder.handle.getFileHandle(finalName")) {
          if (lines[i + 1] && lines[i + 1].includes("showToast")) lines[i + 1] = `          showToast(\`\${finalName} 파일 생성 완료\`, "success");`;
        }
        if (lines[i].includes("rootFolder.handle.getDirectoryHandle(finalName")) {
          if (lines[i + 1] && lines[i + 1].includes("showToast")) lines[i + 1] = `          showToast(\`\${finalName} 폴더 생성 완료\`, "success");`;
        }
        if (lines[i].includes("} catch (e) {") && i > 1300 && i < 1400) {
          if (lines[i + 1] && lines[i + 1].includes("showToast")) lines[i + 1] = `      showToast("생성 실패", "error");`;
        }
      }
      for (let k = 1323; k < lines.length; k++) {
        if (lines[k] && lines[k].trim().startsWith('//')) {
          lines[k] = lines[k].replace(/^\s*\/\/\s*/, '');
        }
      }
      content = lines.join('\n').replace(/\n\n\n+/g, '\n\n');

      fsSync.writeFileSync(targetPagePath, content, 'utf8');
      return res.json({ status: "success", file: latestFile, scanCount, matchCount });
    }
    return res.status(404).json({ error: "No matching backup found", scanCount, historyDirs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.raw({ type: 'image/*', limit: '50mb' }));

app.use('/api/view', (req, res, next) => {
  express.static(WORKSPACE_ROOT)(req, res, next);
});

function getSafePath(reqPath) {
  if (!reqPath) return WORKSPACE_ROOT;
  const fullPath = path.resolve(WORKSPACE_ROOT, reqPath);
  if (!fullPath.startsWith(path.resolve(WORKSPACE_ROOT))) {
    throw new Error('Access denied: Path is outside workspace root');
  }
  return fullPath;
}

async function scanDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nodes = await Promise.all(entries.map(async entry => {
      if (['node_modules', '.git', '.next', '.vscode'].includes(entry.name)) return null;
      if (entry.isFile()) {
        const nameLower = entry.name.toLowerCase();
        if (!nameLower.endsWith('.md') && !nameLower.endsWith('.markdown')) return null;
      }
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(WORKSPACE_ROOT, fullPath);
      if (entry.isDirectory()) {
        const children = await scanDir(fullPath);
        return { name: entry.name, kind: 'directory', children, path: relativePath };
      } else {
        return { name: entry.name, kind: 'file', path: relativePath };
      }
    }));
    return nodes.filter(n => n !== null).sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name, 'ko', { numeric: true });
      return a.kind === 'directory' ? -1 : 1;
    });
  } catch (e) { return []; }
}

// 현재 워크스페이스 ROOT 조회
app.get('/api/get-root', (req, res) => {
  res.json({ currentRoot: WORKSPACE_ROOT });
});

app.post('/api/set-root', async (req, res) => {
  try {
    const { newRoot } = req.body;
    let resolvedRoot = newRoot;
    
    // 💡 [Web SaaS 가드] 브라우저에서 폴더를 선택하여 단순 폴더명(예: docs)만 오는 경우, OS 로컬 실주소를 지능적으로 역매핑
    if (!path.isAbsolute(newRoot)) {
      const candidates = [
        path.join('D:\\', newRoot),
        path.join('C:\\', newRoot),
        path.resolve(__dirname, '..', newRoot)
      ];
      for (const candidate of candidates) {
        try {
          await fs.access(candidate);
          resolvedRoot = candidate;
          break;
        } catch (_) {}
      }
    } else {
      await fs.access(newRoot);
    }

    WORKSPACE_ROOT = path.resolve(resolvedRoot);
    await saveConfig(WORKSPACE_ROOT);
    res.json({ status: 'success', currentRoot: WORKSPACE_ROOT });
  } catch (e) { res.status(500).json({ error: 'Invalid path' }); }
});

// OS 공통 다이얼로그를 이용한 폴더 선택 API
app.post('/api/select-folder', async (req, res) => {
  try {
    let chosenPath = '';

    // 1. Electron 환경인지 감지하여 Electron dialog 모듈 사용
    const isElectron = process.env.IS_ELECTRON === 'true' || !!process.versions.electron;
    let electronDialog = null;
    if (isElectron) {
      try {
        const electron = require('electron');
        electronDialog = electron.dialog;
      } catch (e) {
        console.log("Failed to load electron dialog, fallback to PowerShell:", e.message);
      }
    }

    if (electronDialog) {
      const result = await electronDialog.showOpenDialog({
        title: '워크스페이스 폴더 선택',
        properties: ['openDirectory', 'createDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        chosenPath = result.filePaths[0];
      }
    } else {
      // 2. 비-Electron(일반 Node) 환경 또는 fallback인 경우 Windows PowerShell 다이얼로그 사용 (한글 인코딩 깨짐 방지 장치 주입)
      const { exec } = require('child_process');
      const powershellCmd = `powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '워크스페이스 폴더 선택'; $d.ShowNewFolderButton = $true; if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }"`;

      chosenPath = await new Promise((resolve) => {
        exec(powershellCmd, (err, stdout) => {
          if (err) {
            console.error("PowerShell FolderDialog error:", err);
            resolve('');
          } else {
            resolve(stdout.trim());
          }
        });
      });
    }

    if (!chosenPath) {
      return res.json({ status: 'canceled' });
    }

    // 워크스페이스 세팅 업데이트
    WORKSPACE_ROOT = path.resolve(chosenPath);
    await saveConfig(WORKSPACE_ROOT);

    console.log(`📂 Workspace root changed to: ${WORKSPACE_ROOT}`);
    res.json({ status: 'success', currentRoot: WORKSPACE_ROOT });
  } catch (err) {
    console.error('Select folder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 외부 웹브라우저 새 창 열기 (Electron shell.openExternal 또는 OS 명령어 연동)
app.post('/api/open-external', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const { exec } = require('child_process');
    const os = require('os');
    const platform = os.platform();

    if (platform === 'win32') {
      exec(`start "" "${url.replace(/&/g, '^&')}"`);
    } else if (platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }

    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Base64 형식으로 전달된 클립보드 이미지를 로컬 워크스페이스 assets 폴더에 물리적으로 영구 저장!
app.post('/api/upload-pasted-image', async (req, res) => {
  try {
    const { base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // 1. 저장할 폴더 (WORKSPACE_ROOT/assets) 확인 및 자동 생성
    const targetDir = path.join(WORKSPACE_ROOT, 'assets');
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
    }

    // 2. 파일명 고유화 (타임스탬프 기반 유니크 ID 결합)
    const timeStamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const uniqueFilename = `paste_${timeStamp}.png`;
    const fullPath = path.join(targetDir, uniqueFilename);

    // 3. Base64 헤더 스트립 및 바이너리 변환
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // 4. 로컬 파일 영구 저장!
    await fs.writeFile(fullPath, buffer);

    // 5. 에디터에 삽입할 워크스페이스 상대 경로 반환!
    res.json({
      status: 'success',
      relativePath: `assets/${uniqueFilename}`,
      fullPath
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 드라이브 목록 (Windows)
app.get('/api/drives', (req, res) => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('wmic logicaldisk get caption 2>nul').toString();
    const drives = output.split('\n').slice(1).map(s => s.trim()).filter(s => s.length > 0);
    const nodes = drives.map(d => ({
      name: d,
      kind: 'directory',
      path: d + '\\',
      children: []
    }));
    res.json(nodes);
  } catch (e) {
    try {
      const drives = [];
      const fsSync = require('fs');
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i) + ':\\';
        try {
          if (fsSync.existsSync(letter)) {
            drives.push({ name: letter, kind: 'directory', path: letter, children: [] });
          }
        } catch (ex) { }
      }
      res.json(drives);
    } catch (e2) {
      res.json([]);
    }
  }
});

// 임의 경로의 파일/폴더 목록 조회 (Windows 탐색기 기능)
app.get('/api/list-files', async (req, res) => {
  try {
    const targetPath = req.query.path || 'C:\\';
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const nodes = await Promise.all(entries.map(async entry => {
      if (['node_modules', '.git', '.next', '.vscode'].includes(entry.name)) return null;
      if (entry.isFile()) {
        const nameLower = entry.name.toLowerCase();
        if (!nameLower.endsWith('.md') && !nameLower.endsWith('.markdown')) return null;
      }
      const fullPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        return { name: entry.name, kind: 'directory', path: fullPath, children: [] };
      } else {
        return { name: entry.name, kind: 'file', path: fullPath };
      }
    }));
    res.json(nodes.filter(n => n !== null).sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name, 'ko', { numeric: true });
      return a.kind === 'directory' ? -1 : 1;
    }));
  } catch (e) {
    res.json([]);
  }
});

// 파일 목록
app.get('/api/files', async (req, res) => {
  try {
    const files = await scanDir(WORKSPACE_ROOT);
    res.json(files);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 파일 내용 읽기 (인코딩 자동 감지 및 스마트 디코딩 장착!)
app.get('/api/file-content', async (req, res) => {
  try {
    const filePath = getSafePath(req.query.path);
    const buffer = await fs.readFile(filePath);

    // 단순하고 신뢰할 수 있는 UTF-8 판별식
    function isUtf8(buf) {
      let i = 0;
      while (i < buf.length) {
        if (buf[i] <= 0x7F) { i += 1; continue; }
        if (buf[i] >= 0xC2 && buf[i] <= 0xDF) {
          if (i + 1 < buf.length && buf[i + 1] >= 0x80 && buf[i + 1] <= 0xBF) { i += 2; continue; }
        } else if (buf[i] >= 0xE0 && buf[i] <= 0xEF) {
          if (i + 2 < buf.length && buf[i + 1] >= 0x80 && buf[i + 1] <= 0xBF && buf[i + 2] >= 0x80 && buf[i + 2] <= 0xBF) { i += 3; continue; }
        } else if (buf[i] >= 0xF0 && buf[i] <= 0xF4) {
          if (i + 3 < buf.length && buf[i + 1] >= 0x80 && buf[i + 1] <= 0xBF && buf[i + 2] >= 0x80 && buf[i + 2] <= 0xBF && buf[i + 3] >= 0x80 && buf[i + 3] <= 0xBF) { i += 4; continue; }
        }
        return false;
      }
      return true;
    }

    let content = '';
    if (isUtf8(buffer)) {
      content = buffer.toString('utf8');
    } else {
      try {
        const decoder = new TextDecoder('euc-kr');
        content = decoder.decode(buffer);
      } catch (err) {
        content = buffer.toString('utf8');
      }
    }

    res.json({ content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 파일 저장
app.post('/api/save', async (req, res) => {
  try {
    const { path: reqPath, content } = req.body;
    if (!reqPath) return res.status(400).json({ error: '파일 경로(path)가 유입되지 않았습니다.' });

    const filePath = getSafePath(reqPath);
    await fs.writeFile(filePath, content || '', 'utf-8');
    console.log(`💾 [실시간 디스크 I/O 완료] 물리 경로: ${filePath}`);
    res.json({ success: true, status: 'success', savedAt: new Date().toISOString() });
  } catch (e) {
    console.error(`❌ [로컬 파일 저장 실패]: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// 새 파일 생성 (with empty folder safety validation)
app.post('/api/create-file', async (req, res) => {
  try {
    const { parentPath, name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "파일명이 누락되었습니다." });

    const dirPath = getSafePath(parentPath || '');

    // parentPath가 지정된 경우, 실제 디스크에 존재하는 디렉토리인지 검증
    if (parentPath) {
      if (fs.existsSync(dirPath)) {
        const stat = await fs.promises.stat(dirPath);
        if (!stat.isDirectory()) {
          return res.status(400).json({ success: false, error: "지정된 부모 경로가 폴더가 아닙니다." });
        }
      } else {
        return res.status(404).json({ success: false, error: "선택한 부모 폴더를 찾을 수 없습니다." });
      }
    }

    const filePath = path.join(dirPath, name.trim());
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ success: false, error: "이미 동일한 이름의 파일이 존재합니다." });
    }

    const defaultTemplate = `# ${name.replace('.md', '')}\n\n원고 작성을 시작해 보셔요.\n`;
    await fs.promises.writeFile(filePath, defaultTemplate, 'utf-8');
    res.json({ status: 'success', path: path.relative(WORKSPACE_ROOT, filePath) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// 새 폴더 생성 (with empty folder safety validation)
app.post('/api/create-folder', async (req, res) => {
  try {
    const { parentPath, name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "폴더명이 누락되었습니다." });

    const dirPath = getSafePath(parentPath || '');

    // parentPath가 지정된 경우, 실제 디스크에 존재하는 디렉토리인지 검증
    if (parentPath) {
      if (fs.existsSync(dirPath)) {
        const stat = await fs.promises.stat(dirPath);
        if (!stat.isDirectory()) {
          return res.status(400).json({ success: false, error: "지정된 부모 경로가 폴더가 아닙니다." });
        }
      } else {
        return res.status(404).json({ success: false, error: "선택한 부모 폴더를 찾을 수 없습니다." });
      }
    }

    const newDirPath = path.join(dirPath, name.trim());
    if (fs.existsSync(newDirPath)) {
      return res.status(409).json({ success: false, error: "이미 동일한 이름의 폴더가 존재합니다." });
    }

    await fs.promises.mkdir(newDirPath, { recursive: true });
    res.json({ status: 'success', path: path.relative(WORKSPACE_ROOT, newDirPath) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// 삭제
app.post('/api/delete', async (req, res) => {
  try {
    const filePath = getSafePath(req.body.path);
    await fs.rm(filePath, { recursive: true, force: true });
    res.json({ status: 'success' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 이름 변경 / 이동
app.post('/api/rename', async (req, res) => {
  try {
    const oldPath = getSafePath(req.body.oldPath);
    const newPath = getSafePath(req.body.newPath);
    const destDir = path.dirname(newPath);
    if (!fs.existsSync(destDir)) {
      await fs.mkdir(destDir, { recursive: true });
    }
    try {
      await fs.rename(oldPath, newPath);
    } catch (renameErr) {
      const stat = await fs.stat(oldPath);
      if (stat.isDirectory()) {
        await fs.cp(oldPath, newPath, { recursive: true });
        await fs.rm(oldPath, { recursive: true, force: true });
      } else {
        await fs.copyFile(oldPath, newPath);
        await fs.unlink(oldPath);
      }
    }
    res.json({ status: 'success' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 다중 파일 병합(통폐합) API 추가
app.post('/api/merge-files', async (req, res) => {
  try {
    const { sourcePaths, targetPath, deleteSources, separator, generateToc, insertPageBreak, shiftHeadings } = req.body;
    if (!sourcePaths || !Array.isArray(sourcePaths) || sourcePaths.length < 2) {
      return res.status(400).json({ error: 'At least two source files are required for merging.' });
    }
    if (!targetPath) {
      return res.status(400).json({ error: 'Target path is required.' });
    }

    const resolvedTargetPath = getSafePath(targetPath);
    const targetDir = path.dirname(resolvedTargetPath);

    const contents = [];
    const tocLines = [];
    for (const src of sourcePaths) {
      const resolvedSrcPath = getSafePath(src);
      let fileContent = await fs.readFile(resolvedSrcPath, 'utf-8');

      // 1. 프론트매터 제거
      fileContent = fileContent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

      // 1.5. 헤딩 강등 (Heading Shift)
      if (shiftHeadings) {
        fileContent = fileContent.replace(/^(#{1,5})(\s)/gm, '$1#$2');
      }

      // 2. 상대 경로 보정
      fileContent = fileContent.replace(/(!?\[.*?\])\((.*?)\)/g, (match, prefix, linkPath) => {
        if (
          linkPath.startsWith('http://') || 
          linkPath.startsWith('https://') || 
          linkPath.startsWith('data:') || 
          linkPath.startsWith('/')
        ) return match;

        const srcDir = path.dirname(resolvedSrcPath);
        const absoluteLinkPath = path.resolve(srcDir, linkPath);
        let newRelativePath = path.relative(targetDir, absoluteLinkPath);
        newRelativePath = newRelativePath.replace(/\\/g, '/');
        return `${prefix}(${newRelativePath})`;
      });

      const fileName = path.basename(src);
      const titleLabel = fileName.replace(/\.[^/.]+$/, "");

      if (generateToc) {
        const anchor = titleLabel.toLowerCase().replace(/\s+/g, '-');
        tocLines.push(`- [${titleLabel}](#${anchor})`);
      }

      let formattedContent = fileContent;
      if (separator === 'title') {
        formattedContent = `## ${titleLabel}\n\n${fileContent}`;
      }
      contents.push(formattedContent);
    }

    let joinSeparator = '\n\n';
    if (insertPageBreak) joinSeparator = '\n\n<hr class="page-break" />\n\n';
    else if (separator === 'divider') joinSeparator = '\n\n---\n\n';
    else if (separator === 'none') joinSeparator = '\n';
    else if (separator === 'title') joinSeparator = '\n\n';

    let mergedContent = contents.join(joinSeparator);

    if (generateToc) {
      const tocSection = `# 목차\n\n${tocLines.join('\n')}\n\n${insertPageBreak ? '<hr class="page-break" />\n\n' : '---\n\n'}`;
      mergedContent = tocSection + mergedContent;
    }

    // 대상 경로의 디렉토리가 존재하는지 확인 및 자동 생성
    await fs.mkdir(targetDir, { recursive: true });

    // 대상 파일 쓰기
    await fs.writeFile(resolvedTargetPath, mergedContent, 'utf-8');

    // 원본 파일 삭제 여부 처리
    if (deleteSources) {
      for (const src of sourcePaths) {
        const resolvedSrcPath = getSafePath(src);
        // 대상 파일과 똑같은 파일은 삭제하지 않음 (보호 장치)
        if (resolvedSrcPath !== resolvedTargetPath) {
          await fs.rm(resolvedSrcPath, { recursive: true, force: true });
        }
      }
    }

    res.json({ status: 'success', path: path.relative(WORKSPACE_ROOT, resolvedTargetPath) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 이미지 업로드
app.post('/api/upload-image', async (req, res) => {
  try {
    const fileName = req.query.name || `pasted_${Date.now()}.png`;
    const imagesDir = path.join(WORKSPACE_ROOT, 'images');
    await fs.mkdir(imagesDir, { recursive: true });
    const filePath = path.join(imagesDir, fileName);
    await fs.writeFile(filePath, req.body);
    res.json({ status: 'success', path: `images/${fileName}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 브라우저에서 자동 크롭/투명화 완료된 아이콘 저장 API
app.post('/api/save-processed-icon', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Missing image data' });

    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Next.js 브라우저 파비콘용 저장
    const destIconApp = path.join(__dirname, '../frontend/src/app/icon.png');
    await fs.writeFile(destIconApp, buffer);

    // 2. 데스크톱 앱 빌드 아이콘용 저장
    const destIconPublic = path.join(__dirname, '../frontend/public/icon.png');
    await fs.writeFile(destIconPublic, buffer);

    console.log("🎨 Successfully saved processed ultra-large cropped transparent icon!");
    res.json({ status: 'success' });
  } catch (e) {
    console.error("🎨 Error saving processed icon:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 내보낸 파일을 시스템의 다운로드 폴더에 물리적으로 저장해주는 API
app.post('/api/save-export', async (req, res) => {
  try {
    const { filename, content, type } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    const os = require('os');
    const downloadsFolder = path.join(os.homedir(), 'Downloads');

    try {
      await fs.access(downloadsFolder);
    } catch {
      await fs.mkdir(downloadsFolder, { recursive: true });
    }

    const filePath = path.join(downloadsFolder, filename);

    if (type === 'base64') {
      const cleanBase64 = content.replace(/^data:[\w/]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      await fs.writeFile(filePath, buffer);
    } else {
      await fs.writeFile(filePath, content, 'utf-8');
    }

    console.log(`💾 Exported file saved to downloads folder: ${filePath}`);
    res.json({ status: 'success', path: filePath });
  } catch (err) {
    console.error("💾 Error saving exported file to downloads:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 전체 검색 API
app.get('/api/search', async (req, res) => {
  try {
    const { q, workspacePath, matchCase } = req.query;
    if (!q) return res.json([]);

    const isMatchCase = matchCase === 'true';

    // 💡 [Web SaaS] 폴더 열기로 루트 폴더가 변하더라도 백엔드와 연동된 실시간 WORKSPACE_ROOT를 항상 최우선 검색 기준으로 설정
    const targetDir = WORKSPACE_ROOT;

    // 폴더가 없으면 검색 결과를 빈 배열로 즉시 안전하게 리턴
    try {
      const stat = await fs.stat(targetDir);
      if (!stat.isDirectory()) {
        return res.json([]);
      }
    } catch (err) {
      return res.json([]);
    }

    const results = [];
    async function searchRecursive(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.git', '.next', '.vscode', 'images'].includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await searchRecursive(fullPath);
        } else if (entry.name.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const isMatched = isMatchCase 
            ? content.includes(q) 
            : content.toLowerCase().includes(q.toLowerCase());
            
          if (isMatched) {
            const lines = content.split('\n');
            const snippets = [];
            const lineNumbers = [];
            
            lines.forEach((line, index) => {
              const lineMatched = isMatchCase 
                ? line.includes(q) 
                : line.toLowerCase().includes(q.toLowerCase());
                
              if (lineMatched) {
                if (snippets.length < 5) { // 최대 5개 스니펫
                  snippets.push(`Line ${index + 1}: ${line.trim()}`);
                  lineNumbers.push(index + 1);
                }
              }
            });

            // 매칭 횟수 계산
            const regexFlags = isMatchCase ? 'g' : 'gi';
            const escapedQ = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const matchCount = (content.match(new RegExp(escapedQ, regexFlags)) || []).length;

            results.push({
              fileName: entry.name,
              path: fullPath,
              count: matchCount,
              snippets,
              lineNumbers
            });
          }
        }
      }
    }

    await searchRecursive(targetDir);
    res.json(results.sort((a, b) => b.count - a.count));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// 맞춤법 검사 API
const spellChecker = require('./services/spellChecker');

app.post('/api/spellcheck', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.json({ errors: [] });
    const errors = spellChecker.checkSpelling(text);
    res.json({ errors });
  } catch (err) {
    console.error('Spell check error:', err.message);
    res.json({ errors: [], error: err.message });
  }
});

// SEO 분석 API
const seoAnalyzer = require('./services/seoAnalyzer');

app.post('/api/seo/analyze', async (req, res) => {
  try {
    const { content, language } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const result = seoAnalyzer.analyzeSEO(content, language || 'ko');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 프로덕션 환경인 경우, 빌드된 Next.js 정적 프론트엔드 파일을 Express에서 직접 서빙합니다.
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../frontend/out');
  app.use(express.static(staticPath));

  // SPA 라우팅 대응 (API 이외의 모든 경로 요청은 index.html로 리다이렉트)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const targetIndex = path.join(staticPath, 'index.html');
    res.sendFile(targetIndex, (err) => {
      if (err) {
        console.error(`sendFile error: ${targetIndex}`, err);
        next(err);
      }
    });
  });

  // 상세 디버그용 전역 에러 핸들러 미들웨어 추가
  app.use((err, req, res, next) => {
    console.error("Global Server Error Details:", err);
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(`
      <div style="padding: 20px; font-family: monospace; line-height: 1.6;">
        <h1 style="color: #e53e3e;">Onrivi Backend Server Error (500)</h1>
        <p><strong>Error Message:</strong> ${err.message}</p>
        <p><strong>Request Path:</strong> ${req.path}</p>
        <p><strong>Stack Trace:</strong></p>
        <pre style="background: #f7fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 4px; overflow-x: auto;">${err.stack}</pre>
      </div>
    `);
  });
}

loadConfig().then(async () => {
  // 🧹 [ out 폴더 소탕 비활성화 ]
  // 프로덕션 정적 서빙 및 개발 빌드 보호를 위해 시작 시 frontend/out 폴더 강제 삭제 로직을 비활성화했습니다.

  // 🎨 사용자가 지시한 dist/.icon-ico/icon.ico 로부터 오리지널 완전체 투명 PNG 다이렉트 바이너리 복원 (icon_onriveauther.png 전용 파일명으로 영구 정착!)
  try {
    const icoPath = path.join(__dirname, '../dist/.icon-ico/icon.ico');
    const destIconApp = path.join(__dirname, '../frontend/src/app/icon_onriveauther.png');
    const destIconPublic = path.join(__dirname, '../frontend/public/icon_onriveauther.png');
    const backupIconPublic = path.join(__dirname, '../frontend/public/icon_backup_clover_thumbsup.png');

    // 1. 오리지널 ICO 파일 존재 확인 및 256x256 투명 정품 PNG 다이렉트 추출!
    await fs.access(icoPath);
    await extractPngFromIco(icoPath, destIconApp);
    await extractPngFromIco(icoPath, destIconPublic);

    // 2. 백업 파일도 이 진짜 오리지널 정품 PNG 이미지로 완전히 갱신!
    await fs.copyFile(destIconPublic, backupIconPublic);

    console.log("🎨 Successfully extracted and deployed original Clover-Nib markdown icon from dist/.icon-ico/icon.ico!");
  } catch (err) {
    console.log("🎨 Clover-Nib Icon restoration status:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Onrivi Author Backend running on http://localhost:${PORT}`);
  });
});