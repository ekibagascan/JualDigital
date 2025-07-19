import sgMail from '@sendgrid/mail'

interface SendGridError {
  message: string
  code?: string
  response?: {
    body?: unknown
  }
}

console.log('[EMAIL SERVICE] Initializing with API key:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET')
console.log('[EMAIL SERVICE] From email:', process.env.SENDGRID_FROM_EMAIL || 'NOT SET')

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
  console.log('[EMAIL SERVICE] Attempting to send email to:', to)
  console.log('[EMAIL SERVICE] Subject:', subject)
  console.log('[EMAIL SERVICE] From email:', process.env.SENDGRID_FROM_EMAIL)
  console.log('[EMAIL SERVICE] API key status:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET')
  
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject,
    text,
    html,
  }
  
  console.log('[EMAIL SERVICE] Email message prepared:', {
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    textLength: msg.text.length,
    htmlLength: msg.html.length
  })
  
  try {
    console.log('[EMAIL SERVICE] Sending email via SendGrid...')
    const result = await sgMail.send(msg)
    console.log('[EMAIL SERVICE] Email sent successfully:', result)
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