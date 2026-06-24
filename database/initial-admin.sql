INSERT INTO users (
  full_name,
  email,
  password_hash,
  role,
  location,
  phone,
  store_name,
  bio,
  is_active,
  is_verified,
  preferred_payment_method
)
VALUES (
  'Marketplace Administrator',
  'admin@marketplace.com',
  crypt('AdminPass123', gen_salt('bf')),
  'admin',
  'Freetown, Sierra Leone',
  '',
  'Platform Operations',
  'Primary marketplace administrator account.',
  TRUE,
  TRUE,
  'Bank Transfer'
)
ON CONFLICT (email) DO NOTHING;
