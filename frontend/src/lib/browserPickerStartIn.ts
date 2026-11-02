/** Native OS pickers cannot start inside the browser-private filesystem. */
export async function browserPickerStartIn(handle: any): Promise<any> {
  if (!handle || !navigator.storage?.getDirectory) return handle;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.resolve(handle) !== null ? undefined : handle;
  } catch { return handle; }
}
