-- Atomically increment a user's monthly DM-sent counter.
-- Called by the webhook after each successful DM so canSendDm() sees an
-- up-to-date count. INSERT ... ON CONFLICT handles the first DM of the month.
-- SECURITY DEFINER so the service-role path is consistent with the rest of usage.
CREATE OR REPLACE FUNCTION increment_dms(p_user_id UUID, p_month TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage (user_id, month, dms_sent)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET dms_sent = usage.dms_sent + 1, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
