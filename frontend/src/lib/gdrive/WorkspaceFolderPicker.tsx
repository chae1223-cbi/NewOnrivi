// ====================================================================
// 📊 [OMD-GDRIVE-WorkspaceFolderPicker-0001] WorkspaceFolderPicker.tsx
// 🎯 @KICK  : 구글 드라이브 폴더 탐색 및 선택 모달
// 🚨 @PATCH : **2026-10-15** — [웹드라이브 다중 계정 격리 저장 및 작업장 세션 보존 완성]:
//             1) 다중 구글 드라이브 계정 선택 드롭다운 및 '새 계정 로그인' 기능 연동 (isStandalone: true)
//             2) 웹드라이브(계정 A) 작업 중 다른 웹드라이브(계정 B)로 '다른 이름으로 저장' 시 활성 작업장 세션·토큰 무결성 100% 보장 (작업장 강제 종료·단절 원천 방지)
//             3) 파일 목록 배제 및 오직 폴더만 표시 유지, 저장 대상 사용자 이메일(userEmail) 메타데이터 전달 연동
// ====================================================================
'use client';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  listDriveChildren,
  createDriveFolder,
  fetchGoogleUserInfo,
  listSharedDrives,
  requestGoogleDriveAuth,
  ensureDriveFolder,
  GoogleDriveFileItem,
  getSavedDriveAccounts,
  saveDriveAccount,
  DriveAccountEntry
} from './googleDriveClient';

export type Folder = {
  id: string;
  name: string;
  path?: Array<{ id: string; name: string }>;
  fileName?: string;
  token?: string;
  userEmail?: string;
  mimeType?: string;
};

export interface FolderPickerOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  initialFileName?: string;
  showFileNameInput?: boolean;
  selectFile?: boolean;
  acceptFile?: (file: GoogleDriveFileItem) => boolean;
}

interface FolderPickerProps {
  token: string;
  initialPath: Folder[];
  done: (folder: Folder | null) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  initialFileName?: string;
  showFileNameInput?: boolean;
  selectFile?: boolean;
  acceptFile?: (file: GoogleDriveFileItem) => boolean;
}

