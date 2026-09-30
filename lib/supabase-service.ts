import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client that bypasses RLS via the service role key.
 *
 * Do NOT use `createServerClient` from `@supabase/ssr` with the service role key.
 * SSR clients bind cookie sessions into the Authorization header, which overrides
 * the service role JWT and re-applies RLS — updates then match 0 rows and look
 * like "status snapped back" after an optimistic UI update + refetch.
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
