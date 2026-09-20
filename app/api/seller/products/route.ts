import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUserFromRequest, pickBody, serviceRoleClient } from '@/lib/mobile-auth'
import { calculateSellerTrustScore } from '@/lib/seller-trust-service'

const ALLOWED_TYPES = ['digital_product', 'service', 'course', 'membership'] as const
type ProductType = (typeof ALLOWED_TYPES)[number]

function normalizeLanguage(lang: unknown): string {
  const s = String(lang || 'id').trim().toLowerCase()
  if (!s || s === 'indonesia' || s === 'indonesian' || s === 'id') return 'id'
  if (s === 'english' || s === 'en') return 'en'
  if (s === 'both' || s === 'bilingual') return 'both'
  return String(lang)
}

function normalizeLicense(license: unknown): string | null {
  if (license === undefined || license === null || license === '') return null
  const s = String(license).trim().toLowerCase()
  if (s === 'personal') return 'personal'
  if (s === 'commercial' || s === 'komersial') return 'commercial'
  if (s === 'extended') return 'extended'
  return String(license)
}

function parsePrice(value: unknown): number {
  if (typeof value === 'number') return value
  if (value === undefined || value === null || value === '') return NaN
  return parseFloat(String(value))
}

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
}

function linkList(body: Record<string, unknown>, downloadLink: unknown) {
  const raw = pickBody<unknown>(body, 'productLinks', 'product_links')
  const links = Array.isArray(raw) ? raw : []
  if (links.length) return links as Array<{ name?: string; url?: string }>
  if (typeof downloadLink === 'string' && downloadLink.trim()) {
    return [{ name: 'Download', url: downloadLink.trim() }]
  }
  return []
}

