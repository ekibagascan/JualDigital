import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-session'
import { createServiceRoleClient } from '@/lib/supabase-service'
import { isMissingRelation, isUuid } from '@/lib/moderation'

const HOUR_MS = 60 * 60 * 1000

type ReportRow = {
  id: string
  reporter_id: string
  target_type: 'product' | 'review' | 'post' | 'user'
  target_id: string
  reason: string
  details: string | null
  source: string
  status: string
  admin_note: string | null
  action_taken: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

async function suspendUser(supabase: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId)
  if (profileError) throw profileError

  const { error: productError } = await supabase
    .from('products')
    .update({ status: 'inactive', featured: false })
    .eq('seller_id', userId)
    .in('status', ['active', 'pending'])
  if (productError) throw productError

  const { error: reviewError } = await supabase
    .from('reviews')
    .update({ status: 'removed' })
    .eq('user_id', userId)
    .eq('status', 'active')
  if (reviewError) {
    const { error: deleteError } = await supabase.from('reviews').delete().eq('user_id', userId)
    if (deleteError) console.error('[ADMIN MODERATION] review suspend', deleteError)
  }

  const removedAt = new Date().toISOString()
  const { error: postError } = await supabase
    .from('membership_posts')
    .update({ published_at: null, removed_at: removedAt })
    .eq('author_id', userId)
  if (postError && /removed_at/i.test(postError.message || '')) {
    await supabase.from('membership_posts').update({ published_at: null }).eq('author_id', userId)
  } else if (postError && !/membership_posts|schema cache|does not exist/i.test(postError.message || '')) {
    console.error('[ADMIN MODERATION] post suspend', postError)
  }
}

async function takedownTarget(supabase: ReturnType<typeof createServiceRoleClient>, report: ReportRow) {
  if (report.target_type === 'product') {
    const { error } = await supabase
      .from('products')
      .update({ status: 'inactive', featured: false })
      .eq('id', report.target_id)
    if (error) throw error
    return 'product_unpublished'
  }

  if (report.target_type === 'review') {
    const { error } = await supabase
      .from('reviews')
      .update({ status: 'removed' })
      .eq('id', report.target_id)
    if (error) {
      const { error: deleteError } = await supabase.from('reviews').delete().eq('id', report.target_id)
      if (deleteError) throw deleteError
      return 'review_deleted'
    }
    return 'review_removed'
  }

  if (report.target_type === 'post') {
    const removedAt = new Date().toISOString()
    const { error } = await supabase
      .from('membership_posts')
      .update({ published_at: null, removed_at: removedAt })
      .eq('id', report.target_id)
    if (error && /removed_at/i.test(error.message || '')) {
      const { error: fallback } = await supabase
        .from('membership_posts')
        .update({ published_at: null })
        .eq('id', report.target_id)
      if (fallback) throw fallback
    } else if (error) {
      throw error
    }
    return 'post_unpublished'
  }

  await suspendUser(supabase, report.target_id)
  return 'user_suspended'
}

async function ownerId(supabase: ReturnType<typeof createServiceRoleClient>, report: ReportRow) {
  if (report.target_type === 'user') return report.target_id
  if (report.target_type === 'product') {
    const { data } = await supabase.from('products').select('seller_id').eq('id', report.target_id).maybeSingle()
    return data?.seller_id as string | null
  }
  if (report.target_type === 'review') {
    const { data } = await supabase.from('reviews').select('user_id').eq('id', report.target_id).maybeSingle()
    return data?.user_id as string | null
  }
  const { data } = await supabase
    .from('membership_posts')
    .select('author_id')
    .eq('id', report.target_id)
    .maybeSingle()
  return data?.author_id as string | null
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = new URL(request.url).searchParams.get('status')?.trim() || ''
    const supabase = createServiceRoleClient()
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(200)
    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) {
      if (isMissingRelation(error, 'reports')) {
        return NextResponse.json(
          {
            reports: [],
            error: 'Tabel reports belum ada. Jalankan sql/moderation_apple_guidelines.sql di Supabase.',
            code: 'moderation_storage_missing',
          },
          { status: 503 }
        )
      }
      console.error('[ADMIN MODERATION]', error)
      return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 })
    }

    const reports = (data || []) as ReportRow[]
    const profileIds = Array.from(
      new Set(reports.flatMap((report) => [report.reporter_id, report.target_type === 'user' ? report.target_id : '']))
    ).filter(Boolean)

    const profilesById = new Map<string, { id: string; name: string | null; email: string | null; status: string | null }>()
    if (profileIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, status')
        .in('id', profileIds)
      for (const profile of profiles || []) profilesById.set(profile.id, profile)
    }

    const now = Date.now()
    const decorated = reports.map((report) => {
      const ageMs = now - new Date(report.created_at).getTime()
      const open = report.status === 'open' || report.status === 'reviewing'
      return {
        ...report,
        reporter: profilesById.get(report.reporter_id) || null,
        target_user: report.target_type === 'user' ? profilesById.get(report.target_id) || null : null,
        age_hours: Math.max(0, Math.round(ageMs / HOUR_MS)),
        overdue: open && ageMs >= 24 * HOUR_MS,
      }
    })

    const counts = decorated.reduce(
      (acc, report) => {
        acc.total += 1
        if (report.status === 'open' || report.status === 'reviewing') acc.open += 1
        if (report.overdue) acc.overdue += 1
        return acc
      },
      { total: 0, open: 0, overdue: 0 }
    )

    return NextResponse.json({ reports: decorated, counts })
  } catch (error) {
    console.error('[ADMIN MODERATION]', error)
    return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      report_id?: string
      action?: string
      admin_note?: string
    } | null

    const reportId = body?.report_id?.trim() || ''
    const action = body?.action?.trim() || ''
    const adminNote = typeof body?.admin_note === 'string' ? body.admin_note.trim().slice(0, 2000) : ''
    const allowed = ['reviewing', 'dismiss', 'takedown', 'suspend_user']
    if (!isUuid(reportId) || !allowed.includes(action)) {
      return NextResponse.json({ error: 'report_id dan action tidak valid' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: report, error } = await supabase.from('reports').select('*').eq('id', reportId).maybeSingle()
    if (error) {
      console.error('[ADMIN MODERATION]', error)
      return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 })
    }
    if (!report) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })

    const row = report as ReportRow
    let actionTaken = action
    if (action === 'takedown') {
      actionTaken = await takedownTarget(supabase, row)
    } else if (action === 'suspend_user') {
      const userId = await ownerId(supabase, row)
      if (!userId) return NextResponse.json({ error: 'Pemilik konten tidak ditemukan' }, { status: 404 })
      await suspendUser(supabase, userId)
      actionTaken = 'user_suspended'
    }

    const nextStatus = action === 'reviewing' ? 'reviewing' : action === 'dismiss' ? 'dismissed' : 'actioned'
    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update({
        status: nextStatus,
        action_taken: actionTaken,
        admin_note: adminNote || row.admin_note,
        resolved_at: action === 'reviewing' ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[ADMIN MODERATION] update', updateError)
      return NextResponse.json({ error: 'Gagal memperbarui laporan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, report: updated })
  } catch (error) {
    console.error('[ADMIN MODERATION]', error)
    const message = error instanceof Error ? error.message : 'Gagal menindak laporan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
