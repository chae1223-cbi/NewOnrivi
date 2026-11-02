-- ====================================================================
-- Onrivi Author — Supabase RPC (Stored Procedure) 정의
-- Supabase SQL Editor에서 실행하세요 (DROP + CREATE, 재실행 가능)
-- ====================================================================
-- 주의: 모든 RPC는 JSONB { success, code, message } 반환
--       RLS 정책이 각 테이블에 올바르게 설정되어 있어야 함
-- ====================================================================

-- ====================================================================
-- 1. cancel_subscription
-- 구독 상태를 CANCELED로 변경하고 라이선스를 비활성화
-- ====================================================================
DROP FUNCTION IF EXISTS cancel_subscription(p_subscription_id uuid, p_user_id uuid);
CREATE OR REPLACE FUNCTION cancel_subscription( -- 🔐 구독 해지
  p_subscription_id uuid,  -- 🔑 구독 ID
  p_user_id uuid           -- 🔑 사용자 ID
) RETURNS jsonb -- 📤 JSONB 응답
LANGUAGE plpgsql -- ⚙️ PL/pgSQL 함수
SECURITY DEFINER -- 🔒 보안 정의
SET search_path = public -- 🗄️ 스키마 설정
AS $$
DECLARE
  v_now text; -- ⏱️ 현재 시간
BEGIN
  v_now := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');

  -- 🔐 구독 상태 변경
  UPDATE subscriptions  -- 🏷️ 구독 정보 업데이트
  SET plan_status = 'CANCELED', -- 🏷️ 요금제 상태를 '해지'
      is_expired = 'Y', -- 🏷️ 만료 여부를 'Y'로 설정
      plan_end_date = v_now -- 🏷️ 종료일을 현재 시간으로 설정
  WHERE id = p_subscription_id
    AND user_id = p_user_id
    AND is_expired = 'N';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', '해지할 구독을 찾을 수 없습니다.');
  END IF;

  -- 🔗 연결된 라이선스 비활성화
  UPDATE software_licenses -- 🏷️ 소프트웨어 라이선스 정보 업데이트
  SET is_active = false -- 🏷️ 라이선스 상태를 '비활성화'
  WHERE subscription_id = p_subscription_id;

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '구독이 해지되었습니다.'); -- 📤 성공 응답
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM); -- ❌ 오류 응답
END;
$$;

-- ====================================================================
-- 2. delete_user_account
-- 사용자 계정 및 모든 연결 데이터 정리
-- (auth.users는 Supabase Management API로만 삭제 가능하므로
--  로컬 users 레코드만 삭제하고 라이선스/구독은 비활성화)
-- ====================================================================
DROP FUNCTION IF EXISTS delete_user_account(p_user_id uuid);
CREATE OR REPLACE FUNCTION delete_user_account(   -- 회원 탈퇴
  p_user_id uuid  -- 🔑 사용자 ID
) RETURNS jsonb  -- 📤 JSONB 응답
LANGUAGE plpgsql  -- ⚙️ PL/pgSQL 함수
SECURITY DEFINER  -- 🔒 보안 정의
SET search_path = public  -- 🗄️ 스키마 설정
AS $$
DECLARE
  v_now text;
BEGIN
  v_now := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');

  -- 모든 활성 구독 해지
  -- UPDATE subscriptions
  -- SET plan_status = 'CANCELED',
  --     is_expired = 'Y',
  --     plan_end_date = v_now
  -- WHERE user_id = p_user_id
  --   AND is_expired = 'N';

  -- 모든 라이선스 비활성화
 -- UPDATE software_licenses
 -- SET is_active = false
 -- WHERE user_id = p_user_id;

  -- 모든 기기 접속 세션 삭제
  DELETE FROM license_activations
  WHERE license_id IN (
    SELECT id FROM software_licenses WHERE user_id = p_user_id
  );

  -- users 레코드 삭제 대신 소프트 딜리트
  UPDATE users SET is_deleted = true, deleted_at = now() WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '회원 탈퇴가 완료되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 3. deactivate_session_on_logout
