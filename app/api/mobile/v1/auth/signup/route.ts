import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mapSellerStatusForMobile, serviceRoleClient } from '@/lib/mobile-auth'

type AdminClient = SupabaseClient

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim()
    const password = String(body.password || '')
    const name = String(body.name || '').trim() || email.split('@')[0]
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Kata sandi minimal 8 karakter' }, { status: 400 })
    }

    const admin = serviceRoleClient()
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, full_name: name },
    })

    if (createError && !isAlreadyRegistered(createError.message)) {
      return NextResponse.json({ error: friendlyAuthError(createError.message) }, { status: 400 })
    }

    if (createError) {
      const existing = await signIn(email, password)
      if (existing.error && isEmailUnconfirmed(existing.error.message)) {
        const userId = await findUserIdByEmail(email)
        if (userId) {
          await admin.auth.admin.updateUserById(userId, { email_confirm: true })
        }
      }
    }

    return await sessionResponse(admin, email, password, name)
  } catch (e) {
    console.error('[MOBILE AUTH SIGNUP]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function signIn(email: string, password: string) {
  return anonClient().auth.signInWithPassword({ email, password })
}

async function sessionResponse(admin: AdminClient, email: string, password: string, name: string) {
  const { data, error } = await signIn(email, password)
  if (error || !data.session || !data.user) {
    const message = error?.message || ''
    if (isAlreadyRegistered(message) || message.toLowerCase().includes('invalid login')) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar. Silakan masuk.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: friendlyAuthError(message || 'Pendaftaran gagal') }, { status: 400 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, role, avatar_url, status')
    .eq('id', data.user.id)
    .maybeSingle()

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || name,
      role: profile?.role || 'buyer',
      avatar_url: profile?.avatar_url,
      seller_status: mapSellerStatusForMobile(profile),
    },
  })
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  const endpoint = new URL('/auth/v1/admin/users', base)
  endpoint.searchParams.set('filter', email)
  endpoint.searchParams.set('page', '1')
  endpoint.searchParams.set('per_page', '20')
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  const users = (json.users || []) as { id: string; email?: string }[]
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null
}

function isAlreadyRegistered(message: string) {
  const value = message.toLowerCase()
  return value.includes('already') || value.includes('registered') || value.includes('exists')
}

function isEmailUnconfirmed(message: string) {
  const value = message.toLowerCase()
  return value.includes('email not confirmed') || value.includes('email_not_confirmed')
}

function friendlyAuthError(message: string) {
  const value = message.toLowerCase()
  if (value.includes('rate limit') || value.includes('too many')) {
    return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
  }
  if (isAlreadyRegistered(value)) {
    return 'Email ini sudah terdaftar. Silakan masuk.'
  }
  if (isEmailUnconfirmed(value)) {
    return 'Silakan konfirmasi email Anda terlebih dahulu.'
  }
  return message || 'Pendaftaran gagal'
}
