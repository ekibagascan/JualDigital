-- Additive migration: product types + jasa + kursus + keanggotaan
-- Safe for existing main code: product_type defaults to digital_product

-- 1) product_type on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'digital_product';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_type_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_type_check
      CHECK (product_type IN ('digital_product', 'service', 'course', 'membership'));
  END IF;
END $$;

UPDATE public.products
SET product_type = 'digital_product'
WHERE product_type IS NULL OR product_type = '';

CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products (product_type);

-- Optional categories for browse
INSERT INTO public.categories (name, slug, description, icon, is_featured, sort_order)
VALUES
  ('Jasa', 'jasa', 'Jasa digital dan freelance', '🛠️', true, 12),
  ('Keanggotaan', 'keanggotaan', 'Konten berlangganan / komunitas', '👑', true, 13)
ON CONFLICT (slug) DO NOTHING;

-- 2) Jasa / gigs
CREATE TABLE IF NOT EXISTS public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('basic', 'standard', 'premium')),
  title text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  delivery_days int NOT NULL DEFAULT 3,
  revisions int NOT NULL DEFAULT 1,
  features text[] DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier)
);

CREATE TABLE IF NOT EXISTS public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.service_packages(id),
  buyer_id uuid REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'awaiting_requirements'
    CHECK (status IN ('awaiting_requirements','in_progress','delivered','revision','completed','cancelled')),
  due_at timestamptz,
  requirements_submitted_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  revision_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id)
);

CREATE TABLE IF NOT EXISTS public.service_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  file_url text,
  link_url text,
  note text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_buyer ON public.service_orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_seller ON public.service_orders (seller_id);

-- 3) Kursus
CREATE TABLE IF NOT EXISTS public.course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL DEFAULT 'video' CHECK (content_type IN ('video','text','file')),
  video_path text,
  body text,
  file_path text,
  duration_sec int DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz,
  position_sec int DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, lesson_id)
);

-- 4) Keanggotaan / Patreon-style
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL CHECK (price_monthly >= 0),
  price_yearly numeric,
  perks text[] DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.membership_tiers(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','past_due','cancelled','expired')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  external_payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON public.subscriptions (product_id);

CREATE TABLE IF NOT EXISTS public.membership_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  body text,
  media_type text NOT NULL DEFAULT 'text' CHECK (media_type IN ('text','image','file','video')),
  media_path text,
  min_tier_sort_order int NOT NULL DEFAULT 0,
  published_at timestamptz,
  is_public_teaser boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
