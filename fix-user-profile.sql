-- =====================================================
-- FIX USER PROFILE AND TRIGGER ISSUES
-- =====================================================

-- 1. First, let's check if the trigger exists and is working
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- 2. Check if the handle_new_user function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 3. Create the missing profile for the current user
INSERT INTO profiles (id, name, role, created_at, updated_at)
VALUES (
  '80ec880c-e75c-45e6-b5b9-8e05a031ed2b',
  'Google User',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Recreate the trigger to ensure it works for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON carts TO anon, authenticated;
GRANT ALL ON cart_items TO anon, authenticated;

-- 6. Verify the profile was created
SELECT * FROM profiles WHERE id = '80ec880c-e75c-45e6-b5b9-8e05a031ed2b';

-- 7. Create a cart for the user if it doesn't exist
INSERT INTO carts (id, user_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '80ec880c-e75c-45e6-b5b9-8e05a031ed2b',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- 8. Check if cart was created
SELECT * FROM carts WHERE user_id = '80ec880c-e75c-45e6-b5b9-8e05a031ed2b'; 