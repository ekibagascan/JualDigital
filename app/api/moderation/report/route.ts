import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, pickBody, serviceRoleClient } from '@/lib/mobile-auth'
import {
  REPORT_TARGET_TYPES,
  insertReport,
  isMissingRelation,
  isUuid,
  notifyModerationReport,
  targetExists,
  type ReportTargetType,
} from '@/lib/moderation'

const STORAGE_ERROR = {
  error: 'Moderasi belum siap. Jalankan SQL migrasi di Supabase.',
  code: 'moderation_storage_missing',
}

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
    const targetType = pickBody<string>(body, 'target_type', 'targetType')
    const targetId = pickBody<string>(body, 'target_id', 'targetId')?.trim()
    const reason = pickBody<string>(body, 'reason')?.trim()
    const detailsRaw = pickBody<string>(body, 'details')
    const details = typeof detailsRaw === 'string' ? detailsRaw.trim() : ''

    if (!targetType || !REPORT_TARGET_TYPES.includes(targetType as ReportTargetType)) {
      return NextResponse.json(
        { error: "target_type harus product, review, post, atau user" },
        { status: 400 }
      )
    }
    if (!targetId || !isUuid(targetId)) {
      return NextResponse.json({ error: 'target_id tidak valid' }, { status: 400 })
    }
    if (!reason || reason.length > 200) {
      return NextResponse.json({ error: 'Alasan wajib diisi (maks. 200 karakter)' }, { status: 400 })
    }
    if (details.length > 2000) {
      return NextResponse.json({ error: 'Detail terlalu panjang' }, { status: 400 })
    }
    if (targetType === 'user' && targetId === user.id) {
      return NextResponse.json({ error: 'Kamu tidak bisa melaporkan akunmu sendiri' }, { status: 400 })
    }

    const supabase = serviceRoleClient()
    const exists = await targetExists(supabase, targetType as ReportTargetType, targetId)
    if (!exists) {
      return NextResponse.json({ error: 'Konten atau pengguna tidak ditemukan' }, { status: 404 })
    }

    const { data, error } = await insertReport(supabase, {
      reporterId: user.id,
      targetType: targetType as ReportTargetType,
      targetId,
      reason,
      details: details || null,
      source: 'report',
    })

    if (error || !data) {
      if (isMissingRelation(error, 'reports')) {
        return NextResponse.json(STORAGE_ERROR, { status: 503 })
      }
      console.error('[MODERATION REPORT]', error)
      return NextResponse.json({ error: 'Gagal menyimpan laporan' }, { status: 500 })
    }

    const notified = await notifyModerationReport({
      reportId: data.id,
      targetType,
      targetId,
      reason,
      details: details || null,
      reporterId: user.id,
      source: 'report',
    })

    return NextResponse.json({ success: true, report: data, notified })
  } catch (error) {
    console.error('[MODERATION REPORT]', error)
    return NextResponse.json({ error: 'Gagal menyimpan laporan' }, { status: 500 })
  }
}
