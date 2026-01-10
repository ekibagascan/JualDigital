import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Create Supabase server client for route handlers with proper cookie methods
 * Uses getAll and setAll instead of deprecated get, set, remove methods
 */
export function createSupabaseRouteHandlerClient(
  req: NextRequest,
  res?: NextResponse,
  useServiceRole = false
) {
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          if (res) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          }
        },
      },
    }
  )
}
