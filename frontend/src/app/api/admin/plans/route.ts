/** 🚨 @PATCH : 2026-11-02 — 관리자 요금제 조회·변경을 PostgreSQL로 통일하고 중복 인증 조회를 제거한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { DB_CODES } from '@/constants/dbCodes';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  try {
    const verified = await verifyAdmin(request);
    if (!verified.user) return NextResponse.json({ error: verified.error }, { status: 403 });
    // 1. 모든 요금제 조회 (활성화/비활성화 모두)
    const plans = await sql`SELECT * FROM public.pricing_plans ORDER BY sort_order ASC`;

    // 2. 공통코드에서 표시명 가져오기
    const codes = await sql`SELECT group_code, code_value, code_name FROM public.common_codes`;

    // 3. 데이터 병합
    const enrichedPlans = (plans || []).map((plan: any) => {
      const planCodeInfo = codes.find((c: any) => c.group_code === DB_CODES.CODE_GROUP.PLAN_NAME && c.code_value === plan.plan_code);
      const sysTypeInfo = codes.find((c: any) => c.group_code === DB_CODES.CODE_GROUP.SYS_TYPE && c.code_value === plan.sys_type);

      return {
        ...plan,
        name: planCodeInfo ? planCodeInfo.code_name : plan.plan_code,
        environment_name: sysTypeInfo ? sysTypeInfo.code_name : plan.sys_type
      };
    });

    return NextResponse.json(enrichedPlans);
  } catch (error: any) {
    console.error('Admin plans GET error:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const verified = await verifyAdmin(request, true);
    if (!verified.user) return NextResponse.json({ error: verified.error }, { status: 403 });
    const user = verified.user;

    const body = await request.json();
    const { 
      plan_code, sys_type, tagline, badge, is_free, tier_emoji, 
      price_monthly, price_monthly_usd, price_yearly, price_yearly_usd, 
      features, cta, cta_variant, is_highlighted, sort_order, is_active 
    } = body;

    const payload = {
        plan_code, sys_type, tagline, badge, is_free, tier_emoji,
        price_monthly, price_monthly_usd, price_yearly, price_yearly_usd,
        features: features === undefined ? undefined : JSON.stringify(features), cta, cta_variant, is_highlighted, sort_order, is_active,
        created_by: user.id,
        updated_by: user.id
      };
    const values = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
    const rows = await sql`INSERT INTO public.pricing_plans ${sql(values)} RETURNING *`;
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Admin plans POST error:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const verified = await verifyAdmin(request, true);
    if (!verified.user) return NextResponse.json({ error: verified.error }, { status: 403 });
    const user = verified.user;

    const body = await request.json();
    const { 
      id, plan_code, sys_type, tagline, badge, is_free, tier_emoji, 
      price_monthly, price_monthly_usd, price_yearly, price_yearly_usd, 
      features, cta, cta_variant, is_highlighted, sort_order, is_active 
    } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const payload = {
        plan_code, sys_type, tagline, badge, is_free, tier_emoji,
        price_monthly, price_monthly_usd, price_yearly, price_yearly_usd,
        features: features === undefined ? undefined : JSON.stringify(features), cta, cta_variant, is_highlighted, sort_order, is_active,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };
    const values = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
    const rows = await sql`UPDATE public.pricing_plans SET ${sql(values)} WHERE id = ${id} RETURNING *`;
    return NextResponse.json(rows[0] || null);
  } catch (error: any) {
    console.error('Admin plans PATCH error:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const verified = await verifyAdmin(request, true);
    if (!verified.user) return NextResponse.json({ error: verified.error }, { status: 403 });
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await sql`DELETE FROM public.pricing_plans WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin plans DELETE error:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
