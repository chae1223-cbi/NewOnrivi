-- 🚨 @PATCH : 2026-11-04 — [관리자 권한 상태] 기존 관리자 유지와 즉시 접근 차단을 위한 is_active 열 추가
-- 관리자 권한 해제 상태를 관리자 레코드와 분리하여 보존한다.
-- 기존 관리자는 배포 시 계속 활성 상태를 유지한다.
BEGIN;
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
COMMIT;
