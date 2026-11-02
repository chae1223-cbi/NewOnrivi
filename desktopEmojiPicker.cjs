const { execFile } = require('node:child_process');

// Hidden helper keeps the editor in the foreground while sending Windows+period.
function showWindowsEmojiPicker(run = execFile) {
  const script = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class OnriviEmoji {
  [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
  public static void Open() {
    try { keybd_event(0x5B,0,0,UIntPtr.Zero); keybd_event(0xBE,0,0,UIntPtr.Zero); }
    finally { keybd_event(0xBE,0,2,UIntPtr.Zero); keybd_event(0x5B,0,2,UIntPtr.Zero); }
  }
}
'@
[OnriviEmoji]::Open()
`;
  return new Promise(resolve => run('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64'),
  ], { windowsHide: true, timeout: 10000 }, error => resolve(!error)));
}

module.exports = { showWindowsEmojiPicker };