function FolderPicker({
  token,
  initialPath,
  done,
  title,
  description,
  confirmText,
  initialFileName,
  showFileNameInput,
  selectFile,
  acceptFile
}: FolderPickerProps) {
  const [currentToken, setCurrentToken] = useState(token);
  const [userEmail, setUserEmail] = useState('');
  const [accounts, setAccounts] = useState<DriveAccountEntry[]>([]);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [drives, setDrives] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: '📁 내 드라이브 (기본)' }
  ]);
  const [selectedDriveId, setSelectedDriveId] = useState('root');

  const [path, setPath] = useState<Folder[]>(initialPath);
  const [folders, setFolders] = useState<GoogleDriveFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saveFileName, setSaveFileName] = useState(initialFileName || '새 문서.md');
  const current = path[path.length - 1];

  // 1. 다중 계정 목록 로드
  useEffect(() => {
    const list = getSavedDriveAccounts();
    setAccounts(list);
  }, []);

  // 2. 현재 계정 정보 및 공유 드라이브(Shared Drives) 목록 로드
  useEffect(() => {
    let active = true;
    fetchGoogleUserInfo(currentToken)
      .then(info => {
        if (active && info.email) {
          setUserEmail(info.email);
          saveDriveAccount({
            email: info.email,
            name: info.name || info.email.split('@')[0],
            token: currentToken,
            expiresAt: getSavedDriveAccounts().find(a => a.token === currentToken)?.expiresAt || Date.now()
          });
          setAccounts(getSavedDriveAccounts());
        }
      })
      .catch(() => {});

    listSharedDrives(currentToken)
      .then(shared => {
        if (active) {
          const driveList = [{ id: 'root', name: '📁 내 드라이브 (My Drive)' }];
          if (shared && shared.length > 0) {
            shared.forEach(d => driveList.push({ id: d.id, name: `👥 공유 드라이브: ${d.name}` }));
          }
          setDrives(driveList);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [currentToken]);

  // 3. 현재 선택된 폴더의 자식 폴더 로드 (파일은 제외하고 오직 폴더만 필터링)
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setFolders([]);
    listDriveChildren(currentToken, current.id)
      .then(items => {
        if (active) {
          setFolders(items.filter(item => item.isFolder || (selectFile && (!acceptFile || acceptFile(item)))));
        }
      })
      .catch(e => {
        if (active) setError(e.message || '폴더를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentToken, current.id, selectFile, acceptFile]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') done(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [done]);

  // 4. 드라이브 전환 (내 드라이브 ↔ 공유 드라이브)
  const handleDriveChange = (newDriveId: string) => {
    setSelectedDriveId(newDriveId);
    const driveObj = drives.find(d => d.id === newDriveId);
    const driveName = newDriveId === 'root' ? '내 드라이브' : (driveObj?.name.replace(/^👥 공유 드라이브:\s*/, '') || '공유 드라이브');
    setPath([{ id: newDriveId, name: driveName }]);
  };

  // 5. 구글 계정 전환 (저장된 다중 계정 중 선택)
  const handleAccountChange = async (targetEmail: string) => {
    if (targetEmail === '__ADD_NEW__') {
      handleAddNewAccount();
      return;
    }
    const target = accounts.find(a => a.email.toLowerCase() === targetEmail.toLowerCase());
    if (!target) return;
    try {
      setIsSwitchingAccount(true);
      setError('');
      if (target.expiresAt <= Date.now() + 30000) {
        await handleAddNewAccount();
        return;
      }
      setPath([{ id: 'root', name: '내 드라이브' }]);
      setDrives([{ id: 'root', name: '📁 내 드라이브 (My Drive)' }]);
      setCurrentToken(target.token);
      setUserEmail(target.email);
      setSelectedDriveId('root');
      try {
        const rootId = await ensureDriveFolder(target.token, 'OnriviAuthor', 'root');
        setPath([{ id: 'root', name: '내 드라이브' }, { id: rootId, name: 'OnriviAuthor' }]);
      } catch {
        setPath([{ id: 'root', name: '내 드라이브' }]);
      }
    } catch (e: any) {
      setError(e.message || '계정 전환에 실패했습니다.');
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  // 6. 새로운 구글 계정 로그인 / 추가 (작업장 세션 훼손 방지를 위해 isStandalone: true 사용)
  const handleAddNewAccount = async () => {
    try {
      setIsSwitchingAccount(true);
      setError('');
      const newToken = await requestGoogleDriveAuth(undefined, undefined, { isStandalone: true });
      if (newToken) {
        const info = await fetchGoogleUserInfo(newToken);
        if (info?.email) {
          setUserEmail(info.email);
          saveDriveAccount({
            email: info.email,
            name: info.name || info.email.split('@')[0],
            token: newToken,
            expiresAt: getSavedDriveAccounts().find(a => a.token === newToken)?.expiresAt || Date.now() + 3600000,
          });
          setAccounts(getSavedDriveAccounts());
        }
        setPath([{ id: 'root', name: '내 드라이브' }]);
        setDrives([{ id: 'root', name: '📁 내 드라이브 (My Drive)' }]);
        setCurrentToken(newToken);
        setSelectedDriveId('root');
        try {
          const rootId = await ensureDriveFolder(newToken, 'OnriviAuthor', 'root');
          setPath([{ id: 'root', name: '내 드라이브' }, { id: rootId, name: 'OnriviAuthor' }]);
        } catch {
          setPath([{ id: 'root', name: '내 드라이브' }]);
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || '계정 추가/로그인에 실패했습니다.');
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  const handleConfirm = () => {
    const finalFileName = showFileNameInput ? saveFileName.trim() : undefined;
    done({
      ...current,
      path,
      fileName: finalFileName,
      token: currentToken,
      userEmail,
    });
  };

  return (
    <div className="fixed inset-0 z-[1000000] bg-black/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drive-workspace-title"
        className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-zinc-800"
      >
        <div className="space-y-1">
          <h2 id="drive-workspace-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {title || '구글 드라이브 작업장 선택'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            {description || '저장할 웹드라이브 위치를 선택하고 ‘이 폴더에 저장’을 눌러 주세요.'}
          </p>
        </div>

        {/* 👤 다중 계정 및 다중 드라이브 선택 상단 바 */}
        <div className="bg-slate-50 dark:bg-zinc-800/80 p-3 rounded-lg border border-slate-200 dark:border-zinc-700/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0">👤</span>
              <div className="flex-1 min-w-0">
                <label htmlFor="drive-account-selector" className="sr-only">
                  구글 드라이브 계정 선택
                </label>
                <select
                  id="drive-account-selector"
                  value={userEmail || ''}
                  onChange={e => handleAccountChange(e.target.value)}
                  disabled={isSwitchingAccount}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-600 truncate"
                >
                  {userEmail && !accounts.some(a => a.email.toLowerCase() === userEmail.toLowerCase()) && (
                    <option value={userEmail}>
                      {userEmail} (현재 연결됨)
                    </option>
                  )}
                  {accounts.map(acc => (
                    <option key={acc.email} value={acc.email}>
                      {acc.email} {acc.isWorkspaceAccount ? '⭐ (현재 작업장)' : ''}
                    </option>
                  ))}
                  <option value="__ADD_NEW__" className="text-blue-600 font-bold">
                    ➕ 다른 웹드라이브 계정 로그인/추가...
                  </option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isSwitchingAccount}
              onClick={handleAddNewAccount}
              className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold flex items-center justify-center gap-1 shrink-0 text-xs disabled:opacity-50 transition-colors"
            >
              <span>{isSwitchingAccount ? '⏳ 연결 중...' : '➕ 계정 추가'}</span>
            </button>
          </div>

          {/* 공유 드라이브가 있을 때 드라이브 위치 선택 드롭다운 */}
          {drives.length > 1 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-zinc-700/60">
              <label htmlFor="drive-selector" className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 shrink-0">
                드라이브 위치:
              </label>
              <select
                id="drive-selector"
                value={selectedDriveId}
                onChange={e => handleDriveChange(e.target.value)}
                className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {drives.map(drive => (
                  <option key={drive.id} value={drive.id}>
                    {drive.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 현재 경로 브레드크럼 */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700/60">
          <span className="text-slate-400">위치:</span>
          {path.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1">
              <button
                type="button"
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                onClick={() => setPath(path.slice(0, index + 1))}
              >
                {folder.name}
              </button>
              {index < path.length - 1 && <span className="text-slate-400">/</span>}
            </div>
          ))}
        </div>

        {/* 폴더 목록 (파일은 일체 표시하지 않고 오직 폴더만 표시) */}
        <div className="h-56 overflow-y-auto border border-slate-200 dark:border-zinc-700/80 rounded-lg p-2 divide-y divide-slate-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
          {loading ? (
            <p className="p-3 text-xs text-slate-500 text-center py-8">폴더를 불러오는 중...</p>
          ) : error ? (
            <p role="alert" className="text-red-600 dark:text-red-400 p-3 text-xs">{error}</p>
          ) : folders.length === 0 ? (
            <p className="p-3 text-xs text-slate-500 text-center py-8">{selectFile ? '이 폴더에 지원되는 문서가 없습니다.' : '하위 폴더가 없습니다. (현재 선택된 폴더에 저장할 수 있습니다)'}</p>
          ) : (
            folders.map(folder => (
              <button
                key={folder.id}
                type="button"
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 text-xs font-semibold text-slate-800 dark:text-zinc-200 transition-colors"
                disabled={isSwitchingAccount}
                onClick={() => folder.isFolder ? setPath([...path, { id: folder.id, name: folder.name }]) : done({ id: folder.id, name: folder.name, mimeType: folder.mimeType, path, token: currentToken, userEmail })}
              >
                <span className="text-base leading-none">{folder.isFolder ? '📁' : '📄'}</span>
                <span className="truncate flex-1">{folder.name}</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">{folder.isFolder ? '폴더 열기 ▶' : '가져오기'}</span>
              </button>
            ))
          )}
        </div>

        {/* 새 폴더 생성 폼 */}
        <form
          className="flex gap-2"
          onSubmit={async event => {
            event.preventDefault();
            if (!name.trim() || creating) return;
            setCreating(true);
            setError('');
            try {
              const id = await createDriveFolder(currentToken, name.trim(), current.id);
              setPath([...path, { id, name: name.trim() }]);
              setName('');
            } catch (e) {
              setError(e instanceof Error ? e.message : '폴더를 만들지 못했습니다.');
            } finally {
              setCreating(false);
            }
          }}
        >
          <input
            aria-label="새 폴더 이름"
            placeholder="현재 폴더 내 새 폴더 만들기"
            className="min-w-0 flex-1 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            value={name}
            maxLength={100}
            onChange={event => setName(event.target.value)}
          />
          <button
            type="submit"
            disabled={loading || creating || !name.trim()}
            className="border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40 transition-colors"
          >
            폴더 추가
          </button>
        </form>

        {/* 저장할 파일명 입력 필드 */}
        {showFileNameInput && (
          <div className="space-y-1.5 pt-2.5 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label htmlFor="drive-save-filename" className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
                저장할 파일 이름
              </label>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                저장 대상 폴더: <span className="font-semibold text-blue-600 dark:text-blue-400">{current.name}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="drive-save-filename"
                type="text"
                value={saveFileName}
                onChange={event => setSaveFileName(event.target.value)}
                placeholder="문서 이름 입력 (예: 새 문서.md)"
                className="flex-1 min-w-0 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* 하단 확인/취소 버튼 */}
        <div className="flex justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={creating}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 transition-colors"
            onClick={() => done(null)}
          >
            취소
          </button>
          {!selectFile && <button
            type="button"
            disabled={isSwitchingAccount || loading || creating || Boolean(error) || (showFileNameInput && !saveFileName.trim())}
            className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm disabled:opacity-40 transition-colors"
            onClick={handleConfirm}
          >
            {confirmText || '이 폴더에 저장'}
          </button>}
        </div>
      </div>
    </div>
  );
}

export function pickAccessibleDriveFolder(
  token: string,
  initialPath: Folder[],
  options?: FolderPickerOptions
): Promise<Folder | null> {
  return new Promise(resolve => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const previousFocus = document.activeElement as HTMLElement | null;
    let settled = false;
    const done = (folder: Folder | null) => {
      if (settled) return;
      settled = true;
      root.unmount();
      container.remove();
      previousFocus?.focus();
      resolve(folder);
    };
    root.render(
      <FolderPicker
        token={token}
        initialPath={initialPath}
        done={done}
        title={options?.title}
        description={options?.description}
        confirmText={options?.confirmText}
        initialFileName={options?.initialFileName}
        showFileNameInput={options?.showFileNameInput}
        selectFile={options?.selectFile}
        acceptFile={options?.acceptFile}
      />
    );
  });
}
