import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sendSellerApplicationApproved, sendSellerApplicationRejected } from '@/lib/email-service'
import { WhatsAppService } from '@/lib/whatsapp-service'

export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    // Get all users from profiles table - force fresh query with aggressive cache-busting
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    console.log('[ADMIN USERS API] Fetching users at:', new Date().toISOString(), 'timestamp:', timestamp, 'random:', randomId)
    
    // Force a completely fresh query by using multiple cache-busting techniques
    // Create a new Supabase client instance to avoid any connection-level caching
    const freshSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )
    
    // Force fresh query with timestamp-based filter and no caching
    const { data: users, error: usersError } = await freshSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      // Use a filter that's always true but forces fresh query evaluation
      .neq('id', '00000000-0000-0000-0000-000000000000')
      // Add timestamp to query to prevent any caching
      .limit(10000) // Set high limit to ensure we get all users

    if (usersError) {
      console.error('[ADMIN USERS API] Users query error:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get orders data for each user to calculate statistics
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('user_id, total_amount, status, created_at')

    if (ordersError) {
      console.error('[ADMIN USERS API] Orders query error:', ordersError)
    }

    // Get products data for sellers
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('seller_id, created_at')

    if (productsError) {
      console.error('[ADMIN USERS API] Products query error:', productsError)
    }

    // Calculate statistics
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Calculate stats
    const totalUsers = users?.length || 0
    const activeUsers = users?.filter(user => user.status === 'active').length || 0
    const suspendedUsers = users?.filter(user => user.status === 'suspended').length || 0
    const totalAuthors = users?.filter(user => user.role === 'seller').length || 0
    
    // Filter pending sellers and log for debugging
    const pendingSellersList = users?.filter(user => user.role === 'seller' && user.status === 'pending') || []
    const pendingSellers = pendingSellersList.length
    console.log('[ADMIN USERS API] Pending sellers count:', pendingSellers)
    console.log('[ADMIN USERS API] Pending sellers details:', pendingSellersList.map(u => ({ id: u.id, name: u.name, role: u.role, status: u.status })))
    
    const newUsersThisMonth = users?.filter(user => 
      new Date(user.created_at) >= thisMonth
    ).length || 0

    // Log all seller statuses for debugging
    const allSellers = users?.filter(user => user.role === 'seller') || []
    console.log('[ADMIN USERS API] All sellers status breakdown:', {
      total: allSellers.length,
      active: allSellers.filter(u => u.status === 'active').length,
      pending: allSellers.filter(u => u.status === 'pending').length,
      rejected: allSellers.filter(u => u.status === 'rejected').length,
      other: allSellers.filter(u => u.status !== 'active' && u.status !== 'pending' && u.status !== 'rejected').map(u => ({ id: u.id, status: u.status }))
    })

    // Process user data with additional statistics
    const processedUsers = users?.map(user => {
      // Calculate user's order statistics
      const userOrders = orders?.filter(order => order.user_id === user.id) || []
      const totalPurchases = userOrders.length
      const totalSpent = userOrders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)
      const lastOrder = userOrders.length > 0 ? 
        new Date(Math.max(...userOrders.map(o => new Date(o.created_at).getTime()))) : null

      // Calculate seller statistics
      const userProducts = products?.filter(product => product.seller_id === user.id) || []
      const productsCount = userProducts.length
      const totalEarnings = user.total_earnings || 0

      return {
        id: user.id,
        name: user.name || 'Unknown User',
        email: user.email || 'No email',
        role: user.role || 'user',
        status: user.status || 'active',
        joinDate: user.created_at,
        lastLogin: user.updated_at,
        totalPurchases,
        totalSpent,
        productsCount,
        totalEarnings,
        avatar: user.avatar_url || null,
        phone: user.phone,
        address: user.address,
        city: user.city,
        business_name: user.business_name,
        business_category: user.business_category,
        business_description: user.business_description,
        bank_name: user.bank_name,
        account_number: user.account_number,
        account_name: user.account_name,
        total_sales: user.total_sales || 0,
        rating: user.rating || 0,
        total_reviews: user.total_reviews || 0,
        followers: user.followers || 0,
        lastOrder: lastOrder?.toISOString() || null
      }
    }) || []

    console.log('[ADMIN USERS API] Returning stats:', {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalAuthors,
      pendingSellers,
      newUsersThisMonth,
      timestamp: new Date().toISOString()
    })

    // Log the actual data being returned to help debug
    const returnedPendingSellers = processedUsers?.filter(user => user.role === 'seller' && user.status === 'pending') || []
    console.log('[ADMIN USERS API] Returning data - Pending sellers in response:', returnedPendingSellers.length)
    if (returnedPendingSellers.length > 0) {
      console.log('[ADMIN USERS API] Sample pending seller IDs:', returnedPendingSellers.slice(0, 3).map(u => ({ id: u.id, name: u.name, status: u.status })))
    }
    
    return NextResponse.json({
      users: processedUsers,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalAuthors,
        pendingSellers,
        newUsersThisMonth
      },
      _meta: {
        fetchedAt: new Date().toISOString(),
        timestamp: Date.now(),
        totalUsersReturned: processedUsers?.length || 0
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': Date.now().toString(),
      },
    })

  } catch (error) {
    console.error('[ADMIN USERS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check admin authentication
    const adminAuth = req.cookies.get('admin-auth')?.value
    if (!adminAuth || adminAuth !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service role key for admin operations to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )

    const { userId, action, role, status, rejectionReason } = await req.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const updateData: Record<string, string> = {}

    if (action === 'updateRole') {
      if (!role) {
        return NextResponse.json(
          { error: 'Role is required for updateRole action' },
          { status: 400 }
        )
      }
      updateData.role = role
    } else if (action === 'updateStatus') {
      if (!status) {
        return NextResponse.json(
          { error: 'Status is required for updateStatus action' },
          { status: 400 }
        )
      }
      updateData.status = status
    } else if (action === 'approveSeller') {
      if (!role || !status) {
        return NextResponse.json(
          { error: 'Role and status are required for approveSeller action' },
          { status: 400 }
        )
      }
      updateData.role = role
      updateData.status = status
    }

    // Get user details before updating for email notifications
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('[ADMIN USERS API] User fetch error:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Get email from auth.users table since profiles.email might be empty for OAuth users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('[ADMIN USERS API] Auth user fetch error:', authError)
    }

    const userEmail = authUser?.user?.email || userData?.email || ''

    console.log('[ADMIN USERS API] User data for email:', {
      id: userData?.id,
      email: userEmail,
      name: userData?.name,
      business_name: userData?.business_name
    })

    console.log('[ADMIN USERS API] Updating user:', { userId, updateData })
    
    // Update and return the FULL updated user data in one query
    // Use a fresh Supabase client to avoid any connection-level caching
    const updateSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )
    
    const { data: updateResult, error } = await updateSupabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('[ADMIN USERS API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    console.log('[ADMIN USERS API] User updated successfully:', { userId, updateData })
    console.log('[ADMIN USERS API] Update result from Supabase:', { 
      id: updateResult?.id, 
      role: updateResult?.role, 
      status: updateResult?.status 
    })
    
    // Verify the update was actually committed by querying again with a fresh connection
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const verifySupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )
    
    const { data: verifiedUser, error: verifyError } = await verifySupabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', userId)
      .single()
    
    if (!verifyError && verifiedUser) {
      console.log('[ADMIN USERS API] Verified update:', { 
        id: verifiedUser.id, 
        role: verifiedUser.role, 
        status: verifiedUser.status 
      })
      
      // If verification shows different status, use verified data
      if (verifiedUser.status !== updateResult.status) {
        console.warn('[ADMIN USERS API] Status mismatch! Update result:', updateResult.status, 'Verified:', verifiedUser.status)
        updateResult.status = verifiedUser.status
        updateResult.role = verifiedUser.role
      }
    } else {
      console.error('[ADMIN USERS API] Verification failed:', verifyError)
    }

    // Send email and WhatsApp notifications for seller application status changes
    if (userData && (action === 'updateRole' || action === 'updateStatus' || action === 'approveSeller')) {
      try {
        if ((action === 'updateRole' && role === 'seller') || action === 'approveSeller') {
          // Seller application approved - send via both email and WhatsApp
          
          // Send email notification
          if (userEmail && userEmail.trim() !== '') {
            const emailSent = await sendSellerApplicationApproved({
              to: userEmail,
              sellerName: userData.name || '',
              businessName: userData.business_name || '',
            })
            if (emailSent) {
              console.log('[ADMIN USERS API] Approval email sent successfully')
            } else {
              console.log('[ADMIN USERS API] Failed to send approval email')
            }
          } else {
            console.log('[ADMIN USERS API] No valid email found for user, skipping email notification')
          }
          
          // Send WhatsApp notification
          const whatsappService = new WhatsAppService()
          const whatsappSent = await whatsappService.sendSellerApprovalNotification(userId, {
            sellerName: userData.name || '',
            businessName: userData.business_name || '',
          })
          if (whatsappSent) {
            console.log('[ADMIN USERS API] Approval WhatsApp sent successfully')
          } else {
            console.log('[ADMIN USERS API] Failed to send approval WhatsApp (user may not have phone number)')
          }
        } else if (action === 'updateStatus' && updateData.status === 'rejected') {
          // Seller application rejected - send via both email and WhatsApp
          
          // Send email notification
          if (userEmail && userEmail.trim() !== '') {
            const emailSent = await sendSellerApplicationRejected({
              to: userEmail,
              sellerName: userData.name || '',
              businessName: userData.business_name || '',
              reason: rejectionReason || 'Aplikasi tidak memenuhi kriteria yang diperlukan',
            })
            if (emailSent) {
              console.log('[ADMIN USERS API] Rejection email sent successfully')
            } else {
              console.log('[ADMIN USERS API] Failed to send rejection email')
            }
          } else {
            console.log('[ADMIN USERS API] No valid email found for user, skipping email notification')
          }
          
          // Send WhatsApp notification
          const whatsappService = new WhatsAppService()
          const whatsappSent = await whatsappService.sendSellerRejectionNotification(userId, {
            sellerName: userData.name || '',
            businessName: userData.business_name || '',
            reason: 'Aplikasi tidak memenuhi kriteria yang diperlukan',
          })
          if (whatsappSent) {
            console.log('[ADMIN USERS API] Rejection WhatsApp sent successfully')
          } else {
            console.log('[ADMIN USERS API] Failed to send rejection WhatsApp (user may not have phone number)')
          }
        }
      } catch (notificationError) {
        console.error('[ADMIN USERS API] Failed to send notification:', notificationError)
        // Don't fail the update if notification fails
      }
    }

    // Return the updated user data so frontend can update immediately without refetching
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updateResult,
      updatedFields: updateData
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('[ADMIN USERS API] PUT Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 