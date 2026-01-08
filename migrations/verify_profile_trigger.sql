-- Verification queries to check if the trigger is set up correctly

-- 1. Check if the function exists
SELECT 
  proname as function_name,
  pronamespace::regnamespace as schema,
  proowner::regrole as owner
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check recent users without profiles (to identify if trigger is working)
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  CASE WHEN p.id IS NULL THEN 'MISSING PROFILE' ELSE 'HAS PROFILE' END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 10;

-- 4. Test the function manually (replace USER_ID with an actual user ID)
-- SELECT public.handle_new_user() FROM auth.users WHERE id = 'USER_ID_HERE';
