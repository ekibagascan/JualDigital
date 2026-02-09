import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { validateSlug, generateSlug } from '@/lib/slug-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seller/slug
 * Returns the current seller's slug
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('slug, business_name')
      .eq('id', user.id)
      .eq('role', 'seller')
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      slug: profile.slug || null,
      suggestedSlug: profile.slug || generateSlug(profile.business_name || ''),
      storeUrl: profile.slug ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/${profile.slug}` : null,
    })
  } catch (error) {
    console.error('[SLUG API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/seller/slug
 * Update the seller's slug
 * Body: { slug: string }
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const slug = (body.slug || '').toLowerCase().trim()

    // Validate
    const validation = validateSlug(slug)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check seller
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .eq('role', 'seller')
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    // Check uniqueness
    const { data: existing } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .neq('id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug ini sudah digunakan oleh seller lain' }, { status: 409 })
    }

    // Update
    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({ slug })
      .eq('id', user.id)

    if (updateError) {
      console.error('[SLUG API] Update error:', updateError)
      return NextResponse.json({ error: 'Gagal menyimpan slug' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'

    return NextResponse.json({
      slug,
      storeUrl: `${appUrl}/${slug}`,
      message: 'Slug berhasil diperbarui',
    })
  } catch (error) {
    console.error('[SLUG API] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
