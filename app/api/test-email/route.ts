import { NextRequest, NextResponse } from 'next/server'
import { sendDownloadEmail } from '@/lib/email-service'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('[TEST EMAIL] Testing email configuration...')
    console.log('[TEST EMAIL] Environment variables:')
    console.log('[TEST EMAIL] SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET')
    console.log('[TEST EMAIL] SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || 'NOT SET')
    console.log('[TEST EMAIL] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'NOT SET')

    const result = await sendDownloadEmail({
      to: email,
      subject: 'Test Email - Jual Digital',
      text: 'This is a test email from Jual Digital marketplace.',
      html: '<p>This is a test email from <strong>Jual Digital</strong> marketplace.</p>',
    })

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send test email' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[TEST EMAIL] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email' 
    }, { status: 500 })
  }
} 