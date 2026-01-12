-- Update existing payment_method setting to midtrans if it exists
UPDATE settings
SET value = 'midtrans', updated_at = NOW()
WHERE key = 'payment_method' AND value = 'manual';

-- If no setting exists, insert midtrans as default
INSERT INTO settings (key, value)
VALUES ('payment_method', 'midtrans')
ON CONFLICT (key) DO UPDATE SET value = 'midtrans', updated_at = NOW();
