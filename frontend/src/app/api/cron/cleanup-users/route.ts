import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sql } from '@/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function GET(req: Request) {
  try {
    // Basic authorization check for cron requests
    // Vercel Cron sends a Bearer token in the Authorization header
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase Admin is not configured.' }, { status: 500 });
    }

    // 1. Find users who have been soft-deleted for more than 30 days
    const targetUsers = await sql`
      SELECT id FROM users 
      WHERE is_deleted = true 
      AND deleted_at < NOW() - INTERVAL '30 days'
    `;

    if (targetUsers.length === 0) {
      return NextResponse.json({ success: true, message: 'No users to cleanup.', count: 0 });
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // 2. Delete each user from Auth completely and from DB
    for (const user of targetUsers) {
      try {
        const userId = user.id;

        // Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw new Error(`Auth delete error: ${authError.message}`);

        // Delete from public.users
        // Depending on DB configuration, cascading deletes might already take care of other tables
        // like subscriptions, license_activations etc. But we explicitly delete from users table.
        await sql`DELETE FROM users WHERE id = ${userId}`;

        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push({ id: user.id, message: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup completed.', 
      count: targetUsers.length,
      successCount,
      failCount,
      errors
    });

  } catch (error: any) {
    console.error('[/api/cron/cleanup-users] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
