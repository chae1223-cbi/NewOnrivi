-- ====================================================================
-- 📊 [Onrivi Author] 공통코드 전면 적용 데이터베이스 DDL 마이그레이션 스크립트 (v15.0 - 라이브 테이블 칼럼 완전 호환판)
-- 🎯 기존 license_activations 테이블에 deactivated_at, device_name 등 미존재 칼럼 완전 방어
-- 🎯 1. 공통코드 마스터/디테일(common_code_groups, common_codes) 최상단 배치 및 전 디바이스 적용
-- 🎯 2. software_licenses ➔ subscriptions 테이블 1:1 슬림 통합
-- 🎯 3. 중복 칼럼(trial_start_at, trial_end_at) 및 레거시 tickets 테이블 완전 제거
-- 🎯 4. 주요 테이블의 모든 코드 칼럼을 공통코드 매핑 및 대문자(UPPERCASE) 규격으로 통일
-- 🎯 5. 칼럼 순서 표준화: PK ➔ 생성자 ➔ 생성일시 ➔ 최종변경자 ➔ 최종변경일시 ➔ 참조키(FK) ➔ 일반키
-- 📝 6. 전 칼럼 및 공통코드 그룹 매핑 연관 한글 주석(COMMENT ON COLUMN) 지정
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 0. 레거시 미사용 테이블 영구 삭제
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS public.tickets CASCADE;

-- --------------------------------------------------------------------
-- 1. common_code_groups 테이블 (공통 코드 마스터 그룹 테이블)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.common_code_groups_new (
    group_code text NOT NULL,                             -- 기본키: 공통 코드 그룹 ID (대문자 e.g. PLAN_NAME)
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 대체 고유키 (UUID)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    group_name text NOT NULL,                             -- 그룹 한글 명칭 (e.g. 요금제 플랜 유형)
    description text NULL,                                -- 그룹 상세 설명
    sort_order integer NOT NULL DEFAULT 1,                -- 표시 정렬 순서
    is_use boolean NOT NULL DEFAULT true,                 -- 사용 여부 (true: 사용, false: 미사용)
    CONSTRAINT common_code_groups_new_pkey PRIMARY KEY (group_code)
);

COMMENT ON TABLE public.common_code_groups_new IS '공통 코드 마스터 그룹 테이블';
COMMENT ON COLUMN public.common_code_groups_new.group_code IS '기본키: 공통 코드 그룹 식별자 (대문자)';
COMMENT ON COLUMN public.common_code_groups_new.id IS '대체 고유키 UUID';
COMMENT ON COLUMN public.common_code_groups_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.common_code_groups_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.common_code_groups_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.common_code_groups_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.common_code_groups_new.group_name IS '그룹 한글 명칭';
COMMENT ON COLUMN public.common_code_groups_new.description IS '그룹 상세 설명';
COMMENT ON COLUMN public.common_code_groups_new.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_code_groups_new.is_use IS '사용 여부 (true: 사용, false: 미사용)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'common_code_groups') THEN
        INSERT INTO public.common_code_groups_new (group_code, id, created_by, created_at, updated_by, updated_at, group_name, description, sort_order, is_use)
        SELECT group_code, id, NULL::uuid AS created_by, created_at, NULL::uuid AS updated_by, updated_at, group_name, description, sort_order, is_use FROM public.common_code_groups;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 2. common_codes 테이블 (공통 코드 상세 Detail 테이블)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.common_codes_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    group_code text NOT NULL,                             -- 참조키: 그룹 코드 (common_code_groups.group_code)
    code_value text NOT NULL,                             -- 코드값 (대문자 통일 e.g. FREE, ACTIVE)
    code_name text NOT NULL,                              -- 코드 한글 표시 명칭 (e.g. 무료 플랜)
    description text NULL,                                -- 상세 설명
    sort_order integer NOT NULL DEFAULT 1,                -- 표시 정렬 순서
    is_use boolean NOT NULL DEFAULT true,                 -- 사용 여부 (true: 사용, false: 미사용)
    attr_1 text NULL,                                     -- 확장 속성 1
    attr_2 text NULL,                                     -- 확장 속성 2
    CONSTRAINT common_codes_new_pkey PRIMARY KEY (id),
    CONSTRAINT common_codes_new_group_code_val_key UNIQUE (group_code, code_value),
    CONSTRAINT common_codes_new_group_code_fkey FOREIGN KEY (group_code) REFERENCES public.common_code_groups_new(group_code) ON DELETE CASCADE
);

