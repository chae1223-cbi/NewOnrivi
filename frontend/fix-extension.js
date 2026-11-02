const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');

const log = (msg, type = 'info') => {
  const prefix = type === 'error' ? '[ERROR]' : type === 'warn' ? '[WARN]' : '[INFO]';
  console.log(`${prefix} ${msg}`);
};

function replaceInFiles(dir, seek, replace) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInFiles(filePath, seek, replace);
    } else if (stat.isFile() && (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.json'))) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(seek)) {
        content = content.split(seek).join(replace);
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

function copyMonacoEditor() {
  const monacoSrc = path.join(__dirname, 'node_modules', 'monaco-editor', 'min', 'vs');
  const monacoDest = path.join(outDir, 'monaco-editor', 'min', 'vs');

  if (!fs.existsSync(monacoSrc)) {
    log('Monaco sources not found', 'error');
    return;
  }

  fs.mkdirSync(path.join(outDir, 'monaco-editor', 'min'), { recursive: true });

  if (fs.existsSync(monacoDest)) {
    try {
      fs.rmSync(monacoDest, { recursive: true, force: true });
    } catch (e) {
      log('Failed to remove existing monaco-editor', 'warn');
    }
  }

  try {
    fs.cpSync(monacoSrc, monacoDest, { recursive: true });
    log('Monaco editor resources copied');
  } catch (err) {
    log('Failed to copy Monaco editor resources', 'error');
  }
}

function extractInlineScripts(dir) {
  if (!fs.existsSync(dir)) return;
  let totalExtracted = 0;
  let totalUpdated = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      extractInlineScripts(filePath);
    } else if (stat.isFile() && filePath.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let inlineScriptCount = 0;
      const baseName = path.basename(filePath, '.html');
      const dirPath = path.dirname(filePath);

      const scriptRegex = /<script(?![^>]*src\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
      const newContent = content.replace(scriptRegex, (match, scriptCode) => {
        if (!scriptCode.trim()) {
          return match;
        }
        inlineScriptCount++;
        const inlineJsName = `${baseName}-inline-${inlineScriptCount}.js`;
        const inlineJsPath = path.join(dirPath, inlineJsName);

        fs.writeFileSync(inlineJsPath, scriptCode, 'utf8');
        return `<script src="${inlineJsName}"></script>`;
      });

      if (inlineScriptCount > 0) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        totalExtracted += inlineScriptCount;
        totalUpdated++;
      }
    }
  }
  if (totalExtracted > 0) {
    log(`Inline scripts: ${totalExtracted} extracted from ${totalUpdated} files`);
  }
}

function renameDirectory(oldPath, newPath) {
  if (!fs.existsSync(oldPath)) {
    log('Source directory does not exist (already processed)', 'warn');
    return;
  }

  if (fs.existsSync(newPath)) {
    try {
      fs.rmSync(newPath, { recursive: true, force: true });
    } catch (e) {
      log('Failed to remove existing target directory', 'warn');
    }
  }

  let attempts = 5;
  while (attempts > 0) {
    try {
      fs.renameSync(oldPath, newPath);
      log('Directory renamed');
      return;
    } catch (err) {
      attempts--;
      if (attempts === 0) {
        log('Rename failed, trying copy-and-delete fallback', 'warn');
        try {
          fs.cpSync(oldPath, newPath, { recursive: true });
          log('Directory copied');
          try {
            fs.rmSync(oldPath, { recursive: true, force: true });
            log('Source directory cleaned up');
          } catch (rmErr) {
            log('Could not clean up source directory (file locked)', 'warn');
          }
        } catch (cpErr) {
          log('Failed to copy directory — Chrome may be locking files', 'error');
          throw cpErr;
        }
      } else {
        const waitTill = new Date(new Date().getTime() + 150);
        while (waitTill > new Date()) {}
      }
    }
  }
}

const oldPath = path.join(outDir, '_next');
const newPath = path.join(outDir, 'next');

renameDirectory(oldPath, newPath);

replaceInFiles(outDir, '/_next/', '/next/');
replaceInFiles(outDir, '_next/', 'next/');
log('Path references updated');

replaceInFiles(outDir, 'url(next/static/media/', 'url(../media/');
replaceInFiles(outDir, "url('next/static/media/", "url('../media/");
replaceInFiles(outDir, 'url("next/static/media/', 'url("../media/');
replaceInFiles(outDir, "url('/next/static/media/", "url('../media/");
replaceInFiles(outDir, 'url("/next/static/media/', 'url("../media/');
log('CSS font paths fixed');

copyMonacoEditor();

function copyKatexFonts() {
  const katexFontsSrc = path.join(__dirname, 'node_modules', 'katex', 'dist', 'fonts');
  const katexFontsDest = path.join(outDir, 'fonts');

  if (!fs.existsSync(katexFontsSrc)) {
    log('KaTeX fonts not found, skipping', 'warn');
    return;
  }

  fs.mkdirSync(katexFontsDest, { recursive: true });
  try {
    const files = fs.readdirSync(katexFontsSrc);
    for (const file of files) {
      const srcPath = path.join(katexFontsSrc, file);
      const destPath = path.join(katexFontsDest, file);
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    log(`KaTeX fonts: ${fs.readdirSync(katexFontsSrc).length} files copied`);
  } catch (err) {
    log('Failed to copy KaTeX fonts', 'error');
  }
}

copyKatexFonts();

// [ONR-BLD-001] docs 폴더 재귀적 복사 로직: 빌드 시 docs 폴더 하위 가이드 문서 및 CSS 명세서 등 모든 정적 파일을 out 디렉토리에 복사하여 확장프로그램 내 포함되도록 처리합니다.
function copyDocsHelp() {
  const docsSrc = path.join(__dirname, '..', 'docs');
  const docsDest = path.join(outDir, 'docs');

  if (!fs.existsSync(docsSrc)) {
    log('docs directory not found, skipping', 'warn');
    return;
  }

  try {
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    };
    copyRecursive(docsSrc, docsDest);
    log('Docs folder and CSS spec copied recursively');
  } catch (err) {
    log('Failed to copy docs directory', 'error');
  }
}

copyDocsHelp();

extractInlineScripts(outDir);
log('Extension build complete');
