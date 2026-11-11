// ====================================================================
// 📊 [OMD-ELECTRON-WORD-DOC-0001] electron/wordDocConverter.cjs
// 🎯 @KICK  : 설치된 Microsoft Word로 DOC 바이트를 임시 DOCX로 변환
// 🛡️ @GUARD : 원본 파일을 열지 않고 임시 복사본을 읽기 전용으로 변환하며 매크로를 차단
// 🚨 @PATCH : 2026-11-11 — DOC의 표와 이미지 구조를 가져오기 위한 Word 변환기 추가
// ====================================================================
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

/**
 * ========================================================================================
 * [convertWordDocToDocx] DOC 바이트를 Word로 임시 DOCX로 변환합니다.
 * @param {Uint8Array} bytes - 원본 DOC 바이트
 * @returns {Promise<Uint8Array>} 변환된 DOCX 바이트
 * @throws Word 실행 또는 변환 실패 시 오류
 * ========================================================================================
 */
async function convertWordDocToDocx(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8 || bytes.length > 100 * 1024 * 1024 ||
      ![0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, index) => bytes[index] === value)) {
    throw new TypeError('Invalid DOC input');
  }
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'onrivi-doc-'));
  const source = path.join(folder, 'source.doc');
  const target = path.join(folder, 'converted.docx');
  try {
    await fs.writeFile(source, bytes);
    const source64 = Buffer.from(source, 'utf8').toString('base64');
    const target64 = Buffer.from(target, 'utf8').toString('base64');
    const script = `
$ErrorActionPreference = 'Stop'
$source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${source64}'))
$target = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${target64}'))
$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $word.AutomationSecurity = 3
  $document = $word.Documents.Open($source, $false, $true, $false)
  $document.SaveAs2($target, 16)
} finally {
  if ($document) { $document.Close(0) }
  if ($word) { $word.Quit() }
}
`;
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });
    return new Uint8Array(await fs.readFile(target));
  } finally {
    for (const file of [source, target]) {
      try {
        await fs.unlink(file);
      } catch (error) {
        if (error.code !== 'ENOENT') console.warn('[DOC conversion cleanup]', { code: error.code || error.name });
      }
    }
    try {
      await fs.rmdir(folder);
    } catch (error) {
      console.warn('[DOC conversion cleanup]', { code: error.code || error.name });
    }
  }
}

module.exports = { convertWordDocToDocx };
