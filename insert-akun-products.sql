-- =====================================================
-- INSERT AKUN CATEGORY AND PRODUCTS
-- =====================================================

-- First, insert the "Akun" category
INSERT INTO categories (name, slug, description, icon, is_featured, sort_order) 
VALUES (
  'Akun', 
  'akun', 
  'Koleksi akun premium streaming, musik, dan aplikasi digital berkualitas tinggi',
  'User',
  true,
  1
);

-- =====================================================
-- DISNEY HOTSTAR PRODUCTS
-- =====================================================

-- DISNEY HOTSTAR PRIVATE
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Disney+ Hotstar Private',
  'Akun Disney+ Hotstar Private dengan akses eksklusif ke konten premium',
  'Nikmati akses eksklusif ke semua konten Disney+ Hotstar tanpa batasan. Akun private memberikan pengalaman menonton yang optimal dengan kualitas streaming terbaik.',
  54000,
  'akun',
  ARRAY['disney', 'hotstar', 'streaming', 'private', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//no_brands_disney_hotstar_4k_private_for_all_device_full01_fd14142d.jpg.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//no_brands_disney_hotstar_4k_private_for_all_device_full01_fd14142d.jpg.webp']
);

-- Insert variants for DISNEY HOTSTAR PRIVATE
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  54000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Disney+ Hotstar Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  94000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'Disney+ Hotstar Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  134000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'Disney+ Hotstar Private';

-- DISNEY HOTSTAR SHARING
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Disney+ Hotstar Sharing',
  'Akun Disney+ Hotstar Sharing dengan akses bersama',
  'Akun sharing yang dapat digunakan bersama dengan pengguna lain. Cocok untuk keluarga atau teman yang ingin berbagi biaya.',
  40000,
  'akun',
  ARRAY['disney', 'hotstar', 'streaming', 'sharing'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//no_brands_disney_hotstar_4k_private_for_all_device_full01_fd14142d.jpg.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//no_brands_disney_hotstar_4k_private_for_all_device_full01_fd14142d.jpg.webp']
);

-- Insert variants for DISNEY HOTSTAR SHARING
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  40000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Disney+ Hotstar Sharing';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  80000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'Disney+ Hotstar Sharing';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  120000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'Disney+ Hotstar Sharing';

-- =====================================================
-- VIDIO PRODUCTS
-- =====================================================

-- VIDIO PLATINUM
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Vidio Platinum',
  'Akun Vidio Platinum dengan akses All Device',
  'Nikmati konten Vidio premium dengan akses ke semua device. Streaming tanpa batas dengan kualitas terbaik.',
  39000,
  'akun',
  ARRAY['vidio', 'streaming', 'platinum', 'all-device'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//vidio-logo-illustration-in-square-background-free-png.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//vidio-logo-illustration-in-square-background-free-png.webp']
);

-- Insert variant for VIDIO PLATINUM
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan (All Device)',
  39000,
  'Akses 1 bulan untuk semua device'
FROM products p 
WHERE p.title = 'Vidio Platinum';

-- VIDIO DIAMOND
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Vidio Diamond',
  'Akun Vidio Diamond dengan pilihan device',
  'Akun Vidio Diamond dengan pilihan akses HP/Tablet atau All Device sesuai kebutuhan Anda.',
  79000,
  'akun',
  ARRAY['vidio', 'streaming', 'diamond', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//vidio-logo-illustration-in-square-background-free-png.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//vidio-logo-illustration-in-square-background-free-png.webp']
);

-- Insert variants for VIDIO DIAMOND
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan (HP/Tablet)',
  79000,
  'Akses 1 bulan untuk HP dan Tablet'
FROM products p 
WHERE p.title = 'Vidio Diamond';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan (All Device)',
  129000,
  'Akses 1 bulan untuk semua device'
FROM products p 
WHERE p.title = 'Vidio Diamond';

-- =====================================================
-- PRIME PRODUCTS
-- =====================================================

