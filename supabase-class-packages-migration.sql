-- Migration: Class Packages, Drop-in Credits, and Payment System
-- This migration adds class packages, drop-in credits, session-based enrollments, and instructor payment tracking

-- ====================================================================================
-- STEP 1: Update existing tables with new columns
-- ====================================================================================

-- Add payment configuration to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS instructor_payment_type TEXT DEFAULT 'percentage' CHECK (instructor_payment_type IN ('flat', 'percentage'));
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) DEFAULT 70.00;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS schedule_days TEXT[];
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS schedule_time TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

COMMENT ON COLUMN public.classes.instructor_payment_type IS 'Payment method: flat rate per student or percentage of sale';
COMMENT ON COLUMN public.classes.instructor_payment_value IS 'Either flat amount (e.g., 50.00) or percentage (e.g., 70.00 for 70%)';
COMMENT ON COLUMN public.classes.banner_url IS 'URL to class banner image in Supabase Storage';
COMMENT ON COLUMN public.classes.schedule_days IS 'Array of days when class occurs (e.g., {monday,wednesday,friday})';
COMMENT ON COLUMN public.classes.schedule_time IS 'Time of day in 24hr format (e.g., 18:00)';
COMMENT ON COLUMN public.classes.duration_minutes IS 'Class duration in minutes';

-- Update check_ins table for new payment tracking
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS class_session_id UUID;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS enrollment_id UUID;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS credit_purchase_id UUID;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('package', 'credit'));
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processed', 'paid'));
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS instructor_payment_amount NUMERIC(10,2);

COMMENT ON COLUMN public.check_ins.class_session_id IS 'Link to specific class session instance';
COMMENT ON COLUMN public.check_ins.enrollment_id IS 'Link to class enrollment if checked in via package';
COMMENT ON COLUMN public.check_ins.credit_purchase_id IS 'Link to credit purchase if checked in via drop-in credit';
COMMENT ON COLUMN public.check_ins.payment_method IS 'How the user paid: class package or drop-in credit';
COMMENT ON COLUMN public.check_ins.payment_status IS 'Payment processing status for instructor payout';
COMMENT ON COLUMN public.check_ins.instructor_payment_amount IS 'Amount owed to instructor for this check-in';

-- ====================================================================================
-- STEP 2: Create new tables
-- ====================================================================================

-- Class sessions: Specific date/time instances of recurring classes
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  created_from TEXT DEFAULT 'enrollment' CHECK (created_from IN ('enrollment', 'dropin', 'manual')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, session_date, session_time)
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_class ON public.class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions(session_date);

COMMENT ON TABLE public.class_sessions IS 'Specific date/time instances of recurring classes, created on-demand';
COMMENT ON COLUMN public.class_sessions.created_from IS 'How this session was created: enrollment, drop-in check-in, or manual by admin';

