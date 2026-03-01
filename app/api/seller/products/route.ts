import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr'
import { calculateSellerTrustScore } from '@/lib/seller-trust-service'

export async function POST(req: NextRequest) {
  try {
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
            // Route handler - cookies set via response
          },
        },
      }
    )

    // Get user from auth token (try multiple cookie names)
    let user = null

    // Try to get user from auth
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
    
    if (!userError && authUser) {
      user = authUser
    }

    // Get request body for product data
    const body = await req.json()
    const { 
      title, 
      description, 
      longDescription, 
      category, 
      price, 
      variants, 
      sellerId,
      language,
      deliveryMethod,
      tags,
      livePreview,
      license,
      format,
      originalPrice,
      productLinks,
      downloadLimit,
      imageUrl,
      imageUrls,
      thumbnailIndex,
      submitForReview, // true = pending (for admin review), false/undefined = draft
      telegramEnabled,
      telegramPlanCode,
      telegramStarsPrice,
    } = body

    // If auth failed, try to get user from sellerId in body
    if (!user && sellerId) {
      // Get user profile by ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .single()
      
      if (profile && profile.role === 'seller') {
        user = { id: sellerId }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Seller access required' },
        { status: 401 }
      )
    }

    // Check if user is a seller
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, telegram_feature_enabled')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'seller') {
      return NextResponse.json(
        { error: 'Seller access required' },
        { status: 403 }
      )
    }

    if (telegramEnabled && !profile.telegram_feature_enabled) {
      return NextResponse.json(
        { error: 'Telegram checkout feature is not enabled for your seller account. Please contact admin.' },
        { status: 403 }
      )
    }

    if (!title || !description || !category || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine initial status
    let initialStatus = 'draft'
    if (submitForReview) {
      // Seller clicked "Simpan dan Pasarkan" - submit for admin review
      initialStatus = 'pending'
    } else {
      // Check seller trust level - trusted sellers can self-activate
      const trustScore = await calculateSellerTrustScore(user.id)
      initialStatus = trustScore.canSelfActivate ? 'active' : 'draft'
    }

    // Map delivery method: form uses "upload", DB expects "file"
    const dbDeliveryMethod = deliveryMethod === 'upload' ? 'file' : (deliveryMethod || 'file')

    // Safely parse price
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: 'Harga tidak valid' },
        { status: 400 }
      )
    }

    // Create product
    const productData = {
      title,
      description,
      long_description: longDescription || null,
      category,
      price: parsedPrice,
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      seller_id: user.id,
      status: initialStatus,
      language: language || 'id',
      tags: tags || [],
      live_preview: livePreview || null,
      license: license || null,
      format: format || null,
      delivery_method: dbDeliveryMethod,
      download_limit: downloadLimit || -1,
      file_url: null,
      download_link: dbDeliveryMethod === 'link' && productLinks && productLinks.length > 0 
        ? productLinks[0].url 
        : null,
      image_url: (imageUrls && imageUrls.length > 0 && thumbnailIndex !== undefined) 
        ? imageUrls[thumbnailIndex] || imageUrls[0] 
        : imageUrl || null,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : null,
      telegram_enabled: !!telegramEnabled,
      telegram_plan_code: telegramPlanCode?.trim() || null,
      telegram_stars_price: telegramStarsPrice ? parseInt(String(telegramStarsPrice), 10) || null : null,
    }

    console.log('[SELLER PRODUCTS API] Inserting product:', { title, category, price: parsedPrice, status: initialStatus, deliveryMethod: dbDeliveryMethod })

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (productError) {
      console.error('[SELLER PRODUCTS API] Product creation error:', productError)
      console.error('[SELLER PRODUCTS API] Error details:', JSON.stringify(productError, null, 2))
      return NextResponse.json(
        { error: `Failed to create product: ${productError.message}`, details: productError.message, code: productError.code },
        { status: 500 }
      )
    }

    // Create product variants if provided
    if (variants && variants.length > 0 && product) {
      const variantData = variants.map((variant: { name: string; price: number; description: string }) => ({
        product_id: product.id,
        name: variant.name,
        price: variant.price,
        description: variant.description || ''
      }))

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantData)

      if (variantError) {
        console.error('[SELLER PRODUCTS API] Variant creation error:', variantError)
        // Don't fail the entire request if variants fail, just log the error
      }
    } else if (product) {
      // Create default variant if none provided
      const { error: defaultVariantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          name: 'Standard',
          price: parseFloat(price),
          description: 'Default variant'
        })

      if (defaultVariantError) {
        console.error('[SELLER PRODUCTS API] Default variant creation error:', defaultVariantError)
      }
    }

    return NextResponse.json({
      success: true,
      product
    })

  } catch (error) {
    console.error('[SELLER PRODUCTS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check seller authentication
    const authToken = req.cookies.get('sb-e52fc39c-d56c-418c-b470-934337d0286b-auth-token')?.value

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // Route handler - cookies set via response
          },
        },
      }
    )

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get seller's products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('[SELLER PRODUCTS API] Products fetch error:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      products
    })

  } catch (error) {
    console.error('[SELLER PRODUCTS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 