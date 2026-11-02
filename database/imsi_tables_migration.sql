-- ====================================================================
-- 📊 [Onrivi Author] imsi_ 접두어 기반 멸균 이관 SQL 스크립트 (v15.0 - 라이브 테이블 칼럼 완전 가드 보완판)
-- 🎯 기존 license_activations 테이블에 deactivated_at, device_name 등 미존재 칼럼 완전 방어
-- 🎯 1. 공통코드 테이블(common_code_groups, common_codes) 신설 및 초기 시드 주입
-- 🎯 2. 변경 대상 7개 테이블을 imsi_ 접두어로 멸균 생성 (표준 칼럼 순서 + 한글 주석)
-- 🎯 3. 기존 원본 테이블 데이터를 imsi_ 테이블로 대문자 코드 변환 후 안전 이관
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. 공통코드 마스터/디테일 테이블 생성
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.common_code_groups (
    group_code text NOT NULL,                             -- 기본키: 공통 코드 그룹 ID (대문자)
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 대체 고유키 UUID
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    group_name text NOT NULL,                             -- 그룹 한글 명칭
    description text NULL,                                -- 그룹 상세 설명
    sort_order integer NOT NULL DEFAULT 1,                -- 표시 정렬 순서
    is_use boolean NOT NULL DEFAULT true,                 -- 사용 여부
    CONSTRAINT common_code_groups_pkey PRIMARY KEY (group_code)
);

COMMENT ON TABLE public.common_code_groups IS '공통 코드 마스터 그룹 테이블';
COMMENT ON COLUMN public.common_code_groups.group_code IS '기본키: 공통 코드 그룹 식별자 (대문자)';
COMMENT ON COLUMN public.common_code_groups.id IS '대체 고유키 UUID';
COMMENT ON COLUMN public.common_code_groups.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.common_code_groups.created_at IS '생성 일시';
COMMENT ON COLUMN public.common_code_groups.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.common_code_groups.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.common_code_groups.group_name IS '그룹 한글 명칭';
COMMENT ON COLUMN public.common_code_groups.description IS '그룹 상세 설명';
COMMENT ON COLUMN public.common_code_groups.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_code_groups.is_use IS '사용 여부 (true: 사용, false: 미사용)';

CREATE TABLE IF NOT EXISTS public.common_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    group_code text NOT NULL,                             -- 참조키: 그룹 코드 (common_code_groups.group_code)
    code_value text NOT NULL,                             -- 코드값 (대문자)
    code_name text NOT NULL,                              -- 코드 한글 표시 명칭
    description text NULL,                                -- 상세 설명
    sort_order integer NOT NULL DEFAULT 1,                -- 표시 정렬 순서
    is_use boolean NOT NULL DEFAULT true,                 -- 사용 여부
    attr_1 text NULL,                                     -- 확장 속성 1
    attr_2 text NULL,                                     -- 확장 속성 2
    CONSTRAINT common_codes_pkey PRIMARY KEY (id),
    CONSTRAINT common_codes_group_code_val_key UNIQUE (group_code, code_value),
    CONSTRAINT common_codes_group_code_fkey FOREIGN KEY (group_code) REFERENCES public.common_code_groups(group_code) ON DELETE CASCADE
);

COMMENT ON TABLE public.common_codes IS '공통 코드 상세 테이블';
COMMENT ON COLUMN public.common_codes.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.common_codes.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.common_codes.created_at IS '생성 일시';
COMMENT ON COLUMN public.common_codes.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.common_codes.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.common_codes.group_code IS '참조키: 그룹 코드 (common_code_groups.group_code)';
COMMENT ON COLUMN public.common_codes.code_value IS '코드값 (대문자)';
COMMENT ON COLUMN public.common_codes.code_name IS '코드 한글 표시 명칭';
COMMENT ON COLUMN public.common_codes.description IS '상세 설명';
COMMENT ON COLUMN public.common_codes.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_codes.is_use IS '사용 여부';
COMMENT ON COLUMN public.common_codes.attr_1 IS '확장 속성 1';
COMMENT ON COLUMN public.common_codes.attr_2 IS '확장 속성 2';

