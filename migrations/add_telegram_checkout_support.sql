-- Telegram checkout support for product eligibility + payment observability

ALTER TABLE products
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS telegram_plan_code TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS telegram_stars_price INTEGER;

CREATE TABLE IF NOT EXISTS telegram_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  telegram_user_id TEXT,
  telegram_payment_charge_id TEXT,
  provider_payment_charge_id TEXT,
  stars_amount INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_payment_events_order_id
  ON telegram_payment_events(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_payment_events_charge_unique
  ON telegram_payment_events(telegram_payment_charge_id)
  WHERE telegram_payment_charge_id IS NOT NULL;
