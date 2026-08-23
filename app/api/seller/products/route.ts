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
      productType,
      servicePackages,
      courseSections,
      membershipTiers,
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

    const allowedTypes = ['digital_product', 'service', 'course', 'membership'] as const
    type ProductType = (typeof allowedTypes)[number]
    const resolvedType: ProductType = allowedTypes.includes(productType as ProductType)
      ? (productType as ProductType)
      : 'digital_product'

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Judul, deskripsi, dan kategori wajib diisi' },
        { status: 400 }
      )
    }

    // Price required for digital; service/membership use package/tier prices
    if (resolvedType === 'digital_product' && (price === undefined || price === null || price === '')) {
      return NextResponse.json({ error: 'Harga wajib diisi' }, { status: 400 })
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

    // Derive display price from type-specific packages when needed
    let parsedPrice = parseFloat(price)
    if (resolvedType === 'service' && Array.isArray(servicePackages) && servicePackages.length) {
      parsedPrice = Math.min(...servicePackages.map((p: { price: number | string }) => parseFloat(String(p.price))))
    } else if (resolvedType === 'membership' && Array.isArray(membershipTiers) && membershipTiers.length) {
      parsedPrice = Math.min(...membershipTiers.map((t: { price_monthly: number | string }) => parseFloat(String(t.price_monthly))))
    }
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
      product_type: resolvedType,
      price: parsedPrice,
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      seller_id: user.id,
      status: initialStatus,
      language: language || 'id',
      tags: tags || [],
      live_preview: livePreview || null,
      license: license || null,
      format: format || null,
      delivery_method: resolvedType === 'digital_product' ? dbDeliveryMethod : 'link',
      download_limit: downloadLimit || -1,
      file_url: null,
      download_link: resolvedType === 'digital_product' && dbDeliveryMethod === 'link' && productLinks && productLinks.length > 0 
        ? productLinks[0].url 
        : null,
      image_url: (imageUrls && imageUrls.length > 0 && thumbnailIndex !== undefined) 
        ? imageUrls[thumbnailIndex] || imageUrls[0] 
        : imageUrl || null,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : null,
      telegram_enabled: resolvedType === 'digital_product' ? !!telegramEnabled : false,
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

    // Create product variants if provided (digital + course display tiers)
    if (resolvedType === 'digital_product' || resolvedType === 'course') {
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
        }
      } else if (product) {
        const { error: defaultVariantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            name: 'Standard',
            price: parsedPrice,
            description: 'Default variant'
          })

        if (defaultVariantError) {
          console.error('[SELLER PRODUCTS API] Default variant creation error:', defaultVariantError)
        }
      }
    }

    // Service packages
    if (resolvedType === 'service' && product && Array.isArray(servicePackages)) {
      const rows = servicePackages
        .filter((p: { title?: string; price?: number | string }) => p.title && p.price !== undefined)
        .map((p: {
          tier?: string
          title: string
          description?: string
          price: number | string
          delivery_days?: number
          revisions?: number
          features?: string[]
          sort_order?: number
        }, idx: number) => ({
          product_id: product.id,
          tier: p.tier || ['basic', 'standard', 'premium'][idx] || 'basic',
          title: p.title,
          description: p.description || null,
          price: parseFloat(String(p.price)),
          delivery_days: p.delivery_days ?? 3,
          revisions: p.revisions ?? 1,
          features: p.features || [],
          sort_order: p.sort_order ?? idx,
        }))
      if (rows.length) {
        const { error: pkgErr } = await supabase.from('service_packages').insert(rows)
        if (pkgErr) console.error('[SELLER PRODUCTS API] service_packages', pkgErr)
      }
    }

    // Course curriculum
    if (resolvedType === 'course' && product && Array.isArray(courseSections)) {
      for (let sIdx = 0; sIdx < courseSections.length; sIdx++) {
        const section = courseSections[sIdx] as {
          title: string
          lessons?: Array<{
            title: string
            content_type?: string
            video_path?: string
            body?: string
            file_path?: string
            duration_sec?: number
            is_preview?: boolean
          }>
        }
        if (!section?.title) continue
        const { data: sec, error: secErr } = await supabase
          .from('course_sections')
          .insert({
            product_id: product.id,
            title: section.title,
            sort_order: sIdx,
          })
          .select('id')
          .single()
        if (secErr || !sec) {
          console.error('[SELLER PRODUCTS API] course_sections', secErr)
          continue
        }
        const lessons = section.lessons || []
        if (lessons.length) {
          const lessonRows = lessons.map((l, lIdx) => ({
            section_id: sec.id,
            title: l.title,
            content_type: l.content_type || 'video',
            video_path: l.video_path || null,
            body: l.body || null,
            file_path: l.file_path || null,
            duration_sec: l.duration_sec || 0,
            is_preview: !!l.is_preview,
            sort_order: lIdx,
          }))
          const { error: lesErr } = await supabase.from('course_lessons').insert(lessonRows)
          if (lesErr) console.error('[SELLER PRODUCTS API] course_lessons', lesErr)
        }
      }
    }

    // Membership tiers
    if (resolvedType === 'membership' && product && Array.isArray(membershipTiers)) {
      const rows = membershipTiers
        .filter((t: { name?: string; price_monthly?: number | string }) => t.name && t.price_monthly !== undefined)
        .map((t: {
          name: string
          description?: string
          price_monthly: number | string
          price_yearly?: number | string
          perks?: string[]
          sort_order?: number
        }, idx: number) => ({
          product_id: product.id,
          name: t.name,
          description: t.description || null,
          price_monthly: parseFloat(String(t.price_monthly)),
          price_yearly: t.price_yearly != null ? parseFloat(String(t.price_yearly)) : null,
          perks: t.perks || [],
          sort_order: t.sort_order ?? idx,
          is_active: true,
        }))
      if (rows.length) {
        const { error: tierErr } = await supabase.from('membership_tiers').insert(rows)
        if (tierErr) console.error('[SELLER PRODUCTS API] membership_tiers', tierErr)
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