-- RLS policies for instructors to view only their own class enrollments

-- Allow instructors to view enrollments only for their own classes
CREATE POLICY "Instructors can view their own class enrollments" ON class_enrollments
  FOR SELECT TO authenticated
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
  );

-- Allow instructors to view class sessions only for their own classes
CREATE POLICY "Instructors can view their own class sessions" ON class_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_sessions.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Allow instructors to view classes where they are the instructor
CREATE POLICY "Instructors can view their own classes" ON classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    instructor_id = auth.uid()
  );
