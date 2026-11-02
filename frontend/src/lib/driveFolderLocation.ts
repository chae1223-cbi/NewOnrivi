/** Resolve display ancestry without changing the configured resource destination. */
export async function resolveDriveFolderLocation(token: string, folderId: string, signal?: AbortSignal): Promise<string> {
  const names: string[] = [];
  const visited = new Set<string>();
  let id: string | undefined = folderId;
  while (id) {
    if (visited.has(id) || visited.size >= 30) throw new Error('상위 폴더 경로를 확인하지 못했습니다.');
    visited.add(id);
    const response: Response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,parents,trashed&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    });
    if (!response.ok) throw new Error(`폴더 경로 조회 실패 (${response.status}). 폴더 ID로 위치를 확인해 주세요.`);
    const folder: {name?: string; parents?: string[]; trashed?: boolean} = await response.json();
    if (folder.trashed) throw new Error('선택한 폴더가 휴지통에 있습니다.');
    if (!folder.name) throw new Error('폴더 이름을 확인하지 못했습니다.');
    names.unshift(folder.name);
    id = folder.parents?.[0];
  }
  return names.join(' / ');
}
