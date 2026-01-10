import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { sendSellerApplicationConfirmation } from '@/lib/email-service'

export async function POST(req: NextRequest) {
  try {
    const { userId, sellerName, businessName } = await req.json()

    if (!userId || !sellerName || !businessName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Service role doesn't need to set cookies
          },
        },
      }
    )

    // Get email from auth.users table since profiles.email might be empty for OAuth users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('[SELLER APPLICATION CONFIRMATION API] Auth user fetch error:', authError)
      return NextResponse.json(
        { error: 'Failed to fetch user email' },
        { status: 500 }
      )
    }

    const userEmail = authUser?.user?.email || ''

    if (!userEmail) {
      console.error('[SELLER APPLICATION CONFIRMATION API] No email found for user')
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 400 }
      )
    }

    const emailSent = await sendSellerApplicationConfirmation({
      to: userEmail,
      sellerName,
      businessName,
    })

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[SELLER APPLICATION CONFIRMATION API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 