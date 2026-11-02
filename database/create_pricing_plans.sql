CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_by uuid,
    updated_at timestamptz DEFAULT now(),
    
    plan_code varchar(50) NOT NULL UNIQUE, 
    sys_type varchar(50) NOT NULL, 
    
    tagline varchar(255),
    badge varchar(50),
    is_free boolean DEFAULT false,
    tier_emoji varchar(10),
    
    price_monthly integer,
    price_monthly_usd numeric(10, 2),
    price_yearly integer,
    price_yearly_usd numeric(10, 2),
    
    features jsonb DEFAULT '[]'::jsonb,
    cta varchar(100),
    cta_variant varchar(50),
    is_highlighted boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true
);

INSERT INTO public.pricing_plans (plan_code, sys_type, tagline, badge, is_free, tier_emoji, price_monthly, price_monthly_usd, price_yearly, price_yearly_usd, features, cta, cta_variant, is_highlighted, sort_order) VALUES
('READER', 'WEB', '평생 무료 읽기 전용', '🥉', true, '🥉', null, null, null, null, '["회원가입 시 세상의 모든 마크다운 문서를 제한 없이 자유롭게 읽기 가능"]', '무료 회원가입', 'secondary', false, 1),
('APPRENTICE', 'WEB', '14일 무료 체험', '🥈', true, '🥈', null, null, null, null, '["가입 후 14일 동안 모든 문서 읽기 + 편집 기능 무료 체험", "편집(Write): 단 1개의 브라우저에서만 작성 가능", "웹 뷰어: 모든 마크다운 문서를 브라우저로 원클릭 공유!"]', '무료 체험 시작', 'secondary', false, 2),
('REGULAR', 'WEB', '월 3,000원 / 연 30,000원', '🥇', false, '🥇', 3000, 2.00, 30000, null, '["매달 가볍게 시작하는 월간 구독 또는 합리적인 연간 구독 선택", "편집(Write): 1개의 브라우저에서만 문서 편집 가능", "웹 뷰어: 모든 마크다운 문서를 브라우저로 원클릭 공유!"]', '구독 시작', 'primary', true, 3),
('ELITEPRO', 'DESKTOP', '오프라인 + 웹 듀얼 환경', '💎', false, '💎', null, null, 45000, 30.00, '["내 컴퓨터에 직접 설치하는 독립 설치형 프로그램 제공", "설치 권한: 단 1대 PC 설치 및 고유 인증", "설치한 PC에서 무제한 읽기/편집 가능", "웹 뷰어: 모든 마크다운 문서를 브라우저로 원클릭 공유!"]', 'Elite Pro 구독', 'primary', false, 4)
ON CONFLICT (plan_code) DO NOTHING;
