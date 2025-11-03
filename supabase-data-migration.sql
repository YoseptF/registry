-- Data Migration: Convert class_memberships to class_enrollments
-- This script migrates existing class memberships to the new session-based enrollment system
-- Run this AFTER the main schema migration (supabase-class-packages-migration.sql)

-- ====================================================================================
-- STEP 1: Create a "Legacy Enrollment" package for migrated data
-- ====================================================================================

DO $$
DECLARE
  v_legacy_package_id UUID;
BEGIN
  -- Create a special package to represent legacy memberships
  INSERT INTO public.class_packages (
    id,
    name,
    description,
    num_classes,
    price,
    active
  ) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Fixed UUID for legacy package
    'Legacy Enrollment',
    'Auto-generated package for migrated class memberships (permanent enrollments)',
    9999,
    0.00,
    false -- Not active, just for record keeping
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Created legacy package for data migration';
END $$;

-- ====================================================================================
-- STEP 2: Create recurring sessions for classes with existing memberships
-- ====================================================================================

DO $$
DECLARE
  v_class RECORD;
  v_session_id UUID;
  v_session_date DATE;
  v_session_time TIME;
  v_days TEXT[];
  v_day TEXT;
  v_weeks INTEGER := 52; -- Create sessions for next year
  v_week INTEGER;
  v_sessions_created INTEGER := 0;
