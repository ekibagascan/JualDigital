import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { mapSellerStatusForMobile, serviceRoleClient } from '@/lib/mobile-auth'

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, full_name: name },
      },
    })

    if (error) {
      return NextResponse.json(
        { error: friendlyAuthError(error.message, error.code) },
        { status: 400 }
      )
    }

    if (isExistingUser(data.user)) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar. Silakan masuk.' },
        { status: 400 }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json({
        access_token: null,
        message: 'Silakan konfirmasi email Anda. Cek kotak masuk untuk tautan konfirmasi.',
      })
    }

    const admin = serviceRoleClient()
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
  } catch (e) {
    console.error('[MOBILE AUTH SIGNUP]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function isExistingUser(user: { identities?: unknown[] | null } | null) {
  if (!user) return false
  return Array.isArray(user.identities) && user.identities.length === 0
}

function isAlreadyRegistered(message: string, code?: string) {
  const value = `${code || ''} ${message}`.toLowerCase()
  return (
    value.includes('already') ||
    value.includes('registered') ||
    value.includes('exists') ||
    value.includes('user_already_exists')
  )
}

function friendlyAuthError(message: string, code?: string) {
  const value = `${code || ''} ${message}`.toLowerCase()
  if (value.includes('rate limit') || value.includes('too many')) {
    return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
  }
  if (isAlreadyRegistered(message, code)) {
    return 'Email ini sudah terdaftar. Silakan masuk.'
  }
  return message || 'Pendaftaran gagal'
}