-- 초기 시드 데이터 주입
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
('PLAN_NAME', 'FREE', '무료 플랜', '7일 무료 1대 접속 기본 요금제', 1),
('PLAN_NAME', 'BASIC', '베이직 플랜', '기초 작성자 전용 요금제', 2),
('PLAN_NAME', 'PRO', '프로 플랜', '전문 창작자 전용 요금제', 3),
('PLAN_NAME', 'PREMIUM', '프리미엄 플랜', '기업 및 무제한 전용 요금제', 4),
('PLAN_STATUS', 'ACTIVE', '구독중 (활성)', '정상 이용 중인 활성 상태', 1),
('PLAN_STATUS', 'CANCELED', '해지됨', '구독 해지 신청 상태', 2),
('PLAN_STATUS', 'EXPIRED', '만료됨', '구독 기간 종료 만료 상태', 3),
('BILLING_CYCLE', 'MONTHLY', '월간 결제', '매월 자동 정기 결제', 1),
('BILLING_CYCLE', 'YEARLY', '연간 결제', '매년 자동 정기 결제 (할인 적용)', 2),
('INQUIRY_TYPE', 'GENERAL', '일반 문의', '일반 사용 및 서비스 안내', 1),
('INQUIRY_TYPE', 'BILLING', '결제/구독 문의', '결제, 환불, 요금제 관련 문의', 2),
('INQUIRY_TYPE', 'TECH', '기술 지원', '오류, 버그, 기술 관련 문의', 3),
('INQUIRY_TYPE', 'SUGGESTION', '기능 제안', '신규 기능 및 개선 제안', 4),
('INQUIRY_STATUS', 'PENDING', '접수 대기', '문의가 접수되어 답변 대기 중인 상태', 1),
('INQUIRY_STATUS', 'IN_PROGRESS', '처리 중', '담당자가 확인하여 처리 중인 상태', 2),
('INQUIRY_STATUS', 'RESOLVED', '답변 완료', '문의에 대한 답변 생성이 완료된 상태', 3),
('PAYMENT_STATUS', 'SUCCESS', '결제 성공', 'PG 결제가 정상 승인된 상태', 1),
('PAYMENT_STATUS', 'FAILED', '결제 실패', '잔액 부족/카드 오류 등으로 실패된 상태', 2),
('PAYMENT_STATUS', 'PENDING', '결제 대기', '가상계좌 또는 승인 진행 중인 상태', 3),
('PAYMENT_STATUS', 'CANCELED', '결제 취소', '결제가 취소/환불 처리된 상태', 4),
('AUTH_PROVIDER', 'EMAIL', '이메일 인증', '이메일/비밀번호 기반 자체 인증', 1),
('AUTH_PROVIDER', 'GOOGLE', '구글 소셜 인증', 'Google OAuth 기반 소셜 인증', 2)
ON CONFLICT (group_code, code_value) DO NOTHING;

-- --------------------------------------------------------------------
-- 2. imsi_users 테이블 (회원 기본 원장 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    email text NOT NULL,                                  -- 회원 이메일 주소 (로그인 계정)
    provider text NOT NULL DEFAULT 'EMAIL',               -- 인증 제공자 코드 (공통코드 AUTH_PROVIDER)
    is_deleted boolean NOT NULL DEFAULT false,            -- 계정 탈퇴 여부
    deleted_at timestamptz NULL,                          -- 계정 탈퇴 일시
    nick_name text NULL,                                  -- 회원 활동명 (별명/필명)
    CONSTRAINT imsi_users_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_users_email_key UNIQUE (email)
);

COMMENT ON TABLE public.imsi_users IS '[임시 이관형] 회원 기본 원장 테이블';
COMMENT ON COLUMN public.imsi_users.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_users.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_users.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_users.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_users.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_users.email IS '회원 이메일 주소';
COMMENT ON COLUMN public.imsi_users.provider IS '인증 제공자 코드 (공통코드 AUTH_PROVIDER: EMAIL, GOOGLE)';
COMMENT ON COLUMN public.imsi_users.is_deleted IS '계정 탈퇴 여부';
COMMENT ON COLUMN public.imsi_users.deleted_at IS '계정 탈퇴 일시';
COMMENT ON COLUMN public.imsi_users.nick_name IS '회원 활동명 (별명/필명)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        INSERT INTO public.imsi_users (id, created_by, created_at, updated_by, updated_at, email, provider, is_deleted, deleted_at, nick_name)
        SELECT 
            id,
            id AS created_by,
            now() AS created_at,
            NULL::uuid AS updated_by,
            now() AS updated_at,
            email,
            UPPER(COALESCE(provider, 'EMAIL')) AS provider,
            false AS is_deleted,
            NULL::timestamptz AS deleted_at,
            NULL::text AS nick_name
        FROM public.users
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;


