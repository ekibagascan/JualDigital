-- Add slug column to profiles for shareable store URLs (jualdigital.id/store-name)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;

-- Auto-generate slugs for existing sellers from business_name
-- Uses lowercase, hyphens, strips non-alphanumeric, appends random suffix if needed
DO $$
DECLARE
  seller RECORD;
  base_slug TEXT;
  final_slug TEXT;
  slug_exists BOOLEAN;
  suffix INT;
BEGIN
  FOR seller IN 
    SELECT id, business_name FROM profiles 
    WHERE role = 'seller' AND slug IS NULL AND business_name IS NOT NULL
  LOOP
    -- Generate base slug from business_name
    base_slug := lower(trim(seller.business_name));
    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Truncate to 30 chars
    IF length(base_slug) > 30 THEN
      base_slug := left(base_slug, 30);
      base_slug := trim(both '-' from base_slug);
    END IF;
    
    -- Skip if empty
    IF base_slug = '' OR length(base_slug) < 3 THEN
      base_slug := 'toko-' || left(seller.id::text, 8);
    END IF;
    
    -- Check uniqueness and append suffix if needed
    final_slug := base_slug;
    suffix := 1;
    LOOP
      SELECT EXISTS(SELECT 1 FROM profiles WHERE slug = final_slug) INTO slug_exists;
      EXIT WHEN NOT slug_exists;
      final_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    
    -- Update the profile
    UPDATE profiles SET slug = final_slug WHERE id = seller.id;
  END LOOP;
END $$;
