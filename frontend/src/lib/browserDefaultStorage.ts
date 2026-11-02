import { idb } from './indexedDbHelper';
import { getResourceSettings, saveResourceSettings } from './resourceSettings';
import { SYSTEM_PROFILES } from '@/constants/cssProfile';
import { browserAccountStorage as localStorage, getBrowserAccountScope } from './browserAccountStorage';

let initializing: Promise<void> | undefined;

async function accountDirectory() {
  const root = await navigator.storage.getDirectory();
  const app = await root.getDirectoryHandle('OnriviAuthor', { create: true });
  const account = getBrowserAccountScope();
  if (!account) return app; // Legacy data stays untouched outside account folders.
  const accounts = await app.getDirectoryHandle('accounts', { create: true });
  return accounts.getDirectoryHandle(account, { create: true });
}

/** Reset only the selected workspace; documents and resource destinations survive. */
export async function resetBrowserWorkspace() {
  if ((window as any).electronAPI) throw new Error('웹 브라우저에서 사용하는 기능입니다.');
  if (!navigator.storage?.getDirectory) throw new Error('브라우저 내부 저장소를 사용할 수 없습니다.');
  const app = await accountDirectory();
  const handle = await app.getDirectoryHandle('작업장', { create: true });
  // Replace the persisted handle as well as string settings; either can restore
  // a previously selected PC directory after a reload.
  await idb.set('rootFolderHandle', handle);
  for (const key of ['onrivi_workspace_path', 'onrivi_last_local_workspace_path',
    'onrivi_last_local_root_folder', 'onrivi_last_local_workspace_type']) localStorage.removeItem(key);
  const folder = { name: handle.name, displayName: '브라우저 작업장', storage: 'opfs', handle };
  localStorage.setItem('rootFolder', JSON.stringify({ name: folder.name, displayName: folder.displayName, storage: folder.storage }));
  localStorage.setItem('workspaceType', 'browser');
  localStorage.setItem('onrivi_last_workspace_mode', 'browser');
  return folder;
}

/** Set up real browser-private files only when no destination has been selected. */
export function initializeBrowserDefaultStorage(): Promise<void> {
  if (initializing) return initializing;
  initializing = initialize().finally(() => { initializing = undefined; });
  return initializing;
}

async function initialize() {
  if (typeof window === 'undefined' || (window as any).electronAPI || !navigator.storage?.getDirectory) return;
  const mode = localStorage.getItem('workspaceType');
  const lastMode = localStorage.getItem('onrivi_last_workspace_mode');
  if (['cloud', 'gdrive'].includes(mode || '') || ['cloud', 'gdrive'].includes(lastMode || '')) return;
  const savedRoot = localStorage.getItem('rootFolder');
  const savedHandle = await idb.get('rootFolderHandle');
  const needsWorkspace = !savedRoot && !savedHandle && !localStorage.getItem('onrivi_workspace_path');
  const savedResourceHandle = await idb.get('localResourceFolderHandle') || await idb.get('resourceFolderHandle');
  const existingResources = getResourceSettings('local');
  // Older installations persist `local: null` even before any folder was chosen.
  // Restore a retained folder handle, or provision OPFS when no destination exists.
  if (!existingResources && savedResourceHandle) {
    (window as any).__resourceFolderHandle = savedResourceHandle;
    saveResourceSettings({ kind: 'browser', path: savedResourceHandle.name }, 'local');
  }
  const needsResources = !savedResourceHandle && !existingResources;
  if (!needsWorkspace && !needsResources) return;
  const app = await accountDirectory();
  if (needsResources) {
    const resources = await app.getDirectoryHandle('참조파일', { create: true });
    for (const name of ['media', 'profiles', 'prompt', 'bible', 'db']) await resources.getDirectoryHandle(name, { create: true });
    const defaults: Record<string, string> = {
      'profiles/userCssProfiles.json': JSON.stringify(SYSTEM_PROFILES, null, 2),
      'prompt/ai_prompts.json': '{}', 'prompt/ai_presets.json': '[]',
      'prompt/promptTemplates.json': '[]', 'bible/references.bib': '',
    };
    for (const [relative, content] of Object.entries(defaults)) {
      const [directory, name] = relative.split('/');
      const parent = await resources.getDirectoryHandle(directory);
      try { await parent.getFileHandle(name); }
      catch (error: any) {
        if (error.name !== 'NotFoundError') throw error;
        const file = await parent.getFileHandle(name, { create: true });
        const writer = await file.createWritable();
        try { await writer.write(content); await writer.close(); }
        catch (error) { await writer.abort(); throw error; }
      }
    }
    await idb.set('resourceFolderHandle', resources);
    await idb.set('localResourceFolderHandle', resources);
    (window as any).__resourceFolderHandle = resources;
    saveResourceSettings({ kind: 'browser', path: resources.name }, 'local');
    localStorage.setItem('onrivi_default_resource_storage', 'opfs');
  }
  if (needsWorkspace) {
    const workspace = await app.getDirectoryHandle('작업장', { create: true });
    await idb.set('rootFolderHandle', workspace);
    localStorage.setItem('rootFolder', JSON.stringify({ name: workspace.name, displayName: '브라우저 작업장', storage: 'opfs' }));
    localStorage.setItem('workspaceType', 'browser');
    localStorage.setItem('onrivi_last_workspace_mode', 'browser');
  }
}
