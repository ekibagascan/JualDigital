import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Slim columns for catalog cards/lists — cuts payload vs select('*'). */
export const PRODUCT_LIST_COLUMNS =
  'id, title, description, price, original_price, image_url, category, tags, seller_id, status, rating, total_sales, total_reviews, featured, created_at, delivery_method, product_type, live_preview, telegram_enabled, telegram_plan_code, telegram_stars_price'

// Lazy getter for Supabase client to avoid multiple GoTrueClient instances in browser
let _browserClient: SupabaseClient | null = null
function getBrowserClient(): SupabaseClient {
  if (!_browserClient && typeof window !== 'undefined') {
    // Dynamically import to avoid circular dependencies and ensure we use the shared instance
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _browserClient = require('@/lib/supabase-client').supabase as SupabaseClient
  }
  return _browserClient || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  )
}

// Use shared browser client when in browser context, otherwise create server client
const supabase: SupabaseClient = typeof window !== 'undefined' 
  ? getBrowserClient()
  : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    )

type CatalogOptions = {
  category?: string
  status?: string
  limit?: number
  offset?: number
  search?: string
  price_min?: number
  price_max?: number
  categories?: string[]
  min_rating?: number
  sort?: string
  product_type?: string
  exclude_id?: string
  mode?: 'featured'
  include_sellers?: boolean
}

/** Browser catalog goes through Next.js /api/products (CDN cache) instead of direct Supabase. */
async function fetchCatalogViaApi(options: CatalogOptions = {}): Promise<{
  products: Product[]
  count: number
  sellerNames?: Record<string, string>
}> {
  const params = new URLSearchParams()
  if (options.mode) params.set('mode', options.mode)
  if (options.category) params.set('category', options.category)
  if (options.product_type) params.set('product_type', options.product_type)
  if (options.search) params.set('q', options.search)
  if (options.limit != null) params.set('limit', String(options.limit))
  if (options.offset != null) params.set('offset', String(options.offset))
  if (options.price_min != null) params.set('price_min', String(options.price_min))
  if (options.price_max != null) params.set('price_max', String(options.price_max))
  if (options.min_rating != null) params.set('min_rating', String(options.min_rating))
  if (options.sort) params.set('sort', options.sort)
  if (options.exclude_id) params.set('exclude_id', options.exclude_id)
  if (options.categories?.length) params.set('categories', options.categories.join(','))
  if (options.include_sellers) params.set('include_sellers', '1')

  const res = await fetch(`/api/products?${params.toString()}`)
  if (!res.ok) {
    console.error('Catalog API error:', res.status, await res.text().catch(() => ''))
    return { products: [], count: 0 }
  }
  const data = await res.json()
  return {
    products: (data.products || []) as Product[],
    count: typeof data.count === 'number' ? data.count : (data.products || []).length,
    sellerNames: data.sellerNames as Record<string, string> | undefined,
  }
}

export interface Product {
  id: string
  title: string
  description: string
  long_description?: string
  price: number
  original_price?: number
  image_url?: string
  images?: string[]
  category: string
  tags?: string[]
  seller_id: string
  status: string
  total_sales: number
  rating: number
  total_reviews: number
  created_at: string
  updated_at: string
  live_preview?: string
  delivery_method: string
  product_type?: 'digital_product' | 'service' | 'course' | 'membership'
  featured?: boolean
  telegram_enabled?: boolean
  telegram_plan_code?: string
  telegram_stars_price?: number
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price: number
  description?: string
}

export interface SellerProfile {
  id: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  business_name?: string | null
  shop_logo?: string | null
  total_products?: number
  total_sales?: number
  rating?: number
  total_reviews?: number
}

export class ProductService {
  async getCatalog(options?: CatalogOptions): Promise<{
    products: Product[]
    count: number
    sellerNames?: Record<string, string>
  }> {
    if (typeof window !== 'undefined') {
      return fetchCatalogViaApi(options)
    }
    const products = options?.mode === 'featured'
      ? await this.getFeaturedProducts(options.limit || 4)
      : await this.getProducts(options)
    const count = options?.mode === 'featured'
      ? products.length
      : await this.getProductsCount(options)
    let sellerNames: Record<string, string> | undefined
    if (options?.include_sellers) {
      sellerNames = await ProductService.fetchSellerNames(
        products.map((p) => p.seller_id)
      )
    }
    return { products, count, sellerNames }
  }

