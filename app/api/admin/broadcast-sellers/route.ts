import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDownloadEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/broadcast-sellers
 * Send a broadcast email to all approved sellers.
 * Protected by admin-auth cookie.
 *
 * Body (optional):
 *   { "dryRun": true }  — only returns the list of sellers without sending.
 */
export async function POST(req: NextRequest) {
  try {
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const dryRun = body.dryRun === true

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all sellers from profiles (email is in auth.users, not profiles)
    const { data: sellers, error } = await supabase
      .from('profiles')
      .select('id, name, shop_name, role, status')
      .eq('role', 'seller')
      .eq('status', 'active')

    if (error) {
      console.error('[BROADCAST] Error fetching sellers:', error)
      return NextResponse.json({ error: 'Failed to fetch sellers', details: error.message }, { status: 500 })
    }

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ message: 'No approved sellers found', count: 0 })
    }

    console.log('[BROADCAST] Found active sellers:', sellers.length)

    // Get emails from auth.users for each seller
    const sellersWithEmail: { id: string; name: string; email: string; shop_name: string | null }[] = []
    for (const seller of sellers) {
      const { data: authUser } = await supabase.auth.admin.getUserById(seller.id)
      const email = authUser?.user?.email
      if (email) {
        sellersWithEmail.push({ id: seller.id, name: seller.name, email, shop_name: seller.shop_name })
      }
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        count: sellersWithEmail.length,
        sellers: sellersWithEmail.map(s => ({ name: s.name, email: s.email, shop: s.shop_name })),
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'
    const results: { email: string; success: boolean }[] = []

    for (const seller of sellersWithEmail) {
      const sellerName = seller.name || 'Seller'
      const shopName = seller.shop_name || sellerName

      const subject = 'Akun Seller Anda Aktif & Sistem Pembayaran Normal Kembali - Jual Digital'

      const text = `Halo ${sellerName},

Kami ingin menginformasikan beberapa kabar baik:

1. AKUN SELLER ANDA AKTIF
Aplikasi seller Anda telah disetujui. Anda sudah dapat mulai berjualan di Jual Digital.

2. SISTEM PEMBAYARAN NORMAL KEMBALI
Sistem pembayaran kami telah kembali beroperasi secara normal. Pelanggan dapat melakukan pembayaran melalui DANA (saldo DANA, Virtual Account, dan metode lainnya) dengan lancar.

Langkah selanjutnya:
- Login ke dashboard seller Anda di ${appUrl}/seller
- Upload produk digital Anda
- Mulai berjualan dan dapatkan penghasilan

Jika ada pertanyaan, silakan hubungi tim support kami.

Salam,
Tim Jual Digital`

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Akun Seller Aktif</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0;">JD Jual Digital</h1>
    </div>

    <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
      <h2 style="color: #059669; margin-top: 0;">Akun Seller Anda Aktif &amp; Sistem Pembayaran Normal</h2>

      <p>Halo <strong>${sellerName}</strong>,</p>

      <p>Kami ingin menginformasikan beberapa kabar baik untuk Anda:</p>

      <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #059669;">1. Akun Seller Anda Telah Aktif</h3>
        <p style="margin-bottom: 0;">Aplikasi seller Anda (<strong>${shopName}</strong>) telah disetujui oleh tim kami. Anda sudah dapat mulai berjualan di platform Jual Digital.</p>
      </div>

      <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2563eb;">2. Sistem Pembayaran Normal Kembali</h3>
        <p style="margin-bottom: 0;">Sistem pembayaran kami telah kembali beroperasi secara normal. Pelanggan dapat melakukan pembayaran melalui <strong>DANA</strong> (saldo DANA, Virtual Account, dan metode lainnya) dengan lancar.</p>
      </div>

      <h3 style="color: #374151;">Langkah Selanjutnya:</h3>
      <ol style="margin: 0; padding-left: 20px;">
        <li>Login ke dashboard seller Anda</li>
        <li>Upload produk digital Anda</li>
        <li>Mulai berjualan dan dapatkan penghasilan</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${appUrl}/seller" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Akses Dashboard Seller</a>
      </div>
    </div>

    <div style="text-align: center; color: #6b7280; font-size: 14px;">
      <p>Salam,<br>Tim Jual Digital</p>
      <p style="font-size: 12px; color: #9ca3af;">Jual Digital - Platform Jual Beli Produk Digital Indonesia</p>
    </div>
  </div>
</body>
</html>`

      try {
        const sent = await sendDownloadEmail({ to: seller.email, subject, text, html })
        results.push({ email: seller.email, success: !!sent })
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error(`[BROADCAST] Failed to send to ${seller.email}:`, err)
        results.push({ email: seller.email, success: false })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Broadcast sent to ${successCount}/${results.length} sellers`,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('[BROADCAST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