async function requireSeller(userId: string) {
  const supabase = serviceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, telegram_feature_enabled')
    .eq('id', userId)
    .single()

  if (!profile || (profile.role !== 'seller' && profile.role !== 'admin')) {
    return { supabase, profile: null as typeof profile }
  }
  return { supabase, profile }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    const body = asObject(await req.json())

    let actor = user
    const sellerId = pickBody<string>(body, 'sellerId', 'seller_id')
    const supabaseProbe = serviceRoleClient()

    if (!actor && sellerId) {
      const { data: profile } = await supabaseProbe
        .from('profiles')
        .select('id, role')
        .eq('id', sellerId)
        .single()
      if (profile && (profile.role === 'seller' || profile.role === 'admin')) {
        actor = { id: sellerId } as typeof user
      }
    }

    if (!actor) {
      return NextResponse.json(
        { error: 'Unauthorized - Seller access required' },
        { status: 401 }
      )
    }

    const { supabase, profile } = await requireSeller(actor.id)
    if (!profile) {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }

    const title = pickBody<string>(body, 'title')
    const description = pickBody<string>(body, 'description')
    const category = pickBody<string>(body, 'category')
    const longDescription = pickBody<string>(body, 'longDescription', 'long_description')
    const language = pickBody<string>(body, 'language')
    const deliveryMethod = pickBody<string>(body, 'deliveryMethod', 'delivery_method')
    const tags = pickBody<string[]>(body, 'tags')
    const livePreview = pickBody<string>(body, 'livePreview', 'live_preview')
    const license = pickBody<string>(body, 'license')
    const format = pickBody<string>(body, 'format')
    const originalPrice = pickBody<unknown>(body, 'originalPrice', 'original_price')
    const downloadLimit = pickBody<unknown>(body, 'downloadLimit', 'download_limit')
    const imageUrl = pickBody<string>(body, 'imageUrl', 'image_url', 'imageURL')
    const imageUrls = pickBody<string[]>(body, 'imageUrls', 'image_urls')
    const thumbnailIndex = pickBody<number>(body, 'thumbnailIndex', 'thumbnail_index')
    const fileUrl = pickBody<string>(body, 'fileUrl', 'file_url', 'fileURL')
    const downloadLink = pickBody<string>(body, 'downloadLink', 'download_link')
    const productTypeRaw = pickBody<string>(body, 'productType', 'product_type')
    const variants = pickBody<Array<{ name: string; price: number; description?: string }>>(body, 'variants')
    const telegramEnabled = pickBody<boolean>(body, 'telegramEnabled', 'telegram_enabled')
    const telegramPlanCode = pickBody<string>(body, 'telegramPlanCode', 'telegram_plan_code')
    const telegramStarsPrice = pickBody<unknown>(body, 'telegramStarsPrice', 'telegram_stars_price')
    const submitForReview = !!pickBody<boolean>(body, 'submitForReview', 'submit_for_review')
    let servicePackages = pickBody<unknown[]>(body, 'servicePackages', 'service_packages')
    const courseSections = pickBody<unknown[]>(body, 'courseSections', 'course_sections')
    let membershipTiers = pickBody<unknown[]>(body, 'membershipTiers', 'membership_tiers')
    const productLinks = linkList(body, downloadLink)
    const price = pickBody<unknown>(body, 'price')

    if (telegramEnabled && !profile.telegram_feature_enabled) {
      return NextResponse.json(
        { error: 'Telegram checkout feature is not enabled for your seller account. Please contact admin.' },
        { status: 403 }
      )
    }

    const resolvedType: ProductType = ALLOWED_TYPES.includes(productTypeRaw as ProductType)
      ? (productTypeRaw as ProductType)
      : 'digital_product'

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Judul, deskripsi, dan kategori wajib diisi' },
        { status: 400 }
      )
    }

    let parsedPrice = parsePrice(price)
    if (resolvedType === 'service' && Array.isArray(servicePackages) && servicePackages.length) {
      parsedPrice = Math.min(
        ...servicePackages.map((p: { price?: number | string }) => parsePrice(p.price))
      )
    } else if (resolvedType === 'membership' && Array.isArray(membershipTiers) && membershipTiers.length) {
      parsedPrice = Math.min(
        ...membershipTiers.map((t: { price_monthly?: number | string }) => parsePrice(t.price_monthly))
      )
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Harga wajib diisi' }, { status: 400 })
    }

    // Mobile v1: create jasa/kursus/keanggotaan with type + price; extras completed on web later.
    if (resolvedType === 'service' && (!Array.isArray(servicePackages) || servicePackages.length === 0)) {
      servicePackages = [
        {
          tier: 'basic',
          title: 'Basic',
          description: description,
          price: parsedPrice,
          delivery_days: 3,
          revisions: 1,
          features: [],
        },
      ]
    }
    if (resolvedType === 'membership' && (!Array.isArray(membershipTiers) || membershipTiers.length === 0)) {
      membershipTiers = [
        {
          name: 'Standard',
          description: description,
          price_monthly: parsedPrice,
          perks: [],
        },
      ]
    }

    let initialStatus = 'draft'
    if (submitForReview) {
      initialStatus = 'pending'
    } else {
      const trustScore = await calculateSellerTrustScore(actor.id)
      initialStatus = trustScore.canSelfActivate ? 'active' : 'draft'
    }

    const dbDeliveryMethod =
      deliveryMethod === 'upload' ? 'file' : deliveryMethod || (fileUrl ? 'file' : 'link')

    const productData = {
      title,
      description,
      long_description: longDescription || null,
      category,
      product_type: resolvedType,
      price: parsedPrice,
      original_price: (() => {
        if (originalPrice == null || originalPrice === '') return null
        const parsed = parsePrice(originalPrice)
        return Number.isFinite(parsed) ? parsed : null
      })(),
      seller_id: actor.id,
      status: initialStatus,
      language: normalizeLanguage(language),
      tags: tags || [],
      live_preview: livePreview || null,
      license: normalizeLicense(license),
      format: format || null,
      delivery_method: resolvedType === 'digital_product' ? dbDeliveryMethod : 'link',
      download_limit: downloadLimit || -1,
      file_url:
        resolvedType === 'digital_product' && dbDeliveryMethod === 'file' ? fileUrl || null : null,
      download_link:
        resolvedType === 'digital_product' && dbDeliveryMethod === 'link' && productLinks.length > 0
          ? productLinks[0].url || null
          : null,
      image_url:
        imageUrls && imageUrls.length > 0 && thumbnailIndex !== undefined
          ? imageUrls[thumbnailIndex] || imageUrls[0]
          : imageUrl || null,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : null,
      telegram_enabled: resolvedType === 'digital_product' ? !!telegramEnabled : false,
      telegram_plan_code: telegramPlanCode?.trim() || null,
      telegram_stars_price: telegramStarsPrice
        ? parseInt(String(telegramStarsPrice), 10) || null
        : null,
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (productError) {
      console.error('[SELLER PRODUCTS API] Product creation error:', productError)
      return NextResponse.json(
        {
          error: `Failed to create product: ${productError.message}`,
          details: productError.message,
          code: productError.code,
        },
        { status: 500 }
      )
    }

    if (resolvedType === 'digital_product' || resolvedType === 'course') {
      if (variants && variants.length > 0 && product) {
        const variantData = variants.map((variant) => ({
          product_id: product.id,
          name: variant.name,
          price: variant.price,
          description: variant.description || '',
        }))
        const { error: variantError } = await supabase.from('product_variants').insert(variantData)
        if (variantError) console.error('[SELLER PRODUCTS API] Variant creation error:', variantError)
      } else if (product) {
        const { error: defaultVariantError } = await supabase.from('product_variants').insert({
          product_id: product.id,
          name: 'Standard',
          price: parsedPrice,
          description: 'Default variant',
        })
        if (defaultVariantError) {
          console.error('[SELLER PRODUCTS API] Default variant creation error:', defaultVariantError)
        }
      }
    }

    if (resolvedType === 'service' && product && Array.isArray(servicePackages)) {
      const rows = servicePackages
        .filter((p: { title?: string; price?: number | string }) => p.title && p.price !== undefined)
        .map(
          (
            p: {
              tier?: string
              title: string
              description?: string
              price: number | string
              delivery_days?: number
              revisions?: number
              features?: string[]
              sort_order?: number
            },
            idx: number
          ) => ({
            product_id: product.id,
            tier: p.tier || ['basic', 'standard', 'premium'][idx] || 'basic',
            title: p.title,
            description: p.description || null,
            price: parsePrice(p.price),
            delivery_days: p.delivery_days ?? 3,
            revisions: p.revisions ?? 1,
            features: p.features || [],
            sort_order: p.sort_order ?? idx,
          })
        )
      if (rows.length) {
        const { error: pkgErr } = await supabase.from('service_packages').insert(rows)
        if (pkgErr) console.error('[SELLER PRODUCTS API] service_packages', pkgErr)
      }
    }

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

    if (resolvedType === 'membership' && product && Array.isArray(membershipTiers)) {
      const rows = membershipTiers
        .filter((t: { name?: string; price_monthly?: number | string }) => t.name && t.price_monthly !== undefined)
        .map(
          (
            t: {
              name: string
              description?: string
              price_monthly: number | string
              price_yearly?: number | string
              perks?: string[]
              sort_order?: number
            },
            idx: number
          ) => ({
            product_id: product.id,
            name: t.name,
            description: t.description || null,
            price_monthly: parsePrice(t.price_monthly),
            price_yearly: t.price_yearly != null ? parsePrice(t.price_yearly) : null,
            perks: t.perks || [],
            sort_order: t.sort_order ?? idx,
            is_active: true,
          })
        )
      if (rows.length) {
        const { error: tierErr } = await supabase.from('membership_tiers').insert(rows)
        if (tierErr) console.error('[SELLER PRODUCTS API] membership_tiers', tierErr)
      }
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('[SELLER PRODUCTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, profile } = await requireSeller(user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (productsError) {
      console.error('[SELLER PRODUCTS API] Products fetch error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    return NextResponse.json({
      products: products || [],
    })
  } catch (error) {
    console.error('[SELLER PRODUCTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
