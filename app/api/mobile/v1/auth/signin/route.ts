import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'
import { POST as loginPOST } from '../login/route'

/** Alias for older iOS builds that call /auth/signin instead of /auth/login */
export async function POST(req: NextRequest) {
  return loginPOST(req)
}
