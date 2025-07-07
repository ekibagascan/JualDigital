import { NextRequest, NextResponse } from 'next/server'
import { orderService } from '@/lib/order-service'

export async function POST(req: NextRequest) {
  const orderData = await req.json()
  try {
    const { order, paymentUrl } = await orderService.createOrder(orderData)
    return NextResponse.json({ order, paymentUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 })
  }
} 