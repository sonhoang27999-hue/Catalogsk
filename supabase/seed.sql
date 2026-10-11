-- Dữ liệu demo cho database chạy trên máy (supabase start / supabase db reset).
-- Supabase CLI chỉ chạy file này ở môi trường local, không đẩy lên production.
-- Tài khoản quản trị demo: admin@demo.local / DemoSK@2026 (người dùng đầu tiên tự thành admin).

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'admin@demo.local',
  extensions.crypt('DemoSK@2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Quản trị Demo"}',
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '{"sub":"a0000000-0000-4000-8000-000000000001","email":"admin@demo.local","email_verified":true}',
  'email', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- Danh mục, dòng xe và sản phẩm đã có sẵn trong các migration (dữ liệu mẫu Lovable để lại), nên ở đây chỉ tạo tài khoản.
