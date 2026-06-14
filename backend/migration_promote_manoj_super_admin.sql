-- ═══════════════════════════════════════════════════════════════════════════
-- migration_promote_manoj_super_admin.sql
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Update the password in Supabase auth.users table (Bcrypt hashed)
-- Supabase uses the pgcrypto extension for password hashing.
UPDATE auth.users
SET encrypted_password = crypt('110196', gen_salt('bf', 10))
WHERE email = 'p.manojkumar1101@gmail.com';

-- 2. Promote the user in the public.users table
UPDATE public.users
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'p.manojkumar1101@gmail.com';

-- 3. Insert or update the admin details in the admin_details table
INSERT INTO public.admin_details (
  user_id, 
  name, 
  email, 
  role, 
  status, 
  has_profile, 
  profile_id, 
  whatsapp, 
  mobile, 
  created_at, 
  updated_at
)
SELECT 
  u.id AS user_id,
  u.name AS name,
  u.email AS email,
  'super_admin' AS role,
  'active' AS status,
  (p.id IS NOT NULL) AS has_profile,
  p.id AS profile_id,
  p.whatsapp AS whatsapp,
  p.contact AS mobile,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE u.email = 'p.manojkumar1101@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  has_profile = EXCLUDED.has_profile,
  profile_id = EXCLUDED.profile_id,
  whatsapp = EXCLUDED.whatsapp,
  mobile = EXCLUDED.mobile,
  updated_at = NOW();
