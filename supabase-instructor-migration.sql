-- Migration: Add instructor role and update classes table
-- This migration adds the instructor role to the system and updates classes to use instructor_id

-- Step 1: Update role check constraint to include 'instructor'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'instructor', 'user'));

-- Step 2: Add bio field for instructor profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Step 3: Add instructor_id to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 4: Create index on instructor_id for better query performance
CREATE INDEX IF NOT EXISTS idx_classes_instructor ON public.classes(instructor_id);

-- Step 5: Update RLS policies for instructor role

-- Allow instructors to view all classes (same as everyone)
-- (Already covered by "Classes are viewable by everyone" policy)

-- Allow instructors to update ONLY their assigned classes
DROP POLICY IF EXISTS "Instructors can update their classes" ON public.classes;
CREATE POLICY "Instructors can update their classes"
  ON public.classes FOR UPDATE
  USING (
    exists (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
      AND auth.uid() = classes.instructor_id
    )
  );

-- Allow instructors to view memberships in their classes
DROP POLICY IF EXISTS "Instructors can view their class memberships" ON public.class_memberships;
CREATE POLICY "Instructors can view their class memberships"
  ON public.class_memberships FOR SELECT
  USING (
    auth.uid() = user_id OR
    exists (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    exists (
      SELECT 1 FROM public.classes
      WHERE id = class_memberships.class_id
      AND instructor_id = auth.uid()
    )
  );

-- Allow instructors to create memberships in their classes
DROP POLICY IF EXISTS "Instructors can create memberships in their classes" ON public.class_memberships;
CREATE POLICY "Instructors can create memberships in their classes"
  ON public.class_memberships FOR INSERT
  WITH CHECK (
    exists (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    exists (
      SELECT 1 FROM public.classes
      WHERE id = class_memberships.class_id
      AND instructor_id = auth.uid()
    )
  );

-- Allow instructors to delete memberships in their classes
DROP POLICY IF EXISTS "Instructors can delete memberships in their classes" ON public.class_memberships;
CREATE POLICY "Instructors can delete memberships in their classes"
  ON public.class_memberships FOR DELETE
  USING (
    exists (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    exists (
      SELECT 1 FROM public.classes
      WHERE id = class_memberships.class_id
      AND instructor_id = auth.uid()
    )
  );

-- Allow instructors to view check-ins for their classes
DROP POLICY IF EXISTS "Instructors can view their class check-ins" ON public.check_ins;
CREATE POLICY "Instructors can view their class check-ins"
  ON public.check_ins FOR SELECT
  USING (
    auth.uid() = user_id OR
    exists (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    exists (
      SELECT 1 FROM public.classes
      WHERE id = check_ins.class_id
      AND instructor_id = auth.uid()
    )
  );

-- Step 6: Create helper function to check if user is instructor
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('instructor', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to get classes taught by instructor
CREATE OR REPLACE FUNCTION public.get_instructor_classes(instructor_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  instructor TEXT,
  instructor_id UUID,
  schedule TEXT,
  banner_url TEXT,
  schedule_days TEXT[],
  schedule_time TEXT,
  duration_minutes INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ,
  enrolled_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.*,
    COUNT(cm.id) AS enrolled_count
  FROM public.classes c
  LEFT JOIN public.class_memberships cm ON c.id = cm.class_id
  WHERE c.instructor_id = instructor_user_id
  GROUP BY c.id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create view for instructors with their class counts
CREATE OR REPLACE VIEW public.instructors_with_stats AS
SELECT
  p.id,
  p.name,
  p.email,
  p.bio,
  p.avatar_url,
  p.created_at,
  COUNT(c.id) AS classes_count
FROM public.profiles p
LEFT JOIN public.classes c ON c.instructor_id = p.id
WHERE p.role IN ('instructor', 'admin')
GROUP BY p.id, p.name, p.email, p.bio, p.avatar_url, p.created_at
ORDER BY p.name;

-- Grant access to the view
GRANT SELECT ON public.instructors_with_stats TO authenticated, anon;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.bio IS 'Biography/description for instructors (optional)';
COMMENT ON COLUMN public.classes.instructor_id IS 'Foreign key to profiles table for instructor assignment';
COMMENT ON FUNCTION public.is_instructor() IS 'Returns true if current user is an instructor or admin';
COMMENT ON FUNCTION public.get_instructor_classes(UUID) IS 'Returns all classes taught by a specific instructor with enrollment counts';
COMMENT ON VIEW public.instructors_with_stats IS 'View of all instructors with their class counts';
