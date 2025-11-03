-- Add UPDATE policies for class_enrollments (needed for check-ins)

-- Allow instructors to update enrollments for their classes (when checking students in)
CREATE POLICY "Instructors can update enrollments for their classes" ON class_enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM class_sessions
      JOIN classes ON classes.id = class_sessions.class_id
      WHERE class_sessions.id = class_enrollments.class_session_id
      AND classes.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM class_sessions
      JOIN classes ON classes.id = class_sessions.class_id
      WHERE class_sessions.id = class_enrollments.class_session_id
      AND classes.instructor_id = auth.uid()
    )
  );
