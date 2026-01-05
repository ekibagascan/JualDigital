-- Migration: Add payment proof fields to orders table
-- Run this migration in your Supabase SQL editor

-- Add payment proof fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_proof_date DATE,
ADD COLUMN IF NOT EXISTS payment_proof_note TEXT;

-- Update payment_provider default to 'manual' for new orders
-- Note: Existing orders will keep their current payment_provider value

-- Create index for faster queries on payment_proof_url
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof_url ON orders(payment_proof_url) WHERE payment_proof_url IS NOT NULL;

-- Create index for faster queries on orders with payment proof
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof ON orders(status, payment_provider) WHERE payment_provider = 'manual' AND status = 'pending';

