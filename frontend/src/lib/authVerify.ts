import { supabaseAdmin } from './supabaseAdmin';

export async function verifyUser(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return { user: null, error: 'Unauthorized (No token)' };

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return { user: null, error: 'Unauthorized (Invalid token)' };
    }

    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message };
  }
}