COMMENT ON TABLE public.common_codes_new IS '공통 코드 상세 테이블';
COMMENT ON COLUMN public.common_codes_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.common_codes_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.common_codes_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.common_codes_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.common_codes_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.common_codes_new.group_code IS '참조키: 그룹 코드 (common_code_groups.group_code)';
COMMENT ON COLUMN public.common_codes_new.code_value IS '코드값 (대문자)';
COMMENT ON COLUMN public.common_codes_new.code_name IS '코드 한글 표시 명칭';
COMMENT ON COLUMN public.common_codes_new.description IS '상세 설명';
COMMENT ON COLUMN public.common_codes_new.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_codes_new.is_use IS '사용 여부 (true: 사용, false: 미사용)';
COMMENT ON COLUMN public.common_codes_new.attr_1 IS '확장 속성 1';
COMMENT ON COLUMN public.common_codes_new.attr_2 IS '확장 속성 2';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'common_codes') THEN
        INSERT INTO public.common_codes_new (id, created_by, created_at, updated_by, updated_at, group_code, code_value, code_name, description, sort_order, is_use, attr_1, attr_2)
        SELECT id, NULL::uuid AS created_by, created_at, NULL::uuid AS updated_by, updated_at, group_code, UPPER(code_value), code_name, description, sort_order, is_use, attr_1, attr_2 FROM public.common_codes;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 3. users 테이블 (회원 기본 원장 - 공통코드 AUTH_PROVIDER 매핑)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    email text NOT NULL,                                  -- 회원 이메일 주소 (로그인 계정)
    provider text NOT NULL DEFAULT 'EMAIL',               -- 인증 제공자 코드 (공통코드 AUTH_PROVIDER: EMAIL, GOOGLE)
    is_deleted boolean NOT NULL DEFAULT false,            -- 계정 탈퇴 여부 (true: 탈퇴, false: 정상)
    deleted_at timestamptz NULL,                          -- 계정 탈퇴 처리 일시
    CONSTRAINT users_new_pkey PRIMARY KEY (id),
    CONSTRAINT users_new_email_key UNIQUE (email)
);