-- PRIME PRIVATE
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Prime Private',
  'Akun Prime Private dengan akses eksklusif',
  'Akun Prime private dengan akses eksklusif ke konten premium tanpa batasan.',
  38000,
  'akun',
  ARRAY['prime', 'streaming', 'private', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//Amazon_Prime_Video_blue_logo_1.svg',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//Amazon_Prime_Video_blue_logo_1.svg']
);

-- Insert variants for PRIME PRIVATE
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  38000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Prime Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  68000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'Prime Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  93000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'Prime Private';

-- PRIME SHARING
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Prime Sharing',
  'Akun Prime Sharing dengan akses bersama',
  'Akun Prime sharing yang dapat digunakan bersama dengan pengguna lain.',
  28000,
  'akun',
  ARRAY['prime', 'streaming', 'sharing'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//Amazon_Prime_Video_blue_logo_1.svg',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//Amazon_Prime_Video_blue_logo_1.svg']
);

-- Insert variants for PRIME SHARING
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  28000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Prime Sharing';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  58000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'Prime Sharing';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  73000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'Prime Sharing';

-- =====================================================
-- WE TV PRODUCTS
-- =====================================================

-- WE TV PRIVATE
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'WeTV Private',
  'Akun WeTV Private dengan akses eksklusif',
  'Akun WeTV private dengan akses eksklusif ke konten premium.',
  36000,
  'akun',
  ARRAY['wetv', 'streaming', 'private', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//WeTV-vertical.jpg',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//WeTV-vertical.jpg']
);

-- Insert variants for WE TV PRIVATE
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  36000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'WeTV Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  66000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'WeTV Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  86000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'WeTV Private';

-- =====================================================
-- VISION+ PRODUCTS
-- =====================================================

-- VISION+ PRIVATE
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Vision+ Private',
  'Akun Vision+ Private dengan akses eksklusif',
  'Akun Vision+ private dengan akses eksklusif ke konten premium.',
  34000,
  'akun',
  ARRAY['vision+', 'streaming', 'private', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  '/placeholder.svg?height=300&width=400&text=Vision+Private',
  ARRAY['/placeholder.svg?height=300&width=400&text=Vision+Private']
);

-- Insert variant for VISION+ PRIVATE
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  34000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Vision+ Private';

-- VISION+ SHARING
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Vision+ Sharing',
  'Akun Vision+ Sharing dengan akses bersama',
  'Akun Vision+ sharing yang dapat digunakan bersama dengan pengguna lain.',
  20000,
  'akun',
  ARRAY['vision+', 'streaming', 'sharing'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  '/placeholder.svg?height=300&width=400&text=Vision+Sharing',
  ARRAY['/placeholder.svg?height=300&width=400&text=Vision+Sharing']
);

-- Insert variant for VISION+ SHARING
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  20000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Vision+ Sharing';

-- =====================================================
-- VIU PRODUCTS
-- =====================================================

-- VIU PREMIUM
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Viu Premium',
  'Akun Viu Premium dengan akses eksklusif',
  'Akun Viu Premium dengan akses eksklusif ke konten premium.',
  21000,
  'akun',
  ARRAY['viu', 'streaming', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//unnamed.png',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//unnamed.png']
);

-- Insert variants for VIU PREMIUM
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  21000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Viu Premium';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  41000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'Viu Premium';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  61000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'Viu Premium';

-- =====================================================
-- YOUTUBE PRODUCTS
-- =====================================================

-- YOUTUBE INDIVIDUAL
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'YouTube Individual',
  'Akun YouTube Premium Individual',
  'Akun YouTube Premium Individual dengan akses eksklusif ke fitur premium.',
  49000,
  'akun',
  ARRAY['youtube', 'premium', 'individual', 'streaming'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//accurate-recreation-of-the-new-youtube-logo-v0-l8divibm8dxd1.png.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//accurate-recreation-of-the-new-youtube-logo-v0-l8divibm8dxd1.png.webp']
);

-- Insert variants for YOUTUBE INDIVIDUAL
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  49000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'YouTube Individual';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  89000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'YouTube Individual';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  119000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'YouTube Individual';

-- =====================================================
-- HBO MAX PRODUCTS
-- =====================================================

