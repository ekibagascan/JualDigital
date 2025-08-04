create table public.products (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  long_description text null,
  price numeric(10, 2) not null,
  original_price numeric(10, 2) null,
  image_url text null,
  images text[] null,
  file_url text null,
  download_link text null,
  live_preview text null,
  category text not null,
  tags text[] null,
  seller_id uuid not null,
  status text null default 'draft'::text,
  rejection_reason text null,
  file_size text null,
  format text null,
  pages integer null,
  language text null default 'id'::text,
  last_updated timestamp with time zone null default now(),
  download_limit integer null default 3,
  license text null,
  delivery_method text null default 'file'::text,
  total_sales integer null default 0,
  total_revenue numeric(12, 2) null default 0,
  total_views integer null default 0,
  rating numeric(3, 2) null default 0,
  total_reviews integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint products_pkey primary key (id),
  constraint products_seller_id_fkey foreign KEY (seller_id) references auth.users (id),
  constraint products_delivery_method_check check (
    (
      delivery_method = any (array['file'::text, 'link'::text])
    )
  ),
  constraint products_status_check check (
    (
      status = any (
        array[
          'draft'::text,
          'pending'::text,
          'active'::text,
          'inactive'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_products_seller_id on public.products using btree (seller_id) TABLESPACE pg_default;

create index IF not exists idx_products_status on public.products using btree (status) TABLESPACE pg_default;

create index IF not exists idx_products_category on public.products using btree (category) TABLESPACE pg_default;

create index IF not exists idx_products_created_at on public.products using btree (created_at) TABLESPACE pg_default;

create trigger update_seller_sales_trigger
after
update on products for EACH row
execute FUNCTION update_seller_sales ();