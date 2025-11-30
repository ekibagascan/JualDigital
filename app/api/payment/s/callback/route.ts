// Alias route for Xendit webhook callback
// This route forwards requests to the main webhook handler
// This ensures compatibility if Xendit is configured with a different webhook URL

import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// Forward the request to the main webhook handler
export async function POST(req: NextRequest) {
  // Import and call the main handler
  const { POST: mainHandler } = await import('@/app/api/payments/callback/route')
  return mainHandler(req)
}
