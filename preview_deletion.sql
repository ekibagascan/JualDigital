-- PREVIEW: What will be deleted for seller ID: e52fc39c-d56c-418c-b470-934337d0286b
-- Run this first to see what will be deleted, then run delete_seller_products.sql if you're sure

-- Products that will be deleted
SELECT 'PRODUCTS TO BE DELETED:' as info;
SELECT 
  id, 
  title, 
  price, 
  category,
  created_at
FROM products 
WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY created_at DESC;

-- Product variants that will be deleted
SELECT 'PRODUCT VARIANTS TO BE DELETED:' as info;
SELECT 
  pv.id, 
  pv.name, 
  pv.price, 
  p.title as product_title
FROM product_variants pv 
JOIN products p ON pv.product_id = p.id 
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY p.title, pv.price;

-- Order items that will be deleted
SELECT 'ORDER ITEMS TO BE DELETED:' as info;
SELECT 
  oi.id, 
  oi.product_id, 
  p.title as product_title,
  oi.quantity, 
  oi.seller_earnings,
  o.status as order_status
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY o.created_at DESC;

-- Orders that will be deleted (orders that only contain products from this seller)
SELECT 'ORDERS TO BE DELETED:' as info;
SELECT 
  o.id,
  o.user_id,
  o.total_amount,
  o.status,
  o.created_at,
  COUNT(oi.id) as item_count
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
GROUP BY o.id, o.user_id, o.total_amount, o.status, o.created_at
ORDER BY o.created_at DESC;

-- Cart items that will be deleted
SELECT 'CART ITEMS TO BE DELETED:' as info;
SELECT 
  ci.id, 
  ci.product_id, 
  p.title as product_title,
  ci.quantity
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY ci.id DESC;

-- Reviews that will be deleted
SELECT 'REVIEWS TO BE DELETED:' as info;
SELECT 
  r.id, 
  r.product_id, 
  p.title as product_title,
  r.rating,
  r.content,
  r.created_at
FROM reviews r
JOIN products p ON r.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY r.created_at DESC;

-- Wishlist items that will be deleted
SELECT 'WISHLIST ITEMS TO BE DELETED:' as info;
SELECT 
  w.id, 
  w.product_id, 
  p.title as product_title,
  w.user_id,
  w.created_at
FROM wishlist w
JOIN products p ON w.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY w.created_at DESC;

-- Downloads that will be deleted
SELECT 'DOWNLOADS TO BE DELETED:' as info;
SELECT 
  d.id, 
  d.product_id, 
  p.title as product_title,
  d.user_id
FROM downloads d
JOIN products p ON d.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
ORDER BY d.id DESC;

-- Summary counts
SELECT 'SUMMARY COUNTS:' as info;
SELECT 
  (SELECT COUNT(*) FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as products_count,
  (SELECT COUNT(*) FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as variants_count,
  (SELECT COUNT(*) FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as order_items_count,
  (SELECT COUNT(*) FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as cart_items_count,
  (SELECT COUNT(*) FROM reviews r JOIN products p ON r.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as reviews_count,
  (SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as orders_count,
  (SELECT COUNT(*) FROM wishlist w JOIN products p ON w.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as wishlist_count,
  (SELECT COUNT(*) FROM downloads d JOIN products p ON d.product_id = p.id WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b') as downloads_count; 