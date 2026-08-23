import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { serviceRoleClient } from '@/lib/mobile-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body.email?.trim()
    const password = body.password
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Email atau kata sandi salah' },
        { status: 401 }
      )
    }

    const admin = serviceRoleClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, name, role, avatar_url, seller_status')
      .eq('id', data.user.id)
      .maybeSingle()

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name,
        role: profile?.role || 'buyer',
        avatar_url: profile?.avatar_url,
        seller_status: profile?.seller_status,
      },
    })
  } catch (e) {
    console.error('[MOBILE AUTH LOGIN]', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
