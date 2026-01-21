-- Update existing payment_method setting from midtrans to dana
UPDATE settings
SET value = 'dana', updated_at = NOW()
WHERE key = 'payment_method' AND value = 'midtrans';

-- Update payment_fiat_method from midtrans to dana
UPDATE settings
SET value = 'dana', updated_at = NOW()
WHERE key = 'payment_fiat_method' AND value = 'midtrans';

-- If no payment_method setting exists, insert dana as default
INSERT INTO settings (key, value, created_at, updated_at)
VALUES ('payment_method', 'dana', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET value = 'dana', updated_at = NOW();

-- If no payment_fiat_method setting exists, insert dana as default
INSERT INTO settings (key, value, created_at, updated_at)
VALUES ('payment_fiat_method', 'dana', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET value = 'dana', updated_at = NOW();
