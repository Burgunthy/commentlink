-- Rename polar_* columns to provider-neutral names for the LemonSqueezy migration.
-- Idempotent: skips any column that was already renamed (or never existed).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='polar_customer_id') THEN
    ALTER TABLE users RENAME COLUMN polar_customer_id TO customer_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='polar_subscription_id') THEN
    ALTER TABLE subscriptions RENAME COLUMN polar_subscription_id TO subscription_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='polar_customer_id') THEN
    ALTER TABLE subscriptions RENAME COLUMN polar_customer_id TO customer_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='polar_product_id') THEN
    ALTER TABLE subscriptions RENAME COLUMN polar_product_id TO variant_id;
  END IF;
END $$;
