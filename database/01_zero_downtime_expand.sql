-- ====================================================================
-- 📊 [Onrivi Author] 무중단 마이그레이션 1단계 : EXPAND (확장 단계)
-- 🎯 서비스 중단 없이 신규 테이블/칼럼을 추가하고, 트리거로 실시간 미러링 및 과거 데이터 백필 수행
-- ====================================================================

BEGIN;

-- 1. 공통코드 그룹/디테일 테이블 신규 생성 (NON-BLOCKING)
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

-- 2. 기존 subscriptions 테이블에 신규 통합 칼럼 무중단 추가 (INSTANT ADD COLUMN)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS license_key text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_no text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 3. 일별 정산 집계 테이블 무중단 추가
CREATE TABLE IF NOT EXISTS public.daily_payment_summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),           -- 기본키 (Primary Key)
    created_by uuid NULL,                                 -- 레코드 생성자 UUID
    created_at timestamptz NOT NULL DEFAULT now(),        -- 생성 일시
    updated_by uuid NULL,                                 -- 레코드 최종 변경자 UUID
    updated_at timestamptz NOT NULL DEFAULT now(),        -- 레코드 최종 변경 일시
    settlement_date date NOT NULL,                        -- 정산 일자 (YYYY-MM-DD)
    total_amount integer NOT NULL DEFAULT 0,              -- 총 금액 (원)
    total_count integer NOT NULL DEFAULT 0,               -- 총 건수 (건)
    CONSTRAINT daily_payment_summaries_pkey PRIMARY KEY (id),
    CONSTRAINT daily_payment_summaries_settlement_date_key UNIQUE (settlement_date)
);

-- 4. 과거 software_licenses 데이터 ➔ subscriptions 신규 칼럼으로 백그라운드 백필(Backfill)
UPDATE public.subscriptions s
SET 
    license_key = l.license_key,
    payment_no = l.payment_no,
    is_active = COALESCE(l.is_active, true),
    plan_name = UPPER(s.plan_name),
    plan_status = UPPER(s.plan_status),
    billing_cycle = UPPER(s.billing_cycle)
FROM public.software_licenses l
WHERE l.subscription_id = s.id;

-- 5. 기존 구버전 앱이 software_licenses에 쏠 때 subscriptions에도 실시간 복사하는 무중단 동기화 트리거
CREATE OR REPLACE FUNCTION trg_fn_sync_software_license_to_sub()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.subscriptions
    SET 
        license_key = NEW.license_key,
        payment_no = NEW.payment_no,
        is_active = NEW.is_active
    WHERE id = NEW.subscription_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_software_license ON public.software_licenses;
CREATE TRIGGER trg_sync_software_license
AFTER INSERT OR UPDATE ON public.software_licenses
FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_software_license_to_sub();

-- 6. 초기 공통코드 시드 데이터 즉시 주입
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

COMMIT;
