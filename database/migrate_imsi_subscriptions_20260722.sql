-- ====================================================================
-- 📊 [Onrivi Author] imsi_subscriptions 통합 이관 마이그레이션 스크립트
-- 🎯 목적: subscriptions + software_licenses → imsi_subscriptions 단일 테이블 통합
-- 🚨 실행일: 2026-07-22
-- ⚠️  주의: 기존 두 테이블은 백업 후 DROP됩니다.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- Step 1. 기존 테이블 데이터 백업
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions_backup_20260722 AS
SELECT * FROM public.subscriptions;

CREATE TABLE IF NOT EXISTS public.software_licenses_backup_20260722 AS
SELECT * FROM public.software_licenses;

DO $$
DECLARE
    v_sub_count INTEGER;
    v_lic_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_sub_count FROM public.subscriptions_backup_20260722;
    SELECT COUNT(*) INTO v_lic_count FROM public.software_licenses_backup_20260722;
    RAISE NOTICE '[BACKUP] subscriptions: % 건, software_licenses: % 건 백업 완료', v_sub_count, v_lic_count;
END $$;

-- --------------------------------------------------------------------
-- Step 2. license_activations 외래키 제약 임시 제거
-- --------------------------------------------------------------------
ALTER TABLE public.license_activations
    DROP CONSTRAINT IF EXISTS license_activations_license_id_fkey;

-- --------------------------------------------------------------------
-- Step 3. 기존 테이블 DROP
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS public.software_licenses CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- --------------------------------------------------------------------
-- Step 4. imsi_subscriptions 신규 생성
-- --------------------------------------------------------------------
CREATE TABLE public.imsi_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_by uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL,
    plan_name text NOT NULL DEFAULT 'FREE',
    plan_status text NOT NULL DEFAULT 'ACTIVE',
    billing_cycle text NOT NULL DEFAULT 'MONTHLY',
    license_key text NULL,
    verify_key text NULL,
    payment_no text NULL,
    max_devices integer NOT NULL DEFAULT 1,
    price_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    current_period_start timestamptz NOT NULL DEFAULT now(),
    current_period_end timestamptz NOT NULL DEFAULT (now() + '30 days'::interval),
    canceled_at timestamptz NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT imsi_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_subscriptions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.imsi_users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.imsi_subscriptions IS '구독 + 라이선스 통합 관리 테이블 (subscriptions + software_licenses 통합)';
COMMENT ON COLUMN public.imsi_subscriptions.id IS '기본키 (구독 ID = 라이선스 ID 통합)';
COMMENT ON COLUMN public.imsi_subscriptions.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_subscriptions.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_subscriptions.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_subscriptions.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_subscriptions.user_id IS '회원 UUID (imsi_users.id 참조)';
COMMENT ON COLUMN public.imsi_subscriptions.plan_name IS '요금제 이름 (FREE / BASIC / PRO / PREMIUM)';
COMMENT ON COLUMN public.imsi_subscriptions.plan_status IS '구독 상태 (ACTIVE / FREE / CANCELED / EXPIRED)';
COMMENT ON COLUMN public.imsi_subscriptions.billing_cycle IS '결제 주기 (MONTHLY / YEARLY / TRIAL / FREE)';
COMMENT ON COLUMN public.imsi_subscriptions.license_key IS '라이선스 키 (16자리 HEX 대문자)';
COMMENT ON COLUMN public.imsi_subscriptions.verify_key IS '인증 키 (데스크탑 딥링크 활성화용)';
COMMENT ON COLUMN public.imsi_subscriptions.payment_no IS '결제 번호 (PAY-YYYYMMDD-XXXXXXXX)';
COMMENT ON COLUMN public.imsi_subscriptions.max_devices IS '최대 동시 접속 기기 수';
COMMENT ON COLUMN public.imsi_subscriptions.price_amount IS '결제 금액 (원)';
COMMENT ON COLUMN public.imsi_subscriptions.current_period_start IS '현재 구독 시작 일시';
COMMENT ON COLUMN public.imsi_subscriptions.current_period_end IS '현재 구독 만료 일시';
COMMENT ON COLUMN public.imsi_subscriptions.canceled_at IS '구독 해지/만료 처리 일시';
COMMENT ON COLUMN public.imsi_subscriptions.is_active IS '활성 구독 여부 (true: 활성, false: 해지/만료)';

CREATE INDEX idx_imsi_subscriptions_user_id
    ON public.imsi_subscriptions USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX idx_imsi_subscriptions_user_active
    ON public.imsi_subscriptions USING btree (user_id, is_active, plan_status) TABLESPACE pg_default;

CREATE INDEX idx_imsi_subscriptions_payment_no
    ON public.imsi_subscriptions USING btree (payment_no) TABLESPACE pg_default;

-- --------------------------------------------------------------------
-- Step 5. 기존 데이터 통합 이관 (subscriptions JOIN software_licenses)
-- --------------------------------------------------------------------
INSERT INTO public.imsi_subscriptions (
    id, created_by, created_at, updated_by, updated_at,
    user_id, plan_name, plan_status, billing_cycle,
    license_key, verify_key, payment_no,
    max_devices, price_amount,
    current_period_start, current_period_end,
    canceled_at, is_active
)
SELECT
    s.id,
    s.user_id                                               AS created_by,
    COALESCE(s.created_at, now())                          AS created_at,
    s.user_id                                               AS updated_by,
    COALESCE(s.created_at, now())                          AS updated_at,
    s.user_id,
    COALESCE(s.plan_name, 'FREE')                          AS plan_name,
    COALESCE(s.plan_status, 'FREE')                        AS plan_status,
    COALESCE(s.billing_interval, 'MONTHLY')                AS billing_cycle,
    sl.license_key,
    sl.verify_key,
    sl.payment_no,
    COALESCE(s.max_devices, 1)                             AS max_devices,
    0.00                                                    AS price_amount,
    COALESCE(s.created_at, now())                          AS current_period_start,
    COALESCE(s.current_period_end, s.trial_end_at, now() + interval '30 days') AS current_period_end,
    CASE WHEN s.is_expired = 'Y' THEN s.updated_at ELSE NULL END AS canceled_at,
    CASE WHEN s.is_expired = 'N' THEN true ELSE false END  AS is_active
FROM public.subscriptions_backup_20260722 s
LEFT JOIN public.software_licenses_backup_20260722 sl ON sl.subscription_id = s.id
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.imsi_subscriptions;
    RAISE NOTICE '[MIGRATE] imsi_subscriptions 이관 완료: % 건', v_count;
END $$;

-- --------------------------------------------------------------------
-- Step 6. license_activations FK → imsi_subscriptions(id) 재연결
-- --------------------------------------------------------------------
ALTER TABLE public.license_activations
    ADD CONSTRAINT license_activations_license_id_fkey
    FOREIGN KEY (license_id) REFERENCES public.imsi_subscriptions(id) ON DELETE CASCADE;

DO $$
BEGIN
    RAISE NOTICE '[FK] license_activations.license_id → imsi_subscriptions(id) 재연결 완료';
END $$;

-- --------------------------------------------------------------------
-- Step 7. imsi_password_resets → password_resets 이관 반영 (이미 완료된 경우 무시)
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS public.imsi_password_resets CASCADE;

COMMIT;
