CREATE TABLE IF NOT EXISTS plan_config (
    plan TEXT PRIMARY KEY CHECK (plan IN ('free', 'pro', 'business')),
    polar_product_id TEXT,
    max_accounts INTEGER NOT NULL DEFAULT 1,
    max_dms_per_month INTEGER NOT NULL DEFAULT 100,
    features JSONB NOT NULL DEFAULT '{}',
    display_price TEXT NOT NULL DEFAULT '₩0',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plan_config (plan, max_accounts, max_dms_per_month, features, display_price) VALUES
    ('free',     1,   100,   '{"keyword_dm": false, "raffle": false, "analytics": "basic"}',     '₩0'),
    ('pro',      3,   500,   '{"keyword_dm": true,  "raffle": true,  "analytics": "basic"}',     '₩4,900/월'),
    ('business', -1,  -1,    '{"keyword_dm": true,  "raffle": true,  "analytics": "detailed"}',   '₩14,900/월')
ON CONFLICT (plan) DO NOTHING;

ALTER TABLE plan_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read plan_config" ON plan_config FOR SELECT USING (auth.uid() IS NOT NULL);
