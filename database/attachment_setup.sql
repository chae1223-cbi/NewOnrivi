-- ====================================================================
-- 📊 [OMD-DB-ATTACH-0001] attachment_setup
-- 🎯 @KICK  : 문의하기 첨부파일 지원 — storage bucket, RPC 수정, 트리거 업데이트
-- Supabase SQL Editor에서 실행하세요
-- ====================================================================

-- 1. storage bucket 생성 (public read, authenticated insert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- 2. storage RLS: 인증된 사용자만 업로드, 누구나 읽기 가능
CREATE POLICY "support_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments');

CREATE POLICY "support_attachments_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'support-attachments');

-- 3. support_inquiries 테이블에 attachment_urls 컬럼 추가
ALTER TABLE support_inquiries
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';

-- 4. insert_support_inquiry RPC 수정 (p_attachment_urls 파라미터 추가)
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

-- 5. Brevo 이메일 트리거 업데이트 — 첨부파일 다운로드 링크 + 문구 개선
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

  -- 첨부파일 다운로드 링크 생성
  v_file_count := 0;
  IF NEW.attachment_urls IS NOT NULL AND array_length(NEW.attachment_urls, 1) > 0 THEN
    v_attachments_html := '<div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #eff6ff, #f0f9ff); border: 1px solid #bae6fd; border-radius: 12px;">' ||
                          '<h4 style="margin: 0 0 12px 0; font-size: 14px; color: #0369a1; display: flex; align-items: center; gap: 6px;">📎 첨부 파일 다운로드</h4>' ||
                          '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
    FOR i IN 1..array_length(NEW.attachment_urls, 1) LOOP
      v_file_count := v_file_count + 1;
      v_attachments_html := v_attachments_html ||
        '<tr><td style="padding: 6px 0; border-bottom: 1px solid #e0f2fe;">' ||
        '<a href="' || NEW.attachment_urls[i] || '" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 6px;">' ||
        '📄 첨부파일 ' || v_file_count || ' 다운로드</a></td></tr>';
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

-- 6. 트리거 재등록
DROP TRIGGER IF EXISTS trg_support_inquiry_email ON support_inquiries;
CREATE TRIGGER trg_support_inquiry_email
AFTER INSERT ON support_inquiries
FOR EACH ROW
EXECUTE FUNCTION trg_send_brevo_email_on_inquiry();