-- Class packages: Package definitions (e.g., "5 Classes - $250")
CREATE TABLE IF NOT EXISTS public.class_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  num_classes INTEGER NOT NULL CHECK (num_classes > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_class_packages_active ON public.class_packages(active);

COMMENT ON TABLE public.class_packages IS 'Definitions for class packages that can be purchased (e.g., 1 class, 5 classes, 10 classes)';

-- Class package purchases: User's package purchases
CREATE TABLE IF NOT EXISTS public.class_package_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES public.class_packages(id) ON DELETE RESTRICT NOT NULL,
  package_name TEXT NOT NULL,
  num_classes INTEGER NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_class_package_purchases_user ON public.class_package_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_class_package_purchases_date ON public.class_package_purchases(purchase_date DESC);

COMMENT ON TABLE public.class_package_purchases IS 'Records of users purchasing class packages, with payment tracking';
COMMENT ON COLUMN public.class_package_purchases.package_name IS 'Snapshot of package name at time of purchase';
COMMENT ON COLUMN public.class_package_purchases.num_classes IS 'Snapshot of number of classes at time of purchase';
COMMENT ON COLUMN public.class_package_purchases.assigned_by IS 'Admin/staff who processed the sale';

-- Class enrollments: Links users to specific class sessions (replaces class_memberships)
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE NOT NULL,
  package_purchase_id UUID REFERENCES public.class_package_purchases(id) ON DELETE SET NULL NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  checked_in BOOLEAN DEFAULT false NOT NULL,
  reschedule_requested_at TIMESTAMPTZ,
  reschedule_approved_at TIMESTAMPTZ,
  reschedule_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id, class_session_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_user ON public.class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_session ON public.class_enrollments(class_session_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_package ON public.class_enrollments(package_purchase_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_reschedule ON public.class_enrollments(reschedule_requested_at) WHERE reschedule_requested_at IS NOT NULL;

COMMENT ON TABLE public.class_enrollments IS 'User enrollments to specific class sessions via package purchases';
COMMENT ON COLUMN public.class_enrollments.checked_in IS 'Whether user has checked in for this session';

-- Drop-in credit packages: Package definitions for flexible credits
CREATE TABLE IF NOT EXISTS public.drop_in_credit_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  num_credits INTEGER NOT NULL CHECK (num_credits > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  payment_type TEXT DEFAULT 'percentage' CHECK (payment_type IN ('flat', 'percentage')),
  payment_value NUMERIC(10,2),
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drop_in_credit_packages_active ON public.drop_in_credit_packages(active);

COMMENT ON TABLE public.drop_in_credit_packages IS 'Definitions for drop-in credit packages that can be purchased';
COMMENT ON COLUMN public.drop_in_credit_packages.payment_type IS 'How instructor gets paid: flat rate per credit use or percentage';
COMMENT ON COLUMN public.drop_in_credit_packages.payment_value IS 'Either flat amount or percentage for instructor payment';

-- Drop-in credit purchases: User's credit purchases and balance
CREATE TABLE IF NOT EXISTS public.drop_in_credit_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES public.drop_in_credit_packages(id) ON DELETE RESTRICT NOT NULL,
  package_name TEXT NOT NULL,
  credits_total INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  payment_type TEXT NOT NULL,
  payment_value NUMERIC(10,2) NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_drop_in_credit_purchases_user ON public.drop_in_credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_drop_in_credit_purchases_active ON public.drop_in_credit_purchases(user_id, credits_remaining) WHERE credits_remaining > 0;

COMMENT ON TABLE public.drop_in_credit_purchases IS 'User purchases of drop-in credits with remaining balance tracking';
COMMENT ON COLUMN public.drop_in_credit_purchases.credits_remaining IS 'Number of unused credits';
COMMENT ON COLUMN public.drop_in_credit_purchases.payment_type IS 'Snapshot of payment type at purchase';
COMMENT ON COLUMN public.drop_in_credit_purchases.payment_value IS 'Snapshot of payment value at purchase';

-- Instructor payments: Weekly payout records
CREATE TABLE IF NOT EXISTS public.instructor_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  check_in_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_instructor_payments_instructor ON public.instructor_payments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_payments_week ON public.instructor_payments(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_instructor_payments_status ON public.instructor_payments(status);

COMMENT ON TABLE public.instructor_payments IS 'Weekly payment records for instructors based on check-ins';
COMMENT ON COLUMN public.instructor_payments.check_in_ids IS 'Array of check-in IDs included in this payment';

-- Instructor payment configuration: Per-instructor payment schedule overrides
CREATE TABLE IF NOT EXISTS public.instructor_payment_config (
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  payment_day_of_week INTEGER DEFAULT 5 CHECK (payment_day_of_week >= 0 AND payment_day_of_week <= 6),
  custom_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.instructor_payment_config IS 'Per-instructor payment schedule configuration';
COMMENT ON COLUMN public.instructor_payment_config.payment_day_of_week IS 'Day of week for payment (0=Sunday, 6=Saturday, default 5=Friday)';

-- Reschedule requests: Separate table for tracking reschedule workflow
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enrollment_id UUID REFERENCES public.class_enrollments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE NOT NULL,
  new_session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  requested_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  UNIQUE(enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON public.reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_user ON public.reschedule_requests(user_id);

COMMENT ON TABLE public.reschedule_requests IS 'User requests to reschedule enrolled class sessions';

-- ====================================================================================
-- STEP 3: Enable RLS on new tables
-- ====================================================================================

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_in_credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_in_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- ====================================================================================
-- STEP 4: Create RLS policies
-- ====================================================================================

-- Class sessions policies
CREATE POLICY "Class sessions viewable by everyone"
  ON public.class_sessions FOR SELECT
  USING (true);

CREATE POLICY "Admins can create class sessions"
  ON public.class_sessions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update class sessions"
  ON public.class_sessions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete class sessions"
  ON public.class_sessions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Class packages policies
CREATE POLICY "Class packages viewable by everyone"
  ON public.class_packages FOR SELECT
  USING (active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage class packages"
  ON public.class_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Class package purchases policies
CREATE POLICY "Users can view own package purchases"
  ON public.class_package_purchases FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Admins can manage package purchases"
  ON public.class_package_purchases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Class enrollments policies
CREATE POLICY "Users can view own enrollments"
  ON public.class_enrollments FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      JOIN public.classes c ON cs.class_id = c.id
      WHERE cs.id = class_enrollments.class_session_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admins and instructors can create enrollments"
  ON public.class_enrollments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      JOIN public.classes c ON cs.class_id = c.id
      WHERE cs.id = class_session_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update enrollments"
  ON public.class_enrollments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete enrollments"
  ON public.class_enrollments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Drop-in credit packages policies
CREATE POLICY "Credit packages viewable by everyone"
  ON public.drop_in_credit_packages FOR SELECT
  USING (active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage credit packages"
  ON public.drop_in_credit_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Drop-in credit purchases policies
CREATE POLICY "Users can view own credit purchases"
  ON public.drop_in_credit_purchases FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

CREATE POLICY "Admins can manage credit purchases"
  ON public.drop_in_credit_purchases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Instructor payments policies
CREATE POLICY "Instructors can view own payments"
  ON public.instructor_payments FOR SELECT
  USING (
    auth.uid() = instructor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage instructor payments"
  ON public.instructor_payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Instructor payment config policies
CREATE POLICY "Instructors can view own payment config"
  ON public.instructor_payment_config FOR SELECT
  USING (
    auth.uid() = instructor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage payment configs"
  ON public.instructor_payment_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reschedule requests policies
CREATE POLICY "Users can view own reschedule requests"
  ON public.reschedule_requests FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create own reschedule requests"
  ON public.reschedule_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage reschedule requests"
  ON public.reschedule_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ====================================================================================
-- STEP 5: Create helper functions
-- ====================================================================================

-- Function to calculate instructor payment for a check-in
CREATE OR REPLACE FUNCTION public.calculate_instructor_payment(
  p_class_id UUID,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_num_classes INTEGER DEFAULT 1
)
RETURNS NUMERIC AS $$
DECLARE
  v_payment_type TEXT;
  v_payment_value NUMERIC;
  v_class_value NUMERIC;
  v_result NUMERIC;
BEGIN
  -- Get class payment configuration
  SELECT instructor_payment_type, instructor_payment_value
  INTO v_payment_type, v_payment_value
  FROM public.classes
  WHERE id = p_class_id;

  -- Calculate value per class (for packages, divide by number of classes)
  v_class_value := p_amount_paid / GREATEST(p_num_classes, 1);

  -- Calculate instructor payment
  IF v_payment_type = 'flat' THEN
    v_result := v_payment_value;
  ELSE -- percentage
    v_result := v_class_value * (v_payment_value / 100);
  END IF;

  RETURN ROUND(v_result, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_instructor_payment IS 'Calculates instructor payment for a check-in based on class payment config';

-- Function to get user's available drop-in credits
CREATE OR REPLACE FUNCTION public.get_user_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(credits_remaining), 0)
  INTO v_total
  FROM public.drop_in_credit_purchases
  WHERE user_id = p_user_id
  AND credits_remaining > 0;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_user_available_credits IS 'Returns total available drop-in credits for a user';

-- Function to use a drop-in credit
CREATE OR REPLACE FUNCTION public.use_drop_in_credit(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_purchase_id UUID;
BEGIN
  -- Find oldest purchase with remaining credits (FIFO)
  SELECT id INTO v_purchase_id
  FROM public.drop_in_credit_purchases
  WHERE user_id = p_user_id
  AND credits_remaining > 0
  ORDER BY purchase_date ASC
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    RAISE EXCEPTION 'No available credits for user';
  END IF;

  -- Decrement credit
  UPDATE public.drop_in_credit_purchases
  SET credits_remaining = credits_remaining - 1
  WHERE id = v_purchase_id;

  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.use_drop_in_credit IS 'Decrements a drop-in credit for user and returns purchase ID (FIFO)';

-- Function to check if reschedule is allowed (24hr rule)
CREATE OR REPLACE FUNCTION public.can_reschedule_enrollment(p_enrollment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_date DATE;
  v_session_time TIME;
  v_session_datetime TIMESTAMPTZ;
BEGIN
  -- Get session date and time
  SELECT cs.session_date, cs.session_time
  INTO v_session_date, v_session_time
  FROM public.class_enrollments ce
  JOIN public.class_sessions cs ON ce.class_session_id = cs.id
  WHERE ce.id = p_enrollment_id;

  IF v_session_date IS NULL THEN
    RETURN false;
  END IF;

  -- Combine date and time
  v_session_datetime := (v_session_date || ' ' || v_session_time)::TIMESTAMPTZ;

  -- Check if more than 24 hours away
  RETURN v_session_datetime > (now() + INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.can_reschedule_enrollment IS 'Returns true if enrollment can be rescheduled (more than 24 hours before session)';

-- ====================================================================================
-- STEP 6: Create views for common queries
-- ====================================================================================

-- View: User enrollments with full class details
CREATE OR REPLACE VIEW public.user_enrollments_with_details AS
SELECT
  ce.id AS enrollment_id,
  ce.user_id,
  ce.checked_in,
  ce.enrolled_at,
  ce.reschedule_requested_at,
  cs.id AS session_id,
  cs.session_date,
  cs.session_time,
  c.id AS class_id,
  c.name AS class_name,
  c.description AS class_description,
  c.banner_url,
  c.duration_minutes,
  c.instructor_id,
  p.name AS instructor_name,
  p.avatar_url AS instructor_avatar,
  cpp.package_name,
  public.can_reschedule_enrollment(ce.id) AS can_reschedule
FROM public.class_enrollments ce
JOIN public.class_sessions cs ON ce.class_session_id = cs.id
JOIN public.classes c ON cs.class_id = c.id
LEFT JOIN public.profiles p ON c.instructor_id = p.id
LEFT JOIN public.class_package_purchases cpp ON ce.package_purchase_id = cpp.id;

GRANT SELECT ON public.user_enrollments_with_details TO authenticated;

COMMENT ON VIEW public.user_enrollments_with_details IS 'User enrollments with full class and session details, including reschedule eligibility';

-- View: Instructor earnings for current week
CREATE OR REPLACE VIEW public.instructor_weekly_earnings AS
SELECT
  c.instructor_id,
  p.name AS instructor_name,
  DATE_TRUNC('week', ci.checked_in_at)::DATE AS week_start,
  COUNT(ci.id) AS total_check_ins,
  SUM(ci.instructor_payment_amount) AS total_earnings,
  SUM(CASE WHEN ci.payment_method = 'package' THEN ci.instructor_payment_amount ELSE 0 END) AS package_earnings,
  SUM(CASE WHEN ci.payment_method = 'credit' THEN ci.instructor_payment_amount ELSE 0 END) AS credit_earnings
FROM public.check_ins ci
JOIN public.class_sessions cs ON ci.class_session_id = cs.id
JOIN public.classes c ON cs.class_id = c.id
LEFT JOIN public.profiles p ON c.instructor_id = p.id
WHERE c.instructor_id IS NOT NULL
AND ci.instructor_payment_amount IS NOT NULL
GROUP BY c.instructor_id, p.name, DATE_TRUNC('week', ci.checked_in_at)::DATE;

GRANT SELECT ON public.instructor_weekly_earnings TO authenticated;

COMMENT ON VIEW public.instructor_weekly_earnings IS 'Weekly earnings summary for instructors based on check-ins';

-- ====================================================================================
-- STEP 7: Add foreign key constraints to check_ins (deferred to avoid circular refs)
-- ====================================================================================

ALTER TABLE public.check_ins
  DROP CONSTRAINT IF EXISTS check_ins_class_session_id_fkey,
  ADD CONSTRAINT check_ins_class_session_id_fkey
    FOREIGN KEY (class_session_id)
    REFERENCES public.class_sessions(id)
    ON DELETE SET NULL;

ALTER TABLE public.check_ins
  DROP CONSTRAINT IF EXISTS check_ins_enrollment_id_fkey,
  ADD CONSTRAINT check_ins_enrollment_id_fkey
    FOREIGN KEY (enrollment_id)
    REFERENCES public.class_enrollments(id)
    ON DELETE SET NULL;

ALTER TABLE public.check_ins
  DROP CONSTRAINT IF EXISTS check_ins_credit_purchase_id_fkey,
  ADD CONSTRAINT check_ins_credit_purchase_id_fkey
    FOREIGN KEY (credit_purchase_id)
    REFERENCES public.drop_in_credit_purchases(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_check_ins_session ON public.check_ins(class_session_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_enrollment ON public.check_ins(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_credit_purchase ON public.check_ins(credit_purchase_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_payment_status ON public.check_ins(payment_status);

-- ====================================================================================
-- Migration complete!
-- ====================================================================================

-- Note: Data migration from class_memberships to class_enrollments should be done
-- separately after the schema is in place. See the separate data migration script.
