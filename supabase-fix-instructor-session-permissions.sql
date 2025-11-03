-- Fix: Allow instructors to create sessions for their classes

-- Drop the old admin-only policy
DROP POLICY IF EXISTS "Admins can create class sessions" ON public.class_sessions;

-- Create new policy allowing both admins and instructors
CREATE POLICY "Admins and instructors can create class sessions"
  ON public.class_sessions FOR INSERT
  WITH CHECK (
    -- Admins can create any session
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Instructors can create sessions for their own classes
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_sessions.class_id
      AND instructor_id = auth.uid()
    )
  );

COMMENT ON POLICY "Admins and instructors can create class sessions" ON public.class_sessions IS 'Admins can create any session, instructors can create sessions for their classes';
