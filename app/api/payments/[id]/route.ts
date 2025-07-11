import { NextRequest, NextResponse } from 'next/server'
import { xenditAPI } from '@/lib/xendit'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const paymentData = await xenditAPI.getPaymentStatus(id)
    return NextResponse.json(paymentData)
  } catch (error: any) {
    console.error('Get payment error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get payment' }, { status: 500 })
  }
} 