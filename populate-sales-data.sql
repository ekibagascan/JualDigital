-- Populate total_sales from existing order data
-- Run this in Supabase SQL Editor

-- Update products with sales data from order_items
UPDATE products 
SET 
  total_sales = (
    SELECT COALESCE(SUM(quantity), 0) 
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    WHERE oi.product_id = products.id AND o.status = 'paid'
  ),
  total_revenue = (
    SELECT COALESCE(SUM(oi.price * oi.quantity), 0) 
    FROM order_items oi 
    JOIN orders o ON oi.order_id = o.id 
    WHERE oi.product_id = products.id AND o.status = 'paid'
  ),
  updated_at = NOW();

-- Update profiles with seller analytics
UPDATE profiles 
SET 
  total_products = (
    SELECT COUNT(*) 
    FROM products 
    WHERE seller_id = profiles.id AND status = 'active'
  ),
  total_sales = (
    SELECT COALESCE(SUM(total_sales), 0) 
    FROM products 
    WHERE seller_id = profiles.id AND status = 'active'
  ),
  total_earnings = (
    SELECT COALESCE(SUM(total_revenue * 0.9), 0) 
    FROM products 
    WHERE seller_id = profiles.id AND status = 'active'
  ),
  updated_at = NOW()
WHERE role = 'seller';

-- Check the results
SELECT 
  'Products Updated' as table_name,
  COUNT(*) as total_products,
  COUNT(CASE WHEN total_sales > 0 THEN 1 END) as products_with_sales,
  SUM(total_sales) as total_sales_sum
FROM products 
WHERE status = 'active';

SELECT 
  'Sellers Updated' as table_name,
  COUNT(*) as total_sellers,
  COUNT(CASE WHEN total_sales > 0 THEN 1 END) as sellers_with_sales
FROM profiles 
WHERE role = 'seller'; 