import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[TEST API] Test endpoint called')
  return NextResponse.json({ message: 'Test API working' })
} 