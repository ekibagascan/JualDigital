import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const orderId = formData.get('orderId') as string
    const proof = formData.get('proof') as File
    const transferAmount = formData.get('transferAmount') as string
    const transferDate = formData.get('transferDate') as string
    const transferNote = formData.get('transferNote') as string

    if (!orderId || !proof || !transferAmount || !transferDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file
    if (proof.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    if (!proof.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total_amount')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not pending payment' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = proof.name.split('.').pop() || 'jpg'
    const fileName = `payment-proofs/${orderId}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage - use 'files' bucket
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(fileName, proof, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[UPLOAD PROOF] Storage error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload proof image' },
        { status: 500 }
      )
    }

    // Get public URL - if bucket is not public, use signed URL instead
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(fileName)
    
    // If public URL doesn't work, generate a signed URL (valid for 1 year)
    let proofUrl = publicUrl
    if (!publicUrl || publicUrl.includes('undefined')) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('files')
        .createSignedUrl(fileName, 31536000) // 1 year
      
      if (!signedError && signedData) {
        proofUrl = signedData.signedUrl
      }
    }

    // Update order with payment proof information
    // Note: These fields may need to be added to the orders table
    const updateData: Record<string, unknown> = {
      payment_proof_url: proofUrl,
      payment_proof_amount: parseFloat(transferAmount),
      payment_proof_date: transferDate,
    }

    if (transferNote) {
      updateData.payment_proof_note = transferNote
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error('[UPLOAD PROOF] Update error:', updateError)
      // Try to delete uploaded file if update fails
      await supabase.storage
        .from('files')
        .remove([fileName])
      
      return NextResponse.json(
        { error: 'Failed to update order. Please check if payment_proof fields exist in orders table.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      proofUrl: proofUrl,
    })
  } catch (error) {
    console.error('[UPLOAD PROOF] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

