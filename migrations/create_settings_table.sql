-- Create settings table for storing application settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role (backend) to read all settings
CREATE POLICY "Service role can read settings"
  ON settings
  FOR SELECT
  USING (true);

-- Policy: Allow service role (backend) to insert settings
CREATE POLICY "Service role can insert settings"
  ON settings
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow service role (backend) to update settings
CREATE POLICY "Service role can update settings"
  ON settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role (backend) to delete settings
CREATE POLICY "Service role can delete settings"
  ON settings
  FOR DELETE
  USING (true);

-- Insert default payment method setting
INSERT INTO settings (key, value)
VALUES ('payment_method', 'manual')
ON CONFLICT (key) DO NOTHING;

