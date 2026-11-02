// ====================================================================
// 📊 [OMD-MODAL-ReferenceManagerModal-0001] ReferenceManagerModal.tsx
// 🎯 @KICK  : 참고문헌(.bib) 파일 관리 모달
// 🛡️ @GUARD : Rule 1(단일 주석 관리)
// 🚨 @PATCH : **2026-10-18** — [useCallback 의존성 배열 보강]: loadBibFiles의 의존성 배열에 누락된 showToast 등록 및 불필요한 의존성(isDrive, resourceFolder) 제거로 ESLint exhaustive-deps 경고 해결
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더 기반 드라이브 bible 폴더 안전 조회 및 저장]:
//             1) getSavedWorkspaceInfo뿐만 아니라 getResourceSettings('cloud')의 bibleFolderId를 우선 적용하여 사용자가 선택한 리소스 폴더의 참조문서를 정확히 로드
//             2) folderId로부터 bible 하위 폴더 동적 탐색 폴백 구축으로 참조문서 로드 실패 결함 원천 해결
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import {parseBibliography,citedKeys} from '@/lib/bibliography';
import {loadBibliographyFiles} from '@/lib/bibliographyStorage';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, FileText, Database, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { loadSecureData } from '@/lib/secureStorage';
import { pickResourceTextFile } from '@/lib/gdrive/ResourceFilePicker';
import { getSavedDriveToken, getSavedWorkspaceInfo, listDriveChildren, readDriveFileContent, ensureDriveTextFile, saveDriveFileContent } from '@/lib/gdrive/googleDriveClient';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { vfsWriteFile } from '@/lib/virtualFileSystem';

interface ReferenceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  resourceFolderHandle?: any;
  workspaceType?: string;
  rootFolder?: any;
  resourceFolder?: string | null;
  currentDocument?: string;
}

interface BibFile {
  name: string;
  path?: string;
  handle?: any;
  content: string;
  driveId?: string;
}

