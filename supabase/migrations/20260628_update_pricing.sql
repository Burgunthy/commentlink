-- Align plan_config with the pricing page (commit e3e8161 lowered prices).
-- Run this on databases that already seeded the old ₩19,900/₩49,900 values.
UPDATE plan_config SET max_dms_per_month = 500, display_price = '₩4,900/월', updated_at = NOW()
  WHERE plan = 'pro';
UPDATE plan_config SET display_price = '₩14,900/월', updated_at = NOW()
  WHERE plan = 'business';
