import { supabase } from '@/lib/supabase-client'

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
  featured?: boolean
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
  }): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
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

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data: products, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
        return []
      }

      return products || []
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
        .select('*')
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
      // First, try to get manually featured products
      const { data: featuredProducts, error: featuredError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('featured', true)
        .order('total_sales', { ascending: false })
        .order('rating', { ascending: false })
        .limit(limit)

      if (featuredError) {
        console.error('Error fetching featured products:', featuredError)
      }

      // If we have enough manually featured products, return them
      if (featuredProducts && featuredProducts.length >= limit) {
        return featuredProducts.slice(0, limit)
      }

      // If we don't have enough featured products, fill with top performers
      const remainingLimit = limit - (featuredProducts?.length || 0)
      
      if (remainingLimit > 0) {
        const { data: topProducts, error: topError } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .eq('featured', false) // Exclude already featured products
          .gte('rating', 3.5) // Only products with decent rating
          .order('total_sales', { ascending: false })
          .order('rating', { ascending: false })
          .order('total_revenue', { ascending: false })
          .limit(remainingLimit)

        if (topError) {
          console.error('Error fetching top products:', topError)
        }

        // Combine featured and top products
        const allProducts = [
          ...(featuredProducts || []),
          ...(topProducts || [])
        ]

        return allProducts.slice(0, limit)
      }

      return featuredProducts || []
    } catch (error) {
      console.error('Error in getFeaturedProducts:', error)
      return []
    }
  }

  async getNewestProducts(limit: number = 4): Promise<Product[]> {
    return this.getProducts({ limit })
  }

  async getProductsByCategory(category: string, limit?: number): Promise<Product[]> {
    return this.getProducts({ category, limit })
  }

  async searchProducts(query: string, limit?: number): Promise<Product[]> {
    try {
      // First try the standard search
      let results = await this.getProducts({ search: query, limit })

      // If no results, try a more flexible search
      if (results.length === 0 && query.length > 2) {
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
          .limit(limit || 20)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error in flexible search:', error)
          return []
        }

        results = products || []
      }

      return results
    } catch (error) {
      console.error('Error in searchProducts:', error)
      return []
    }
  }

  async getRelatedProducts(category: string, currentProductId: string, limit: number = 4): Promise<Product[]> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('category', category)
        .neq('id', currentProductId)
        .limit(limit)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching related products:', error)
        return []
      }

      return products || []
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