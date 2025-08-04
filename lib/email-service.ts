import sgMail from '@sendgrid/mail'

interface SendGridError {
  message?: string
  code?: string
  response?: {
    body?: unknown
  }
}

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendDownloadEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject,
    text,
    html,
  }
  
  try {
    const result = await sgMail.send(msg)
    return true
  } catch (error: unknown) {
    console.error('[EMAIL SERVICE] Failed to send email:', error)
    const sendGridError = error as SendGridError
    console.error('[EMAIL SERVICE] Error details:', {
      message: sendGridError.message || 'Unknown error',
      code: sendGridError.code,
      response: sendGridError.response?.body
    })
    return false
  }
}

// Seller application confirmation email
export async function sendSellerApplicationConfirmation({
  to,
  sellerName,
  businessName,
}: {
  to: string
  sellerName: string
  businessName: string
}) {
  const subject = 'Aplikasi Seller Berhasil Dikirim - Jual Digital'
  const text = `
Halo ${sellerName},

Terima kasih telah mendaftar sebagai seller di Jual Digital!

Detail Aplikasi:
- Nama: ${sellerName}
- Nama Bisnis: ${businessName}
- Status: Sedang dalam review

Tim kami akan meninjau aplikasi Anda dalam 1-2 hari kerja dan akan mengirim notifikasi melalui email.

Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.

Salam,
Tim Jual Digital
  `
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Aplikasi Seller Berhasil Dikirim</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">JD Jual Digital</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #059669; margin-top: 0;">✅ Aplikasi Seller Berhasil Dikirim!</h2>
            
            <p>Halo <strong>${sellerName}</strong>,</p>
            
            <p>Terima kasih telah mendaftar sebagai seller di Jual Digital! Aplikasi Anda telah berhasil diterima dan sedang dalam proses review.</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Detail Aplikasi:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Nama:</strong> ${sellerName}</li>
                    <li><strong>Nama Bisnis:</strong> ${businessName}</li>
                    <li><strong>Status:</strong> Sedang dalam review</li>
                </ul>
            </div>
            
            <p>Tim kami akan meninjau aplikasi Anda dalam <strong>1-2 hari kerja</strong> dan akan mengirim notifikasi melalui email.</p>
            
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.</p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Salam,<br>Tim Jual Digital</p>
        </div>
    </div>
</body>
</html>
  `

  return sendDownloadEmail({ to, subject, text, html })
}

// Seller application approval email
export async function sendSellerApplicationApproved({
  to,
  sellerName,
  businessName,
}: {
  to: string
  sellerName: string
  businessName: string
}) {
  const subject = 'Selamat! Aplikasi Seller Anda Disetujui - Jual Digital'
  const text = `
Halo ${sellerName},

Selamat! Aplikasi seller Anda telah disetujui oleh tim Jual Digital.

Detail:
- Nama: ${sellerName}
- Nama Bisnis: ${businessName}
- Status: DISETUJUI

Sekarang Anda dapat:
1. Login ke dashboard seller
2. Upload produk digital pertama Anda
3. Mulai berjualan dan mendapatkan penghasilan

Silakan login ke akun Anda untuk mengakses dashboard seller.

Salam,
Tim Jual Digital
  `
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Aplikasi Seller Disetujui</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">JD Jual Digital</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669;">
            <h2 style="color: #059669; margin-top: 0;">🎉 Selamat! Aplikasi Seller Anda Disetujui!</h2>
            
            <p>Halo <strong>${sellerName}</strong>,</p>
            
            <p>Kami senang memberitahu bahwa aplikasi seller Anda telah <strong>disetujui</strong> oleh tim Jual Digital!</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Detail Aplikasi:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Nama:</strong> ${sellerName}</li>
                    <li><strong>Nama Bisnis:</strong> ${businessName}</li>
                    <li><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">DISETUJUI</span></li>
                </ul>
            </div>
            
            <h3 style="color: #374151;">Langkah Selanjutnya:</h3>
            <ol style="margin: 0; padding-left: 20px;">
                <li>Login ke dashboard seller</li>
                <li>Upload produk digital pertama Anda</li>
                <li>Mulai berjualan dan mendapatkan penghasilan</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://jualdigital.id'}/seller" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Akses Dashboard Seller</a>
            </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Salam,<br>Tim Jual Digital</p>
        </div>
    </div>
</body>
</html>
  `

  return sendDownloadEmail({ to, subject, text, html })
}

// Seller application rejection email
export async function sendSellerApplicationRejected({
  to,
  sellerName,
  businessName,
  reason,
}: {
  to: string
  sellerName: string
  businessName: string
  reason?: string
}) {
  const subject = 'Update Aplikasi Seller - Jual Digital'
  const text = `
Halo ${sellerName},

Kami ingin memberitahu bahwa aplikasi seller Anda tidak dapat disetujui saat ini.

Detail:
- Nama: ${sellerName}
- Nama Bisnis: ${businessName}
- Status: Tidak disetujui
${reason ? `- Alasan: ${reason}` : ''}

Anda dapat mengajukan ulang aplikasi seller setelah memperbaiki hal-hal yang diperlukan.

Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.

Salam,
Tim Jual Digital
  `
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Update Aplikasi Seller</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">JD Jual Digital</h1>
        </div>
        
        <div style="background: #fef2f2; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h2 style="color: #dc2626; margin-top: 0;">Update Aplikasi Seller</h2>
            
            <p>Halo <strong>${sellerName}</strong>,</p>
            
            <p>Kami ingin memberitahu bahwa aplikasi seller Anda tidak dapat disetujui saat ini.</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Detail Aplikasi:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Nama:</strong> ${sellerName}</li>
                    <li><strong>Nama Bisnis:</strong> ${businessName}</li>
                    <li><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Tidak disetujui</span></li>
                    ${reason ? `<li><strong>Alasan:</strong> ${reason}</li>` : ''}
                </ul>
            </div>
            
            <p>Anda dapat mengajukan ulang aplikasi seller setelah memperbaiki hal-hal yang diperlukan.</p>
            
            <p>Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.</p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Salam,<br>Tim Jual Digital</p>
        </div>
    </div>
</body>
</html>
  `

  return sendDownloadEmail({ to, subject, text, html })
} 