import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // This will refresh the Supabase session cookie on every request
  await createMiddlewareClient({ req, res })
  return res
}

// Optionally, specify which routes to run the middleware on
export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
} 