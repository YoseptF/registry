-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users who don't have profiles yet
INSERT INTO public.profiles (id, email, name, role, avatar_url, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.email) as name,
  'user' as role,
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') as avatar_url,
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Update existing profiles that are missing avatars
UPDATE public.profiles p
SET avatar_url = COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
WHERE p.id = u.id
  AND p.avatar_url IS NULL
  AND (u.raw_user_meta_data->>'avatar_url' IS NOT NULL OR u.raw_user_meta_data->>'picture' IS NOT NULL);
