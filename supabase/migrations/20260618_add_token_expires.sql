-- =====================================================
-- 토큰 만료 추적 + 웹훅 에러 핸들링 (B1/B3)
-- DMify 마이그레이션 (2026-06-18)
-- =====================================================

-- 1. accounts: long-lived 토큰 만료 시각 추적
--    (schema.sql 에는 이미 컬럼이 있지만, 기존 배포 DB 에는 없을 수 있어 IF NOT EXISTS 로 추가)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- 2. conversations: DM/공개답장 실패 사유 저장
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 3. conversations.status 에 'failed' 허용
--    기존 CHECK 제약은 'failed' 를 허용하지 않아, 실패 처리 시 UPDATE 가 무시된다.
--    제약을 새로 만들어 'failed' 를 포함하도록 교체한다.
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('received', 'replied', 'confirmed', 'dm_sent', 'done', 'failed', 'error'));
