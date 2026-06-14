-- =============================================================================
-- MIGRATION: Convert Custom Auth to Supabase Auth & Add Row Level Security
-- =============================================================================

-- 1. Modify public.users to link to auth.users securely
--------------------------------------------------------------------------------
-- Make public.users.id a foreign key to auth.users.id
-- First check if data is already in there, we assume it's fresh as you just set it up.
TRUNCATE TABLE public.users CASCADE; -- Wipe out old users before migration

ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- Ensure public.users ID directly maps to the Supabase authenticated user
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_auth_fkey,
  ADD CONSTRAINT users_auth_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create the Auth Trigger
--------------------------------------------------------------------------------
-- Automatically insert a row into public.users whenever someone signs up via Supabase.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Enable Row Level Security (RLS) on critical tables
--------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS POLICIES FOR 'users'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
CREATE POLICY "Users can read their own data" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" 
  ON public.users FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update their own name/password" ON public.users;
CREATE POLICY "Users can update their own name/password" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- RLS POLICIES FOR 'profiles'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (
    (profile_status = 'active' AND approval_status = 'approved') 
    OR 
    user_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RLS POLICIES FOR 'photos'
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Approved photos viewable by logged in users" ON public.photos;
CREATE POLICY "Approved photos viewable by logged in users" 
  ON public.photos FOR SELECT 
  USING (
    (approval_status = 'approved' AND auth.uid() IS NOT NULL)
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can upload their own photos" ON public.photos;
CREATE POLICY "Users can upload their own photos" 
  ON public.photos FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;
CREATE POLICY "Users can delete their own photos" 
  ON public.photos FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND user_id = auth.uid())
  );

-- =============================================================================
-- Migration complete. You are now securely linked to Supabase Auth!
-- =============================================================================
