// @ts-nocheck
// Local counterpart of the Pages Function. Use the same validation, redaction
// and rate limit; never send development diagnostics to the production bucket.
import { onRequestPost } from '../../../../../functions/api/client-log.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  const directory = path.resolve(process.cwd(), '.tmp/client-logs');
  return onRequestPost({ request, env: { R2_BUCKET: {
    async put(key: string, value: string) {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const filename = path.basename(key).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      await fs.writeFile(path.join(directory, filename), value, { mode: 0o600 });
    }
  } } });
}
