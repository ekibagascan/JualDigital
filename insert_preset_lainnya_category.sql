-- Insert new category "Preset"
INSERT INTO public.categories (
  id,
  name,
  slug,
  description,
  icon,
  image_url,
  is_featured,
  sort_order,
  created_at
) VALUES (
  gen_random_uuid(),
  'Preset',
  'preset',
  'Koleksi preset dan template siap pakai',
  '🏞️',
  NULL,
  false,
  10,
  now()
);

-- Insert new category "Lainnya"
INSERT INTO public.categories (
  id,
  name,
  slug,
  description,
  icon,
  image_url,
  is_featured,
  sort_order,
  created_at
) VALUES (
  gen_random_uuid(),
  'Lainnya',
  'lainnya',
  'Kategori produk lainnya yang tidak termasuk dalam kategori utama',
  '📦',
  NULL,
  false,
  11,
  now()
);

-- Verify the insertions
SELECT * FROM public.categories WHERE slug IN ('preset', 'lainnya');
