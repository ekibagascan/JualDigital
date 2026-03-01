-- Admin-controlled seller access for Telegram checkout feature.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS telegram_feature_enabled BOOLEAN NOT NULL DEFAULT FALSE;
