-- =====================================================
-- SIMPLIFIED CHECK FOR JUAL DIGITAL FUNCTIONS
-- =====================================================

-- Check all custom functions
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('information_schema', 'pg_catalog')
  AND p.proname IN ('handle_new_user', 'update_product_stats', 'update_product_rating', 'generate_order_number')
ORDER BY p.proname;

-- Check all triggers
SELECT 
  n.nspname as schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname NOT IN ('information_schema', 'pg_catalog')
  AND t.tgname IN ('on_auth_user_created', 'trigger_update_product_stats', 'trigger_update_product_rating', 'trigger_generate_order_number')
ORDER BY t.tgname;

-- Check main tables
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
  AND tablename IN ('profiles', 'products', 'product_variants', 'orders', 'order_items', 'downloads', 'reviews', 'withdrawals', 'categories', 'site_settings', 'notifications', 'analytics')
ORDER BY tablename;

-- Check RLS enabled tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
  AND rowsecurity = true
ORDER BY schemaname, tablename;

-- Check storage buckets
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
ORDER BY name;

-- Check if extensions are enabled
SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- =====================================================
-- END OF SIMPLIFIED CHECK
-- ===================================================== 