-- --------------------------------------------------------------------
-- 3. imsi_subscriptions 테이블 (구독 & 라이선스 통합 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    user_id uuid NOT NULL,                                -- 참조키: 회원 UUID (imsi_users.id)
    plan_name text NOT NULL DEFAULT 'FREE',               -- 요금제 플랜명 코드 (공통코드 PLAN_NAME: FREE, BASIC, PRO, PREMIUM)
    plan_status text NOT NULL DEFAULT 'ACTIVE',           -- 구독 상태 코드 (공통코드 PLAN_STATUS: ACTIVE, CANCELED, EXPIRED)
    billing_cycle text NOT NULL DEFAULT 'MONTHLY',        -- 결제 주기 코드 (공통코드 BILLING_CYCLE: MONTHLY, YEARLY)
    license_key text NULL,                                -- 소프트웨어 고유 정품 인증키
    payment_no text NULL,                                 -- PG사 결제 고유 번호
    max_devices integer NOT NULL DEFAULT 1,               -- 동시 접속 허용 기기 수
    price_amount numeric(10,2) NOT NULL DEFAULT 0.00,     -- 결제 금액 (원)
    current_period_start timestamptz NOT NULL DEFAULT now(),-- 구독 기간 시작일
    current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),-- 구독 기간 만료일
    canceled_at timestamptz NULL,                         -- 구독 해지 신청일
    is_active boolean NOT NULL DEFAULT true,              -- 구독/라이선스 유효 상태
    CONSTRAINT imsi_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.imsi_users(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.imsi_subscriptions IS '[임시 이관형] 구독 및 라이선스 통합 관리 테이블';
COMMENT ON COLUMN public.imsi_subscriptions.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_subscriptions.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_subscriptions.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_subscriptions.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_subscriptions.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_subscriptions.user_id IS '참조키: 회원 UUID (imsi_users.id)';
COMMENT ON COLUMN public.imsi_subscriptions.plan_name IS '요금제 플랜명 코드 (공통코드 PLAN_NAME)';
COMMENT ON COLUMN public.imsi_subscriptions.plan_status IS '구독 상태 코드 (공통코드 PLAN_STATUS)';
COMMENT ON COLUMN public.imsi_subscriptions.billing_cycle IS '결제 주기 코드 (공통코드 BILLING_CYCLE)';
COMMENT ON COLUMN public.imsi_subscriptions.license_key IS '소프트웨어 고유 정품 인증키';
COMMENT ON COLUMN public.imsi_subscriptions.payment_no IS 'PG사 결제 고유 승인 번호';
COMMENT ON COLUMN public.imsi_subscriptions.max_devices IS '동시 접속 허용 기기 수';
COMMENT ON COLUMN public.imsi_subscriptions.price_amount IS '결제 금액';
COMMENT ON COLUMN public.imsi_subscriptions.current_period_start IS '구독 시작 일시';
COMMENT ON COLUMN public.imsi_subscriptions.current_period_end IS '구독 만료 일시';
COMMENT ON COLUMN public.imsi_subscriptions.canceled_at IS '구독 해지 신청 일시';
COMMENT ON COLUMN public.imsi_subscriptions.is_active IS '구독/라이선스 유효 상태';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        INSERT INTO public.imsi_subscriptions (
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
        LEFT JOIN public.software_licenses l ON l.subscription_id = s.id
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 4. imsi_license_activations 테이블 (기기 동시 접속 세션 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_license_activations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    subscription_id uuid NOT NULL,                        -- 참조키: 구독 UUID (imsi_subscriptions.id)
    device_uuid text NOT NULL,                            -- 기기 고유 식별 세션 UUID
    device_name text NOT NULL DEFAULT 'Web SaaS',         -- 기기/클라이언트 디바이스 명칭
    activated_at timestamptz NOT NULL DEFAULT now(),      -- 세션 활성화 일시
    deactivated_at timestamptz NULL,                      -- 세션 해제 일시
    is_active boolean NOT NULL DEFAULT true,              -- 세션 유효 여부
    CONSTRAINT imsi_license_activations_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_license_activations_sub_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.imsi_subscriptions(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.imsi_license_activations IS '[임시 이관형] 기기 동시 접속 세션 테이블';
COMMENT ON COLUMN public.imsi_license_activations.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_license_activations.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_license_activations.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_license_activations.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_license_activations.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_license_activations.subscription_id IS '참조키: 구독 UUID (imsi_subscriptions.id)';
COMMENT ON COLUMN public.imsi_license_activations.device_uuid IS '기기 고유 식별 세션 UUID';
COMMENT ON COLUMN public.imsi_license_activations.device_name IS '기기/클라이언트 명칭';
COMMENT ON COLUMN public.imsi_license_activations.activated_at IS '접속 활성화 일시';
COMMENT ON COLUMN public.imsi_license_activations.deactivated_at IS '접속 해제 일시';
COMMENT ON COLUMN public.imsi_license_activations.is_active IS '세션 유효 여부';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'license_activations') THEN
        INSERT INTO public.imsi_license_activations (
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
        LEFT JOIN public.software_licenses sl ON sl.id = la.license_id
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 5. imsi_support_inquiries 테이블 (고객 문의 원장 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_support_inquiries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    user_id uuid NULL,                                    -- 참조키: 문의 회원 UUID (imsi_users.id, 비회원 NULL)
    name text NOT NULL,                                   -- 문의자 성명 / 닉네임
    email text NOT NULL,                                  -- 회신받을 이메일 주소
    type text NOT NULL DEFAULT 'GENERAL',                 -- 문의 유형 코드 (공통코드 INQUIRY_TYPE)
    title text NOT NULL,                                  -- 문의 제목
    content text NOT NULL,                                -- 문의 본문 내용
    attachment_urls text[] DEFAULT '{}',                  -- 첨부파일 URL 저장 배열
    status text NOT NULL DEFAULT 'PENDING',               -- 처리 상태 코드 (공통코드 INQUIRY_STATUS)
    CONSTRAINT imsi_support_inquiries_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_support_inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.imsi_users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.imsi_support_inquiries IS '[임시 이관형] 고객 문의하기 접수 원장 테이블';
COMMENT ON COLUMN public.imsi_support_inquiries.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_support_inquiries.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_support_inquiries.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_support_inquiries.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_support_inquiries.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_support_inquiries.user_id IS '참조키: 문의 회원 UUID (imsi_users.id)';
COMMENT ON COLUMN public.imsi_support_inquiries.name IS '문의자 성명';
COMMENT ON COLUMN public.imsi_support_inquiries.email IS '회신받을 이메일 주소';
COMMENT ON COLUMN public.imsi_support_inquiries.type IS '문의 유형 코드 (공통코드 INQUIRY_TYPE)';
COMMENT ON COLUMN public.imsi_support_inquiries.title IS '문의 제목';
COMMENT ON COLUMN public.imsi_support_inquiries.content IS '문의 본문 내용';
COMMENT ON COLUMN public.imsi_support_inquiries.attachment_urls IS '첨부파일 URL 배열';
COMMENT ON COLUMN public.imsi_support_inquiries.status IS '처리 상태 코드 (공통코드 INQUIRY_STATUS)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_inquiries') THEN
        INSERT INTO public.imsi_support_inquiries (
            id, created_by, created_at, updated_by, updated_at, user_id,
            name, email, type, title, content, attachment_urls, status
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
        FROM public.support_inquiries
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 6. imsi_stripe_webhook_raws 테이블 (Stripe 결제 웹훅 로그 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_stripe_webhook_raws (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 이벤트 수신 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    processed_at timestamptz NULL,                        -- 웹훅 처리 완료 일시
    stripe_event_id text NOT NULL,                        -- Stripe 고유 이벤트 ID
    event_type text NOT NULL,                             -- Stripe 이벤트 유형
    payload jsonb NOT NULL,                               -- Stripe 웹훅 원본 JSON 데이터
    status text NOT NULL DEFAULT 'PENDING',               -- 처리 상태 코드 (공통코드 PAYMENT_STATUS)
    CONSTRAINT imsi_stripe_webhook_raws_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_stripe_webhook_raws_stripe_event_id_key UNIQUE (stripe_event_id)
);

COMMENT ON TABLE public.imsi_stripe_webhook_raws IS '[임시 이관형] Stripe 결제 웹훅 원천 로그 테이블';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.created_at IS '이벤트 최초 수신 일시';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.processed_at IS '웹훅 처리 완료 일시';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.stripe_event_id IS 'Stripe 고유 이벤트 식별자';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.event_type IS 'Stripe 이벤트 유형';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.payload IS 'Stripe 웹훅 원본 JSON 데이터';
COMMENT ON COLUMN public.imsi_stripe_webhook_raws.status IS '웹훅 처리 상태 코드 (공통코드 PAYMENT_STATUS)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_webhook_raws') THEN
        INSERT INTO public.imsi_stripe_webhook_raws (
            id, created_by, created_at, updated_by, updated_at, processed_at,
            stripe_event_id, event_type, payload, status
        )
        SELECT 
            id,
            NULL::uuid AS created_by,
            COALESCE(created_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            now() AS updated_at,
            processed_at,
            stripe_event_id,
            event_type,
            payload,
            UPPER(COALESCE(status, 'PENDING')) AS status
        FROM public.stripe_webhook_raws
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 7. imsi_payment_logs 테이블 (결제 정산 이력 로그 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_payment_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    user_id uuid NOT NULL,                                -- 참조키: 회원 UUID (imsi_users.id)
    webhook_raw_id uuid NULL,                             -- 참조키: Stripe 웹훅 로그 UUID (imsi_stripe_webhook_raws.id)
    stripe_invoice_id text NOT NULL,                      -- PG사 결제 인보이스/영수증 ID
    amount integer NOT NULL DEFAULT 0,                    -- 결제 금액 (원)
    currency text NOT NULL DEFAULT 'KRW',                 -- 통화 코드
    payment_status text NOT NULL DEFAULT 'SUCCESS',       -- 결제 상태 코드 (공통코드 PAYMENT_STATUS)
    paid_at timestamptz NOT NULL DEFAULT now(),           -- 결제 승인 완료 일시
    CONSTRAINT imsi_payment_logs_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_payment_logs_stripe_invoice_id_key UNIQUE (stripe_invoice_id),
    CONSTRAINT imsi_payment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.imsi_users(id) ON DELETE RESTRICT,
    CONSTRAINT imsi_payment_logs_webhook_raw_id_fkey FOREIGN KEY (webhook_raw_id) REFERENCES public.imsi_stripe_webhook_raws(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.imsi_payment_logs IS '[임시 이관형] 결제 정산 이력 로그 테이블';
COMMENT ON COLUMN public.imsi_payment_logs.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_payment_logs.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_payment_logs.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_payment_logs.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_payment_logs.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_payment_logs.user_id IS '참조키: 회원 UUID (imsi_users.id)';
COMMENT ON COLUMN public.imsi_payment_logs.webhook_raw_id IS '참조키: Stripe 웹훅 로그 UUID (imsi_stripe_webhook_raws.id)';
COMMENT ON COLUMN public.imsi_payment_logs.stripe_invoice_id IS 'PG사 결제 인보이스/영수증 ID';
COMMENT ON COLUMN public.imsi_payment_logs.amount IS '결제 금액 (원)';
COMMENT ON COLUMN public.imsi_payment_logs.currency IS '통화 코드';
COMMENT ON COLUMN public.imsi_payment_logs.payment_status IS '결제 상태 코드 (공통코드 PAYMENT_STATUS)';
COMMENT ON COLUMN public.imsi_payment_logs.paid_at IS '결제 승인 완료 일시';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_logs') THEN
        INSERT INTO public.imsi_payment_logs (
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
        FROM public.payment_logs
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 8. imsi_daily_payment_summaries 테이블 (일별 정산 집계 요약 - 표준 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_daily_payment_summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    settlement_date date NOT NULL,                        -- 정산 일자 (YYYY-MM-DD)
    total_amount integer NOT NULL DEFAULT 0,              -- 총 금액 (원)
    total_count integer NOT NULL DEFAULT 0,               -- 총 건수 (건)
    CONSTRAINT imsi_daily_payment_summaries_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_daily_payment_summaries_settlement_date_key UNIQUE (settlement_date)
);

COMMENT ON TABLE public.imsi_daily_payment_summaries IS '[임시 이관형] 일별 결제/정산 매출 집계 요약 테이블';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.settlement_date IS '정산 일자 (YYYY-MM-DD)';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.total_amount IS '총 금액 (원)';
COMMENT ON COLUMN public.imsi_daily_payment_summaries.total_count IS '총 건수 (건)';

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_payment_summaries') THEN
        INSERT INTO public.imsi_daily_payment_summaries (
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
        FROM public.daily_payment_summaries
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- N. imsi_password_resets 테이블 (비밀번호 재설정 토큰 - 표준 이관 구조)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.imsi_password_resets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    is_deleted boolean NOT NULL DEFAULT false,            -- 삭제(만료 처리) 여부
    deleted_at timestamptz NULL,                          -- 삭제(만료 처리) 일시
    email text NOT NULL,                                  -- 비밀번호 재설정 대상 이메일
    token text NOT NULL,                                  -- 재설정 토큰 (고유값)
    expires_at timestamptz NOT NULL,                      -- 토큰 만료 일시
    used boolean NOT NULL DEFAULT false,                  -- 토큰 사용 여부 (true: 사용됨)
    CONSTRAINT imsi_password_resets_pkey PRIMARY KEY (id),
    CONSTRAINT imsi_password_resets_token_key UNIQUE (token)
);

COMMENT ON TABLE public.imsi_password_resets IS '[임시 이관형] 비밀번호 재설정 토큰 관리 테이블';
COMMENT ON COLUMN public.imsi_password_resets.id IS '기본키 (Primary Key UUID)';
COMMENT ON COLUMN public.imsi_password_resets.created_by IS '생성자 UUID';
COMMENT ON COLUMN public.imsi_password_resets.created_at IS '생성 일시';
COMMENT ON COLUMN public.imsi_password_resets.updated_by IS '최종 변경자 UUID';
COMMENT ON COLUMN public.imsi_password_resets.updated_at IS '최종 변경 일시';
COMMENT ON COLUMN public.imsi_password_resets.is_deleted IS '소프트 딜리트 여부 (만료/폐기된 토큰)';
COMMENT ON COLUMN public.imsi_password_resets.deleted_at IS '소프트 딜리트 일시';
COMMENT ON COLUMN public.imsi_password_resets.email IS '비밀번호 재설정 대상 이메일';
COMMENT ON COLUMN public.imsi_password_resets.token IS '재설정 토큰 (UUID 또는 해시값, 고유)';
COMMENT ON COLUMN public.imsi_password_resets.expires_at IS '토큰 만료 일시';
COMMENT ON COLUMN public.imsi_password_resets.used IS '토큰 사용 완료 여부 (true: 이미 사용됨)';

CREATE INDEX IF NOT EXISTS idx_imsi_password_resets_token
    ON public.imsi_password_resets USING btree (token) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_imsi_password_resets_email
    ON public.imsi_password_resets USING btree (email) TABLESPACE pg_default;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_resets') THEN
        INSERT INTO public.imsi_password_resets (
            id, created_by, created_at, updated_by, updated_at,
            is_deleted, deleted_at, email, token, expires_at, used
        )
        SELECT
            id,
            NULL::uuid AS created_by,
            COALESCE(created_at, now()) AS created_at,
            NULL::uuid AS updated_by,
            COALESCE(created_at, now()) AS updated_at,
            false AS is_deleted,
            NULL::timestamptz AS deleted_at,
            LOWER(TRIM(email)) AS email,
            token,
            expires_at,
            COALESCE(used, false) AS used
        FROM public.password_resets
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
