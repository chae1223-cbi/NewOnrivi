// @ts-nocheck
import { sql } from '@/lib/db';
import { sessionUser } from '../../../../../../functions/api/license/_sessionAuth.js';
import { checkSession } from '../../../../../../functions/api/license/_session.js';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  try {
    const body = await request.json();
    const user = await sessionUser(request, process.env);
    if (request.headers.has('Authorization') && !user) return new Response(JSON.stringify({ success: false, code: 'UNAUTHORIZED' }), { status: 401, headers });
    const result = await checkSession(body, user, (text, values) => sql.unsafe(text, values));
    return new Response(JSON.stringify(result.data), { status: result.status, headers });
  } catch {
    return new Response(JSON.stringify({ success: false, code: 'SESSION_CHECK_FAILED' }), { status: 503, headers });
  }
}
