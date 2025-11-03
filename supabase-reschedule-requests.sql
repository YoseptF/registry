-- Drop existing table and policies
DROP TABLE IF EXISTS public.reschedule_requests CASCADE;

-- Create reschedule_requests table
CREATE TABLE public.reschedule_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.class_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  requested_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own reschedule requests
CREATE POLICY "Users can view own reschedule requests"
ON public.reschedule_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own reschedule requests
CREATE POLICY "Users can create own reschedule requests"
ON public.reschedule_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own pending reschedule requests (to cancel them)
CREATE POLICY "Users can update own pending requests"
ON public.reschedule_requests
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can view all reschedule requests
CREATE POLICY "Admins can view all reschedule requests"
ON public.reschedule_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can update all reschedule requests
CREATE POLICY "Admins can update all reschedule requests"
ON public.reschedule_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_user_id ON public.reschedule_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON public.reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_enrollment_id ON public.reschedule_requests(enrollment_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_reschedule_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reschedule_requests_updated_at
BEFORE UPDATE ON public.reschedule_requests
FOR EACH ROW
EXECUTE FUNCTION update_reschedule_requests_updated_at();

COMMENT ON TABLE public.reschedule_requests IS 'Reschedule requests for class enrollments';
COMMENT ON COLUMN public.reschedule_requests.enrollment_id IS 'The enrollment being rescheduled';
COMMENT ON COLUMN public.reschedule_requests.current_session_id IS 'The current class session';
COMMENT ON COLUMN public.reschedule_requests.requested_session_id IS 'The requested new class session';
COMMENT ON COLUMN public.reschedule_requests.status IS 'pending, approved, or rejected';
