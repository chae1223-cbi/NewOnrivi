// The authenticated account is fixed for the lifetime of an editor page.
// Auth changes reload the editor, so pending writes keep their original scope.
let account: string | null = null;
export function activateBrowserAccount(userId: string | null) {
  if (typeof window !== 'undefined' && (window as any).electronAPI) return;
  const next = userId || 'guest';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(next)) throw new Error('계정 저장소 식별자가 올바르지 않습니다.');
  if (account && account !== next) throw new Error('계정 변경 후 편집기를 다시 열어 주세요.');
  account = next;
}
export const getBrowserAccountScope = () => account;
export const browserAccountDatabaseName = () => account ? `onrivi-author-db:account:${account}` : 'onrivi-author-db';

const exactKeys = new Set(['rootFolder', 'workspaceType', 'resourceFolder', 'activeCssProfileId', 'onrivi_settings', 'onrivi_last_local_root_folder','onrivi_default_watermark_settings','onrivi_ai_connections','onrivi_ai_selected']);
export function isAccountStorageKey(key: string) {
  return key.startsWith('vfs:') || exactKeys.has(key) || /^onrivi_(?:.*workspace|.*resource|gdrive_|active_drive_account|drive_account_settings|saved_drive_accounts|emergency_gdrive_drafts|cached_drive_profiles|tabs_|content$|vfs_|.*draft|.*backup|recent_|web_base_path)/.test(key);
}
function keyFor(key: string) {
  return account && isAccountStorageKey(key) ? `onrivi:account:${account}:${key}` : key;
}
// Explicit adapters rather than patching the browser's global Storage APIs.
export const browserAccountStorage = {
  keys: () => {
    if (typeof window === 'undefined') return [];
    const keys = Object.keys(globalThis.localStorage);
    if (!account) return keys;
    const prefix = `onrivi:account:${account}:`;
    return keys.flatMap(key => key.startsWith(prefix) ? [key.slice(prefix.length)] :
      !key.startsWith('onrivi:account:') && !isAccountStorageKey(key) ? [key] : []);
  },
  getItem: (key: string) => typeof window === 'undefined' ? null : globalThis.localStorage.getItem(keyFor(key)),
  setItem: (key: string, value: string) => { if (typeof window !== 'undefined') globalThis.localStorage.setItem(keyFor(key), value); },
  removeItem: (key: string) => { if (typeof window !== 'undefined') globalThis.localStorage.removeItem(keyFor(key)); },
};
export const browserAccountSessionStorage = {
  getItem: (key: string) => typeof window === 'undefined' ? null : globalThis.sessionStorage.getItem(keyFor(key)),
  setItem: (key: string, value: string) => { if (typeof window !== 'undefined') globalThis.sessionStorage.setItem(keyFor(key), value); },
  removeItem: (key: string) => { if (typeof window !== 'undefined') globalThis.sessionStorage.removeItem(keyFor(key)); },
};
