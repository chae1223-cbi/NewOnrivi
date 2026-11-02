-- ====================================================================
-- 📊 [Onrivi Author] 무중단 마이그레이션 3단계 : CONTRACT (축소 및 정리 단계)
-- 🎯 모든 신규 앱 배포 완료 후, 임시 무중단 동기화 트리거를 제거하고 레거시 테이블 완전 삭제
-- ====================================================================

BEGIN;

-- 1. 임시 동기화 트리거 및 함수 제거
DROP TRIGGER IF EXISTS trg_sync_software_license ON public.software_licenses;
DROP FUNCTION IF EXISTS trg_fn_sync_software_license_to_sub();

-- 2. 미사용 레거시 테이블 삭제
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.software_licenses CASCADE;

COMMIT;
