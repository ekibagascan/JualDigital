import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

/** Debug endpoint disabled in production — leaks session data. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Debug aktif hanya di development',
    timestamp: new Date().toISOString(),
  })
}