-- 로그아웃 시 특정 기기 세션 제거 (payment_no 기준 조회)
-- ====================================================================
DROP FUNCTION IF EXISTS deactivate_session_on_logout(p_payment_no text, p_device_uuid text);
CREATE OR REPLACE FUNCTION deactivate_session_on_logout(
  p_payment_no text,
  p_device_uuid text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_id uuid;
BEGIN
  -- payment_no로 license_id 조회
  SELECT id INTO v_license_id
  FROM software_licenses
  WHERE payment_no = p_payment_no
  LIMIT 1;

  IF v_license_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', '해당 결제번호의 라이선스를 찾을 수 없습니다.');
  END IF;

  -- 해당 세션만 삭제
  DELETE FROM license_activations
  WHERE license_id = v_license_id
    AND device_uuid = p_device_uuid;

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '세션이 해제되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 4. delete_license_activation
-- 에디터 로그아웃 시 특정 기기 세션 제거 (payment_no + device_uuid)
-- ====================================================================
DROP FUNCTION IF EXISTS delete_license_activation(p_payment_no text, p_device_uuid text);
CREATE OR REPLACE FUNCTION delete_license_activation(
  p_payment_no text,
  p_device_uuid text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license_id uuid;
BEGIN
  SELECT id INTO v_license_id
  FROM software_licenses
  WHERE payment_no = p_payment_no
  LIMIT 1;

  IF v_license_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', '해당 결제번호의 라이선스를 찾을 수 없습니다.');
  END IF;

  DELETE FROM license_activations
  WHERE license_id = v_license_id
    AND device_uuid = p_device_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', '해당 세션을 찾을 수 없습니다.');
  END IF;

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '라이선스 활성화가 해제되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 5. delete_device_activation
-- 대시보드 기기 관리 UI에서 특정 activation 레코드 삭제
-- ====================================================================
DROP FUNCTION IF EXISTS delete_device_activation(p_activation_id uuid);
CREATE OR REPLACE FUNCTION delete_device_activation(    -- 대시보드 기기 해제
  p_activation_id uuid  -- 🔑 기기 접속 ID
) RETURNS jsonb  -- 📤 JSONB 응답
LANGUAGE plpgsql  -- ⚙️ PL/pgSQL 함수
SECURITY DEFINER  -- 🔒 보안 정의
SET search_path = public  -- 🗄️ 스키마 설정
AS $$
BEGIN
  DELETE FROM license_activations WHERE id = p_activation_id;  -- 🏷️ 기기 접속 정보 삭제

  IF NOT FOUND THEN  -- 🔍 삭제할 데이터 없음
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', '해당 기기 접속  정보를 찾을 수 없습니다.');
  END IF;

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '기기가 해제되었습니다.');  -- 📤 성공 응답
EXCEPTION
  WHEN OTHERS THEN  -- ❌ 오류 발생
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 6. subscribe_user_plan
-- 구독/라이선스/기기활성화를 단일 트랜잭션으로 생성 (재가입/재구독 대응)
-- ====================================================================
DROP FUNCTION IF EXISTS subscribe_user_plan(p_user_id uuid, p_plan_name text, p_plan_status text, p_billing_interval text, p_max_devices int, p_period_end text, p_plan_end_date text, p_today_str text, p_device_uuid text, p_device_name text);
CREATE OR REPLACE FUNCTION subscribe_user_plan(
  p_user_id uuid,  -- 🔑 사용자 ID
  p_plan_name text, -- 🎯 요금제 이름
  p_plan_status text, -- 🛡️ 상태
  p_billing_interval text, -- 🛡️ 구독 간격
  p_max_devices int, -- 🔒 최대 기기 수
  p_period_end text, -- 🛡️ 기간 종료일
  p_plan_end_date text, -- 🛡️ 요금제 종료일
  p_today_str text, -- ⏰ 오늘 날짜
  p_device_uuid text, -- 🔐 디바이스 UUID
  p_device_name text -- 🛡️ 디바이스 이름
) RETURNS jsonb -- 📤 JSONB 응답
LANGUAGE plpgsql -- ⚙️ PL/pgSQL 함수
SECURITY DEFINER -- 🔒 보안 정의
SET search_path = public -- 🗄️ 스키마 설정
AS $$
DECLARE -- 📦 변수 선언
  v_subscription_id uuid; -- 🆔 구독 ID
  v_license_id uuid; -- 🆔 라이선스 ID
  v_license_key text; -- 🆔 라이선스 키
  v_verify_key text; -- 🆔 인증 키
  v_payment_no text; -- 🆔 결제번호
BEGIN -- 🚀 함수 시작
  -- 1. 기존 활성 구독이 있으면 해지
  UPDATE subscriptions
  SET plan_status = 'CANCELED', -- 🛡️ 상태 변경
      is_expired = 'Y', -- 🛡️ 만료
      plan_end_date = p_today_str -- 🛡️ 종료일 설정
  WHERE user_id = p_user_id -- 🔑 사용자 ID
    AND is_expired = 'N';

  -- 2. 구독 생성 
  v_subscription_id := gen_random_uuid(); -- 🆔 구독 ID 생성
  INSERT INTO subscriptions (
    id, user_id, plan_name, plan_status, billing_interval, -- 🆔 구독 정보
    max_devices, current_period_end, plan_start_date, -- 🛡️ 기간 정보
    is_expired, plan_end_date, created_at -- 🛡️ 상태 정보
  ) VALUES (
    v_subscription_id, p_user_id, p_plan_name, p_plan_status, p_billing_interval, -- 🆔 구독 정보
    p_max_devices, p_period_end::timestamptz, p_today_str, -- 🛡️ 기간 정보
    'N', p_plan_end_date, now()
  );

  -- 3. 라이선스 생성
  v_license_id := gen_random_uuid(); -- 🆔 라이선스 ID 생성
  v_license_key := upper(substr(md5(random()::text || clock_timestamp() ::text), 1, 16)); -- 🆔 라이선스 키 생성
  v_verify_key := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 16)); -- 🆔 인증 키 생성
  v_payment_no := 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 8)); -- 🆔 결제번호 생성

  INSERT INTO software_licenses (
    id, subscription_id, user_id, license_key, verify_key,
    payment_no, is_active
  ) VALUES (
    v_license_id, v_subscription_id, p_user_id, v_license_key, v_verify_key,
    v_payment_no,
    CASE WHEN p_plan_status = 'FREE' THEN false ELSE true END
  );

  -- 4. 기기 활성화 (기존 동일 기기 세션은 삭제 후 재생성)
  DELETE FROM license_activations
  WHERE license_id = v_license_id
    AND device_uuid = p_device_uuid;

  INSERT INTO license_activations (license_id, device_uuid, device_name, activated_at)
  VALUES (v_license_id, p_device_uuid, p_device_name, now());

  RETURN jsonb_build_object(
    'success', true, 'code', 'SUCCESS', 'message', '플랜이 활성화되었습니다.',
    'license_key', v_license_key,
    'verify_key', v_verify_key,
    'payment_no', v_payment_no,
    'subscription_id', v_subscription_id,
    'license_id', v_license_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 7. upsert_user
-- 사용자 정보 동기화 (처음 로그인 시 자동 생성)
-- ====================================================================
DROP FUNCTION IF EXISTS upsert_user(p_id uuid, p_email text, p_provider text);
CREATE OR REPLACE FUNCTION upsert_user(
  p_id uuid,                         -- 👤 users 테이블 id
  p_email text,                      -- 👤 users 테이블 email
  p_provider text                    -- 👤 users 테이블 provider
) RETURNS jsonb
LANGUAGE plpgsql                         -- 🔗 플루이드한 타입 사용 및 예외처리 지원을 위해 plpgsql로 구현
SECURITY DEFINER                   -- 🔐 RLS 정책을 우회하는 보안 설정
SET search_path = public             -- 📁 테이블 스키마를 public으로 설정
AS $$
BEGIN
  -- users 레코드 확인 및 생성 (탈퇴자 재가입 시 is_deleted=false로 재활성화)
  INSERT INTO users (id, email, provider)
  VALUES (p_id, p_email, p_provider)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    provider = EXCLUDED.provider,
    is_deleted = false,
    deleted_at = null;

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '사용자 동기화 완료'); -- 📤 성공 반환
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM); -- 📤 실패 반환
END;
$$;

