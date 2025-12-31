import { NextRequest, NextResponse } from 'next/server'
import { sendDownloadEmail } from '@/lib/email-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, subject } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Email address (to) is required' },
        { status: 400 }
      )
    }

    // Check if MailerSend environment variables are set
    if (!process.env.MAILERSEND_API_KEY) {
      return NextResponse.json(
        { error: 'MAILERSEND_API_KEY is not set in environment variables' },
        { status: 500 }
      )
    }

    if (!process.env.MAILERSEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: 'MAILERSEND_FROM_EMAIL is not set in environment variables' },
        { status: 500 }
      )
    }

    console.log('[TEST EMAIL] Sending test email to:', to)
    console.log('[TEST EMAIL] Using MailerSend API Key:', process.env.MAILERSEND_API_KEY ? 'Set (hidden)' : 'Not set')
    console.log('[TEST EMAIL] From Email:', process.env.MAILERSEND_FROM_EMAIL)
    console.log('[TEST EMAIL] From Name:', process.env.MAILERSEND_FROM_NAME || 'Jual Digital')

    const testSubject = subject || 'Test Email from Jual Digital - MailerSend'
    const testText = `
Hello!

This is a test email from Jual Digital to verify that MailerSend is working correctly.

If you received this email, it means:
✅ MailerSend API key is valid
✅ MailerSend integration is working
✅ Email service is properly configured

Timestamp: ${new Date().toISOString()}

Best regards,
Jual Digital Team
    `

    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test Email - MailerSend</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2563eb; margin-top: 0;">✅ MailerSend Test Email</h2>
        
        <p>Hello!</p>
        
        <p>This is a test email from <strong>Jual Digital</strong> to verify that MailerSend is working correctly.</p>
        
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #374151;">If you received this email, it means:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li>✅ MailerSend API key is valid</li>
                <li>✅ MailerSend integration is working</li>
                <li>✅ Email service is properly configured</li>
            </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
            <strong>Timestamp:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
        </p>
        
        <p>Best regards,<br><strong>Jual Digital Team</strong></p>
    </div>
    
    <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
        <p>This is an automated test email. Please do not reply.</p>
    </div>
</body>
</html>
    `

    const result = await sendDownloadEmail({
      to,
      subject: testSubject,
      text: testText,
      html: testHtml,
    })

    if (result) {
      console.log('[TEST EMAIL] ✅ Test email sent successfully to:', to)
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        recipient: to,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('[TEST EMAIL] ❌ Failed to send test email to:', to)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test email. Check server logs for details.',
          recipient: to,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[TEST EMAIL] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'MailerSend Test Email API',
    usage: {
      method: 'POST',
      endpoint: '/api/test-email',
      body: {
        to: 'your-email@example.com',
        subject: 'Optional custom subject (default: Test Email from Jual Digital - MailerSend)',
      },
      example: {
        curl: `curl -X POST https://jualdigital.id/api/test-email \\
  -H "Content-Type: application/json" \\
  -d '{"to": "your-email@example.com"}'`,
      },
    },
    environment: {
      MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY ? 'Set (hidden)' : 'Not set',
      MAILERSEND_FROM_EMAIL: process.env.MAILERSEND_FROM_EMAIL || 'Not set',
      MAILERSEND_FROM_NAME: process.env.MAILERSEND_FROM_NAME || 'Not set (default: Jual Digital)',
    },
  })
}

