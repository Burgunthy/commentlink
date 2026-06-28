-- DMify Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/chlqqedndfrtratmsdaj/sql)

-- ============================================
-- 1. Users (인플루언서)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'instagram')),
    auth_provider_id TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
    language TEXT DEFAULT 'ko' CHECK (language IN ('ko', 'en', 'ja')),
    timezone TEXT DEFAULT 'Asia/Seoul',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Accounts (Instagram 계정 연결)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ig_username TEXT NOT NULL,
    ig_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    fb_page_id TEXT,

    -- 커스텀 메시지 설정
    reply_comment_text TEXT DEFAULT 'DM 전송완료했습니다💗',
    private_reply_text TEXT DEFAULT '팔로우 확인을 위해 아래 버튼을 눌러주세요.',
    private_reply_button TEXT DEFAULT '팔로우 확인 🙌🏻',
    dm_body_template TEXT DEFAULT '안녕하세요 😊 요청하신 제품 링크입니다. 감사합니다🥰',
    disclosure_text TEXT DEFAULT '쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
    not_following_text TEXT DEFAULT '인스타그램 팔로우가 되어있지 않다면 전송이 원활하지 않을 수 있어요. 😭',

    -- 기능 설정
    follow_check_enabled BOOLEAN DEFAULT TRUE,
    public_reply_enabled BOOLEAN DEFAULT TRUE,
    auto_sync_enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Posts (게시물)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    media_id TEXT NOT NULL,
    caption TEXT,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, media_id)
);

-- ============================================
-- 4. Products (제휴 링크)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    affiliate_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Conversations (댓글→DM 처리 기록)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    comment_id TEXT NOT NULL UNIQUE,
    user_igsid TEXT NOT NULL,
    username TEXT,
    comment_text TEXT,
    media_id TEXT,
    status TEXT DEFAULT 'received' CHECK (status IN ('received', 'replied', 'confirmed', 'dm_sent', 'done', 'failed', 'error')),
    error_message TEXT,
    is_following BOOLEAN,
    products_sent UUID[] DEFAULT '{}',
    replied_at TIMESTAMPTZ,
    dm_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_account_id ON posts(account_id);
CREATE INDEX IF NOT EXISTS idx_products_post_id ON products(post_id);
CREATE INDEX IF NOT EXISTS idx_conversations_account_id ON conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_igsid ON conversations(user_igsid, account_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users: 소유자만 읽/쓰
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Accounts: 소유자만 읽/쓰
CREATE POLICY "Users can read own accounts" ON accounts FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth.uid() = id)
);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth.uid() = id)
);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth.uid() = id)
);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth.uid() = id)
);

-- Posts: 계정 소유자만 읽/쓰
CREATE POLICY "Users can read own posts" ON posts FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);

-- Products: 게시물 소유자만 읽/쓰
CREATE POLICY "Users can read own products" ON products FOR SELECT USING (
    post_id IN (SELECT id FROM posts WHERE account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id)))
);
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (
    post_id IN (SELECT id FROM posts WHERE account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id)))
);
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (
    post_id IN (SELECT id FROM posts WHERE account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id)))
);
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (
    post_id IN (SELECT id FROM posts WHERE account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id)))
);

-- Conversations: 계정 소유자만 읽/쓰 (서비스 role은 BYPASS)
CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT USING (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (
    account_id IN (SELECT id FROM accounts WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id))
);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Webhook API용 service_role BYPASS 정책
-- (anon 키로는 webhook에서 쓸 수 없으므로 service_role 필요)
-- Supabase Dashboard > Settings > API > service_role 키를 사용하세요
