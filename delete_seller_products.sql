-- Delete all products and related data for seller ID: e52fc39c-d56c-418c-b470-934337d0286b

-- First, let's see what we're about to delete
SELECT 'Products to be deleted:' as info;
SELECT id, title, price FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Product variants to be deleted:' as info;
SELECT pv.id, pv.name, pv.price, p.title 
FROM product_variants pv 
JOIN products p ON pv.product_id = p.id 
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Order items to be deleted:' as info;
SELECT oi.id, oi.product_id, p.title, oi.quantity, oi.seller_earnings
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Orders to be deleted:' as info;
SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at
FROM orders o
WHERE o.id IN (
  SELECT DISTINCT oi.order_id 
  FROM order_items oi 
  JOIN products p ON oi.product_id = p.id 
  WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

SELECT 'Wishlist items to be deleted:' as info;
SELECT w.id, w.product_id, p.title, w.user_id
FROM wishlist w
JOIN products p ON w.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Downloads to be deleted:' as info;
SELECT d.id, d.product_id, p.title, d.user_id
FROM downloads d
JOIN products p ON d.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

-- Now delete in the correct order (respecting foreign key constraints)

-- 1. Delete product variants first (they reference products)
DELETE FROM product_variants 
WHERE product_id IN (
  SELECT id FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 2. Delete order items (they reference products)
DELETE FROM order_items 
WHERE product_id IN (
  SELECT id FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 3. Delete orders that only contain products from this seller
DELETE FROM orders 
WHERE id IN (
  SELECT DISTINCT oi.order_id 
  FROM order_items oi 
  JOIN products p ON oi.product_id = p.id 
  WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 4. Delete cart items (they reference products)
DELETE FROM cart_items 
WHERE product_id IN (
  SELECT id FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 5. Delete reviews (they reference products)
DELETE FROM reviews 
WHERE product_id IN (
  SELECT id FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 6. Delete wishlist items (they reference products)
DELETE FROM wishlist 
WHERE product_id IN (
  SELECT id FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 7. Delete downloads (they reference products)
DELETE FROM downloads 
WHERE product_id IN (
  SELECT id FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'
);

-- 8. Finally delete the products
DELETE FROM products 
WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

-- Verify deletion
SELECT 'Verification - Remaining products for this seller:' as info;
SELECT COUNT(*) as remaining_products FROM products WHERE seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Verification - Remaining variants for this seller:' as info;
SELECT COUNT(*) as remaining_variants 
FROM product_variants pv 
JOIN products p ON pv.product_id = p.id 
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Verification - Remaining order items for this seller:' as info;
SELECT COUNT(*) as remaining_order_items 
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Verification - Remaining orders for this seller:' as info;
SELECT COUNT(DISTINCT o.id) as remaining_orders 
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Verification - Remaining wishlist items for this seller:' as info;
SELECT COUNT(*) as remaining_wishlist_items 
FROM wishlist w
JOIN products p ON w.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b';

SELECT 'Verification - Remaining downloads for this seller:' as info;
SELECT COUNT(*) as remaining_downloads 
FROM downloads d
JOIN products p ON d.product_id = p.id
WHERE p.seller_id = 'e52fc39c-d56c-418c-b470-934337d0286b'; 