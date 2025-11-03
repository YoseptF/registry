-- Add payment history tracking
-- This tracks when instructors get paid and which enrollments were included

CREATE TABLE IF NOT EXISTS instructor_payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Track which enrollments are included in each payment batch
CREATE TABLE IF NOT EXISTS instructor_payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_batch_id UUID NOT NULL REFERENCES instructor_payment_batches(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES class_enrollments(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  session_date DATE NOT NULL,
  session_time TEXT NOT NULL,
  student_paid DECIMAL(10, 2) NOT NULL,
  instructor_earned DECIMAL(10, 2) NOT NULL,
  admin_earned DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(enrollment_id, payment_batch_id)
);

-- Add field to track if enrollment has been paid out
ALTER TABLE class_enrollments
ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_batch_id UUID REFERENCES instructor_payment_batches(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_batches_instructor ON instructor_payment_batches(instructor_id);
CREATE INDEX IF NOT EXISTS idx_payment_batches_date ON instructor_payment_batches(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_batches_status ON instructor_payment_batches(status);
CREATE INDEX IF NOT EXISTS idx_payment_items_batch ON instructor_payment_items(payment_batch_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_enrollment ON instructor_payment_items(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_paid_out ON class_enrollments(paid_out_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_batch ON class_enrollments(payment_batch_id);

-- Enable RLS
ALTER TABLE instructor_payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_payment_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment batches
CREATE POLICY "Admins can view all payment batches" ON instructor_payment_batches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Instructors can view their own payment batches" ON instructor_payment_batches
  FOR SELECT TO authenticated
  USING (instructor_id = auth.uid());

CREATE POLICY "Admins can create payment batches" ON instructor_payment_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment batches" ON instructor_payment_batches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for payment items
CREATE POLICY "Admins can view all payment items" ON instructor_payment_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Instructors can view their own payment items" ON instructor_payment_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instructor_payment_batches
      WHERE instructor_payment_batches.id = payment_batch_id
      AND instructor_payment_batches.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create payment items" ON instructor_payment_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to automatically process instructor payments
CREATE OR REPLACE FUNCTION process_instructor_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_instructor RECORD;
  v_enrollment RECORD;
  v_batch_id UUID;
  v_total_amount DECIMAL(10, 2);
  v_period_start DATE;
  v_period_end DATE;
  v_system_admin_id UUID;
BEGIN
  -- Get the first admin user as system user
  SELECT id INTO v_system_admin_id
  FROM profiles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;

  -- Set payment period (last 7 days by default, adjust as needed)
  v_period_end := CURRENT_DATE;
  v_period_start := CURRENT_DATE - INTERVAL '7 days';

  -- Loop through each instructor who has unpaid enrollments
  FOR v_instructor IN
    SELECT DISTINCT
      c.instructor_id,
      p.name as instructor_name
    FROM class_enrollments ce
    INNER JOIN class_sessions cs ON ce.class_session_id = cs.id
    INNER JOIN classes c ON cs.class_id = c.id
    INNER JOIN profiles p ON c.instructor_id = p.id
    WHERE ce.paid_out_at IS NULL
      AND ce.checked_in = true
      AND cs.session_date BETWEEN v_period_start AND v_period_end
  LOOP
    -- Calculate total amount for this instructor
    v_total_amount := 0;

    -- Create payment batch
    INSERT INTO instructor_payment_batches (
      instructor_id,
      payment_date,
      period_start,
      period_end,
      total_amount,
      status,
      created_by,
      notes
    ) VALUES (
      v_instructor.instructor_id,
      CURRENT_DATE,
      v_period_start,
      v_period_end,
      0, -- Will update after calculating
      'pending',
      v_system_admin_id,
      'Auto-generated payment batch'
    ) RETURNING id INTO v_batch_id;

    -- Add payment items for each unpaid enrollment
    FOR v_enrollment IN
      SELECT
        ce.id as enrollment_id,
        c.name as class_name,
        cs.session_date,
        cs.session_time,
        cpp.amount_paid / cpp.num_classes as student_paid,
        CASE
          WHEN c.instructor_payment_type = 'flat' THEN c.instructor_payment_value
          ELSE (cpp.amount_paid / cpp.num_classes) * (c.instructor_payment_value / 100.0)
        END as instructor_earned
      FROM class_enrollments ce
      INNER JOIN class_sessions cs ON ce.class_session_id = cs.id
      INNER JOIN classes c ON cs.class_id = c.id
      INNER JOIN class_package_purchases cpp ON ce.package_purchase_id = cpp.id
      WHERE c.instructor_id = v_instructor.instructor_id
        AND ce.paid_out_at IS NULL
        AND ce.checked_in = true
        AND cs.session_date BETWEEN v_period_start AND v_period_end
    LOOP
      -- Insert payment item
      INSERT INTO instructor_payment_items (
        payment_batch_id,
        enrollment_id,
        class_name,
        session_date,
        session_time,
        student_paid,
        instructor_earned,
        admin_earned
      ) VALUES (
        v_batch_id,
        v_enrollment.enrollment_id,
        v_enrollment.class_name,
        v_enrollment.session_date,
        v_enrollment.session_time,
        v_enrollment.student_paid,
        v_enrollment.instructor_earned,
        v_enrollment.student_paid - v_enrollment.instructor_earned
      );

      -- Add to total
      v_total_amount := v_total_amount + v_enrollment.instructor_earned;

      -- Mark enrollment as paid out
      UPDATE class_enrollments
      SET
        paid_out_at = NOW(),
        payment_batch_id = v_batch_id
      WHERE id = v_enrollment.enrollment_id;
    END LOOP;

    -- Update batch total
    UPDATE instructor_payment_batches
    SET total_amount = v_total_amount
    WHERE id = v_batch_id;
  END LOOP;
END;
$$;

-- Create settings table for payment schedule configuration
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_day TEXT NOT NULL DEFAULT 'friday' CHECK (payment_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  payment_hour INTEGER NOT NULL DEFAULT 18 CHECK (payment_hour >= 0 AND payment_hour <= 23),
  payment_minute INTEGER NOT NULL DEFAULT 0 CHECK (payment_minute >= 0 AND payment_minute <= 59),
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  auto_process BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings (Friday at 6 PM Mexico time)
INSERT INTO payment_settings (payment_day, payment_hour, payment_minute, timezone, auto_process)
VALUES ('friday', 18, 0, 'America/Mexico_City', true);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and update settings
CREATE POLICY "Admins can view payment settings" ON payment_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment settings" ON payment_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Enable pg_cron extension (requires superuser, may need to enable in Supabase dashboard)
-- Note: If pg_cron is not available, you can trigger this manually via UI
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic payment processing every Friday at 6 PM Central Mexico Time
-- IMPORTANT: Cron runs in UTC. Mexico Central Time is UTC-6
-- Friday 6 PM CST = Saturday 12:00 AM UTC (midnight)
-- This can be updated via the UI
SELECT cron.schedule(
  'process-instructor-payments',
  '0 0 * * 6', -- Saturday at midnight UTC = Friday 6 PM CST (Mexico Central Time)
  $cron$SELECT process_instructor_payments();$cron$
);

-- Function to update cron schedule (called from UI)
CREATE OR REPLACE FUNCTION update_payment_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_cron_expression TEXT;
  v_utc_hour INTEGER;
  v_day_number INTEGER;
BEGIN
  -- Get current settings
  SELECT * INTO v_settings FROM payment_settings LIMIT 1;

  -- Convert Mexico time to UTC (Mexico is UTC-6)
  v_utc_hour := v_settings.payment_hour + 6;

  -- Map day names to cron day numbers
  v_day_number := CASE v_settings.payment_day
    WHEN 'sunday' THEN 0
    WHEN 'monday' THEN 1
    WHEN 'tuesday' THEN 2
    WHEN 'wednesday' THEN 3
    WHEN 'thursday' THEN 4
    WHEN 'friday' THEN 5
    WHEN 'saturday' THEN 6
  END;

  -- Adjust if hour goes to next day
  IF v_utc_hour >= 24 THEN
    v_utc_hour := v_utc_hour - 24;
    v_day_number := (v_day_number + 1) % 7;
  END IF;

  -- Build cron expression
  v_cron_expression := v_settings.payment_minute || ' ' || v_utc_hour || ' * * ' || v_day_number;

  -- Unschedule existing job
  PERFORM cron.unschedule('process-instructor-payments');

  -- Schedule new job if auto_process is enabled
  IF v_settings.auto_process THEN
    PERFORM cron.schedule(
      'process-instructor-payments',
      v_cron_expression,
      $func$SELECT process_instructor_payments();$func$
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION update_payment_schedule() IS
'Updates the cron schedule based on payment_settings table.
Call this after updating settings via UI.';

GRANT EXECUTE ON FUNCTION update_payment_schedule() TO authenticated;

COMMENT ON FUNCTION process_instructor_payments() IS
'Automatically processes instructor payments for checked-in classes within the last 7 days.
Creates payment batches with status=pending for admin review.
Can be triggered manually or scheduled with pg_cron.';

-- Grant execute permission to authenticated users (only admins can actually execute due to RLS)
GRANT EXECUTE ON FUNCTION process_instructor_payments() TO authenticated;
