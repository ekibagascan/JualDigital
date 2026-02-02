import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLastCreatePayload } from '@/lib/dana'

export const dynamic = 'force-dynamic'

function rowToPayload(row: {
  request_url: string | null
  request_method: string | null
  request_headers: Record<string, string> | null
  request_body: string | null
  response_status: number | null
  response_body: string | null
  created_at: string | null
}) {
  return {
    request: {
      url: row.request_url ?? '',
      method: row.request_method ?? 'POST',
      headers: row.request_headers ?? {},
      body: row.request_body ?? '',
    },
    response: { status: row.response_status ?? 0, body: row.response_body ?? '' },
    capturedAt: row.created_at ?? new Date().toISOString(),
  }
}

/**
 * GET /api/payments/dana/last-create-payload
 * Returns the last create-transaction request and response (for DANA pilot submission).
 * Persisted in DB so it works across server restarts and multiple instances.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: row } = await supabase
      .from('dana_payload_capture')
      .select('request_url, request_method, request_headers, request_body, response_status, response_body, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (row) {
      return NextResponse.json(rowToPayload(row))
    }
  }
  const payload = getLastCreatePayload()
  if (!payload) {
    return NextResponse.json(
      { message: 'No create-transaction captured yet. Complete a DANA payment first, then call this URL again.' },
      { status: 404 }
    )
  }
  return NextResponse.json(payload)
}
