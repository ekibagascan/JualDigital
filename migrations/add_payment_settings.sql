-- Migration to add new payment settings for crypto and fiat payment methods
-- This allows both payment types to be enabled simultaneously

-- Insert or update payment settings
INSERT INTO settings (key, value, created_at, updated_at)
VALUES 
  ('payment_fiat_enabled', 'true', NOW(), NOW()),
  ('payment_fiat_method', 'midtrans', NOW(), NOW()),
  ('payment_crypto_enabled', 'true', NOW(), NOW()),
  ('payment_default_method', 'crypto', NOW(), NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Note: Keep existing payment_method for backward compatibility
-- If payment_method doesn't exist, create it
INSERT INTO settings (key, value, created_at, updated_at)
VALUES ('payment_method', 'midtrans', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
