import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLastVACreatePayload, setLastVACreatePayloadFromLastCreate } from '@/lib/dana'

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
 * GET /api/payments/dana/last-va-payload
 * Returns the last create-transaction request/response for a VA payment.
 * Persisted in DB so it works across server restarts and multiple instances.
 *
 * - VA is set when DANA callback indicates VA, or when you call ?fromLastCreate=1
 *   (use that if DANA webhook does not send payment method).
 */
export async function GET(req: NextRequest) {
  const fromLastCreate = req.nextUrl.searchParams.get('fromLastCreate') === '1'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey)

    if (fromLastCreate) {
      const { data: latest } = await supabase
        .from('dana_payload_capture')
        .select('id, request_url, request_method, request_headers, request_body, response_status, response_body, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (latest) {
        await supabase.from('dana_payload_capture').update({ payment_method: 'va' }).eq('id', latest.id)
        return NextResponse.json(rowToPayload(latest))
      }
    } else {
      const { data: vaRow } = await supabase
        .from('dana_payload_capture')
        .select('request_url, request_method, request_headers, request_body, response_status, response_body, created_at')
        .eq('payment_method', 'va')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (vaRow) {
        return NextResponse.json(rowToPayload(vaRow))
      }
    }
  }

  if (fromLastCreate) {
    setLastVACreatePayloadFromLastCreate()
  }
  const payload = getLastVACreatePayload()
  if (!payload) {
    return NextResponse.json(
      {
        message: 'No VA create-transaction captured yet. Complete a DANA VA payment, then call this URL again. If DANA webhook does not send payment method, call with ?fromLastCreate=1 right after the VA payment.',
      },
      { status: 404 }
    )
  }
  return NextResponse.json(payload)
}
