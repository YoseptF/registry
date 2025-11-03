-- RLS policies for check-ins: instructors and users

-- Allow instructors to view check-ins for their own classes
-- Allow users to view their own check-ins
-- Allow admins to view all check-ins
CREATE POLICY "Users and instructors can view check-ins" ON check_ins
  FOR SELECT TO authenticated
  USING (
    -- Admins see everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Instructors see check-ins for their classes
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = check_ins.class_id
      AND classes.instructor_id = auth.uid()
    )
    OR
    -- Users see their own check-ins
    check_ins.user_id = auth.uid()
  );

-- Allow instructors to insert check-ins for their own classes
CREATE POLICY "Instructors can create check-ins for their classes" ON check_ins
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = check_ins.class_id
      AND classes.instructor_id = auth.uid()
    )
  );
