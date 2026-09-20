import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, pickBody, serviceRoleClient } from '@/lib/mobile-auth'

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
}

function parsePrice(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : fallback
}

async function loadOwnedProduct(userId: string, productId: string) {
  const supabase = serviceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, telegram_feature_enabled')
    .eq('id', userId)
    .single()

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return { supabase, profile: null, product: null as Record<string, unknown> | null }
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('seller_id', userId)
    .single()

  if (error || !product) {
    return { supabase, profile, product: null }
  }
  return { supabase, profile, product: product as Record<string, unknown> }
}

async function updateProduct(req: NextRequest, productId: string) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, profile, product: existingProduct } = await loadOwnedProduct(user.id, productId)
  if (!profile) {
    return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
  }
  if (!existingProduct) {
    return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 })
  }

  const body = asObject(await req.json())
  const title = pickBody<string>(body, 'title') ?? (existingProduct.title as string)
  const description = pickBody<string>(body, 'description') ?? (existingProduct.description as string)
  const longDescription = pickBody<string>(body, 'longDescription', 'long_description')
  const category = pickBody<string>(body, 'category') ?? (existingProduct.category as string)
  const price = pickBody<unknown>(body, 'price')
  const variants = pickBody<Array<{ name: string; price: number; description?: string }>>(body, 'variants')
  const language = pickBody<string>(body, 'language')
  const deliveryMethodRaw = pickBody<string>(body, 'deliveryMethod', 'delivery_method')
  const tags = pickBody<string[]>(body, 'tags')
  const livePreview = pickBody<string>(body, 'livePreview', 'live_preview')
  const license = pickBody<string>(body, 'license')
  const format = pickBody<string>(body, 'format')
  const originalPrice = pickBody<unknown>(body, 'originalPrice', 'original_price')
  const downloadLimit = pickBody<unknown>(body, 'downloadLimit', 'download_limit')
  const imageUrl = pickBody<string>(body, 'imageUrl', 'image_url', 'imageURL')
  const imageUrls = pickBody<string[]>(body, 'imageUrls', 'image_urls')
  const fileUrl = pickBody<string>(body, 'fileUrl', 'file_url', 'fileURL')
  const downloadLink = pickBody<string>(body, 'downloadLink', 'download_link')
  const status = pickBody<string>(body, 'status')
  const thumbnailIndex = pickBody<number>(body, 'thumbnailIndex', 'thumbnail_index')
  const telegramEnabled = pickBody<boolean>(body, 'telegramEnabled', 'telegram_enabled')
  const telegramPlanCode = pickBody<string>(body, 'telegramPlanCode', 'telegram_plan_code')
  const telegramStarsPrice = pickBody<unknown>(body, 'telegramStarsPrice', 'telegram_stars_price')
  const productType = pickBody<string>(body, 'productType', 'product_type')
  const pages = pickBody<unknown>(body, 'pages')
  const productLinksRaw = pickBody<Array<{ url?: string }>>(body, 'productLinks', 'product_links')
  const productLinks =
    productLinksRaw && productLinksRaw.length
      ? productLinksRaw
      : downloadLink
        ? [{ url: downloadLink }]
        : []

  if (telegramEnabled && !profile.telegram_feature_enabled) {
    return NextResponse.json(
      {
        error: 'Telegram checkout feature is not enabled for your seller account. Please contact admin.',
      },
      { status: 403 }
    )
  }

  const deliveryMethod =
    deliveryMethodRaw === 'upload'
      ? 'file'
      : deliveryMethodRaw || (existingProduct.delivery_method as string) || 'file'

  const updatePayload: Record<string, unknown> = {
    title,
    description,
    long_description:
      longDescription !== undefined ? longDescription : existingProduct.long_description,
    category,
    price: parsePrice(price, Number(existingProduct.price) || 0),
    original_price:
      originalPrice != null && originalPrice !== ''
        ? parsePrice(originalPrice, 0)
        : originalPrice === null
          ? null
          : existingProduct.original_price,
    status: status || existingProduct.status,
    language: language || existingProduct.language || 'id',
    tags: tags || existingProduct.tags || [],
    live_preview: livePreview !== undefined ? livePreview || null : existingProduct.live_preview,
    license: license !== undefined ? license || null : existingProduct.license,
    format: format !== undefined ? format || null : existingProduct.format,
    delivery_method: deliveryMethod,
    download_limit: downloadLimit ?? existingProduct.download_limit ?? -1,
    pages: pages !== undefined ? pages : existingProduct.pages,
    file_url:
      deliveryMethod === 'file'
        ? fileUrl || existingProduct.file_url
        : null,
    download_link:
      deliveryMethod === 'link'
        ? productLinks[0]?.url || downloadLink || existingProduct.download_link
        : null,
    image_url:
      imageUrl ||
      (imageUrls && imageUrls.length > 0 && thumbnailIndex !== undefined
        ? imageUrls[thumbnailIndex]
        : existingProduct.image_url),
    images: imageUrls && imageUrls.length > 0 ? imageUrls : existingProduct.images,
    telegram_enabled: telegramEnabled !== undefined ? !!telegramEnabled : existingProduct.telegram_enabled,
    telegram_plan_code:
      telegramPlanCode !== undefined ? telegramPlanCode?.trim() || null : existingProduct.telegram_plan_code,
    telegram_stars_price: telegramStarsPrice
      ? parseInt(String(telegramStarsPrice), 10) || null
      : existingProduct.telegram_stars_price,
  }

  if (productType) {
    updatePayload.product_type = productType
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .select()
    .single()

  if (productError) {
    console.error('Error updating product:', productError)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }

  if (variants && variants.length > 0) {
    const { error: deleteError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId)

    if (deleteError) {
      console.error('Error deleting existing variants:', deleteError)
    }

    const variantsData = variants.map((variant) => ({
      product_id: productId,
      name: variant.name,
      price: variant.price,
      description: variant.description || null,
    }))

    const { error: variantsError } = await supabase.from('product_variants').insert(variantsData)
    if (variantsError) {
      console.error('Error inserting variants:', variantsError)
      return NextResponse.json({ error: 'Failed to update variants' }, { status: 500 })
    }
  }

  const { data: updatedVariants, error: variantsFetchError } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)

  if (variantsFetchError) {
    console.error('Error fetching updated variants:', variantsFetchError)
  }

  return NextResponse.json({
    message: 'Product updated successfully',
    product,
    variants: updatedVariants || [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await updateProduct(req, params.id)
  } catch (error) {
    console.error('Error in PUT /api/seller/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await updateProduct(req, params.id)
  } catch (error) {
    console.error('Error in PATCH /api/seller/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, profile, product } = await loadOwnedProduct(user.id, params.id)
    if (!profile) {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', params.id)

    if (variantsError) {
      console.error('Error fetching variants:', variantsError)
    }

    const res = NextResponse.json({ product, variants: variants || [] })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.headers.set('Pragma', 'no-cache')
    return res
  } catch (error) {
    console.error('Error in GET /api/seller/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, profile, product } = await loadOwnedProduct(user.id, params.id)
    if (!profile) {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 })
    }

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', params.id)
      .limit(1)

    if (orderItems && orderItems.length > 0) {
      return NextResponse.json(
        {
          error:
            'Produk ini memiliki pesanan dan tidak dapat dihapus. Nonaktifkan produk sebagai gantinya.',
        },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)
      .eq('seller_id', user.id)

    if (deleteError) {
      console.error('Error deleting product:', deleteError)
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/seller/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
