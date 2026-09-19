import { NextRequest, NextResponse } from 'next/server'

/** Serve AASA for Universal Links (iOS). Replace TEAMID before production use. */
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const teamId = process.env.APPLE_TEAM_ID || 'TEAMID'
  const body = {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.id.jualdigital.app`,
          paths: ['/payment/success', '/payment/*', '/auth/callback'],
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
