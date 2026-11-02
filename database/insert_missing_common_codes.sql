-- 1. SYS_TYPE (시스템 환경) 공통 코드 그룹 추가
INSERT INTO public.common_code_groups (group_code, group_name, description, sort_order) VALUES
('SYS_TYPE', '시스템 환경 타입', '요금제가 적용되는 플랫폼 (웹, 데스크톱 등)', 8)
ON CONFLICT (group_code) DO NOTHING;

-- 2. SYS_TYPE (시스템 환경) 공통 코드 추가
INSERT INTO public.common_codes (group_code, code_value, code_name, description, sort_order) VALUES
('SYS_TYPE', 'WEB', '웹 전용', '브라우저 기반 서비스 지원', 1),
('SYS_TYPE', 'DESKTOP', '데스크톱 전용', '독립 설치형 프로그램 지원', 2),
('SYS_TYPE', 'MIX_SYSTEM', '오프라인 + 웹 듀얼 환경', '웹 및 데스크톱 통합 지원', 3)
ON CONFLICT (group_code, code_value) DO NOTHING;

-- 3. PLAN_NAME (요금제 유형) 신규 공통 코드 추가 (기존 FREE, BASIC 등 외에 실제 사용되는 코드)
INSERT INTO public.common_codes (group_code, code_value, code_name, description, sort_order) VALUES
('PLAN_NAME', 'READER', 'Reader 플랜', '읽기 전용 무료 요금제', 5),
('PLAN_NAME', 'APPRENTICE', 'Apprentice 플랜', '무료 체험 요금제', 6),
('PLAN_NAME', 'REGULAR', 'Regular 플랜', '일반 구독 요금제', 7),
('PLAN_NAME', 'ELITEPRO', 'Elite Pro 플랜', '프리미엄 구독 요금제', 8)
ON CONFLICT (group_code, code_value) DO UPDATE SET code_name = EXCLUDED.code_name;
