-- Fix security issues with views - add RLS policies
-- Run this after the main migration

-- Enable RLS on views
ALTER VIEW public.user_enrollments_with_details SET (security_barrier = true);
ALTER VIEW public.instructor_weekly_earnings SET (security_barrier = true);

-- However, views don't support RLS policies directly in PostgreSQL
-- The best solution is to replace them with security definer functions

-- Drop the insecure views
DROP VIEW IF EXISTS public.user_enrollments_with_details;
DROP VIEW IF EXISTS public.instructor_weekly_earnings;

-- ====================================================================================
-- Replace with security definer functions that enforce access control
-- ====================================================================================

-- Function to get user's enrollments with details (replaces view)
CREATE OR REPLACE FUNCTION public.get_user_enrollments_with_details(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  enrollment_id UUID,
  user_id UUID,
  checked_in BOOLEAN,
  enrolled_at TIMESTAMPTZ,
  reschedule_requested_at TIMESTAMPTZ,
  session_id UUID,
  session_date DATE,
  session_time TIME,
  class_id UUID,
  class_name TEXT,
  class_description TEXT,
  banner_url TEXT,
  duration_minutes INTEGER,
  instructor_id UUID,
  instructor_name TEXT,
  instructor_avatar TEXT,
  package_name TEXT,
  can_reschedule BOOLEAN
) AS $$
DECLARE
  v_target_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Determine target user
  v_target_user_id := COALESCE(p_user_id, auth.uid());

  -- Check if current user is admin
  v_is_admin := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );

  -- Only allow users to see their own enrollments, unless they're admin
  IF NOT v_is_admin AND v_target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own enrollments';
  END IF;

  RETURN QUERY
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
  LEFT JOIN public.class_package_purchases cpp ON ce.package_purchase_id = cpp.id
  WHERE ce.user_id = v_target_user_id
  ORDER BY cs.session_date, cs.session_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_enrollments_with_details IS 'Get user enrollments with full details. Users can only see their own, admins can see any user.';

-- Function to get instructor's weekly earnings (replaces view)
CREATE OR REPLACE FUNCTION public.get_instructor_weekly_earnings(
  p_instructor_id UUID DEFAULT NULL,
  p_week_start DATE DEFAULT NULL,
  p_week_end DATE DEFAULT NULL
)
RETURNS TABLE (
  instructor_id UUID,
  instructor_name TEXT,
  week_start DATE,
  total_check_ins BIGINT,
  total_earnings NUMERIC,
  package_earnings NUMERIC,
  credit_earnings NUMERIC
) AS $$
DECLARE
  v_target_instructor_id UUID;
  v_is_admin BOOLEAN;
  v_is_instructor BOOLEAN;
BEGIN
  -- Determine target instructor
  v_target_instructor_id := COALESCE(p_instructor_id, auth.uid());

  -- Check user role
  SELECT
    role = 'admin',
    role IN ('admin', 'instructor')
  INTO v_is_admin, v_is_instructor
  FROM public.profiles
  WHERE id = auth.uid();

  -- Only allow instructors to see their own earnings, unless they're admin
  IF NOT v_is_admin AND v_target_instructor_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only view your own earnings';
  END IF;

  -- Instructors must have instructor role
  IF NOT v_is_instructor THEN
    RAISE EXCEPTION 'Access denied: Only instructors can view earnings';
  END IF;

  RETURN QUERY
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
  WHERE c.instructor_id = v_target_instructor_id
    AND c.instructor_id IS NOT NULL
    AND ci.instructor_payment_amount IS NOT NULL
    AND (p_week_start IS NULL OR DATE_TRUNC('week', ci.checked_in_at)::DATE >= p_week_start)
    AND (p_week_end IS NULL OR DATE_TRUNC('week', ci.checked_in_at)::DATE <= p_week_end)
  GROUP BY c.instructor_id, p.name, DATE_TRUNC('week', ci.checked_in_at)::DATE
  ORDER BY week_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_instructor_weekly_earnings IS 'Get instructor weekly earnings. Instructors can only see their own, admins can see any instructor.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_enrollments_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_instructor_weekly_earnings TO authenticated;

-- ====================================================================================
-- Additional helper function: Get upcoming enrollments for a user
-- ====================================================================================

CREATE OR REPLACE FUNCTION public.get_upcoming_enrollments(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  enrollment_id UUID,
  user_id UUID,
  checked_in BOOLEAN,
  enrolled_at TIMESTAMPTZ,
  session_id UUID,
  session_date DATE,
  session_time TIME,
  class_id UUID,
  class_name TEXT,
  class_description TEXT,
  banner_url TEXT,
  duration_minutes INTEGER,
  instructor_id UUID,
  instructor_name TEXT,
  instructor_avatar TEXT,
  package_name TEXT,
  can_reschedule BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_user_enrollments_with_details(COALESCE(p_user_id, auth.uid()))
  WHERE session_date >= CURRENT_DATE
  ORDER BY session_date, session_time
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_upcoming_enrollments TO authenticated;

COMMENT ON FUNCTION public.get_upcoming_enrollments IS 'Get upcoming enrollments for a user, ordered by date';

-- ====================================================================================
-- Usage examples:
-- ====================================================================================

-- As a user, get your own enrollments:
-- SELECT * FROM get_user_enrollments_with_details();

-- As admin, get any user's enrollments:
-- SELECT * FROM get_user_enrollments_with_details('user-uuid-here');

-- As instructor, get your own earnings:
-- SELECT * FROM get_instructor_weekly_earnings();

-- As instructor, get your earnings for specific week:
-- SELECT * FROM get_instructor_weekly_earnings(NULL, '2024-01-01', '2024-01-07');

-- As admin, get any instructor's earnings:
-- SELECT * FROM get_instructor_weekly_earnings('instructor-uuid-here');
