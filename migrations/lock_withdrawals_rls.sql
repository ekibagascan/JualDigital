-- Lock down withdrawals: sellers must create requests via /api/seller/withdrawals
-- (service role). Direct browser/anon inserts of arbitrary amounts are blocked.
-- Apply in Supabase SQL editor after deploying the create API.

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop prior permissive policies if they exist (names may vary in older projects)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'withdrawals'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.withdrawals', pol.policyname);
  END LOOP;
END $$;

-- Sellers can read only their own rows
CREATE POLICY "sellers_select_own_withdrawals"
  ON public.withdrawals
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- No INSERT / UPDATE / DELETE for authenticated or anon clients.
-- Creates and status changes go through Next.js APIs using the service role key.

-- Optional: allow sellers to see nothing more than their rows (already covered).
-- Service role bypasses RLS for admin list + create + status updates.
