-- Persist DANA create-transaction request/response so last-create-payload and last-va-payload
-- work across server restarts and multiple instances (hosted checkout = same flow for wallet + VA).
CREATE TABLE IF NOT EXISTS dana_payload_capture (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  request_url TEXT,
  request_method TEXT DEFAULT 'POST',
  request_headers JSONB,
  request_body TEXT,
  response_status INT,
  response_body TEXT,
  payment_method TEXT, -- 'va' | 'wallet' | null until known (from callback)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dana_payload_order_number ON dana_payload_capture(order_number);
CREATE INDEX IF NOT EXISTS idx_dana_payload_created_at ON dana_payload_capture(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dana_payload_payment_method ON dana_payload_capture(payment_method) WHERE payment_method IS NOT NULL;

ALTER TABLE dana_payload_capture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access dana_payload_capture"
  ON dana_payload_capture FOR ALL USING (true) WITH CHECK (true);
