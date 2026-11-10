import { NextRequest } from 'next/server'
import { POST as deleteAccount } from '@/app/api/account/delete/route'

export const dynamic = 'force-dynamic'

export function POST(req: NextRequest) {
  return deleteAccount(req)
}

export function DELETE(req: NextRequest) {
  return deleteAccount(req)
}