BEGIN
  -- Loop through all classes that have memberships
  FOR v_class IN
    SELECT DISTINCT c.*
    FROM public.classes c
    JOIN public.class_memberships cm ON c.id = cm.class_id
  LOOP
    -- Get schedule info
    v_days := v_class.schedule_days;
    v_session_time := COALESCE(v_class.schedule_time::TIME, '18:00'::TIME);

    -- If no schedule days defined, create a generic session for "now"
    IF v_days IS NULL OR array_length(v_days, 1) IS NULL THEN
      INSERT INTO public.class_sessions (
        class_id,
        session_date,
        session_time,
        created_from
      ) VALUES (
        v_class.id,
        CURRENT_DATE,
        v_session_time,
        'manual'
      )
      ON CONFLICT (class_id, session_date, session_time) DO NOTHING;

      v_sessions_created := v_sessions_created + 1;
      CONTINUE;
    END IF;

    -- Generate sessions for each scheduled day over the next year
    FOREACH v_day IN ARRAY v_days
    LOOP
      FOR v_week IN 0..v_weeks LOOP
        -- Calculate session date based on day of week
        v_session_date := CASE LOWER(v_day)
          WHEN 'monday' THEN CURRENT_DATE + ((1 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          WHEN 'tuesday' THEN CURRENT_DATE + ((2 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          WHEN 'wednesday' THEN CURRENT_DATE + ((3 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          WHEN 'thursday' THEN CURRENT_DATE + ((4 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          WHEN 'friday' THEN CURRENT_DATE + ((5 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          WHEN 'saturday' THEN CURRENT_DATE + ((6 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          WHEN 'sunday' THEN CURRENT_DATE + ((7 - EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER + 7) % 7 + v_week * 7) * INTERVAL '1 day'
          ELSE CURRENT_DATE
        END;

        -- Insert session
        INSERT INTO public.class_sessions (
          class_id,
          session_date,
          session_time,
          created_from
        ) VALUES (
          v_class.id,
          v_session_date::DATE,
          v_session_time,
          'enrollment'
        )
        ON CONFLICT (class_id, session_date, session_time) DO NOTHING;

        v_sessions_created := v_sessions_created + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created % class sessions from recurring schedules', v_sessions_created;
END $$;

-- ====================================================================================
-- STEP 3: Create legacy package purchases for each user with memberships
-- ====================================================================================

-- First, add temp column outside of transaction
ALTER TABLE public.class_memberships ADD COLUMN IF NOT EXISTS temp_purchase_id UUID;

DO $$
DECLARE
  v_user RECORD;
  v_purchase_id UUID;
  v_membership_count INTEGER;
  v_admin_id UUID;
BEGIN
  -- Get first admin to use as assigned_by
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no admin exists, use first user
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id
    FROM public.profiles
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Create a package purchase for each user with memberships
  FOR v_user IN
    SELECT DISTINCT user_id
    FROM public.class_memberships
  LOOP
    -- Count how many classes this user is enrolled in
    SELECT COUNT(*) INTO v_membership_count
    FROM public.class_memberships
    WHERE user_id = v_user.user_id;

    -- Create package purchase
    INSERT INTO public.class_package_purchases (
      user_id,
      package_id,
      package_name,
      num_classes,
      amount_paid,
      purchase_date,
      assigned_by,
      notes
    ) VALUES (
      v_user.user_id,
      '00000000-0000-0000-0000-000000000001', -- Legacy package ID
      'Legacy Enrollment',
      v_membership_count * 999, -- Give enough for all future sessions
      0.00,
      (SELECT enrolled_at FROM public.class_memberships WHERE user_id = v_user.user_id ORDER BY enrolled_at ASC LIMIT 1),
      v_admin_id,
      'Migrated from legacy class_memberships table - permanent enrollment'
    )
    RETURNING id INTO v_purchase_id;

    -- Store purchase_id in temp column
    UPDATE public.class_memberships
    SET temp_purchase_id = v_purchase_id
    WHERE user_id = v_user.user_id;
  END LOOP;

  RAISE NOTICE 'Created legacy package purchases for users with memberships';
END $$;

-- ====================================================================================
-- STEP 4: Create enrollments from memberships to all future sessions
-- ====================================================================================

DO $$
DECLARE
  v_membership RECORD;
  v_session RECORD;
  v_enrollments_created INTEGER := 0;
BEGIN
  -- For each existing membership, enroll them in all future sessions of that class
  FOR v_membership IN
    SELECT * FROM public.class_memberships
  LOOP
    -- Enroll user in all future sessions of this class (up to 1 year out)
    FOR v_session IN
      SELECT id, session_date, session_time
      FROM public.class_sessions
      WHERE class_id = v_membership.class_id
      AND session_date >= CURRENT_DATE
      AND session_date <= CURRENT_DATE + INTERVAL '1 year'
      ORDER BY session_date, session_time
    LOOP
      INSERT INTO public.class_enrollments (
        user_id,
        class_session_id,
        package_purchase_id,
        enrolled_at,
        checked_in
      ) VALUES (
        v_membership.user_id,
        v_session.id,
        v_membership.temp_purchase_id,
        v_membership.enrolled_at,
        false
      )
      ON CONFLICT (user_id, class_session_id) DO NOTHING;

      v_enrollments_created := v_enrollments_created + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created % class enrollments from legacy memberships', v_enrollments_created;
END $$;

-- ====================================================================================
-- STEP 5: Match existing check-ins to sessions
-- ====================================================================================

DO $$
DECLARE
  v_checkin RECORD;
  v_session_id UUID;
  v_enrollment_id UUID;
  v_class RECORD;
  v_checkin_date DATE;
  v_checkin_time TIME;
  v_session_time TIME;
  v_matched INTEGER := 0;
  v_unmatched INTEGER := 0;
BEGIN
  -- Update existing check-ins to link them to sessions and enrollments
  FOR v_checkin IN
    SELECT * FROM public.check_ins
    WHERE class_session_id IS NULL -- Only process unlinked check-ins
    AND is_temporary_user = false
    ORDER BY checked_in_at DESC
  LOOP
    -- Get class details
    SELECT * INTO v_class
    FROM public.classes
    WHERE id = v_checkin.class_id;

    v_checkin_date := v_checkin.checked_in_at::DATE;
    v_checkin_time := v_checkin.checked_in_at::TIME;
    v_session_time := COALESCE(v_class.schedule_time::TIME, '18:00'::TIME);

    -- Try to find or create matching session
    -- First, try exact match
    SELECT id INTO v_session_id
    FROM public.class_sessions
    WHERE class_id = v_checkin.class_id
    AND session_date = v_checkin_date
    AND session_time = v_session_time
    LIMIT 1;

    -- If no exact match, try date match with any time
    IF v_session_id IS NULL THEN
      SELECT id INTO v_session_id
      FROM public.class_sessions
      WHERE class_id = v_checkin.class_id
      AND session_date = v_checkin_date
      LIMIT 1;
    END IF;

    -- If still no match, create a session for this check-in
    IF v_session_id IS NULL THEN
      INSERT INTO public.class_sessions (
        class_id,
        session_date,
        session_time,
        created_from
      ) VALUES (
        v_checkin.class_id,
        v_checkin_date,
        v_session_time,
        'dropin'
      )
      ON CONFLICT (class_id, session_date, session_time) DO UPDATE
        SET class_id = EXCLUDED.class_id -- No-op to return existing
      RETURNING id INTO v_session_id;
    END IF;

    -- Try to find matching enrollment
    SELECT id INTO v_enrollment_id
    FROM public.class_enrollments
    WHERE user_id = v_checkin.user_id
    AND class_session_id = v_session_id
    LIMIT 1;

    -- Update check-in with session and enrollment
    UPDATE public.check_ins
    SET
      class_session_id = v_session_id,
      enrollment_id = v_enrollment_id,
      payment_method = CASE WHEN v_enrollment_id IS NOT NULL THEN 'package' ELSE 'credit' END,
      payment_status = 'paid' -- Legacy check-ins assumed paid
    WHERE id = v_checkin.id;

    -- If enrollment exists, mark it as checked in
    IF v_enrollment_id IS NOT NULL THEN
      UPDATE public.class_enrollments
      SET checked_in = true
      WHERE id = v_enrollment_id;

      v_matched := v_matched + 1;
    ELSE
      v_unmatched := v_unmatched + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Matched % check-ins to enrollments, % were drop-ins', v_matched, v_unmatched;
END $$;

-- ====================================================================================
-- STEP 6: Clean up temporary columns
-- ====================================================================================

ALTER TABLE public.class_memberships DROP COLUMN IF EXISTS temp_purchase_id;

-- ====================================================================================
-- STEP 7: Create default class packages for the system
-- ====================================================================================

-- Insert some common class package options
DO $$
BEGIN
  INSERT INTO public.class_packages (name, description, num_classes, price, active) VALUES
    ('Single Class', 'Try us out with a single class', 1, 60.00, true),
    ('5 Class Package', '5 classes to use over time', 5, 250.00, true),
    ('10 Class Package', '10 classes with better value', 10, 450.00, true),
    ('20 Class Package', 'Best value for committed students', 20, 800.00, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created default class packages';
END $$;

-- ====================================================================================
-- STEP 8: Create default drop-in credit packages
-- ====================================================================================

DO $$
BEGIN
  INSERT INTO public.drop_in_credit_packages (
    name,
    description,
    num_credits,
    price,
    payment_type,
    payment_value,
    active
  ) VALUES
    ('5 Drop-in Credits', 'Flexible credits for any class', 5, 275.00, 'percentage', 70.00, true),
    ('10 Drop-in Credits', 'Best value for flexible scheduling', 10, 500.00, 'percentage', 70.00, true),
    ('20 Drop-in Credits', 'Maximum flexibility', 20, 900.00, 'percentage', 70.00, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created default drop-in credit packages';
END $$;

-- ====================================================================================
-- STEP 9: Set default payment values for classes without them
-- ====================================================================================

DO $$
BEGIN
  UPDATE public.classes
  SET
    instructor_payment_type = 'percentage',
    instructor_payment_value = 70.00
  WHERE instructor_payment_type IS NULL;

  RAISE NOTICE 'Set default instructor payment config for all classes';
END $$;

-- ====================================================================================
-- Migration Summary
-- ====================================================================================

DO $$
DECLARE
  v_classes_count INTEGER;
  v_sessions_count INTEGER;
  v_enrollments_count INTEGER;
  v_checkins_count INTEGER;
  v_packages_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_classes_count FROM public.classes;
  SELECT COUNT(*) INTO v_sessions_count FROM public.class_sessions;
  SELECT COUNT(*) INTO v_enrollments_count FROM public.class_enrollments;
  SELECT COUNT(*) INTO v_checkins_count FROM public.check_ins WHERE class_session_id IS NOT NULL;
  SELECT COUNT(*) INTO v_packages_count FROM public.class_packages WHERE active = true;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'DATA MIGRATION COMPLETE';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Classes: %', v_classes_count;
  RAISE NOTICE 'Sessions created: %', v_sessions_count;
  RAISE NOTICE 'Enrollments created: %', v_enrollments_count;
  RAISE NOTICE 'Check-ins linked: %', v_checkins_count;
  RAISE NOTICE 'Active packages: %', v_packages_count;
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: The old class_memberships table is still intact.';
  RAISE NOTICE 'You can drop it once you verify the migration was successful:';
  RAISE NOTICE '  DROP TABLE public.class_memberships CASCADE;';
  RAISE NOTICE '';
END $$;
