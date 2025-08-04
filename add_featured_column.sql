-- Add featured column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Create index for better performance on featured products
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- Create index for better performance on sales and rating
CREATE INDEX IF NOT EXISTS idx_products_sales_rating ON products(total_sales DESC, rating DESC);

-- Update some products to be featured (example)
UPDATE products 
SET featured = true 
WHERE id IN (
  SELECT id FROM products 
  WHERE status = 'active' 
  ORDER BY total_sales DESC, rating DESC 
  LIMIT 4
); 