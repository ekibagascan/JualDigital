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

-- Service role bypasses RLS ONLY when the request Authorization header is the
-- service role JWT (createClient from @supabase/supabase-js / createServiceRoleClient).
-- Do NOT use createServerClient(@supabase/ssr) with the service role key + cookies:
-- a logged-in seller session in cookies overrides Authorization and RLS applies again
-- (admin updates then match 0 rows / status appears to snap back).
