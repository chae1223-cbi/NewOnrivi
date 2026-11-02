import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Keep the original file intact until the complete replacement is on disk.
export async function atomicReplace(file, bytes, beforeCommit) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let staged = false;
  try {
    let mode = 0o666;
    try {
      const original = await fs.stat(file);
      mode = original.mode;
    } catch {}
    const handle = await fs.open(temporary, 'wx', mode);
    staged = true;
    try { await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
    if (beforeCommit) await beforeCommit();
    await fs.rename(temporary, file);
    staged = false;
  } finally {
    if (staged) await fs.unlink(temporary).catch(() => {});
  }
}
