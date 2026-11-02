// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 요금제·표시 코드 조회를 PostgreSQL로 통일하고 공통 오류 처리를 적용한다.
import { jsonResponse, handleOptions, adminServerError } from './admin/_shared.js';
import { withDbTransaction } from './_db.js';
import { DB_CODES } from './_db-codes.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet({ request, env }) {
  try {
    const { plans, codes } = await withDbTransaction(env, async db => {
      const plansResult = await db.query('SELECT * FROM public.pricing_plans WHERE is_active = true ORDER BY sort_order ASC');
      const codesResult = await db.query('SELECT group_code, code_value, code_name FROM public.common_codes');
      return { plans: plansResult.rows, codes: codesResult.rows };
    });
    const enrichedPlans = plans.map(plan => {
      const planCodeInfo = codes.find(c => c.group_code === DB_CODES.CODE_GROUP.PLAN_NAME && c.code_value === plan.plan_code);
      const sysTypeInfo = codes.find(c => c.group_code === DB_CODES.CODE_GROUP.SYS_TYPE && c.code_value === plan.sys_type);

      let parsedFeatures = plan.features;
      if (typeof parsedFeatures === 'string') {
        try {
          parsedFeatures = JSON.parse(parsedFeatures);
        } catch (e) {
          parsedFeatures = [];
        }
      }

      return {
        ...plan,
        features: parsedFeatures,
        name: planCodeInfo ? planCodeInfo.code_name : plan.plan_code,
        environment_name: sysTypeInfo ? sysTypeInfo.code_name : plan.sys_type
      };
    });

    return jsonResponse(enrichedPlans);
  } catch (error) {
    return adminServerError(request, error, 'functions/api/plans.js', 'list_plans');
  }
}