// ====================================================================
// 📊 [OMD-EDIT-ReferenceManagerModal-0001] ReferenceManagerModal
// 🎯 @KICK  : 외부 참조 파일(BibTeX, CSL-JSON 등) 추가 및 리소스 폴더 저장 모달 (CRUD 지원)
// 🛡️ @GUARD : isOpen/mounted false 시 null 반환, resourceFolder 부재 시 가드
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-02** — [ONRIVI-DS-SYSTEM-002 v5.0] LINE Design System (LDSG) 표준 적용 (bg-sidebar-luxury 사이드바 및 LINE Green #1d4ed8 액션 버튼)
//             **2026-08-05** — 2-Pane 레이아웃 개편: 기존 리소스 폴더 내 .bib 파일 목록 조회, 수정, 삭제 기능 추가
// 🔗 @CALLS : showToast, saveFile, window.dispatchEvent, electronAPI.deleteFile
// ====================================================================
export default function ReferenceManagerModal({
  isOpen,
  onClose,
  isDarkMode,
  resourceFolderHandle,
  workspaceType,
  rootFolder,
  resourceFolder,
  currentDocument='',
}: ReferenceManagerModalProps) {
  useModalEscape(isOpen, onClose);
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [bibFiles, setBibFiles] = useState<BibFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<BibFile | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [fileName, setFileName] = useState("references.bib");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [entryForm,setEntryForm]=useState({key:'',author:'',year:'',title:'',publisher:'',url:'',doi:''});
  const addFormEntry=()=>{
    if(!new RegExp('^[\\p{L}\\p{N}_:\\-.+]+$','u').test(entryForm.key)||!entryForm.title.trim()){showToast('인용키와 제목을 입력해 주세요. 인용키에는 공백을 사용할 수 없습니다.','warning');return;}
    const escape=(value:string)=>value.replace(/\\/g,'\\textbackslash{}').replace(/[{}]/g,m=>'\\'+m).replace(/[\r\n]+/g,' ');
    const fields=Object.entries(entryForm).filter(([k,v])=>k!=='key'&&v.trim()).map(([k,v])=>`  ${k} = {${escape(v.trim())}}`).join(',\n');
    setContent(previous=>previous.trimEnd()+`\n\n@misc{${entryForm.key},\n${fields}\n}\n`);
    setEntryForm({key:'',author:'',year:'',title:'',publisher:'',url:'',doi:''});
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDrive = getResourceSettings()?.kind === 'drive';
  const importReference = async () => {
    try {
      requireResourceSettings();
      const settings = getResourceSettings('cloud');
      const bibleFolderId = settings?.bibleFolderId || getSavedWorkspaceInfo()?.bibleFolderId;
      const f = await pickResourceTextFile('.bib', bibleFolderId, isDrive);
      if (f) {
        setSelectedFile(null);
        setIsCreatingNew(true);
        setFileName(f.name);
        setContent(f.content);
      }
    } catch(e: any) {
      showToast(e.message, 'error');
    }
  };
  const loadBibFiles=useCallback(async()=>{
    try{setBibFiles(await loadBibliographyFiles(resourceFolderHandle));}
    catch(e:any){setBibFiles([]);showToast(e.message,'error');}
  },[resourceFolderHandle,showToast]);

  const handleCreateNew = useCallback(() => {
    setSelectedFile(null);
    setIsCreatingNew(true);
    setFileName("references.bib");
    setContent("");
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadBibFiles().then(() => {
        handleCreateNew();
      });
    }
  }, [isOpen, loadBibFiles, handleCreateNew]);

  const handleInsertSample = () => {
    const sampleBibTeX = `% 샘플을 참조하고 샘플을 지워주세요

@article{kim2026ai,
  title = {인공지능의 미래와 윤리적 고찰},
  author = {김철수 and 이영희},
  journal = {한국인공지능학회 논문지},
  year = {2026}
}

@book{steve2011jobs,
  title = {스티브 잡스 (Steve Jobs)},
  author = {Walter Isaacson},
  year = {2011},
  publisher = {Simon & Schuster}
}

@misc{onrivi2026docs,
  title = {온리비 마크다운 에디터 공식 문서},
  author = {Onrivi Team},
  year = {2026},
  url = {https://onrivi.com/docs}
}

% --- 샘플 끝 ---`;
    setContent(prev => prev ? prev + '\n\n' + sampleBibTeX : sampleBibTeX);
    showToast("샘플 데이터가 삽입되었습니다.", "success");
  };

  const handleSelectFile = (file: BibFile) => {
    setSelectedFile(file);
    setIsCreatingNew(false);
    setFileName(file.name);
    setContent(file.content);
  };

  const handleDelete = async (file: BibFile) => {
    const used=new Set(citedKeys(currentDocument).map(k=>k.toLowerCase()));
    const inUse=parseBibliography(file.content).entries.filter(e=>used.has(e.key.toLowerCase())).map(e=>e.key);
    if (!confirm((inUse.length?'현재 문서에서 사용 중인 인용: '+inUse.join(', ')+'\n삭제하면 인용을 찾을 수 없게 됩니다.\n':'')+`'${file.name}' 파일을 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      const api = (window as any).electronAPI;
      if (file.driveId) {
        const token=getSavedDriveToken(); if (!token) throw new Error('구글 드라이브를 다시 연결해 주세요.');
        const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveId)}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
        if (!response.ok) throw new Error(`드라이브 파일 삭제 실패 (${response.status})`);
      } else if (api && file.path) {
        await api.deleteFile(file.path);
      } else if (resourceFolderHandle && file.handle) {
        const bibleHandle = await resourceFolderHandle.getDirectoryHandle('bible');
        await bibleHandle.removeEntry(file.name);
      } else if (rootFolder?.handle && file.handle) {
        const bibleHandle = await rootFolder.handle.getDirectoryHandle('bible');
        await bibleHandle.removeEntry(file.name);
      }
      showToast(`'${file.name}' 삭제 완료`, "success");
      
      if (selectedFile?.name === file.name) {
        handleCreateNew();
      }
      await loadBibFiles();
      window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        window.dispatchEvent(new CustomEvent('onrivi:bibliography-updated'));
    } catch (e: any) {
      showToast(`삭제 중 오류 발생: ${e.message}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    try {requireResourceSettings();}catch(e:any){onClose();showToast(e.message,'warning');return;}
    if (!fileName.trim()) {
      showToast("파일명을 입력해주세요.", "warning");
      return;
    }
    if (!content.trim()) {
      showToast("참조 데이터(BibTeX 등)를 입력해주세요.", "warning");
      return;
    }

    // 파일 확장자 검사 (기본 .bib)
    let finalFileName = fileName.trim();
    if (!finalFileName.includes('.')) {
      finalFileName += '.bib';
    }

    const parsed=parseBibliography(content);
    const otherKeys=new Set(bibFiles.filter(f=>f.name!==selectedFile?.name && f.name!==finalFileName).flatMap(f=>parseBibliography(f.content).entries.map(e=>e.key.toLowerCase())));
    const duplicates=[...parsed.duplicates,...parsed.entries.filter(e=>otherKeys.has(e.key.toLowerCase())).map(e=>e.key)];
    if(parsed.error || duplicates.length || !parsed.entries.length){showToast(parsed.error || (duplicates.length?'중복 인용키: '+duplicates.join(', '):'문헌 항목을 입력해 주세요.'),'error');return;}
    if(!/^[^\\/]+\.bib$/i.test(finalFileName)){showToast('.bib 파일 이름을 확인해 주세요.','error');return;}
    if(selectedFile?.name!==finalFileName && bibFiles.some(f=>f.name===finalFileName) && !confirm(`'${finalFileName}' 파일이 있습니다. 기존 내용을 바꾸시겠습니까?`))return;
    setIsSaving(true);
    try {
      const api = (window as any).electronAPI;
      const freshResourceFolder = getEffectiveResourceFolder(resourceFolder);

      let saved = false;
      let savedDriveId:string|undefined;
      let savedHandle:any;

      if (isDrive) {
        const token = getSavedDriveToken();
        const settings = getResourceSettings('cloud');
        let folder = settings?.bibleFolderId || getSavedWorkspaceInfo()?.bibleFolderId;
        if (!folder && (settings?.folderId || getSavedWorkspaceInfo()?.resourceFolderId)) {
          try {
            const parentId = settings?.folderId || getSavedWorkspaceInfo()?.resourceFolderId;
            const children = await listDriveChildren(token!, parentId);
            const bibleDir = children.find(c => c.isFolder && c.name === 'bible');
            if (bibleDir) folder = bibleDir.id;
          } catch {}
        }
        if (!token || !folder) throw new Error('드라이브 참고문헌 폴더 연결이 필요합니다.');
        const id=selectedFile?.driveId && selectedFile.name===finalFileName ? selectedFile.driveId : await ensureDriveTextFile(token!,finalFileName,folder,content);
        saved=await saveDriveFileContent(token!,id,content); savedDriveId=id;
      } else if (api) {
        // 🖥️ 데스크탑: 로컬 저장
        if (!freshResourceFolder) {
          showToast("먼저 리소스 폴더를 설정해주세요.", "warning");
          setIsSaving(false);
          return;
        }
        
        try {
          await api.createFolder(freshResourceFolder, 'bible');
        } catch(e) {}

        const targetPath = `${freshResourceFolder}\\bible\\${finalFileName}`;
        const success = await api.saveFile(targetPath, content);
        if (success) {
          saved = true;
        }
      } else {
        // 웹 브라우저 환경
        if (workspaceType === 'browser' || workspaceType === 'local') {
          if (resourceFolderHandle) {
            // FileSystem Access API
            const bibleHandle = await resourceFolderHandle.getDirectoryHandle('bible', { create: true });
            const fileHandle = await bibleHandle.getFileHandle(finalFileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            savedHandle=fileHandle;
            saved = true;
          } else { requireResourceSettings(); throw new Error('리소스 폴더 접근 권한을 다시 설정해 주세요.'); }
        } else { throw new Error('리소스 폴더 연결을 확인해 주세요.'); }
      }

      if (saved) {
        showToast(`'${finalFileName}' 저장 완료`, "success");
        // 파일 트리 리프레시 및 리스트 리로드
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        window.dispatchEvent(new CustomEvent('onrivi:bibliography-updated'));
        await loadBibFiles();
        
        // Find and select the newly saved/updated file
        const apiForPath = (window as any).electronAPI;
        const freshResFolderForPath = getEffectiveResourceFolder(resourceFolder);
        setIsCreatingNew(false);
        setFileName(finalFileName);
        
        // update selectedFile visually manually to prevent race
        setSelectedFile({
          name: finalFileName,
          content: content,
          driveId:savedDriveId,handle:savedHandle,
          path: getResourceSettings()?.kind === 'local' && apiForPath ? `${freshResFolderForPath}\\bible\\${finalFileName}` : undefined
        });

      } else {
        showToast("파일 저장에 실패했습니다.", "error");
      }
    } catch (e: any) {
      showToast(`저장 중 오류 발생: ${e.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div 
        className="relative flex w-[90%] max-w-5xl h-[80vh] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl overflow-hidden border border-[#EFEFEF] dark:border-white/10"
        style={{ fontFamily: "Pretendard, sans-serif" }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {/* Left Pane (File List - bg-sidebar-luxury) */}
        <div className="w-1/3 border-r border-[#EFEFEF] dark:border-white/10 flex flex-col bg-sidebar-luxury text-on-surface">
          <div className="p-4 border-b border-[#EFEFEF] dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-on-surface">
              <Database className="w-5 h-5 text-[#1d4ed8]" />
              <h2 className="text-base font-bold">참조 파일 관리</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <button
              onClick={handleCreateNew}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all w-full text-left text-sm font-bold ${
                isCreatingNew 
                ? 'bg-[#1d4ed8]/15 text-[#1d4ed8] border border-[#1d4ed8] shadow-xs' 
                : 'bg-white/80 dark:bg-[#252525] text-[#616161] dark:text-[#A0A0A0] border border-[#EFEFEF] dark:border-zinc-700 hover:border-[#1d4ed8] hover:text-[#1d4ed8]'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>새 파일 만들기</span>
            </button>
              <button onClick={importReference} className="w-full rounded border p-2 mt-2">파일 가져오기 (OS / 드라이브)</button>

            <div className="my-2 border-t border-[#EFEFEF] dark:border-white/10" />
            
            {bibFiles.map((file, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectFile(file)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border text-sm ${
                  selectedFile?.name === file.name && !isCreatingNew
                  ? 'bg-[#1d4ed8]/15 text-[#1d4ed8] border-[#1d4ed8] font-bold shadow-xs' 
                  : 'bg-white/80 dark:bg-[#252525] text-slate-700 dark:text-zinc-300 border-[#EFEFEF] dark:border-zinc-700 hover:border-[#1d4ed8] hover:text-[#1d4ed8]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 opacity-70 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file);
                  }}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {bibFiles.length === 0 && (
              <p className="text-xs text-center text-[#949494] mt-4">
                저장된 참조 파일이 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* Right Pane (Editor) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E]">
          <div className="flex items-center justify-end px-4 py-4 border-b border-[#EFEFEF] dark:border-white/10">
            <button 
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col flex-1 p-6 gap-6 overflow-y-auto">
            {/* Filename Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#1F1F1F] dark:text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1d4ed8]" />
                파일명 지정
              </label>
              <input
                aria-label="참고문헌 파일명"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="예: references.bib"
                disabled={!isCreatingNew}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all text-[#1F1F1F] dark:text-zinc-100 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 ${
                  !isCreatingNew 
                  ? 'bg-zinc-100 dark:bg-[#151515] border-[#EFEFEF] dark:border-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-white dark:bg-[#252525] border-[#EFEFEF] dark:border-zinc-700 placeholder:text-zinc-400'
                }`}
              />
              {isCreatingNew && (
                <p className="text-xs text-[#949494] mt-1">
                  확장자를 생략하면 자동으로 <code>.bib</code>가 붙습니다.
                </p>
              )}
            </div>

            {/* Reference Data Input */}
            <div className="flex flex-col gap-2 flex-1 min-h-[250px]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-[#1F1F1F] dark:text-zinc-200">
                  참조 데이터 내용 (BibTeX)
                </label>
                <button
                  onClick={handleInsertSample}
                  className="text-xs px-2.5 py-1.5 bg-[#F7F8F9] dark:bg-[#2A2A2A] hover:bg-[#E8F9EE] hover:text-[#1d4ed8] hover:border-[#1d4ed8] text-[#616161] dark:text-zinc-300 rounded-lg transition-colors flex items-center gap-1.5 border border-[#EFEFEF] dark:border-zinc-700 font-medium"
                  title="자주 쓰이는 논문/단행본/웹사이트 양식을 삽입합니다"
                >
                  <FileText className="w-3.5 h-3.5" />
                  기본 샘플 삽입
                </button>
              </div>
              <textarea
                aria-label="BibTeX 원문"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="@article{key,\n  title={Example Title},\n  author={Doe, John},\n  year={2026}\n}"
                className="w-full flex-1 px-4 py-3 bg-[#F7F8F9] dark:bg-[#161616] border border-[#EFEFEF] dark:border-zinc-700 rounded-xl text-sm font-mono text-[#1F1F1F] dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20 resize-none"
              />
              <details className="text-sm border rounded-lg p-3">
                <summary className="cursor-pointer font-bold">입력 폼으로 문헌 추가</summary>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {Object.entries({key:'인용키 (예: kim2026)',title:'제목',author:'저자 (여러 명은 and로 구분)',year:'발행 연도',publisher:'출판사',url:'웹 주소',doi:'DOI'}).map(([field,label])=><label key={field}>{label}<input className="w-full border rounded p-2" value={entryForm[field as keyof typeof entryForm]} onChange={e=>setEntryForm(previous=>({...previous,[field]:e.target.value}))}/></label>)}
                </div>
                <button type="button" className="mt-2 border rounded p-2" onClick={addFormEntry}>문헌 추가</button>
                <p>추가 후 아래 저장 버튼을 눌러 주세요.</p>
              </details>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-[#EFEFEF] dark:border-white/10 bg-[#F7F8F9] dark:bg-[#161616] gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#616161] hover:text-[#1F1F1F] dark:text-[#A0A0A0] dark:hover:text-white rounded-xl transition-colors"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-[#1d4ed8]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
              ) : (
                <Save size={15} />
              )}
              {isCreatingNew ? '리소스 폴더에 저장' : '수정 사항 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
