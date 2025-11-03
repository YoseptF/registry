-- Allow instructors to view payment settings (read-only)
-- They need to see when they'll get paid

CREATE POLICY "Instructors can view payment settings" ON payment_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );
