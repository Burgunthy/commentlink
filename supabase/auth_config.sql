-- ============================================================
-- DMify — Supabase Auth & RLS Setup
-- ============================================================
--
-- 이 파일은 Supabase 프로젝트의 SQL Editor에서 실행하세요.
-- https://supabase.com/dashboard → SQL Editor → New Query
--
-- 순서:
--   1. RLS (Row Level Security) 활성화
--   2. Auth helpers (사용자 매핑 뷰)
--   3. RLS 정책 (accounts, products, posts, conversations)
--   4. 인증 설정 가이드
-- ============================================================

-- ----------------------------------------------------------
-- 1. RLS 활성화 (모든 테이블)
-- ----------------------------------------------------------
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- 2. Auth helpers
-- ----------------------------------------------------------

-- accounts 테이블에 owner_uid 컬럼 추가 (인증된 사용자 소유권)
-- 이미 컬럼이 있으면 에러를 무시합니다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'owner_uid'
  ) THEN
    ALTER TABLE accounts ADD COLUMN owner_uid UUID REFERENCES auth.users(id);
    COMMENT ON COLUMN accounts.owner_uid IS 'Supabase Auth user who owns this account';
  END IF;
END $$;

-- products 테이블에 owner_uid 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'owner_uid'
  ) THEN
    ALTER TABLE products ADD COLUMN owner_uid UUID REFERENCES auth.users(id);
    COMMENT ON COLUMN products.owner_uid IS 'Supabase Auth user who owns this product';
  END IF;
END $$;

-- posts 테이블에 owner_uid 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'owner_uid'
  ) THEN
    ALTER TABLE posts ADD COLUMN owner_uid UUID REFERENCES auth.users(id);
    COMMENT ON COLUMN posts.owner_uid IS 'Supabase Auth user who owns this post entry';
  END IF;
END $$;

-- ----------------------------------------------------------
-- 3. RLS 정책 — accounts
-- ----------------------------------------------------------

-- 인증된 사용어는 자신의 계정만 읽을 수 있음
CREATE POLICY "accounts_select_own"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_uid);

-- 인증된 사용자는 자신의 계정에만 쓸 수 있음
CREATE POLICY "accounts_insert_own"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "accounts_update_own"
  ON accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_uid)
  WITH CHECK (auth.uid() = owner_uid);

-- DELETE는 soft-delete (PATCH로 is_active=false)를 사용하므로 정책 불필요
-- Webhook 서버 (service_role)는 모든 계정에 접근해야 하므로:
CREATE POLICY "accounts_service_role_all"
  ON accounts FOR ALL
  TO service_role
  USING (true);

-- ----------------------------------------------------------
-- 4. RLS 정책 — products
-- ----------------------------------------------------------

CREATE POLICY "products_select_own"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_uid);

CREATE POLICY "products_insert_own"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_uid)
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "products_service_role_all"
  ON products FOR ALL
  TO service_role
  USING (true);

-- ----------------------------------------------------------
-- 5. RLS 정책 — posts
-- ----------------------------------------------------------

CREATE POLICY "posts_select_own"
  ON posts FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_uid);

CREATE POLICY "posts_insert_own"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_uid)
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "posts_service_role_all"
  ON posts FOR ALL
  TO service_role
  USING (true);

-- ----------------------------------------------------------
-- 6. RLS 정책 — conversations
-- (webhook만 쓰므로 service_role만 허용)
-- ----------------------------------------------------------

CREATE POLICY "conversations_service_role_all"
  ON conversations FOR ALL
  TO service_role
  USING (true);

-- 인증된 사용자는 자기 계정의 대화만 읽을 수 있음
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE owner_uid = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- 7. 자동 owner_uid 설정 (new_account_after_trigger)
--   새 계정 생성 시 owner_uid를 현재 인증 사용자로 자동 설정
-- ----------------------------------------------------------

CREATE OR REPLACE FUNCTION set_owner_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_uid IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.owner_uid := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_account_insert ON accounts;
CREATE TRIGGER on_account_insert
  BEFORE INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_uid();

DROP TRIGGER IF EXISTS on_product_insert ON products;
CREATE TRIGGER on_product_insert
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_uid();

DROP TRIGGER IF EXISTS on_post_insert ON posts;
CREATE TRIGGER on_post_insert
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_uid();

-- ============================================================
-- 설정 완료!
-- ============================================================

-- ============================================================
-- SETUP INSTRUCTIONS / 설정 가이드
-- ============================================================
--
-- ## Supabase Auth 설정 방법
--
-- ### Step 1: Supabase 프로젝트 생성
--   1. https://supabase.com → 새 프로젝트 생성
--   2. 데이터베이스 비밀번호 설정
--   3. 리전 선택 (서울 또는 도쿄 권장)
--
-- ### Step 2: 테이블 스키마 적용
--   1. schema.sql을 Supabase SQL Editor에서 실행
--   2. 이 파일 (auth_config.sql)을 그 다음에 실행
--
-- ### Step 3: Auth Provider 설정
--   1. Supabase Dashboard → Authentication → Providers
--   2. Email Provider 활성화 (기본 활성화됨)
--   3. 필요시 Google/GitHub OAuth 추가
--
-- ### Step 4: 환경 변수 설정 (.env.local)
--
--   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (Project Settings → API → anon public)
--   SUPABASE_SERVICE_ROLE_KEY=eyJ... (Project Settings → API → service_role secret)
--
-- ### Step 5: Meta App 설정 (Instagram Webhook)
--
--   1. https://developers.facebook.com → 새 앱 생성
--   2. Instagram Graph API 추가
--   3. Webhook 설정:
--      - Callback URL: https://your-domain.com/api/webhook
--      - Verify Token: 원하는 문자열 (META_WEBHOOK_VERIFY_TOKEN)
--      - Fields: comments
--   4. 환경 변수:
--      - META_APP_SECRET=your_app_secret
--      - META_WEBHOOK_VERIFY_TOKEN=your_verify_token
--
-- ### Step 6: Vercel 배포 환경 변수
--
--   Vercel → Project → Settings → Environment Variables
--   위 5개 환경변수 모두 등록
--
-- ### RLS 정책 요약:
--   - authenticated 사용자: 자신이 생성한 데이터만 접근 가능
--   - service_role: 모든 데이터 접근 가능 (API routes & webhook에서 사용)
--   - owner_uid 트리거: INSERT 시 자동으로 현재 auth.uid() 설정
--
-- ============================================================
