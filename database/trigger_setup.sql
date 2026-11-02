-- ====================================================================
-- 📊 [OMD-DB-TRIGGER-0001] trg_send_brevo_email_on_inquiry
-- 🎯 @KICK  : 문의하기 접수 시 DB 자체 트리거(pg_net)를 통해 Brevo 이메일 자동 발송
-- 🚨 @PATCH : 2026-06-29 — 정적 웹 환경(output: 'export')에서의 API 통신 한계 극복을 위해 데이터베이스 트리거 기반 메일 발송 로직 신규 구축
--             2026-07-04 — 첨부파일 다운로드 링크 및 이메일 템플릿 전면 개선
-- ====================================================================

-- 1. pg_net 익스텐션 활성화 (HTTP 요청용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- URL 디코딩 PL/pgSQL 헬퍼 함수 정의
CREATE OR REPLACE FUNCTION url_decode(input text) RETURNS text AS $$
DECLARE
  bin bytea = '';
  byte text;
  i int = 1;
  len int;
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;
  len := length(input);
  WHILE i <= len LOOP
    IF substr(input, i, 1) = '%' AND i + 2 <= len AND substr(input, i + 1, 2) ~ '^[0-9a-fA-F]{2}$' THEN
      byte = substr(input, i + 1, 2);
      bin = bin || decode(byte, 'hex');
      i = i + 3;
    ELSIF substr(input, i, 1) = '+' THEN
      bin = bin || decode('20', 'hex');
      i = i + 1;
    ELSE
      bin = bin || substr(input, i, 1)::bytea;
      i = i + 1;
    END IF;
  END LOOP;
  RETURN convert_from(bin, 'utf-8');
EXCEPTION
  WHEN OTHERS THEN
    RETURN input;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 2. 문의 알림 이메일 발송 트리거 함수 생성
CREATE OR REPLACE FUNCTION trg_send_brevo_email_on_inquiry()
RETURNS trigger AS $$
DECLARE
  v_payload jsonb;
  v_type_label text;
  v_attachments_html text;
  v_file_count int;
BEGIN
  CASE NEW.type
    WHEN 'general' THEN v_type_label := '일반 문의 / 기타';
    WHEN 'billing' THEN v_type_label := '요금제 / 결제 / 환불 문의';
    WHEN 'tech' THEN v_type_label := '기술 지원 / 오류 제보';
    WHEN 'suggestion' THEN v_type_label := '서비스 건의 / 파트너 제휴';
    ELSE v_type_label := '일반 문의';
  END CASE;

  -- 첨부파일 다운로드 링크 생성 (Cloudflare R2 URL)
  v_file_count := 0;
  IF NEW.attachment_urls IS NOT NULL AND array_length(NEW.attachment_urls, 1) > 0 THEN
    v_attachments_html := '<div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #eff6ff, #f0f9ff); border: 1px solid #bae6fd; border-radius: 12px;">' ||
                          '<h4 style="margin: 0 0 12px 0; font-size: 14px; color: #0369a1; display: flex; align-items: center; gap: 6px;">📎 첨부 파일 다운로드</h4>' ||
                          '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
    FOR i IN 1..array_length(NEW.attachment_urls, 1) LOOP
      DECLARE
        v_raw_filename text;
        v_clean_filename text;
      BEGIN
        v_file_count := v_file_count + 1;
        -- URL에서 마지막 파일명 세그먼트만 파싱
        v_raw_filename := substring(NEW.attachment_urls[i] from '[^/]+$');
        -- 디코딩 복원 및 난수 제거 (R2 고유 식별 타임스탬프 등 정제)
        v_clean_filename := url_decode(v_raw_filename);
        
        -- 혹시 R2 고유 난수가 1783125222_unique_우리안양.pdf 처럼 붙어 있다면
        -- 첫번째와 두번째 언더스코어(_) 이후의 실제 원본 파일명만 정밀 파싱
        IF v_clean_filename ~ '^[0-9]+_[a-z0-9]+_' THEN
          v_clean_filename := substring(v_clean_filename from '^[0-9]+_[a-z0-9]+_(.*)$');
        END IF;

        v_attachments_html := v_attachments_html ||
          '<tr><td style="padding: 6px 0; border-bottom: 1px solid #e0f2fe;">' ||
          '<a href="' || CASE WHEN NEW.attachment_urls[i] LIKE '/%' THEN 'https://onrivi.com' ELSE '' END || NEW.attachment_urls[i] || '" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 6px;">' ||
          '📄 ' || v_clean_filename || ' 다운로드</a></td></tr>';
      END;
    END LOOP;
    v_attachments_html := v_attachments_html || '</table></div>';
  ELSE
    v_attachments_html := '';
  END IF;

  v_payload := jsonb_build_object(
    'sender', jsonb_build_object('name', 'Onrivi Author', 'email', 'support@onrivi.com'),
    'to', jsonb_build_array(jsonb_build_object('email', 'firstonrivi@onrivi.com', 'name', 'Onrivi Author 관리자')),
    'replyTo', jsonb_build_object('email', NEW.email, 'name', NEW.name),
    'subject', '[온리비 문의] ' || v_type_label || ' — ' || NEW.title,
    'htmlContent', '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">' ||
                   '<div style="text-align: center; margin-bottom: 24px;">' ||
                   '<img src="https://onrivi.com/icon.png" alt="Onrivi" style="width: 48px; height: 48px; border-radius: 12px;" />' ||
                   '<h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px;">온리비 문의가 접수되었습니다</h2>' ||
                   '<p style="color: #64748b; font-size: 13px; margin: 0;">' || to_char(NEW.created_at::timestamptz AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') || ' 접수</p></div>' ||
                   '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; background: #f8fafc; border-radius: 12px; padding: 16px;">' ||
                   '<tr><td style="padding: 10px 16px; font-weight: 600; color: #475569; width: 100px; white-space: nowrap;">👤 이름</td><td style="padding: 10px 16px; color: #0f172a;">' || NEW.name || '</td></tr>' ||
                   '<tr><td style="padding: 10px 16px; font-weight: 600; color: #475569;">📧 이메일</td><td style="padding: 10px 16px; color: #0f172a;"><a href="mailto:' || NEW.email || '" style="color: #2563eb;">' || NEW.email || '</a></td></tr>' ||
                   '<tr><td style="padding: 10px 16px; font-weight: 600; color: #475569;">📂 유형</td><td style="padding: 10px 16px; color: #0f172a;"><span style="background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600;">' || v_type_label || '</span></td></tr>' ||
                   '<tr><td style="padding: 10px 16px; font-weight: 600; color: #475569;">📌 제목</td><td style="padding: 10px 16px; color: #0f172a; font-weight: 700;">' || NEW.title || '</td></tr>' ||
                   '</table>' ||
                   '<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">' ||
                   '<h4 style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">📝 문의 내용</h4>' ||
                   '<div style="font-size: 14px; color: #0f172a; line-height: 1.7; white-space: pre-wrap;">' ||
                   replace(replace(NEW.content, '<', '&lt;'), '>', '&gt;') ||
                   '</div></div>' ||
                   v_attachments_html ||
                   '<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">' ||
                   '이 메일은 onrivi.com 문의하기를 통해 자동 발송되었습니다.<br>' ||
                   '답장하시려면 이 메일의 [Reply] 버튼을 클릭하거나 ' ||
                   '<a href="mailto:' || NEW.email || '" style="color: #2563eb;">' || NEW.email || '</a>로 직접 회신해 주세요.</div>' ||
                   '</div>'
  );

  PERFORM net.http_post(
      url:='https://api.brevo.com/v3/smtp/email',
      headers:=jsonb_build_object(
          'accept', 'application/json',
          'content-type', 'application/json',
          'api-key', 'YOUR_BREVO_API_KEY_HERE'
      ),
      body:=v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. support_inquiries 테이블에 INSERT 이후 실행되는 트리거 등록
DROP TRIGGER IF EXISTS trg_support_inquiry_email ON support_inquiries;
CREATE TRIGGER trg_support_inquiry_email
AFTER INSERT ON support_inquiries
FOR EACH ROW
EXECUTE FUNCTION trg_send_brevo_email_on_inquiry();

-- 4. attachment_urls 컬럼 추가 (없는 경우)
ALTER TABLE support_inquiries
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';
