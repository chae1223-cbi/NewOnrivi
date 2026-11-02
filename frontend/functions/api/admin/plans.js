// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 관리자 요금제 조회·변경을 PostgreSQL로 통일하고 오류 추적을 적용한다.
import { jsonResponse, handleOptions, checkAdminAuth, adminServerError } from './_shared.js';
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';

const PLAN_FIELDS = ['plan_code', 'sys_type', 'tagline', 'badge', 'is_free', 'tier_emoji',
  'price_monthly', 'price_monthly_usd', 'price_yearly', 'price_yearly_usd', 'features',
  'cta', 'cta_variant', 'is_highlighted', 'sort_order', 'is_active'];
const supplied = (body, fields) => fields.filter(field => body[field] !== undefined);

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, authResult.status);
    }

    const { plans, codes } = await withDbTransaction(env, async db => {
      const plans = await db.query('SELECT * FROM public.pricing_plans ORDER BY sort_order ASC');
      const codes = await db.query('SELECT group_code, code_value, code_name FROM public.common_codes');
      return { plans: plans.rows, codes: codes.rows };
    });

    const enrichedPlans = (plans || []).map(plan => {
      const planCodeInfo = codes.find(c => c.group_code === DB_CODES.CODE_GROUP.PLAN_NAME && c.code_value === plan.plan_code);
      const sysTypeInfo = codes.find(c => c.group_code === DB_CODES.CODE_GROUP.SYS_TYPE && c.code_value === plan.sys_type);

      return {
        ...plan,
        name: planCodeInfo ? planCodeInfo.code_name : plan.plan_code,
        environment_name: sysTypeInfo ? sysTypeInfo.code_name : plan.sys_type
      };
    });

    return jsonResponse(enrichedPlans);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/plans.js', 'list_plans');
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error === 'Forbidden' ? 'SUPER 권한만 요금제를 추가할 수 있습니다.' : authResult.error }, authResult.status);
    }

    const body = await request.json();
    const { 
      plan_code, sys_type, tagline, badge, is_free, tier_emoji, 
      price_monthly, price_monthly_usd, price_yearly, price_yearly_usd, 
      features, cta, cta_variant, is_highlighted, sort_order, is_active 
    } = body;

    const payload = {
      plan_code, sys_type, tagline, badge, is_free, tier_emoji,
      price_monthly, price_monthly_usd, price_yearly, price_yearly_usd,
      features, cta, cta_variant, is_highlighted, sort_order, is_active,
      created_by: authResult.user.id,
      updated_by: authResult.user.id
    };

    const fields = supplied(payload, [...PLAN_FIELDS, 'created_by', 'updated_by']);
    const result = await withDbTransaction(env, db => db.query(
      `INSERT INTO public.pricing_plans (${fields.join(', ')}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      fields.map(field => field === 'features' ? JSON.stringify(payload[field]) : payload[field])
    ));
    return jsonResponse(result.rows[0] || null);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/plans.js', 'create_plan');
  }
}

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;
    
    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error === 'Forbidden' ? 'SUPER 권한만 요금제를 수정할 수 있습니다.' : authResult.error }, authResult.status);
    }

    const body = await request.json();
    const { 
      id, plan_code, sys_type, tagline, badge, is_free, tier_emoji, 
      price_monthly, price_monthly_usd, price_yearly, price_yearly_usd, 
      features, cta, cta_variant, is_highlighted, sort_order, is_active 
    } = body;

    if (!id) return jsonResponse({ error: 'ID is required' }, 400);

    const payload = {
      plan_code, sys_type, tagline, badge, is_free, tier_emoji,
      price_monthly, price_monthly_usd, price_yearly, price_yearly_usd,
      features, cta, cta_variant, is_highlighted, sort_order, is_active,
      updated_by: authResult.user.id,
      updated_at: new Date().toISOString()
    };

    const fields = supplied(payload, [...PLAN_FIELDS, 'updated_by', 'updated_at']);
    const result = await withDbTransaction(env, db => db.query(
      `UPDATE public.pricing_plans SET ${fields.map((field, i) => `${field} = $${i + 1}`).join(', ')} WHERE id = $${fields.length + 1} RETURNING *`,
      [...fields.map(field => field === 'features' ? JSON.stringify(payload[field]) : payload[field]), id]
    ));
    return jsonResponse(result.rows[0] || null);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/plans.js', 'update_plan');
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error === 'Forbidden' ? 'SUPER 권한만 요금제를 삭제할 수 있습니다.' : authResult.error }, authResult.status);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return jsonResponse({ error: 'ID is required' }, 400);

    await withDbTransaction(env, db => db.query('DELETE FROM public.pricing_plans WHERE id = $1', [id]));
    
    return jsonResponse({ success: true });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/plans.js', 'delete_plan');
  }
}
