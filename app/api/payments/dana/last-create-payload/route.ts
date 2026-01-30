import { NextResponse } from 'next/server'
import { getLastCreatePayload } from '@/lib/dana'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/dana/last-create-payload
 * Returns the last create-transaction request and response (for DANA pilot submission).
 * Call this after completing a DANA payment to copy request/response for DANA.
 */
export async function GET() {
  const payload = getLastCreatePayload()
  if (!payload) {
    return NextResponse.json(
      { message: 'No create-transaction captured yet. Complete a DANA payment first, then call this URL again.' },
      { status: 404 }
    )
  }
  return NextResponse.json(payload)
}
