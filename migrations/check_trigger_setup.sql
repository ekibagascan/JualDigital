-- Comprehensive check to see if trigger is properly set up

-- 1. Check if function exists and its definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition,
  p.prosecdef as is_security_definer,
  p.proconfig as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user'
  AND n.nspname = 'public';

-- 2. Check if trigger exists and its status
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE 'UNKNOWN'
  END as trigger_status,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.tgname = 'on_auth_user_created'
  AND n.nspname = 'auth';

-- 3. Check recent user creations vs profile creations
SELECT 
  au.id,
  au.email,
  au.created_at as user_created,
  p.created_at as profile_created,
  CASE 
    WHEN p.id IS NULL THEN 'MISSING PROFILE'
    WHEN p.created_at > au.created_at + INTERVAL '1 second' THEN 'PROFILE CREATED LATE'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 20;

-- 4. Test if we can manually call the function (uncomment and replace USER_ID)
-- This will help verify the function works even if trigger doesn't fire
-- SELECT public.handle_new_user() FROM auth.users WHERE id = 'USER_ID_HERE';
