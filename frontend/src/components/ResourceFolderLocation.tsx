"use client";
import React, { useEffect, useState } from 'react';
import { getResourceSettings, ResourceSettings } from '@/lib/resourceSettings';
import { getSavedDriveToken } from '@/lib/gdrive/googleDriveClient';
import { resolveDriveFolderLocation } from '@/lib/driveFolderLocation';
import { idb } from '@/lib/indexedDbHelper';

export function ResourceFolderLocation({ environment, folder }: { environment: 'local'|'cloud'; folder: string|null }) {
  const [settings, setSettings] = useState<ResourceSettings|null>(null);
  const [path, setPath] = useState('');
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  const [isPrivateStorage, setIsPrivateStorage] = useState<boolean|null>(null);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('onrivi:resource_folder_changed', refresh);
    window.addEventListener('onrivi:drive_token_updated', refresh);
    return () => {
      window.removeEventListener('onrivi:resource_folder_changed', refresh);
      window.removeEventListener('onrivi:drive_token_updated', refresh);
    };
  }, []);
  useEffect(() => {
    const current = getResourceSettings(environment);
    setSettings(current); setPath(''); setStatus('');
    setIsPrivateStorage(null);
    if (current?.kind === 'browser') {
      let cancelled = false;
      void (async () => {
        try {
          const handle = await idb.get('localResourceFolderHandle') || await idb.get('resourceFolderHandle');
          const root = await navigator.storage?.getDirectory?.();
          const relative = handle?.name === current.path && root ? await root.resolve(handle) : null;
          if (!cancelled) { setIsPrivateStorage(relative !== null); if (relative) setPath(relative.join('/')); }
        } catch { if (!cancelled) setIsPrivateStorage(false); }
      })();
      return () => { cancelled = true; };
    }
    if (current?.kind !== 'drive') return;
    const controller = new AbortController();
    const token = getSavedDriveToken();
    if (!current.folderId) { setStatus('폴더 ID가 없습니다. 폴더를 다시 선택해 주세요.'); return; }
    if (!token) { setStatus('Drive 재연결 후 상위 폴더 경로를 확인할 수 있습니다.'); return; }
    setStatus('전체 경로 확인 중…');
    resolveDriveFolderLocation(token, current.folderId, controller.signal).then(value => {
      if (!controller.signal.aborted) { setPath(value); setStatus(''); }
    }).catch(error => {
      if (!controller.signal.aborted) setStatus(error.message);
    });
    return () => controller.abort();
  }, [environment, folder, revision]);
  const url = settings?.kind === 'drive' && settings.folderId
    ? `https://drive.google.com/drive/folders/${encodeURIComponent(settings.folderId)}` : '';
  return <div className="min-w-0 rounded-lg border border-outline-variant/30 bg-slate-50 dark:bg-zinc-900 p-3 text-[13px] space-y-2" aria-live="polite">
    <div className="font-semibold">저장소: {settings?.kind === 'drive' ? 'Google Drive' : settings?.kind === 'browser' ? (isPrivateStorage === null ? '브라우저 폴더 확인 중…' : isPrivateStorage ? '브라우저 내부 저장소 (OPFS)' : '내 PC · 직접 연결한 폴더') : settings ? '내 PC · 로컬 폴더' : '미지정'}</div>
    {settings && <div className="break-all whitespace-normal"><span className="font-semibold">{settings.kind === 'drive' ? '선택한 폴더' : '폴더 위치'}: </span>{path || settings.path}</div>}
    {settings?.kind === 'browser' && isPrivateStorage === true && <>
      <div className="text-on-surface-variant">처음 사용 시 자동으로 준비한 기본 저장소입니다. 파일 탐색기에는 일반 폴더로 표시되지 않습니다.</div>
      <div className="text-on-surface-variant">이 브라우저·프로필에서 사용할 수 있습니다. 사이트 데이터를 삭제하면 파일도 삭제될 수 있으므로 중요한 문서는 PC나 구글 드라이브에 별도로 저장해 주세요.</div>
    </>}
    {settings?.kind === 'browser' && isPrivateStorage === false && <div className="text-on-surface-variant">브라우저는 PC의 전체 경로를 제공하지 않습니다. 위 이름은 사용자가 직접 연결한 폴더입니다.</div>}
    {settings?.kind === 'drive' && <>
      {status && <div className="text-on-surface-variant">{status}</div>}
      <div className="break-all font-mono text-xs">폴더 ID: {settings.folderId || '미확인'}</div>
      {url && <a className="block break-all text-blue-600 underline" href={url} target="_blank" rel="noopener noreferrer" onClick={event => {
        const api = (window as any).electronAPI;
        if (api?.openExternal) { event.preventDefault(); void api.openExternal(url); }
      }}>Google Drive에서 폴더 열기</a>}
    </>}
    {settings && <div className="break-all text-xs text-on-surface-variant">서식 파일: {settings.kind === 'drive' ? (path || settings.path) + ' / profiles / userCssProfiles.json' : (path || settings.path).replace(/[\\/]$/, '') + '/profiles/userCssProfiles.json'}</div>}
    {!settings && <div>현재 환경의 리소스 폴더를 선택해 주세요.</div>}
  </div>;
}
