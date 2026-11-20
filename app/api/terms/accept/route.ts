import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, pickBody, serviceRoleClient } from '@/lib/mobile-auth'
import { isMissingRelation } from '@/lib/moderation'
import { CURRENT_TERMS_VERSION, normalizeTermsVersion } from '@/lib/terms'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const version = normalizeTermsVersion(pickBody(body, 'version'))
    if (!version) {
      return NextResponse.json(
        { error: 'version wajib diisi', current_version: CURRENT_TERMS_VERSION },
        { status: 400 }
      )
    }

    const supabase = serviceRoleClient()
    const acceptedAt = new Date().toISOString()
    const { data, error } = await supabase
      .from('terms_acceptances')
      .upsert(
        { user_id: user.id, version, accepted_at: acceptedAt },
        { onConflict: 'user_id,version' }
      )
      .select('id, user_id, version, accepted_at')
      .single()

    if (error || !data) {
      if (isMissingRelation(error, 'terms_acceptances')) {
        return NextResponse.json(
          {
            error: 'Penerimaan syarat belum siap. Jalankan SQL migrasi di Supabase.',
            code: 'moderation_storage_missing',
          },
          { status: 503 }
        )
      }
      console.error('[TERMS ACCEPT]', error)
      return NextResponse.json({ error: 'Gagal menyimpan penerimaan syarat' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      acceptance: data,
      current_version: CURRENT_TERMS_VERSION,
    })
  } catch (error) {
    console.error('[TERMS ACCEPT]', error)
    return NextResponse.json({ error: 'Gagal menyimpan penerimaan syarat' }, { status: 500 })
  }
}
