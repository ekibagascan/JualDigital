import { NextRequest, NextResponse } from 'next/server'
import { getLastVACreatePayload, setLastVACreatePayloadFromLastCreate } from '@/lib/dana'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/dana/last-va-payload
 * Returns the last create-transaction request and response for a VA (virtual account) payment.
 * Same flow as last-create-payload but only for VA transactions.
 *
 * - Automatically set when DANA callback (notify) indicates VA payment.
 * - If DANA does not send payment method in the webhook, call with ?fromLastCreate=1
 *   right after completing a VA payment to copy the last create payload as VA.
 */
export async function GET(req: NextRequest) {
  const fromLastCreate = req.nextUrl.searchParams.get('fromLastCreate') === '1'
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
