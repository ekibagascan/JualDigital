-- Demo Users
INSERT INTO public.profiles (id, name, role) VALUES
  ('a1b2c3d4-1111-1111-1111-111111111111', 'Budi Santoso', 'user'),
  ('a1b2c3d4-2222-2222-2222-222222222222', 'Siti Aminah', 'user'),
  ('a1b2c3d4-3333-3333-3333-333333333333', 'Andi Wijaya', 'user'),
  ('a1b2c3d4-4444-4444-4444-444444444444', 'Dewi Lestari', 'user'),
  ('a1b2c3d4-5555-5555-5555-555555555555', 'Rizky Pratama', 'user'),
  ('a1b2c3d4-6666-6666-6666-666666666666', 'Fitriani Putri', 'user'),
  ('a1b2c3d4-7777-7777-7777-777777777777', 'Agus Saputra', 'user'),
  ('a1b2c3d4-8888-8888-8888-888888888888', 'Lina Marlina', 'user'),
  ('a1b2c3d4-9999-9999-9999-999999999999', 'Yusuf Hidayat', 'user'),
  ('a1b2c3d4-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Maya Sari', 'user');

-- Demo Reviews & Downloads
-- Disney+ Hotstar Private
INSERT INTO public.reviews (id, product_id, user_id, rating, content, status, created_at, updated_at) VALUES
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-1111-1111-1111-111111111111', 5, 'Akun langsung aktif, sangat puas!', 'active', now() - interval '10 days', now() - interval '10 days'),
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-2222-2222-2222-222222222222', 4, 'Proses cepat, penjual responsif.', 'active', now() - interval '8 days', now() - interval '8 days'),
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-3333-3333-3333-333333333333', 5, 'Kualitas streaming bagus, recommended!', 'active', now() - interval '7 days', now() - interval '7 days'),
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-4444-4444-4444-444444444444', 5, 'Sangat memuaskan, akun premium asli.', 'active', now() - interval '6 days', now() - interval '6 days');
INSERT INTO public.downloads (id, product_id, user_id, created_at) VALUES
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-1111-1111-1111-111111111111', now() - interval '10 days'),
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-2222-2222-2222-222222222222', now() - interval '8 days'),
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-3333-3333-3333-333333333333', now() - interval '7 days'),
  (gen_random_uuid(), '03557dd6-e061-4401-bfec-e4aa409fdced', 'a1b2c3d4-4444-4444-4444-444444444444', now() - interval '6 days');

-- WeTV Private
INSERT INTO public.reviews (id, product_id, user_id, rating, content, status, created_at, updated_at) VALUES
  (gen_random_uuid(), '09a57fb7-168a-44e4-bc46-e89d9b4dac69', 'a1b2c3d4-5555-5555-5555-555555555555', 5, 'Akun premium asli, harga terjangkau.', 'active', now() - interval '9 days', now() - interval '9 days'),
  (gen_random_uuid(), '09a57fb7-168a-44e4-bc46-e89d9b4dac69', 'a1b2c3d4-6666-6666-6666-666666666666', 4, 'Sangat direkomendasikan, terima kasih!', 'active', now() - interval '7 days', now() - interval '7 days'),
  (gen_random_uuid(), '09a57fb7-168a-44e4-bc46-e89d9b4dac69', 'a1b2c3d4-7777-7777-7777-777777777777', 5, 'Penjual ramah, proses mudah.', 'active', now() - interval '6 days', now() - interval '6 days');
INSERT INTO public.downloads (id, product_id, user_id, created_at) VALUES
  (gen_random_uuid(), '09a57fb7-168a-44e4-bc46-e89d9b4dac69', 'a1b2c3d4-5555-5555-5555-555555555555', now() - interval '9 days'),
  (gen_random_uuid(), '09a57fb7-168a-44e4-bc46-e89d9b4dac69', 'a1b2c3d4-6666-6666-6666-666666666666', now() - interval '7 days'),
  (gen_random_uuid(), '09a57fb7-168a-44e4-bc46-e89d9b4dac69', 'a1b2c3d4-7777-7777-7777-777777777777', now() - interval '6 days');

-- (Repeat for all other products, using the 10 users, varied content, and timestamps)
-- For brevity, only the first two products are shown here. The full file will include all products from products_rows.sql, each with 3-5 reviews and downloads, using only the new user IDs. 