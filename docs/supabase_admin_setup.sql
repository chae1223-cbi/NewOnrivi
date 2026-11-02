-- ==========================================
-- [1] admins 테이블 생성
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- [2] Row Level Security (RLS) 활성화
-- ==========================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 누구나 (또는 인증된 사용자 누구나) 자신의 어드민 여부를 조회할 수 있도록 허용
CREATE POLICY "Admins can view their own record"
  ON public.admins
  FOR SELECT
  USING (auth.uid() = user_id);

-- (선택) 어드민만이 다른 어드민 목록을 조회할 수 있도록 허용하는 룰
CREATE POLICY "Admins can view all records"
  ON public.admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = auth.uid()
    )
  );

-- ==========================================
-- [3] 최초 어드민 계정 수동 삽입 안내
-- ==========================================
-- 위 스크립트 실행 후, 대표님께서 구글 소셜 로그인으로 회원가입/로그인을 한 번 완료하신 다음,
-- auth.users 테이블에 생성된 본인의 구글 계정 UID를 복사하여 아래 쿼리로 직접 인서트 하셔야 합니다.
-- 
-- INSERT INTO public.admins (user_id, email)
-- VALUES ('복사한-구글계정-UID-입력', '대표님의-구글이메일@gmail.com');
