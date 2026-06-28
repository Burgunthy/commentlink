-- Track Instagram token refresh failures so the dashboard can warn the user.
-- The refresh-tokens cron sets this to now() when a refresh fails and clears it
-- (NULL) on success. A non-null value means the account likely needs reconnect.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS token_refresh_failed_at TIMESTAMPTZ;
COMMENT ON COLUMN accounts.token_refresh_failed_at IS
  'Set to now() when the refresh-tokens cron fails to refresh this token; cleared on success.';
