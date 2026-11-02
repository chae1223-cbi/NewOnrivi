/** Undo must not overwrite an item created after the original action. */
export async function assertUndoNameAvailable(parent: any, name: string) {
  for (const method of ['getFileHandle', 'getDirectoryHandle']) {
    try {
      await parent[method](name);
    } catch (error: any) {
      if (error.name === 'NotFoundError') continue;
      if (error.name !== 'TypeMismatchError') throw error;
    }
    throw new Error(`'${name}' 항목이 이미 있습니다. 이름을 변경한 뒤 다시 되돌려 주세요.`);
  }
}
