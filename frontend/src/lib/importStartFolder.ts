/** Keep the source chooser anchored to the folder where File Open was invoked. */
export function importStartFolder(root: any, target: any, parentHandle: any, files: any[], savedDrivePath?: Array<{ id: string; name: string }>) {
  const isDrive = root?.type === 'GDRIVE';
  const nativePath = !isDrive ? target?.path || root?.path || root?.name : undefined;
  const absolute = (value: string) => /^(?:[a-z]:[\\/]|[\\/]{2}|\/)/i.test(value);
  const localPath = nativePath && absolute(nativePath) ? nativePath :
    nativePath && root?.path && absolute(root.path) ? `${root.path.replace(/[\\/]+$/, '')}/${nativePath}` : undefined;
  const localHandle = !isDrive ? target?.handle || (target ? parentHandle : root?.handle) : undefined;
  const idOf = (node: any) => node?.driveId || node?.driveFileId || node?.id || node?.driveFolderId;
  const rootId = idOf(root);
  const drivePath = isDrive && rootId ?
    savedDrivePath?.at(-1)?.id === rootId ? [...(savedDrivePath || [])] : [{ id: rootId, name: root.displayName || root.name || '작업장' }] :
    savedDrivePath?.length ? [...savedDrivePath] : [{ id: 'root', name: '내 드라이브' }];
  if (isDrive && target && idOf(target) && idOf(target) !== rootId) {
    const find = (nodes: any[], chain: any[] = []): any[] | null => {
      for (const node of nodes || []) {
        if (node.kind !== 'directory') continue;
        const next = [...chain, node];
        if (idOf(node) === idOf(target)) return next;
        const nested = find(node.children, next);
        if (nested) return nested;
      }
      return null;
    };
    for (const node of find(files) || [target]) {
      if (!drivePath.some(entry => entry.id === idOf(node))) drivePath.push({ id: idOf(node), name: node.name });
    }
  }
  return { localPath, localHandle, drivePath };
}
