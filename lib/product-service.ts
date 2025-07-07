import { createClient } from '@/lib/supabase-client'

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
  total_products?: number
  total_sales?: number
  rating?: number
  total_reviews?: number
}

export class ProductService {
  public supabase = createClient()

  async getProducts(options?: {
    category?: string
    status?: string
    limit?: number
    offset?: number
    search?: string
  }): Promise<Product[]> {
    try {
      let query = this.supabase
        .from('products')
        .select('*')
        .eq('status', 'active')

      if (options?.category) {
        query = query.eq('category', options.category)
      }

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`)
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
      const { data: product, error } = await this.supabase
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
      const { data: variants, error } = await this.supabase
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
    return this.getProducts({ limit })
  }

  async getNewestProducts(limit: number = 4): Promise<Product[]> {
    return this.getProducts({ limit })
  }

  async getProductsByCategory(category: string, limit?: number): Promise<Product[]> {
    return this.getProducts({ category, limit })
  }

  async searchProducts(query: string, limit?: number): Promise<Product[]> {
    return this.getProducts({ search: query, limit })
  }

  async getRelatedProducts(category: string, currentProductId: string, limit: number = 4): Promise<Product[]> {
    try {
      const { data: products, error } = await this.supabase
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
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, name, avatar_url, bio, business_name, total_products, total_sales, rating, total_reviews')
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
    const supabase = createClient()
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