COMMENT ON TABLE public.users_new IS '회원 기본 원장 테이블';
COMMENT ON COLUMN public.users_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.users_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.users_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.users_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.users_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.users_new.email IS '회원 이메일 주소 (로그인 계정)';
COMMENT ON COLUMN public.users_new.provider IS '인증 제공자 코드 (공통코드 AUTH_PROVIDER: EMAIL, GOOGLE)';
COMMENT ON COLUMN public.users_new.is_deleted IS '계정 탈퇴 여부 (true: 탈퇴, false: 정상)';
COMMENT ON COLUMN public.users_new.deleted_at IS '계정 탈퇴 일시';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        INSERT INTO public.users_new (id, created_by, created_at, updated_by, updated_at, email, provider, is_deleted, deleted_at)
        SELECT 
            id,
            id AS created_by,
            now() AS created_at,
            NULL::uuid AS updated_by,
            now() AS updated_at,
            email,
            UPPER(COALESCE(provider, 'EMAIL')) AS provider,
            false AS is_deleted,
            NULL::timestamptz AS deleted_at
        FROM public.users;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 4. subscriptions 테이블 (구독 및 라이선스 1:1 통합 - 공통코드 PLAN_NAME, PLAN_STATUS, BILLING_CYCLE 매핑)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    user_id uuid NOT NULL,                                -- 참조키: 회원 UUID (users.id)
    plan_name text NOT NULL DEFAULT 'FREE',               -- 요금제 플랜명 코드 (공통코드 PLAN_NAME: FREE, BASIC, PRO, PREMIUM)
    plan_status text NOT NULL DEFAULT 'ACTIVE',           -- 구독 상태 코드 (공통코드 PLAN_STATUS: ACTIVE, CANCELED, EXPIRED)
    billing_cycle text NOT NULL DEFAULT 'MONTHLY',        -- 결제 주기 코드 (공통코드 BILLING_CYCLE: MONTHLY, YEARLY)
    license_key text NULL,                                -- 소프트웨어 고유 정품 인증키 (통합됨)
    payment_no text NULL,                                 -- PG사 결제 고유 번호 (통합됨)
    max_devices integer NOT NULL DEFAULT 1,               -- 동시 접속 허용 기기 수
    price_amount numeric(10,2) NOT NULL DEFAULT 0.00,     -- 결제 금액 (원)
    current_period_start timestamptz NOT NULL DEFAULT now(),-- 구독 기간 시작일
    current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),-- 구독 기간 만료일
    canceled_at timestamptz NULL,                         -- 구독 해지 신청일
    is_active boolean NOT NULL DEFAULT true,              -- 구독/라이선스 유효 상태 (true: 활성, false: 비활성)
    CONSTRAINT subscriptions_new_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_new_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_new(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.subscriptions_new IS '구독 및 라이선스 통합 관리 테이블';
COMMENT ON COLUMN public.subscriptions_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.subscriptions_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.subscriptions_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.subscriptions_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.subscriptions_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.subscriptions_new.user_id IS '참조키: 회원 UUID (users.id)';
COMMENT ON COLUMN public.subscriptions_new.plan_name IS '요금제 플랜명 코드 (공통코드 PLAN_NAME: FREE, BASIC, PRO, PREMIUM)';
COMMENT ON COLUMN public.subscriptions_new.plan_status IS '구독 상태 코드 (공통코드 PLAN_STATUS: ACTIVE, CANCELED, EXPIRED)';
COMMENT ON COLUMN public.subscriptions_new.billing_cycle IS '결제 주기 코드 (공통코드 BILLING_CYCLE: MONTHLY, YEARLY)';
COMMENT ON COLUMN public.subscriptions_new.license_key IS '소프트웨어 고유 정품 인증키';
COMMENT ON COLUMN public.subscriptions_new.payment_no IS 'PG사 결제 고유 승인 번호';
COMMENT ON COLUMN public.subscriptions_new.max_devices IS '동시 접속 허용 기기 수';
COMMENT ON COLUMN public.subscriptions_new.price_amount IS '결제 금액';
COMMENT ON COLUMN public.subscriptions_new.current_period_start IS '구독 기간 시작 일시';
COMMENT ON COLUMN public.subscriptions_new.current_period_end IS '구독 기간 만료 일시';
COMMENT ON COLUMN public.subscriptions_new.canceled_at IS '구독 해지 신청 일시';
COMMENT ON COLUMN public.subscriptions_new.is_active IS '구독 및 라이선스 유효 상태';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        INSERT INTO public.subscriptions_new (
            id, created_by, created_at, updated_by, updated_at, user_id,
            plan_name, plan_status, billing_cycle, license_key, payment_no,
            max_devices, price_amount, current_period_start, current_period_end, canceled_at, is_active
        )
        SELECT 
            s.id,
            s.user_id AS created_by,
            now() AS created_at,
            NULL::uuid AS updated_by,
            now() AS updated_at,
            s.user_id,
            UPPER(COALESCE(s.plan_name, 'FREE')) AS plan_name,
            UPPER(COALESCE(s.plan_status, 'ACTIVE')) AS plan_status,
            'MONTHLY'::text AS billing_cycle,
            l.license_key,
            l.payment_no,
            1::integer AS max_devices,
            0.00::numeric(10,2) AS price_amount,
            now() AS current_period_start,
            (now() + interval '30 days') AS current_period_end,
            NULL::timestamptz AS canceled_at,
            COALESCE(l.is_active, true) AS is_active
        FROM public.subscriptions s
        LEFT JOIN public.software_licenses l ON l.subscription_id = s.id;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 5. license_activations 테이블 (기기 동시 접속 세션 ➔ subscriptions 직접 참조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_activations_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    subscription_id uuid NOT NULL,                        -- 참조키: 구독/라이선스 UUID (subscriptions.id)
    device_uuid text NOT NULL,                            -- 기기 고유 식별 세션 UUID
    device_name text NOT NULL DEFAULT 'Web SaaS',         -- 기기/클라이언트 디바이스 명칭
    activated_at timestamptz NOT NULL DEFAULT now(),      -- 세션 활성화(등록) 일시
    deactivated_at timestamptz NULL,                      -- 세션 해제(로그아웃) 일시
    is_active boolean NOT NULL DEFAULT true,              -- 세션 유효 여부 (true: 접속중, false: 해제됨)
    CONSTRAINT license_activations_new_pkey PRIMARY KEY (id),
    CONSTRAINT license_activations_new_sub_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions_new(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.license_activations_new IS '구독 및 라이선스별 기기 동시 접속 세션 테이블';
COMMENT ON COLUMN public.license_activations_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.license_activations_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.license_activations_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.license_activations_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.license_activations_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.license_activations_new.subscription_id IS '참조키: 구독/라이선스 UUID (subscriptions.id)';
COMMENT ON COLUMN public.license_activations_new.device_uuid IS '기기 고유 식별 세션 UUID';
COMMENT ON COLUMN public.license_activations_new.device_name IS '기기/클라이언트 명칭 (Web SaaS, Desktop App 등)';
COMMENT ON COLUMN public.license_activations_new.activated_at IS '기기 접속 활성화 일시';
COMMENT ON COLUMN public.license_activations_new.deactivated_at IS '기기 접속 해제 일시';
COMMENT ON COLUMN public.license_activations_new.is_active IS '세션 유효 여부';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'license_activations') THEN
        INSERT INTO public.license_activations_new (
            id, created_by, created_at, updated_by, updated_at, subscription_id,
            device_uuid, device_name, activated_at, deactivated_at, is_active
        )
        SELECT 
            la.id,
            NULL::uuid AS created_by,
            COALESCE(la.activated_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            COALESCE(la.activated_at, now()) AS updated_at,
            COALESCE(sl.subscription_id, la.license_id) AS subscription_id,
            la.device_uuid,
            'Web SaaS'::text AS device_name,
            COALESCE(la.activated_at, now()) AS activated_at,
            NULL::timestamptz AS deactivated_at,
            true AS is_active
        FROM public.license_activations la
        LEFT JOIN public.software_licenses sl ON sl.id = la.license_id;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 6. support_inquiries 테이블 (고객 문의 원장 - 공통코드 INQUIRY_TYPE, INQUIRY_STATUS 매핑)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_inquiries_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    user_id uuid NULL,                                    -- 참조키: 문의 회원 UUID (users.id, 비회원은 NULL)
    name text NOT NULL,                                   -- 문의자 성명 / 닉네임
    email text NOT NULL,                                  -- 회신받을 이메일 주소
    type text NOT NULL DEFAULT 'GENERAL',                 -- 문의 유형 코드 (공통코드 INQUIRY_TYPE: GENERAL, BILLING, TECH, SUGGESTION)
    title text NOT NULL,                                  -- 문의 제목
    content text NOT NULL,                                -- 문의 본문 내용
    attachment_urls text[] DEFAULT '{}',                  -- 첨부파일 URL 저장 배열
    status text NOT NULL DEFAULT 'PENDING',               -- 처리 상태 코드 (공통코드 INQUIRY_STATUS: PENDING, IN_PROGRESS, RESOLVED)
    answer_content text NULL,                             -- 관리자 답변 내용
    answered_at timestamptz NULL,                         -- 관리자 답변 일시
    answered_by uuid NULL,                                -- 답변을 작성한 관리자 UUID
    answer_attachment_urls text[] DEFAULT '{}',           -- 관리자 답변 첨부파일 URL 저장 배열
    CONSTRAINT support_inquiries_new_pkey PRIMARY KEY (id),
    CONSTRAINT support_inquiries_new_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_new(id) ON DELETE SET NULL,
    CONSTRAINT support_inquiries_new_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users_new(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.support_inquiries_new IS '고객 문의하기 접수 원장 테이블';
COMMENT ON COLUMN public.support_inquiries_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.support_inquiries_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.support_inquiries_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.support_inquiries_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.support_inquiries_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.support_inquiries_new.user_id IS '참조키: 문의 회원 UUID (users.id)';
COMMENT ON COLUMN public.support_inquiries_new.name IS '문의자 성명 / 닉네임';
COMMENT ON COLUMN public.support_inquiries_new.email IS '회신받을 이메일 주소';
COMMENT ON COLUMN public.support_inquiries_new.type IS '문의 유형 코드 (공통코드 INQUIRY_TYPE: GENERAL, BILLING, TECH, SUGGESTION)';
COMMENT ON COLUMN public.support_inquiries_new.title IS '문의 제목';
COMMENT ON COLUMN public.support_inquiries_new.content IS '문의 본문 내용';
COMMENT ON COLUMN public.support_inquiries_new.attachment_urls IS '첨부파일 URL 저장 배열';
COMMENT ON COLUMN public.support_inquiries_new.status IS '처리 상태 코드 (공통코드 INQUIRY_STATUS: PENDING, IN_PROGRESS, RESOLVED)';
COMMENT ON COLUMN public.support_inquiries_new.answer_content IS '관리자 답변 내용';
COMMENT ON COLUMN public.support_inquiries_new.answered_at IS '관리자 답변 일시';
COMMENT ON COLUMN public.support_inquiries_new.answered_by IS '답변을 작성한 관리자 UUID';
COMMENT ON COLUMN public.support_inquiries_new.answer_attachment_urls IS '관리자 답변 첨부파일 URL 저장 배열';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_inquiries') THEN
        INSERT INTO public.support_inquiries_new (
            id, created_by, created_at, updated_by, updated_at, user_id,
            name, email, type, title, content, attachment_urls, status, answer_content, answered_at, answered_by, answer_attachment_urls
        )
        SELECT 
            id,
            user_id AS created_by,
            COALESCE(created_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            now() AS updated_at,
            user_id,
            name,
            email,
            UPPER(COALESCE(type, 'GENERAL')) AS type,
            title,
            content,
            '{}'::text[] AS attachment_urls,
            UPPER(COALESCE(status, 'PENDING')) AS status
        FROM public.support_inquiries;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 7. stripe_webhook_raws 테이블 (Stripe 결제 웹훅 로그 - 공통코드 PAYMENT_STATUS 매핑)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_raws_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 이벤트 수신 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    processed_at timestamptz NULL,                        -- 웹훅 이벤트 처리 완료 일시
    stripe_event_id text NOT NULL,                        -- Stripe 고유 이벤트 ID (evt_...)
    event_type text NOT NULL,                             -- Stripe 이벤트 유형 (e.g. invoice.payment_succeeded)
    payload jsonb NOT NULL,                               -- Stripe 웹훅 원본 JSON 데이터
    status text NOT NULL DEFAULT 'PENDING',               -- 처리 상태 코드 (공통코드 PAYMENT_STATUS: PENDING, PROCESSED, FAILED)
    CONSTRAINT stripe_webhook_raws_new_pkey PRIMARY KEY (id),
    CONSTRAINT stripe_webhook_raws_new_stripe_event_id_key UNIQUE (stripe_event_id)
);

COMMENT ON TABLE public.stripe_webhook_raws_new IS 'Stripe 결제 웹훅 원천 로그 테이블';
COMMENT ON COLUMN public.stripe_webhook_raws_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.stripe_webhook_raws_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.stripe_webhook_raws_new.created_at IS '이벤트 최초 수신 일시';
COMMENT ON COLUMN public.stripe_webhook_raws_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.stripe_webhook_raws_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.stripe_webhook_raws_new.processed_at IS '웹훅 처리 완료 일시';
COMMENT ON COLUMN public.stripe_webhook_raws_new.stripe_event_id IS 'Stripe 고유 이벤트 식별자';
COMMENT ON COLUMN public.stripe_webhook_raws_new.event_type IS 'Stripe 이벤트 유형';
COMMENT ON COLUMN public.stripe_webhook_raws_new.payload IS 'Stripe 웹훅 원본 JSON 데이터';
COMMENT ON COLUMN public.stripe_webhook_raws_new.status IS '웹훅 처리 상태 코드 (공통코드 PAYMENT_STATUS: PENDING, PROCESSED, FAILED)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_webhook_raws') THEN
        INSERT INTO public.stripe_webhook_raws_new (
            id, created_by, created_at, updated_by, updated_at, processed_at,
            stripe_event_id, event_type, payload, status
        )
        SELECT 
            id,
            NULL::uuid AS created_by,
            COALESCE(created_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            COALESCE(processed_at, now()) AS updated_at,
            processed_at,
            stripe_event_id,
            event_type,
            payload,
            UPPER(COALESCE(status, 'PENDING')) AS status
        FROM public.stripe_webhook_raws;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 8. payment_logs 테이블 (결제 정산 이력 로그 - 공통코드 PAYMENT_STATUS 매핑)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_logs_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    user_id uuid NOT NULL,                                -- 참조키: 회원 UUID (users.id)
    webhook_raw_id uuid NULL,                             -- 참조키: Stripe 웹훅 로그 UUID (stripe_webhook_raws.id)
    stripe_invoice_id text NOT NULL,                      -- PG사 결제 인보이스/영수증 고유 ID
    amount integer NOT NULL DEFAULT 0,                    -- 결제 금액 (원)
    currency text NOT NULL DEFAULT 'KRW',                 -- 통화 (KRW, USD 등 대문자)
    payment_status text NOT NULL DEFAULT 'SUCCESS',       -- 결제 상태 코드 (공통코드 PAYMENT_STATUS: SUCCESS, FAILED, PENDING, CANCELED)
    paid_at timestamptz NOT NULL DEFAULT now(),           -- 결제 승인 완료 일시
    CONSTRAINT payment_logs_new_pkey PRIMARY KEY (id),
    CONSTRAINT payment_logs_new_stripe_invoice_id_key UNIQUE (stripe_invoice_id),
    CONSTRAINT payment_logs_new_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_new(id) ON DELETE RESTRICT,
    CONSTRAINT payment_logs_new_webhook_raw_id_fkey FOREIGN KEY (webhook_raw_id) REFERENCES public.stripe_webhook_raws_new(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.payment_logs_new IS '결제 정산 이력 로그 테이블';
COMMENT ON COLUMN public.payment_logs_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.payment_logs_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.payment_logs_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.payment_logs_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.payment_logs_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.payment_logs_new.user_id IS '참조키: 회원 UUID (users.id)';
COMMENT ON COLUMN public.payment_logs_new.webhook_raw_id IS '참조키: Stripe 웹훅 로그 UUID (stripe_webhook_raws.id)';
COMMENT ON COLUMN public.payment_logs_new.stripe_invoice_id IS 'PG사 결제 인보이스/영수증 고유 ID';
COMMENT ON COLUMN public.payment_logs_new.amount IS '결제 금액 (원)';
COMMENT ON COLUMN public.payment_logs_new.currency IS '통화 (KRW, USD 등)';
COMMENT ON COLUMN public.payment_logs_new.payment_status IS '결제 상태 코드 (공통코드 PAYMENT_STATUS: SUCCESS, FAILED, PENDING, CANCELED)';
COMMENT ON COLUMN public.payment_logs_new.paid_at IS '결제 승인 완료 일시';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_logs') THEN
        INSERT INTO public.payment_logs_new (
            id, created_by, created_at, updated_by, updated_at, user_id, webhook_raw_id,
            stripe_invoice_id, amount, currency, payment_status, paid_at
        )
        SELECT 
            id,
            NULL::uuid AS created_by,
            COALESCE(paid_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            COALESCE(paid_at, now()) AS updated_at,
            user_id,
            webhook_raw_id,
            stripe_invoice_id,
            COALESCE(amount, 0) AS amount,
            UPPER(COALESCE(currency, 'KRW')) AS currency,
            UPPER(COALESCE(payment_status, 'SUCCESS')) AS payment_status,
            COALESCE(paid_at, now()) AS paid_at
        FROM public.payment_logs;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 9. daily_payment_summaries 테이블 (일별 결제/정산 매출 집계 요약 테이블)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_payment_summaries_new (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    settlement_date date NOT NULL,                        -- 정산/집계 대상 일자 (YYYY-MM-DD)
    total_amount integer NOT NULL DEFAULT 0,              -- 해당 일자 총 결제 금액 합계 (원)
    total_count integer NOT NULL DEFAULT 0,               -- 해당 일자 총 결제 건수 (건)
    CONSTRAINT daily_payment_summaries_new_pkey PRIMARY KEY (id),
    CONSTRAINT daily_payment_summaries_new_settlement_date_key UNIQUE (settlement_date)
);

COMMENT ON TABLE public.daily_payment_summaries_new IS '일별 결제/정산 매출 집계 요약 테이블';
COMMENT ON COLUMN public.daily_payment_summaries_new.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.daily_payment_summaries_new.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.daily_payment_summaries_new.created_at IS '생성 일시';
COMMENT ON COLUMN public.daily_payment_summaries_new.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.daily_payment_summaries_new.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.daily_payment_summaries_new.settlement_date IS '정산/집계 대상 일자 (YYYY-MM-DD)';
COMMENT ON COLUMN public.daily_payment_summaries_new.total_amount IS '해당 일자 총 결제 금액 합계 (원)';
COMMENT ON COLUMN public.daily_payment_summaries_new.total_count IS '해당 일자 총 결제 건수 (건)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_payment_summaries') THEN
        INSERT INTO public.daily_payment_summaries_new (
            id, created_by, created_at, updated_by, updated_at,
            settlement_date, total_amount, total_count
        )
        SELECT 
            id,
            NULL::uuid AS created_by,
            COALESCE(created_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            COALESCE(created_at, now()) AS updated_at,
            settlement_date,
            COALESCE(total_amount, 0) AS total_amount,
            COALESCE(total_count, 0) AS total_count
        FROM public.daily_payment_summaries;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 10. 원본 테이블 교체 (DROP & RENAME)
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS public.license_activations CASCADE;
DROP TABLE IF EXISTS public.software_licenses CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.support_inquiries CASCADE;
DROP TABLE IF EXISTS public.payment_logs CASCADE;
DROP TABLE IF EXISTS public.stripe_webhook_raws CASCADE;
DROP TABLE IF EXISTS public.daily_payment_summaries CASCADE;
DROP TABLE IF EXISTS public.common_codes CASCADE;
DROP TABLE IF EXISTS public.common_code_groups CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

ALTER TABLE public.users_new RENAME TO users;
ALTER TABLE public.subscriptions_new RENAME TO subscriptions;
ALTER TABLE public.license_activations_new RENAME TO license_activations;
ALTER TABLE public.support_inquiries_new RENAME TO support_inquiries;
ALTER TABLE public.stripe_webhook_raws_new RENAME TO stripe_webhook_raws;
ALTER TABLE public.payment_logs_new RENAME TO payment_logs;
ALTER TABLE public.daily_payment_summaries_new RENAME TO daily_payment_summaries;
ALTER TABLE public.common_code_groups_new RENAME TO common_code_groups;
ALTER TABLE public.common_codes_new RENAME TO common_codes;

-- 제약조건 명칭 최종 정돈
ALTER TABLE public.users RENAME CONSTRAINT users_new_pkey TO users_pkey;
ALTER TABLE public.users RENAME CONSTRAINT users_new_email_key TO users_email_key;

ALTER TABLE public.subscriptions RENAME CONSTRAINT subscriptions_new_pkey TO subscriptions_pkey;
ALTER TABLE public.subscriptions RENAME CONSTRAINT subscriptions_new_user_id_fkey TO subscriptions_user_id_fkey;

ALTER TABLE public.license_activations RENAME CONSTRAINT license_activations_new_pkey TO license_activations_pkey;
ALTER TABLE public.license_activations RENAME CONSTRAINT license_activations_new_sub_id_fkey TO license_activations_subscription_id_fkey;

ALTER TABLE public.support_inquiries RENAME CONSTRAINT support_inquiries_new_pkey TO support_inquiries_pkey;
ALTER TABLE public.support_inquiries RENAME CONSTRAINT support_inquiries_user_id_fkey TO support_inquiries_user_id_fkey;

ALTER TABLE public.stripe_webhook_raws RENAME CONSTRAINT stripe_webhook_raws_new_pkey TO stripe_webhook_raws_pkey;
ALTER TABLE public.stripe_webhook_raws RENAME CONSTRAINT stripe_webhook_raws_new_stripe_event_id_key TO stripe_webhook_raws_stripe_event_id_key;

ALTER TABLE public.payment_logs RENAME CONSTRAINT payment_logs_new_pkey TO payment_logs_pkey;
ALTER TABLE public.payment_logs RENAME CONSTRAINT payment_logs_new_stripe_invoice_id_key TO payment_logs_stripe_invoice_id_key;
ALTER TABLE public.payment_logs RENAME CONSTRAINT payment_logs_new_user_id_fkey TO payment_logs_user_id_fkey;
ALTER TABLE public.payment_logs RENAME CONSTRAINT payment_logs_new_webhook_raw_id_fkey TO payment_logs_webhook_raw_id_fkey;

ALTER TABLE public.daily_payment_summaries RENAME CONSTRAINT daily_payment_summaries_new_pkey TO daily_payment_summaries_pkey;
ALTER TABLE public.daily_payment_summaries RENAME CONSTRAINT daily_payment_summaries_new_settlement_date_key TO daily_payment_summaries_settlement_date_key;

ALTER TABLE public.common_code_groups RENAME CONSTRAINT common_code_groups_new_pkey TO common_code_groups_pkey;
ALTER TABLE public.common_codes RENAME CONSTRAINT common_codes_new_pkey TO common_codes_pkey;
ALTER TABLE public.common_codes RENAME CONSTRAINT common_codes_new_group_code_val_key TO common_codes_group_code_val_key;
ALTER TABLE public.common_codes RENAME CONSTRAINT common_codes_new_group_code_fkey TO common_codes_group_code_fkey;

-- --------------------------------------------------------------------
-- 11. 시스템 전역 초기 공통코드 마스터/디테일 시드 데이터 주입 (SEED DATA)
-- --------------------------------------------------------------------
INSERT INTO public.common_code_groups (group_code, group_name, description, sort_order) VALUES
('PLAN_NAME', '요금제 플랜 유형', 'Onrivi Author 요금제 유형 코드', 1),
('PLAN_STATUS', '구독 상태', '회원 구독 상태 코드', 2),
('BILLING_CYCLE', '결제 주기', '요금제 결제 주기 코드', 3),
('INQUIRY_TYPE', '고객 문의 유형', '고객 지원 센터 문의 분류 코드', 4),
('INQUIRY_STATUS', '고객 문의 처리 상태', '문의건 처리 현황 코드', 5),
('PAYMENT_STATUS', '결제 트랜잭션 상태', 'PG 결제 시도 및 승인 상태 코드', 6),
('AUTH_PROVIDER', '인증 제공자 유형', '로그인/가입 수단 코드', 7)
ON CONFLICT (group_code) DO NOTHING;

INSERT INTO public.common_codes (group_code, code_value, code_name, description, sort_order) VALUES
-- PLAN_NAME
('PLAN_NAME', 'FREE', '무료 플랜', '7일 무료 1대 접속 기본 요금제', 1),
('PLAN_NAME', 'BASIC', '베이직 플랜', '기초 작성자 전용 요금제', 2),
('PLAN_NAME', 'PRO', '프로 플랜', '전문 창작자 전용 요금제', 3),
('PLAN_NAME', 'PREMIUM', '프리미엄 플랜', '기업 및 무제한 전용 요금제', 4),
-- PLAN_STATUS
('PLAN_STATUS', 'ACTIVE', '구독중 (활성)', '정상 이용 중인 활성 상태', 1),
('PLAN_STATUS', 'CANCELED', '해지됨', '구독 해지 신청 상태', 2),
('PLAN_STATUS', 'EXPIRED', '만료됨', '구독 기간 종료 만료 상태', 3),
-- BILLING_CYCLE
('BILLING_CYCLE', 'MONTHLY', '월간 결제', '매월 자동 정기 결제', 1),
('BILLING_CYCLE', 'YEARLY', '연간 결제', '매년 자동 정기 결제 (할인 적용)', 2),
-- INQUIRY_TYPE
('INQUIRY_TYPE', 'GENERAL', '일반 문의', '일반 사용 및 서비스 안내', 1),
('INQUIRY_TYPE', 'BILLING', '결제/구독 문의', '결제, 환불, 요금제 관련 문의', 2),
('INQUIRY_TYPE', 'TECH', '기술 지원', '오류, 버그, 기술 관련 문의', 3),
('INQUIRY_TYPE', 'SUGGESTION', '기능 제안', '신규 기능 및 개선 제안', 4),
-- INQUIRY_STATUS
('INQUIRY_STATUS', 'PENDING', '접수 대기', '문의가 접수되어 답변 대기 중인 상태', 1),
('INQUIRY_STATUS', 'IN_PROGRESS', '처리 중', '담당자가 확인하여 처리 중인 상태', 2),
('INQUIRY_STATUS', 'RESOLVED', '답변 완료', '문의에 대한 답변 생성이 완료된 상태', 3),
-- PAYMENT_STATUS
('PAYMENT_STATUS', 'SUCCESS', '결제 성공', 'PG 결제가 정상 승인된 상태', 1),
('PAYMENT_STATUS', 'FAILED', '결제 실패', '잔액 부족/카드 오류 등으로 실패된 상태', 2),
('PAYMENT_STATUS', 'PENDING', '결제 대기', '가상계좌 또는 승인 진행 중인 상태', 3),
('PAYMENT_STATUS', 'CANCELED', '결제 취소', '결제가 취소/환불 처리된 상태', 4),
-- AUTH_PROVIDER
('AUTH_PROVIDER', 'EMAIL', '이메일 인증', '이메일/비밀번호 기반 자체 인증', 1),
('AUTH_PROVIDER', 'GOOGLE', '구글 소셜 인증', 'Google OAuth 기반 소셜 인증', 2)
ON CONFLICT (group_code, code_value) DO NOTHING;

COMMIT;
