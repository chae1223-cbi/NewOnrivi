/**
 * ------------------------------------------------------------------------------------------------
 * 🚨 [OMD-SYSTEM-EMOJI] OS 네이티브 이모지 패널 트리거 API 라우트
 * ------------------------------------------------------------------------------------------------
 * @FILE    : frontend/src/app/api/system/emoji/route.ts
 * @DATE    : 2026-10-19
 * @AUTHOR  : Onrivi Author Engine Team
 * @ROLE    : 웹 브라우저/로컬 환경에서 OS 네이티브 이모지 창(Windows: Win + ., macOS: Cmd+Ctrl+Space) 트리거
 * @PATCH   : 2026-10-19 : [OS 이모지 패널 호출 라우트 신설] 브라우저 환경에서도 OS 네이티브 이모지 창을 즉시 호출하도록 지원
 * ------------------------------------------------------------------------------------------------
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    if (isWin) {
      // Windows 10/11: Win + . (VK_LWIN + VK_OEM_PERIOD) 가상 키 이벤트 전송
      const { exec } = await import('node:child_process');
      const psScript = `
$source = @"
using System;
using System.Runtime.InteropServices;
public class WinEmojiHelper {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Show() {
        keybd_event(0x5B, 0, 0, UIntPtr.Zero);
        keybd_event(0xBE, 0, 0, UIntPtr.Zero);
        keybd_event(0xBE, 0, 2, UIntPtr.Zero);
        keybd_event(0x5B, 0, 2, UIntPtr.Zero);
    }
}
"@
Add-Type -TypeDefinition $source
[WinEmojiHelper]::Show()
`;
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
      exec(`powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${encoded}`, (err) => {
        if (err) {
          console.error('[API system/emoji] Windows 이모지 패널 호출 실패:', err);
        }
      });
      return NextResponse.json({ success: true, platform: 'win32' });
    } else if (isMac) {
      // macOS: Cmd + Ctrl + Space 단축키 전송
      const { exec } = await import('node:child_process');
      exec(`osascript -e 'tell application "System Events" to key code 49 using {control down, command down}'`, (err) => {
        if (err) {
          console.error('[API system/emoji] macOS 이모지 패널 호출 실패:', err);
        }
      });
      return NextResponse.json({ success: true, platform: 'darwin' });
    }

    return NextResponse.json({ success: false, message: '지원하지 않는 운영체제입니다.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API system/emoji] 에러 발생:', error);
    return NextResponse.json({ success: false, error: error?.message || '알 수 없는 오류' }, { status: 500 });
  }
}
