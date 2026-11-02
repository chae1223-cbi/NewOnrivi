// ====================================================================
// 📊 [OMD-IO-EDITORSESSION-0001] editorSession.ts
// 🎯 @KICK  : 탭 세션 정보 캡처, 복원 및 플레이스홀더 경고 격리
// 🚨 @PATCH : **2026-10-19** — 작업장 외부 문서 안내 등 시스템 경고 텍스트가 draft로 저장되어 재실행 시 오염 및 저장 요구(orange dot) 유발하는 문제 차단
// ====================================================================

export interface SessionTab {
  id: string;
  name: string;
  path: string | null;
  driveFileId?: string;
  draft?: string;
  scrollTop?: number;
  previewMode?: string;
}

export function isPlaceholderWarning(content?: string | null): boolean {
  if (!content || typeof content !== 'string') return false;
  return content.includes('작업장 외부 문서 안내') || content.includes('작업장 외부 문서');
}

export function sessionDriveId(tab: any): string | undefined {
  return tab.driveFileId || tab.driveId || tab.node?.driveFileId || tab.node?.driveId;
}

export function captureEditorSession(tabs: any[], activeTabId: string | null, activeContent?: string, previewMode?:string) {
  return { version: 2, activeTabId, previewMode, tabs: tabs.filter(t=>!t.isStyleTab).map(t=>{
    const effectiveContent = t.id===activeTabId && activeContent!==undefined ? activeContent : t.content;
    const isWarning = isPlaceholderWarning(effectiveContent);
    // Unsaved work belongs to the session, never write it back to a file on restore.
    // System placeholder warnings must NEVER be persisted as user drafts.
    const draft = !isWarning && (t.isModified || (!t.path && !sessionDriveId(t))) ? effectiveContent : undefined;
    return {
      id:t.id,name:t.name,path:t.path || null,driveFileId:sessionDriveId(t),
      draft,
      scrollTop:t.scrollTop,previewMode:t.previewMode
    };
  }) };
}

export function matchesSessionTab(tab: any, saved: SessionTab): boolean {
  const driveId=sessionDriveId(tab);
  if(driveId || saved.driveFileId)return Boolean(driveId && driveId===saved.driveFileId);
  if(tab.path && saved.path)return tab.path.replace(/\\/g,'/').normalize('NFC')===saved.path.replace(/\\/g,'/').normalize('NFC');
  return tab.id===saved.id;
}

export function readEditorSession(raw: string | null): {tabs:SessionTab[];activeTabId:string|null;previewMode?:string}|null {
  try {
    const value=JSON.parse(raw || 'null');
    if(!Array.isArray(value?.tabs))return null;
    return {tabs:value.tabs.filter((t:any)=>t && typeof t.id==='string' && typeof t.name==='string').map((t:any)=>{
      const rawDraft = typeof t.draft==='string' ? t.draft : undefined;
      return {
        ...t,path:typeof t.path==='string'?t.path:null,
        driveFileId:typeof t.driveFileId==='string'?t.driveFileId:undefined,
        draft:rawDraft !== undefined && !isPlaceholderWarning(rawDraft) ? rawDraft : undefined
      };
    }),activeTabId:typeof value.activeTabId==='string'?value.activeTabId:null,
      previewMode:['edit','both','preview'].includes(value.previewMode)?value.previewMode:undefined};
  }catch{return null;}
}
