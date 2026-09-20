import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, mapSellerStatusForMobile, pickBody, serviceRoleClient } from '@/lib/mobile-auth'
import { sendSellerApplicationConfirmation } from '@/lib/email-service'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login diperlukan' },
        { status: 401 }
      )
    }

    const body = (await req.json()) as Record<string, unknown>
    const businessName = pickBody<string>(body, 'businessName', 'business_name')
    const phone = pickBody<string>(body, 'phone')
    const description = pickBody<string>(body, 'description', 'business_description')
    const bankName = pickBody<string>(body, 'bankName', 'bank_name')
    const accountNumber = pickBody<string>(body, 'accountNumber', 'account_number')
    const accountName = pickBody<string>(body, 'accountName', 'account_name')
    const fullName = pickBody<string>(body, 'fullName', 'full_name', 'name')
    const address = pickBody<string>(body, 'address')
    const city = pickBody<string>(body, 'city')
    const category = pickBody<string>(body, 'category', 'business_category')
    const website = pickBody<string>(body, 'website')
    const socialMedia = pickBody<string>(body, 'socialMedia', 'social_media')

    if (!businessName || !phone || !bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Lengkapi nama toko, WhatsApp, dan data rekening.' },
        { status: 400 }
      )
    }

    const supabase = serviceRoleClient()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, name, role, status')
      .eq('id', user.id)
      .maybeSingle()

    const currentStatus = mapSellerStatusForMobile(existing)
    if (existing?.role === 'seller' && currentStatus === 'approved') {
      return NextResponse.json({
        success: true,
        status: 'approved',
        message: 'Akun penjual sudah disetujui.',
      })
    }
    if (existing?.role === 'seller' && currentStatus === 'pending') {
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Pendaftaran sedang ditinjau admin.',
      })
    }

    const updatePayload: Record<string, unknown> = {
      phone,
      business_name: businessName,
      business_description: description || null,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      role: 'seller',
      status: 'pending',
      updated_at: new Date().toISOString(),
    }
    if (fullName) updatePayload.name = fullName
    else if (!existing?.name) updatePayload.name = businessName
    if (address) updatePayload.address = address
    if (city) updatePayload.city = city
    if (category) updatePayload.business_category = category
    if (website) updatePayload.website = website
    if (socialMedia) updatePayload.social_media = socialMedia

    let { data: profile, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select('id, name, role, status')
      .single()

    if (error) {
      const corePayload = {
        phone,
        business_name: businessName,
        business_description: description || null,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        role: 'seller',
        status: 'pending',
        updated_at: new Date().toISOString(),
        name: (fullName || existing?.name || businessName) as string,
      }
      const retry = await supabase
        .from('profiles')
        .update(corePayload)
        .eq('id', user.id)
        .select('id, name, role, status')
        .single()
      profile = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[SELLER REGISTER] update error:', error)
      return NextResponse.json(
        { error: error.message || 'Gagal mengirim pendaftaran' },
        { status: 500 }
      )
    }

    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
      const email = authUser?.user?.email
      if (email) {
        await sendSellerApplicationConfirmation({
          to: email,
          sellerName: profile?.name || fullName || businessName,
          businessName,
        })
      }
    } catch (emailError) {
      console.error('[SELLER REGISTER] confirmation email failed:', emailError)
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      seller_status: 'pending',
      message: 'Pendaftaran terkirim. Tim kami akan meninjau dalam 1-2 hari kerja.',
    })
  } catch (error) {
    console.error('[SELLER REGISTER] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
