import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body.email?.trim()
    const password = body.password
    const name = body.name?.trim()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib' }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Kata sandi minimal 8 karakter' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || email.split('@')[0] } },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      access_token: data.session?.access_token ?? null,
      refresh_token: data.session?.refresh_token ?? null,
      expires_at: data.session?.expires_at ?? null,
      user: data.user
        ? { id: data.user.id, email: data.user.email, name: name || null, role: 'buyer' }
        : null,
      message: data.session
        ? 'Pendaftaran berhasil'
        : 'Pendaftaran berhasil. Silakan konfirmasi email Anda.',
    })
  } catch (e) {
    console.error('[MOBILE AUTH SIGNUP]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
