import { NextResponse } from 'next/server'
import { mobileHandoffDocument } from '@/lib/ios-auth-handoff'

export const dynamic = 'force-dynamic'

/** Email confirmation landing page. On iPhone this opens jualdigital://auth/confirmed. */
export function GET() {
  return new NextResponse(mobileHandoffDocument('confirmed'), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
