// Manual webhook processing endpoint
// Use this to manually process a webhook payload when webhook fails
// This is a temporary solution to update orders that failed webhook processing

import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, webhookPayload } = body

    if (!orderId && !webhookPayload?.external_id) {
      return NextResponse.json({ 
        error: 'Missing orderId or webhookPayload.external_id' 
      }, { status: 400 })
    }

    // If webhookPayload is provided, process it through the webhook handler
    if (webhookPayload) {
      const webhookModule = await import('../callback/route')
      const webhookRequest = new NextRequest(new URL('/api/payments/callback', req.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })
      
      const result = await webhookModule.POST(webhookRequest)
      return result
    }

    // If only orderId is provided, manually update to paid
    if (orderId) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)

      if (error) {
        return NextResponse.json({ 
          error: 'Failed to update order',
          details: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Order status updated to paid',
        orderId 
      })
    }

    return NextResponse.json({ 
      error: 'Invalid request' 
    }, { status: 400 })

  } catch (error) {
    console.error('[MANUAL UPDATE] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to process manual update',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

