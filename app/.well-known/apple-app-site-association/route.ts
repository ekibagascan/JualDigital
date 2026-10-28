import { NextRequest, NextResponse } from 'next/server'

/** Serve AASA for Universal Links (iOS). Replace TEAMID before production use. */
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const configured = (process.env.APPLE_TEAM_ID || '').trim()
  const teamId = !configured || configured === 'TEAMID' ? 'T7ZN2X7NFY' : configured
  const body = {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.id.jualdigital.app`,
          paths: [
            '/payment/success',
            '/payment/*',
            '/auth/callback',
            '/auth/callback/',
            '/auth/confirmed',
            '/auth/confirmed/',
          ],
        },
      ],
    },
  }

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
