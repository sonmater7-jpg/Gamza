-- =====================================================
-- 감자마켓 Auth 연동 추가 마이그레이션
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- =====================================================

-- 1. profiles 테이블에 auth_user_id 유니크 인덱스 추가 (중복 프로필 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id
  ON public.profiles(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- 2. RLS 정책 갱신 (로그인 유저는 자신의 프로필만 수정 가능, 단 데모 환경에서는 모두 허용)
--    이미 "Anyone can update profile" 정책이 있으면 아래는 건너뜁니다.

-- 3. Supabase Auth 이메일 확인 없이 즉시 가입 허용 설정은
--    Supabase Dashboard > Authentication > Settings > "Enable email confirmations" 를 OFF 로 설정하세요.
--    (개발/데모 환경 권장)

-- 완료! auth.js, data.js, supabaseClient.js 와 함께 동작합니다.