-- HBO MAX PRIVATE
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'HBO Max Private',
  'Akun HBO Max Private dengan akses eksklusif',
  'Akun HBO Max private dengan akses eksklusif ke konten premium.',
  53000,
  'akun',
  ARRAY['hbo', 'max', 'streaming', 'private', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//HBO-Max-Logo.png',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//HBO-Max-Logo.png']
);

-- Insert variant for HBO MAX PRIVATE
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  53000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'HBO Max Private';

-- HBO MAX SHARING
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'HBO Max Sharing',
  'Akun HBO Max Sharing dengan akses bersama',
  'Akun HBO Max sharing yang dapat digunakan bersama dengan pengguna lain.',
  35000,
  'akun',
  ARRAY['hbo', 'max', 'streaming', 'sharing'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//HBO-Max-Logo.png',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//HBO-Max-Logo.png']
);

-- Insert variant for HBO MAX SHARING
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  35000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'HBO Max Sharing';

-- =====================================================
-- CAPCUT PRODUCTS
-- =====================================================

-- CAPCUT PRIVATE
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'CapCut Private',
  'Akun CapCut Private dengan akses eksklusif',
  'Akun CapCut private dengan akses eksklusif ke fitur premium editing.',
  45000,
  'akun',
  ARRAY['capcut', 'editing', 'video', 'private', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//image.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//image.webp']
);

-- Insert variants for CAPCUT PRIVATE
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  45000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'CapCut Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  85000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'CapCut Private';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  120000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'CapCut Private';

-- =====================================================
-- SPOTIFY PRODUCTS
-- =====================================================

-- SPOTIFY PREMIUM INDIVIDUAL
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Spotify Premium Individual',
  'Akun Spotify Premium Individual',
  'Akun Spotify Premium Individual dengan akses eksklusif ke fitur premium musik.',
  37000,
  'akun',
  ARRAY['spotify', 'music', 'premium', 'individual'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//Spotify_Logo_RGB_Green-512.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//Spotify_Logo_RGB_Green-512.webp']
);

-- Insert variants for SPOTIFY PREMIUM INDIVIDUAL
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Bulan',
  37000,
  'Akses 1 bulan penuh'
FROM products p 
WHERE p.title = 'Spotify Premium Individual';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '2 Bulan',
  67000,
  'Akses 2 bulan penuh'
FROM products p 
WHERE p.title = 'Spotify Premium Individual';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '3 Bulan',
  97000,
  'Akses 3 bulan penuh'
FROM products p 
WHERE p.title = 'Spotify Premium Individual';

-- =====================================================
-- CANVA PRODUCTS
-- =====================================================

-- CANVA PRO
INSERT INTO products (
  title, 
  description, 
  long_description,
  price,
  category,
  tags,
  seller_id,
  status,
  delivery_method,
  image_url,
  images
) VALUES (
  'Canva Pro',
  'Akun Canva Pro dengan fitur premium',
  'Akun Canva Pro dengan akses eksklusif ke fitur premium design dan template.',
  59000,
  'akun',
  ARRAY['canva', 'design', 'pro', 'premium'],
  'e52fc39c-d56c-418c-b470-934337d0286b', -- Replace with real seller UUID
  'active',
  'link',
  'https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//image2.webp',
  ARRAY['https://vovqicbfzjgxeizmkxuf.supabase.co/storage/v1/object/public/products//image2.webp']
);

-- Insert variants for CANVA PRO
INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '6 Bulan',
  59000,
  'Akses 6 bulan penuh'
FROM products p 
WHERE p.title = 'Canva Pro';

INSERT INTO product_variants (product_id, name, price, description)
SELECT 
  p.id,
  '1 Tahun',
  91000,
  'Akses 1 tahun penuh'
FROM products p 
WHERE p.title = 'Canva Pro';

-- =====================================================
-- UPDATE PRODUCT PRICES TO MATCH LOWEST VARIANT
-- =====================================================

-- Update all product prices to match their lowest variant price
UPDATE products 
SET price = (
  SELECT MIN(pv.price) 
  FROM product_variants pv 
  WHERE pv.product_id = products.id
)
WHERE category = 'akun'; 