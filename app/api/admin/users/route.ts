import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
    
    // Use createClient with service role key to bypass ALL caching and RLS
    // This ensures we get the absolute latest data from Supabase
    const freshSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )
    
    // Query with explicit cache-busting - use a random parameter to force fresh query
    const { data: users, error: usersError } = await freshSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      // Force fresh query by using a condition that's always true but forces query re-evaluation
      .neq('id', '00000000-0000-0000-0000-000000000000')
      // Add a filter that includes timestamp to prevent any query caching
      .gte('created_at', '1970-01-01') // Always true, but forces fresh query
      .limit(10000) // Set high limit to ensure we get all users
    
    // Log what we actually got from Supabase BEFORE any processing
    if (users) {
      const sellersInResponse = users.filter(u => u.role === 'seller')
      const pendingInResponse = sellersInResponse.filter(u => u.status === 'pending')
      const activeInResponse = sellersInResponse.filter(u => u.status === 'active')
      console.log('[ADMIN USERS API] Raw Supabase response - Total sellers:', sellersInResponse.length, 'Pending:', pendingInResponse.length, 'Active:', activeInResponse.length)
      if (pendingInResponse.length > 0) {
        console.log('[ADMIN USERS API] Raw pending seller IDs from Supabase:', pendingInResponse.slice(0, 5).map(u => ({ id: u.id, name: u.name, status: u.status })))
      }
      // Also log a sample of active sellers to verify they exist
      if (activeInResponse.length > 0) {
        console.log('[ADMIN USERS API] Sample active sellers:', activeInResponse.slice(0, 3).map(u => ({ id: u.id, name: u.name, status: u.status })))
      }
    }

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

    // Get email from auth.users table first (always exists)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('[ADMIN USERS API] Auth user fetch error:', authError)
      return NextResponse.json(
        { error: 'User not found in auth system' },
        { status: 404 }
      )
    }

    const userEmail = authUser?.user?.email || ''

    // Get user details from profiles (may not exist yet)
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // If profile doesn't exist, that's okay - we'll create it with upsert
    const profileExists = !userError && userData

    console.log('[ADMIN USERS API] User data for email:', {
      id: userId,
      email: userEmail,
      name: userData?.name || authUser?.user?.user_metadata?.full_name || '',
      business_name: userData?.business_name || '',
      profileExists
    })

    console.log('[ADMIN USERS API] Updating user:', { userId, updateData })
    
    // Update and return the FULL updated user data in one query
    // Use createClient (not createServerClient) with service role key to properly bypass RLS
    // createServerClient from @supabase/ssr may still apply RLS policies
    const updateSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Use UPSERT instead of UPDATE to handle cases where profile doesn't exist yet
    // This will create the profile if it doesn't exist, or update if it does
    console.log('[ADMIN USERS API] Attempting upsert with data:', JSON.stringify(updateData))
    console.log('[ADMIN USERS API] User ID:', userId)
    
    // Prepare upsert data - include id and preserve existing data if profile exists
    const upsertData: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
    }
    
    // If profile exists, preserve all existing fields (except what we're updating)
    if (profileExists && userData) {
      // Preserve existing data
      Object.assign(upsertData, {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        business_name: userData.business_name,
        business_category: userData.business_category,
        business_description: userData.business_description,
        website: userData.website,
        social_media: userData.social_media,
        shop_logo: userData.shop_logo,
        bank_name: userData.bank_name,
        account_number: userData.account_number,
        account_name: userData.account_name,
        avatar_url: userData.avatar_url,
        bio: userData.bio,
        role: userData.role,
        status: userData.status,
      })
    } else {
      // If profile doesn't exist, set defaults from auth user
      upsertData.name = authUser?.user?.user_metadata?.full_name || authUser?.user?.email?.split('@')[0] || ''
      upsertData.email = userEmail
      // Set default role/status if not in updateData
      if (!updateData.role) upsertData.role = 'buyer'
      if (!updateData.status) upsertData.status = 'pending'
    }
    
    // Apply the update data (this will override preserved values)
    Object.assign(upsertData, updateData)
    
    const { data: updateResult, error } = await updateSupabase
      .from('profiles')
      .upsert(upsertData, { onConflict: 'id' })
      .select('*')
      .single()
    
    // Log the response details
    console.log('[ADMIN USERS API] Update response - error:', error ? JSON.stringify(error) : 'none', 'data:', updateResult ? 'exists' : 'null')

    if (error) {
      console.error('[ADMIN USERS API] Update error:', error)
      console.error('[ADMIN USERS API] Update error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to update user', details: error.message },
        { status: 500 }
      )
    }

    if (!updateResult) {
      console.error('[ADMIN USERS API] Update returned no data!')
      return NextResponse.json(
        { error: 'Update returned no data' },
        { status: 500 }
      )
    }

    console.log('[ADMIN USERS API] User updated successfully:', { userId, updateData })
    console.log('[ADMIN USERS API] Update result from Supabase:', { 
      id: updateResult.id, 
      role: updateResult.role, 
      status: updateResult.status,
      name: updateResult.name
    })
    
    // CRITICAL: Check if the update actually worked
    if (updateResult.status !== updateData.status || updateResult.role !== updateData.role) {
      console.error('[ADMIN USERS API] CRITICAL: Update did not work!')
      console.error('[ADMIN USERS API] Expected:', updateData)
      console.error('[ADMIN USERS API] Got:', { role: updateResult.role, status: updateResult.status })
    }
    
    // CRITICAL: Verify the update was actually committed by querying DIRECTLY from Supabase
    // Wait longer to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Create a completely fresh Supabase client with no connection reuse
    // Use createClient (not createServerClient) with service role key to properly bypass RLS
    const verifySupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Query directly with explicit cache-busting - use a filter that forces fresh query
    const { data: verifiedUser, error: verifyError } = await verifySupabase
      .from('profiles')
      .select('id, role, status, name')
      .eq('id', userId)
      .gte('created_at', '1970-01-01') // Force fresh query
      .single()
    
    if (!verifyError && verifiedUser) {
      console.log('[ADMIN USERS API] Verified update from Supabase:', { 
        id: verifiedUser.id, 
        name: verifiedUser.name,
        role: verifiedUser.role, 
        status: verifiedUser.status 
      })
      
      // CRITICAL: If verification shows different status, the update didn't work!
      // Use the verified data from Supabase (the source of truth)
      if (verifiedUser.status !== updateResult.status || verifiedUser.role !== updateResult.role) {
        console.error('[ADMIN USERS API] CRITICAL: Status mismatch detected!')
        console.error('[ADMIN USERS API] Update result:', { role: updateResult.role, status: updateResult.status })
        console.error('[ADMIN USERS API] Verified from Supabase:', { role: verifiedUser.role, status: verifiedUser.status })
        console.error('[ADMIN USERS API] Using verified data from Supabase as source of truth')
        
        // Override with verified data - Supabase is the source of truth
        updateResult.status = verifiedUser.status
        updateResult.role = verifiedUser.role
        console.error('[ADMIN USERS API] WARNING: Update did not persist! Using verified status from database.')
      } else {
        console.log('[ADMIN USERS API] Update verified successfully - status matches')
      }
    } else {
      console.error('[ADMIN USERS API] Verification query failed:', verifyError)
      console.error('[ADMIN USERS API] This means we cannot verify the update was committed!')
    }
    
    // Store verified user for return
    const verifiedUserData = verifiedUser && !verifyError ? verifiedUser : null

    // Send email and WhatsApp notifications for seller application status changes
    // CRITICAL: Only send notifications if status is actually changing (not already approved/rejected)
    // Use updateResult (the new/updated profile) and userData (the old profile if it existed)
    const previousStatus = userData?.status || 'pending' // Default to pending if profile didn't exist
    const newStatus = updateResult.status
    const statusChanged = previousStatus !== newStatus
    
    console.log('[ADMIN USERS API] Notification check - Previous status:', previousStatus, 'New status:', newStatus, 'Status changed:', statusChanged)
    
    if (updateResult && (action === 'updateRole' || action === 'updateStatus' || action === 'approveSeller') && statusChanged) {
      try {
        if ((action === 'updateRole' && role === 'seller') || action === 'approveSeller') {
          // Only send approval notification if status is changing from pending to active
          if (previousStatus === 'pending' && newStatus === 'active') {
            console.log('[ADMIN USERS API] Sending approval notifications (status changed from pending to active)')
            
            // Send email notification
            if (userEmail && userEmail.trim() !== '') {
              const emailSent = await sendSellerApplicationApproved({
                to: userEmail,
                sellerName: updateResult.name || '',
                businessName: updateResult.business_name || '',
              })
              if (emailSent) {
                console.log('[ADMIN USERS API] Approval email sent successfully')
              } else {
                console.log('[ADMIN USERS API] Failed to send approval email')
              }
            } else {
              console.log('[ADMIN USERS API] No valid email found for user, skipping email notification')
            }
            
            // WhatsApp notification disabled
            // const whatsappService = new WhatsAppService()
            // const whatsappSent = await whatsappService.sendSellerApprovalNotification(userId, {
            //   sellerName: updateResult.name || '',
            //   businessName: updateResult.business_name || '',
            // })
            // if (whatsappSent) {
            //   console.log('[ADMIN USERS API] Approval WhatsApp sent successfully')
            // } else {
            //   console.log('[ADMIN USERS API] Failed to send approval WhatsApp (user may not have phone number)')
            // }
          } else {
            console.log('[ADMIN USERS API] Skipping approval notifications - status not changing from pending to active', {
              previousStatus,
              newStatus
            })
          }
        } else if (action === 'updateStatus' && updateData.status === 'rejected') {
          // Only send rejection notification if status is changing from pending to rejected
          if (previousStatus === 'pending' && newStatus === 'rejected') {
            console.log('[ADMIN USERS API] Sending rejection notifications (status changed from pending to rejected)')
          // Seller application rejected - send via both email and WhatsApp
          
            // Send email notification
            if (userEmail && userEmail.trim() !== '') {
              const emailSent = await sendSellerApplicationRejected({
                to: userEmail,
                sellerName: updateResult.name || '',
                businessName: updateResult.business_name || '',
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
              sellerName: updateResult.name || '',
              businessName: updateResult.business_name || '',
              reason: 'Aplikasi tidak memenuhi kriteria yang diperlukan',
            })
          if (whatsappSent) {
            console.log('[ADMIN USERS API] Rejection WhatsApp sent successfully')
          } else {
            console.log('[ADMIN USERS API] Failed to send rejection WhatsApp (user may not have phone number)')
          }
          } else {
            console.log('[ADMIN USERS API] Skipping rejection notifications - status not changing from pending to rejected', {
              previousStatus,
              newStatus
            })
          }
        }
      } catch (notificationError) {
        console.error('[ADMIN USERS API] Failed to send notification:', notificationError)
        // Don't fail the update if notification fails
      }
    } else {
      console.log('[ADMIN USERS API] Skipping notifications - status not changed or no user data', {
        statusChanged,
        hasUserData: !!userData,
        previousStatus,
        newStatus
      })
    }

    // CRITICAL: Use verified data if available, otherwise use updateResult
    // The verified data is the source of truth from Supabase
    const finalUserData = verifiedUserData ? {
      ...updateResult,
      status: verifiedUserData.status,
      role: verifiedUserData.role
    } : updateResult
    
    console.log('[ADMIN USERS API] Returning final user data:', {
      id: finalUserData.id,
      name: finalUserData.name,
      role: finalUserData.role,
      status: finalUserData.status,
      source: verifiedUserData ? 'verified' : 'updateResult'
    })
    
    // Return the updated user data so frontend can update immediately without refetching
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: finalUserData,
      updatedFields: updateData,
      verified: verifiedUserData ? true : false
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