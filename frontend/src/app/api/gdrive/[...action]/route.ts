// @ts-nocheck
// Development only: production uses Cloudflare Pages Functions.
import { handleDriveOAuth } from '../../../../../../functions/api/gdrive/_oauth.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const directory = path.resolve(process.cwd(), '.tmp/drive-oauth');
const file = (key: string) => path.join(directory, createHash('sha256').update(key).digest('hex'));
const storage = {
  async put(key: string, value: string) {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const destination = file(key), temporary = destination + '.pending';
    await fs.writeFile(temporary, value, { mode: 0o600 });
    await fs.rename(temporary, destination);
  },
  async get(key: string) {
    try { const text = await fs.readFile(file(key), 'utf8'); return { text: async () => text }; }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  },
  async delete(key: string) { await fs.rm(file(key), { force: true }); }
};
function handle(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response('Not found', { status: 404 });
  return handleDriveOAuth(request, {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_DRIVE_REDIRECT_URI: process.env.GOOGLE_DRIVE_REDIRECT_URI,
    R2_BUCKET: storage
  });
}
export const GET = handle;
export const POST = handle;
