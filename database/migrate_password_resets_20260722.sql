-- ====================================================================
-- 📊 [Onrivi Author] password_resets 테이블 마이그레이션 스크립트
-- 🎯 목적: 기존 password_resets 테이블을 표준 감사 칼럼 구조로 재생성
--          (imsi_password_resets 설계 기준을 정식 password_resets에 반영)
-- 🚨 실행일: 2026-07-22
-- ⚠️  주의: 기존 password_resets 테이블 데이터는 백업 후 DROP됩니다.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- Step 1. 기존 password_resets 데이터 백업 (임시 보관)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.password_resets_backup_20260722 AS
SELECT * FROM public.password_resets;

-- 백업 확인 로그
DO $$
DECLARE
    v_backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_backup_count FROM public.password_resets_backup_20260722;
    RAISE NOTICE '[BACKUP] password_resets_backup_20260722: % 건 백업 완료', v_backup_count;
END $$;

-- --------------------------------------------------------------------
-- Step 2. 기존 인덱스 및 password_resets 테이블 DROP
-- --------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_password_resets_token;
DROP TABLE IF EXISTS public.password_resets CASCADE;

-- --------------------------------------------------------------------
-- Step 3. 표준 감사 칼럼 구조로 password_resets 신규 생성
-- --------------------------------------------------------------------
CREATE TABLE public.password_resets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID (imsi_users.id)
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    is_deleted boolean NOT NULL DEFAULT false,            -- 소프트 딜리트 여부 (만료/폐기 처리)
    deleted_at timestamptz NULL,                          -- 소프트 딜리트 일시
    email text NOT NULL,                                  -- 비밀번호 재설정 대상 이메일
    token text NOT NULL,                                  -- 재설정 토큰 (UUID, 고유값)
    expires_at timestamptz NOT NULL,                      -- 토큰 만료 일시 (발급 후 30분)
    used boolean NOT NULL DEFAULT false,                  -- 토큰 사용 완료 여부
    CONSTRAINT password_resets_pkey PRIMARY KEY (id),
    CONSTRAINT password_resets_token_key UNIQUE (token)
);

COMMENT ON TABLE public.password_resets IS '비밀번호 재설정 토큰 관리 테이블 (표준 감사 칼럼 구조)';
COMMENT ON COLUMN public.password_resets.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.password_resets.created_by IS '생성자 UUID (imsi_users.id 참조)';
COMMENT ON COLUMN public.password_resets.created_at IS '생성 일시';
COMMENT ON COLUMN public.password_resets.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.password_resets.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.password_resets.is_deleted IS '소프트 딜리트 여부 (만료/폐기된 토큰)';
COMMENT ON COLUMN public.password_resets.deleted_at IS '소프트 딜리트 일시';
COMMENT ON COLUMN public.password_resets.email IS '비밀번호 재설정 대상 이메일 (소문자 정규화)';
COMMENT ON COLUMN public.password_resets.token IS '재설정 토큰 (UUID v4, 고유값)';
COMMENT ON COLUMN public.password_resets.expires_at IS '토큰 만료 일시 (발급 후 30분)';
COMMENT ON COLUMN public.password_resets.used IS '토큰 사용 완료 여부 (true: 이미 사용됨)';

-- --------------------------------------------------------------------
-- Step 4. 인덱스 생성
-- --------------------------------------------------------------------
CREATE INDEX idx_password_resets_token
    ON public.password_resets USING btree (token) TABLESPACE pg_default;

CREATE INDEX idx_password_resets_email
    ON public.password_resets USING btree (email) TABLESPACE pg_default;

CREATE INDEX idx_password_resets_email_active
    ON public.password_resets USING btree (email, used, is_deleted, expires_at)
    TABLESPACE pg_default;

-- --------------------------------------------------------------------
-- Step 5. 기존 백업 데이터 이관 (유효한 데이터만)
-- --------------------------------------------------------------------
INSERT INTO public.password_resets (
    id, created_by, created_at, updated_by, updated_at,
    is_deleted, deleted_at, email, token, expires_at, used
)
SELECT
    id,
    NULL::uuid                              AS created_by,
    COALESCE(created_at, now())             AS created_at,
    NULL::uuid                              AS updated_by,
    COALESCE(created_at, now())             AS updated_at,
    false                                   AS is_deleted,
    NULL::timestamptz                       AS deleted_at,
    LOWER(TRIM(email::text))               AS email,
    token::text                             AS token,
    expires_at,
    COALESCE(used, false)                   AS used
FROM public.password_resets_backup_20260722
ON CONFLICT (id) DO NOTHING;

-- 이관 결과 확인 로그
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.password_resets;
    RAISE NOTICE '[MIGRATE] password_resets 이관 완료: % 건', v_count;
END $$;

-- --------------------------------------------------------------------
-- Step 6. imsi_password_resets 테이블 제거 (신규 password_resets로 통합)
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS public.imsi_password_resets CASCADE;

DO $$
BEGIN
    RAISE NOTICE '[CLEANUP] imsi_password_resets 테이블 제거 완료';
END $$;

COMMIT;

-- ====================================================================
-- ✅ 마이그레이션 완료 후 확인 쿼리
-- ====================================================================
-- SELECT COUNT(*) FROM public.password_resets;
-- SELECT * FROM public.password_resets ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM public.password_resets_backup_20260722 LIMIT 5; -- 백업 확인
-- ====================================================================
