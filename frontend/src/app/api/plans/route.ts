/** 🚨 @PATCH : 2026-11-02 — 공개 요금제·표시 코드 조회를 PostgreSQL로 통일한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { DB_CODES } from '@/constants/dbCodes';
import { SYSTEM_MESSAGES } from '@/constants/messages';

// ✅ 항상 최신 DB 데이터를 조회하도록 Next.js API 캐싱을 강제 비활성화
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 활성 요금제 조회 (정렬 순서대로)
    const plans = await sql`SELECT * FROM public.pricing_plans WHERE is_active = true ORDER BY sort_order ASC`;

    // 2. 공통코드에서 표시명 가져오기
    const codes = await sql`SELECT group_code, code_value, code_name FROM public.common_codes`;

    // 3. 데이터 병합 (name과 environment 한글명 매핑)
    const enrichedPlans = (plans || []).map((plan: any) => {
      const planCodeInfo = codes.find((c: any) => c.group_code === DB_CODES.CODE_GROUP.PLAN_NAME && c.code_value === plan.plan_code);
      const sysTypeInfo = codes.find((c: any) => c.group_code === DB_CODES.CODE_GROUP.SYS_TYPE && c.code_value === plan.sys_type);

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

    return NextResponse.json(enrichedPlans);
  } catch (error: any) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
