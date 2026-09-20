import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

/**
 * Resolve the authenticated user from Bearer JWT (mobile) or cookies (web).
 */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null

  if (bearer) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase.auth.getUser(bearer)
    if (!error && data.user) return data.user
  }

  const cookieClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data } = await cookieClient.auth.getUser()
  return data.user ?? null
}

export function serviceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** First defined value among camelCase / snake_case aliases. */
export function pickBody<T = unknown>(
  body: Record<string, unknown> | null | undefined,
  ...keys: string[]
): T | undefined {
  if (!body) return undefined
  for (const key of keys) {
    const value = body[key]
    if (value !== undefined && value !== null) return value as T
  }
  return undefined
}

export function formFile(formData: FormData, ...names: string[]): File | null {
  for (const name of names) {
    const value = formData.get(name)
    if (value instanceof File && value.size > 0) return value
  }
  return null
}

/** Map profiles.status / seller_status to iOS SellerStatus values. */
export function mapSellerStatusForMobile(profile: {
  role?: string | null
  status?: string | null
  seller_status?: string | null
} | null): string | null {
  if (!profile) return null
  const raw = String(profile.seller_status || profile.status || '').toLowerCase()
  if (raw === 'active' || raw === 'approved') return 'approved'
  if (raw === 'pending') return 'pending'
  if (raw === 'rejected') return 'rejected'
  if (profile.role === 'seller' || profile.role === 'admin') return raw || 'pending'
  return raw || null
}
