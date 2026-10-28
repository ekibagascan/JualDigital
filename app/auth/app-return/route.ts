import { NextResponse } from 'next/server'
import { mobileHandoffDocument } from '@/lib/ios-auth-handoff'

export const dynamic = 'force-dynamic'

/**
 * Google OAuth return used by the iOS app.
 * One ASWebAuthenticationSession loads this page, then the page continues to
 * jualdigital://auth/callback so the session can finish inside the app.
 */
export function GET() {
  return new NextResponse(mobileHandoffDocument('oauth'), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
