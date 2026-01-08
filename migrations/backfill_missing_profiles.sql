-- Backfill script to create profiles for users that don't have them
-- This will create profiles for all existing auth.users that don't have a profile

INSERT INTO public.profiles (
  id,
  name,
  role,
  status,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(COALESCE(au.email, ''), '@', 1),
    'User'
  ) as name,
  'buyer' as role,
  'pending' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the backfill worked
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
