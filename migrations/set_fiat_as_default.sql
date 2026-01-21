-- Set fiat payment as default and ensure DANA is configured
UPDATE settings
SET value = 'fiat', updated_at = NOW()
WHERE key = 'payment_default_method';

-- Ensure payment_fiat_method is set to 'dana'
UPDATE settings
SET value = 'dana', updated_at = NOW()
WHERE key = 'payment_fiat_method' AND (value = 'midtrans' OR value IS NULL);

-- Insert defaults if they don't exist
INSERT INTO settings (key, value, created_at, updated_at)
VALUES 
  ('payment_default_method', 'fiat', NOW(), NOW()),
  ('payment_fiat_method', 'dana', NOW(), NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
