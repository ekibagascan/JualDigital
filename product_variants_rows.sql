create table public.product_variants (
  id uuid not null default gen_random_uuid (),
  product_id uuid null,
  name text not null,
  price numeric(10, 2) not null,
  description text null,
  created_at timestamp with time zone null default now(),
  constraint product_variants_pkey primary key (id),
  constraint product_variants_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;