  async getProducts(options?: {
    category?: string
    status?: string
    limit?: number
    offset?: number
    search?: string
    price_min?: number
    price_max?: number
    categories?: string[]
    min_rating?: number
    sort?: string
    product_type?: string
    exclude_id?: string
  }): Promise<Product[]> {
    try {
      if (typeof window !== 'undefined') {
        const { products } = await fetchCatalogViaApi(options)
        return products
      }

      let query = supabase
        .from('products')
        .select(PRODUCT_LIST_COLUMNS)
        .eq('status', 'active')

      if (options?.category) {
        query = query.eq('category', options.category)
      }

      if (options?.product_type) {
        query = query.eq('product_type', options.product_type)
      }

      if (options?.categories && options.categories.length > 0) {
        query = query.in('category', options.categories)
      }

      if (options?.price_min) {
        query = query.gte('price', options.price_min)
      }

      if (options?.price_max) {
        query = query.lte('price', options.price_max)
      }

      if (options?.min_rating) {
        query = query.gte('rating', options.min_rating)
      }

      if (options?.exclude_id) {
        query = query.neq('id', options.exclude_id)
      }

      if (options?.search) {
        const searchTerm = options.search.toLowerCase()
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      // Apply sorting
      if (options?.sort) {
        switch (options.sort) {
          case 'newest':
            query = query.order('created_at', { ascending: false })
            break
          case 'price-low':
            query = query.order('price', { ascending: true })
            break
          case 'price-high':
            query = query.order('price', { ascending: false })
            break
          case 'rating':
            query = query.order('rating', { ascending: false })
            break
          case 'popular':
          default:
            query = query.order('total_sales', { ascending: false })
            break
        }
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data: products, error } = await query

      if (error) {
        console.error('Error fetching products:', error)
        return []
      }

      return (products || []) as Product[]
    } catch (error) {
      console.error('Error fetching products:', error)
      return []
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        // PGRST116 means no rows found - this is expected for non-existent products
        if (error.code === 'PGRST116') {
          console.log('Product not found:', id)
          return null
        }
        console.error('Error fetching product:', error)
        return null
      }

      return product
    } catch (error) {
      console.error('Error fetching product:', error)
      return null
    }
  }

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    try {
      const { data: variants, error } = await supabase
        .from('product_variants')
        .select('id, product_id, name, price, description')
        .eq('product_id', productId)
        .order('price', { ascending: true })

      if (error) {
        console.error('Error fetching product variants:', error)
        return []
      }

      return variants || []
    } catch (error) {
      console.error('Error fetching product variants:', error)
      return []
    }
  }

  async getFeaturedProducts(limit: number = 4): Promise<Product[]> {
    try {
      if (typeof window !== 'undefined') {
        const { products } = await fetchCatalogViaApi({ mode: 'featured', limit })
        return products
      }

      const { data: featuredProducts, error: featuredError } = await supabase
        .from('products')
        .select(PRODUCT_LIST_COLUMNS)
        .eq('status', 'active')
        .eq('featured', true)
        .order('total_sales', { ascending: false })
        .order('rating', { ascending: false })
        .limit(limit)

      if (featuredError) {
        console.error('Error fetching featured products:', featuredError)
      }

      if (featuredProducts && featuredProducts.length >= limit) {
        return (featuredProducts as Product[]).slice(0, limit)
      }

      const remainingLimit = limit - (featuredProducts?.length || 0)

      if (remainingLimit > 0) {
        const { data: topProducts, error: topError } = await supabase
          .from('products')
          .select(PRODUCT_LIST_COLUMNS)
          .eq('status', 'active')
          .eq('featured', false)
          .gte('rating', 3.5)
          .order('total_sales', { ascending: false })
          .order('rating', { ascending: false })
          .limit(remainingLimit)

        if (topError) {
          console.error('Error fetching top products:', topError)
        }

        return [
          ...((featuredProducts || []) as Product[]),
          ...((topProducts || []) as Product[]),
        ].slice(0, limit)
      }

      return (featuredProducts || []) as Product[]
    } catch (error) {
      console.error('Error in getFeaturedProducts:', error)
      return []
    }
  }

  async getNewestProducts(limit: number = 4): Promise<Product[]> {
    return this.getProducts({ limit, sort: 'newest' })
  }

  async getProductsByCategory(category: string, limit?: number): Promise<Product[]> {
    return this.getProducts({ category, limit })
  }

  async searchProducts(query: string, limit?: number): Promise<Product[]> {
    try {
      return await this.getProducts({ search: query, limit, sort: 'newest' })
    } catch (error) {
      console.error('Error in searchProducts:', error)
      return []
    }
  }

  async getRelatedProducts(category: string, currentProductId: string, limit: number = 4): Promise<Product[]> {
    try {
      return await this.getProducts({
        category,
        exclude_id: currentProductId,
        limit,
        sort: 'newest',
      })
    } catch (error) {
      console.error('Error fetching related products:', error)
      return []
    }
  }

  async getSellerProfile(sellerId: string): Promise<SellerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, bio, business_name, shop_logo, total_products, total_sales, rating, total_reviews')
        .eq('id', sellerId)
        .single()
      if (error) {
        console.error('Error fetching seller profile:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error fetching seller profile:', error)
      return null
    }
  }

  async getProductsCount(options?: {
    category?: string
    status?: string
    search?: string
    price_min?: number
    price_max?: number
    categories?: string[]
    min_rating?: number
  }): Promise<number> {
    try {
      if (typeof window !== 'undefined') {
        const { count } = await fetchCatalogViaApi({
          ...options,
          limit: 1,
          offset: 0,
        })
        return count
      }

      let query = supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      if (options?.category) {
        query = query.eq('category', options.category)
      }

      if (options?.categories && options.categories.length > 0) {
        query = query.in('category', options.categories)
      }

      if (options?.price_min) {
        query = query.gte('price', options.price_min)
      }

      if (options?.price_max) {
        query = query.lte('price', options.price_max)
      }

      if (options?.min_rating) {
        query = query.gte('rating', options.min_rating)
      }

      if (options?.search) {
        const searchTerm = options.search.toLowerCase()
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      }

      const { count, error } = await query

      if (error) {
        console.error('Error getting products count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting products count:', error)
      return 0
    }
  }

  static async fetchSellerNames(sellerIds: string[]): Promise<Record<string, string>> {
    if (sellerIds.length === 0) return {}
    const { data: sellers, error } = await supabase
      .from('profiles')
      .select('id, name, business_name')
      .in('id', sellerIds)
    if (error || !sellers) return {}
    const map: Record<string, string> = {}
    sellers.forEach((s: { id: string, name: string, business_name: string }) => {
      map[s.id] = s.business_name || s.name || "Seller"
    })
    return map
  }
}

export const productService = new ProductService() 