-- ====================================================================
-- 8. insert_license_activation
-- 로그인/OAuth 콜백 시 기기 세션 등록
-- ====================================================================
DROP FUNCTION IF EXISTS insert_license_activation(p_license_id uuid, p_device_uuid text, p_device_name text);
CREATE OR REPLACE FUNCTION insert_license_activation(   -- 20260705 max_devices 제한 추가 @PATCH
  p_license_id uuid,                   -- 🆔 라이선스 ID
  p_device_uuid text,                  -- 🆔 디바이스 UUID
  p_device_name text                   -- 🆔 디바이스 이름
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id uuid;
  v_max_devices int;
  v_active_count int;
BEGIN
  -- 1. 해당 라이선스의 구독 정보 조회
  SELECT sl.subscription_id, sub.max_devices
  INTO v_sub_id, v_max_devices
  FROM software_licenses sl
  LEFT JOIN subscriptions sub ON sub.id = sl.subscription_id
  WHERE sl.id = p_license_id;

  -- 2. 기존 동일 기기 세션 제거
  DELETE FROM license_activations
  WHERE license_id = p_license_id
    AND device_uuid = p_device_uuid;

  -- 3. max_devices가 설정되어 있으면 제한 검사 (NULL이면 무제한)
  IF v_max_devices IS NOT NULL AND v_max_devices > 0 THEN
    SELECT COUNT(*) INTO v_active_count
    FROM license_activations
    WHERE license_id = p_license_id;

    IF v_active_count >= v_max_devices THEN
      RETURN jsonb_build_object(
        'success', false, 'code', 'ERR_MAX_DEVICES_EXCEEDED',
        'message', format('최대 %s대까지 동시 접속 가능합니다.', v_max_devices),
        'max_devices', v_max_devices
      );
    END IF;
  END IF;

  -- 4. 신규 세션 등록
  INSERT INTO license_activations (license_id, device_uuid, device_name, activated_at)
  VALUES (p_license_id, p_device_uuid, p_device_name, now());

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '기기가 활성화되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 9. upsert_license_activation
-- 라이선스 모달에서 기기 세션 등록/갱신
-- ====================================================================
DROP FUNCTION IF EXISTS upsert_license_activation(p_license_id uuid, p_device_uuid text, p_device_name text);
CREATE OR REPLACE FUNCTION upsert_license_activation(
  p_license_id uuid,
  p_device_uuid text,
  p_device_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO license_activations (license_id, device_uuid, device_name, activated_at)
  VALUES (p_license_id, p_device_uuid, p_device_name, now())
  ON CONFLICT (license_id, device_uuid) DO UPDATE SET
    device_name = EXCLUDED.device_name,
    activated_at = now();

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '기기 활성화가 갱신되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 10. check_user_by_email
-- 회원가입 시 public.users 존재 여부/탈퇴 여부 확인 (RLS 우회용 SECURITY DEFINER)
-- ====================================================================
DROP FUNCTION IF EXISTS check_user_by_email(p_email text);

CREATE OR REPLACE FUNCTION check_user_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE email = p_email LIMIT 1;

  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object('exists', false, 'is_deleted', false);
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'id', v_user.id,
    'is_deleted', v_user.is_deleted
  );
END;
$$;

-- ====================================================================
-- 11. insert_support_inquiry
-- 문의하기 접수 — attachment_urls(text[]) 지원
-- ====================================================================
DROP FUNCTION IF EXISTS insert_support_inquiry(p_name text, p_email text, p_type text, p_title text, p_content text, p_user_id uuid, p_attachment_urls text[]);
CREATE OR REPLACE FUNCTION insert_support_inquiry(
  p_name text,
  p_email text,
  p_type text,
  p_title text,
  p_content text,
  p_user_id uuid DEFAULT NULL,
  p_attachment_urls text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inquiry_id uuid;
BEGIN
  INSERT INTO support_inquiries (name, email, type, title, content, user_id, attachment_urls)
  VALUES (p_name, p_email, p_type, p_title, p_content, p_user_id, COALESCE(p_attachment_urls, '{}'))
  RETURNING id INTO v_inquiry_id;

  RETURN jsonb_build_object(
    'success', true, 'code', 'SUCCESS', 'message', '문의가 접수되었습니다.',
    'inquiry_id', v_inquiry_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

-- ====================================================================
-- 12. expire_subscription_and_license
-- 자동 만료 시 단일 트랜잭션으로 구독, 라이선스 비활성화 및 세션 해제 처리
-- ====================================================================
DROP FUNCTION IF EXISTS expire_subscription_and_license(p_subscription_id uuid);
CREATE OR REPLACE FUNCTION expire_subscription_and_license(
  p_subscription_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now text;
BEGIN
  v_now := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');

  -- 1. 구독 상태를 EXPIRED로 변경
  UPDATE subscriptions
  SET plan_status = 'EXPIRED',
      is_expired = 'Y',
      plan_end_date = v_now
  WHERE id = p_subscription_id
    AND is_expired = 'N';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', '만료 처리할 구독을 찾을 수 없거나 이미 만료되었습니다.');
  END IF;

  -- 2. 해당 구독에 연결된 라이선스 비활성화
  UPDATE software_licenses
  SET is_active = false
  WHERE subscription_id = p_subscription_id;

  -- 3. 해당 라이선스의 활성 기기 세션 모두 삭제
  DELETE FROM license_activations
  WHERE license_id IN (
    SELECT id FROM software_licenses WHERE subscription_id = p_subscription_id
  );

  RETURN jsonb_build_object('success', true, 'code', 'SUCCESS', 'message', '구독 만료 처리가 완료되었습니다.');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'ERROR', 'message', SQLERRM);
END;
$$;

