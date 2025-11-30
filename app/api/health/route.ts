// Health check endpoint to keep the app warm
// This can be called periodically to prevent cold starts

import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'App is running'
  })
}

