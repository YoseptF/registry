-- Fix RLS policies to allow users to see their own data

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Instructors can view their own class enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Instructors can view their own class sessions" ON class_sessions;
DROP POLICY IF EXISTS "Instructors can view their own classes" ON classes;

-- Create new policy for class_enrollments that includes users seeing their own
CREATE POLICY "Users and instructors can view enrollments" ON class_enrollments
  FOR SELECT TO authenticated
  USING (
    -- Admins see all enrollments
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Instructors see enrollments for their classes
    EXISTS (
      SELECT 1 FROM class_sessions
      JOIN classes ON classes.id = class_sessions.class_id
      WHERE class_sessions.id = class_enrollments.class_session_id
      AND classes.instructor_id = auth.uid()
    )
    OR
    -- Users see their own enrollments
    class_enrollments.user_id = auth.uid()
  );

-- Allow all authenticated users to view class sessions (needed for browsing/enrolling)
CREATE POLICY "Authenticated users can view class sessions" ON class_sessions
  FOR SELECT TO authenticated
  USING (true);

-- Allow all authenticated users to view classes (needed for browsing/enrolling)
CREATE POLICY "Authenticated users can view classes" ON classes
  FOR SELECT TO authenticated
  USING (true);
