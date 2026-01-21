-- Disable crypto payment and set fiat as default
UPDATE settings
SET value = 'false', updated_at = NOW()
WHERE key = 'payment_crypto_enabled';

-- Ensure fiat is enabled
UPDATE settings
SET value = 'true', updated_at = NOW()
WHERE key = 'payment_fiat_enabled';

-- Set fiat as default payment method
UPDATE settings
SET value = 'fiat', updated_at = NOW()
WHERE key = 'payment_default_method';

-- Insert defaults if they don't exist
INSERT INTO settings (key, value, created_at, updated_at)
VALUES 
  ('payment_crypto_enabled', 'false', NOW(), NOW()),
  ('payment_fiat_enabled', 'true', NOW(), NOW()),
  ('payment_default_method', 'fiat', NOW(), NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
