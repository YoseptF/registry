export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  role: 'admin' | 'instructor' | 'user'
  bio?: string | null
  avatar_url?: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  description?: string | null
  instructor?: string | null
  instructor_id?: string | null
  schedule?: string | null
  banner_url?: string | null
  schedule_days?: string[] | null
  schedule_time?: string | null
  duration_minutes?: number | null
  instructor_payment_type?: 'flat' | 'percentage'
  instructor_payment_value?: number
  created_by: string
  created_at: string
}

export interface ClassMembership {
  id: string
  class_id: string
  user_id: string
  enrolled_at: string
}

export interface CheckIn {
  id: string
  class_id: string
  user_id?: string | null
  class_session_id?: string | null
  enrollment_id?: string | null
  credit_purchase_id?: string | null
  payment_method?: 'package' | 'credit'
  payment_status?: 'pending' | 'processed' | 'paid'
  instructor_payment_amount?: number | null
  checked_in_at: string
  is_temporary_user: boolean
  profiles?: {
    name: string
    email: string
  } | null
  classes?: {
    name: string
  } | null
}

export interface TemporaryUser {
  id: string
  name: string
  phone?: string | null
  class_id: string
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'instructor' | 'user'
}

export interface ClassSession {
  id: string
  class_id: string
  session_date: string
  session_time: string
  created_from: 'enrollment' | 'dropin' | 'manual'
  created_at: string
}

export interface ClassPackage {
  id: string
  name: string
  description?: string | null
  num_classes: number
  price: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ClassPackagePurchase {
  id: string
  user_id: string
  package_id: string
  package_name: string
  num_classes: number
  amount_paid: number
  purchase_date: string
  assigned_by: string
  notes?: string | null
}

export interface ClassEnrollment {
  id: string
  user_id: string
  class_session_id: string
  package_purchase_id: string
  enrolled_at: string
  checked_in: boolean
  reschedule_requested_at?: string | null
  reschedule_approved_at?: string | null
  reschedule_approved_by?: string | null
}

export interface DropInCreditPackage {
  id: string
  name: string
  description?: string | null
  num_credits: number
  price: number
  payment_type: 'flat' | 'percentage'
  payment_value?: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface DropInCreditPurchase {
  id: string
  user_id: string
  package_id: string
  package_name: string
  credits_total: number
  credits_remaining: number
  amount_paid: number
  purchase_date: string
  assigned_by: string
  payment_type: 'flat' | 'percentage'
  payment_value: number
  notes?: string | null
}

export interface InstructorPayment {
  id: string
  instructor_id: string
  week_start: string
  week_end: string
  total_amount: number
  status: 'pending' | 'approved' | 'paid'
  check_in_ids: string[]
  created_at: string
  approved_at?: string | null
  approved_by?: string | null
  paid_at?: string | null
  notes?: string | null
}

export interface InstructorPaymentConfig {
  instructor_id: string
  payment_day_of_week: number
  custom_notes?: string | null
  updated_at: string
}

export interface RescheduleRequest {
  id: string
  enrollment_id: string
  user_id: string
  current_session_id: string
  requested_session_id: string
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string | null
  processed_by?: string | null
  processed_at?: string | null
  created_at: string
  updated_at: string
}

export interface UserEnrollmentWithDetails {
  enrollment_id: string
  user_id: string
  checked_in: boolean
  enrolled_at: string
  reschedule_requested_at?: string | null
  session_id: string
  session_date: string
  session_time: string
  class_id: string
  class_name: string
  class_description?: string | null
  banner_url?: string | null
  duration_minutes?: number | null
  instructor_id?: string | null
  instructor_name?: string | null
  instructor_avatar?: string | null
  package_name?: string | null
  can_reschedule: boolean
}
