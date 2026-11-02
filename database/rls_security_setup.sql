-- ====================================================================
-- 📊 [Onrivi Author] Supabase RLS(Row-Level Security) 전역 보안 설정 스크립트
-- 🎯 목적: Supabase Security Advisor의 'rls_disabled_in_public' 경고 완전 해결
-- 🛡️ 안전성 보장:
--    1) 테이블 구조 변경(DROP/ALTER COLUMN) 및 데이터 수정/삭제(DELETE/UPDATE) 일체 없음
--    2) 오직 RLS 활성화(ENABLE ROW LEVEL SECURITY)와 접근 권한 정책(POLICY)만 설정
--    3) 이미 존재하는 정책과 충돌하지 않도록 DROP POLICY IF EXISTS 후 재생성(멱등성 보장)
--    4) 백업/임시 테이블 유무에 관계없이 에러 없이 실행되도록 동적 체크(DO $$) 적용
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. 관리자 여부 판별 보안 헬퍼 함수 (RLS 무한 재귀 방지용 SECURITY DEFINER)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = auth.uid()
  );
$$;

-- --------------------------------------------------------------------
-- 2. public 스키마 내 모든 테이블에 대해 RLS 일괄 활성화
--    (운영 테이블 + 백업 테이블(*_backup_*) + 임시 테이블(imsi_*) 모두 포함)
--    ※ RLS가 켜진 후 별도 POLICY가 없는 백업/서버전용 테이블은
--       외부(anon/authenticated) 접근이 100% 자동 차단되며,
--       서버 API(supabaseAdmin / service_role) 및 SECURITY DEFINER 함수만 접근 가능합니다.
-- --------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 3. 앱 기능 정상 동작을 위한 테이블별 세밀한 접근 권한 정책(Policy) 설정
-- --------------------------------------------------------------------

-- [3-1] admins (관리자 테이블: 본인 레코드 및 관리자 조회 허용)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admins') THEN
    DROP POLICY IF EXISTS "Admins can view their own record" ON public.admins;
    DROP POLICY IF EXISTS "Admins can view all records" ON public.admins;
    DROP POLICY IF EXISTS "rls_admins_select" ON public.admins;
    DROP POLICY IF EXISTS "rls_admins_all_admin" ON public.admins;

    CREATE POLICY "rls_admins_select"
      ON public.admins
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR public.is_admin());

    CREATE POLICY "rls_admins_all_admin"
      ON public.admins
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- [3-2] 공개 조회용 마스터 테이블 (common_code_groups, common_codes, pricing_plans, faqs)
--       누구나 읽기(SELECT) 가능 / 등록·수정·삭제는 관리자(is_admin)만 가능
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['common_code_groups', 'common_codes', 'pricing_plans', 'faqs']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "rls_%I_select_public" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_%I_write_admin" ON public.%I;', t, t);

      EXECUTE format(
        'CREATE POLICY "rls_%I_select_public" ON public.%I FOR SELECT TO anon, authenticated USING (true);',
        t, t
      );
      EXECUTE format(
        'CREATE POLICY "rls_%I_write_admin" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- [3-3] users (회원 원장: 본인 정보 조회/수정 및 관리자 전체 관리 허용)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    DROP POLICY IF EXISTS "rls_users_select_own" ON public.users;
    DROP POLICY IF EXISTS "rls_users_update_own" ON public.users;
    DROP POLICY IF EXISTS "rls_users_admin_all" ON public.users;

    CREATE POLICY "rls_users_select_own"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id OR public.is_admin());

    CREATE POLICY "rls_users_update_own"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id OR public.is_admin())
      WITH CHECK (auth.uid() = id OR public.is_admin());

    CREATE POLICY "rls_users_admin_all"
      ON public.users
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- [3-4] subscriptions (구독/라이선스: 본인 구독 조회 및 활성 기기 인증 조회 허용, 변경은 서버/관리자 전용)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    DROP POLICY IF EXISTS "rls_subscriptions_select_own" ON public.subscriptions;
    DROP POLICY IF EXISTS "rls_subscriptions_admin_all" ON public.subscriptions;

    CREATE POLICY "rls_subscriptions_select_own"
      ON public.subscriptions
      FOR SELECT
      TO anon, authenticated
      USING (
        auth.uid() = user_id
        OR public.is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.license_activations la
          WHERE la.subscription_id = subscriptions.id
            AND la.is_active = true
        )
      );

    CREATE POLICY "rls_subscriptions_admin_all"
      ON public.subscriptions
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- [3-5] license_activations (기기 동시접속 세션: 실시간 Realtime 감지용 조회 허용, 변경은 서버/관리자 전용)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'license_activations') THEN
    DROP POLICY IF EXISTS "rls_license_activations_select" ON public.license_activations;
    DROP POLICY IF EXISTS "rls_license_activations_admin_all" ON public.license_activations;

    CREATE POLICY "rls_license_activations_select"
      ON public.license_activations
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "rls_license_activations_admin_all"
      ON public.license_activations
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- [3-6] promotions & promotion_subscribers (프로모션 관리: 어드민 대시보드 전용)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['promotions', 'promotion_subscribers']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "rls_%I_admin_all" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "rls_%I_admin_all" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- [3-7] support_inquiries (고객 문의: 본인 문의 조회 및 관리자 전체 관리 허용, 등록은 RPC/서버 API 경유)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_inquiries') THEN
    DROP POLICY IF EXISTS "rls_support_inquiries_select_own" ON public.support_inquiries;
    DROP POLICY IF EXISTS "rls_support_inquiries_admin_all" ON public.support_inquiries;

    CREATE POLICY "rls_support_inquiries_select_own"
      ON public.support_inquiries
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR public.is_admin());

    CREATE POLICY "rls_support_inquiries_admin_all"
      ON public.support_inquiries
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- [3-8] 서버 전용 민감 테이블 (password_resets, stripe_webhook_raws, payment_logs, daily_payment_summaries)
--       RLS는 위 2번 단계에서 모두 켜졌으며, 관리자(is_admin) 외 클라이언트 직접 접근은 전면 차단됩니다.
--       (Next.js 서버 API의 supabaseAdmin(service_role)은 RLS를 자동 우회하므로 100% 정상 작동)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['password_resets', 'stripe_webhook_raws', 'payment_logs', 'daily_payment_summaries']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "rls_%I_admin_only" ON public.%I;', t, t);
      EXECUTE format(
        'CREATE POLICY "rls_%I_admin_only" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());',
        t, t
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ====================================================================
-- ✅ 실행 후 확인 쿼리 (결과에 rowsecurity = false 인 테이블이 0개여야 정상)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ====================================================================
