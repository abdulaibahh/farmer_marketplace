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
  'abdulaib087@gmail.com',
  'AdminPass123',
  'admin',
  'Freetown, Sierra Leone',
  '+23275756395',
  'Platform Operations',
  'Primary marketplace administrator account.',
  TRUE,
  TRUE,
  'Bank Transfer'
)
ON CONFLICT (email) DO NOTHING;
