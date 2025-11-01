export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  role: 'admin' | 'user'
  avatar_url?: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  description?: string | null
  instructor?: string | null
  schedule?: string | null
  banner_url?: string | null
  schedule_days?: string[] | null
  schedule_time?: string | null
  duration_minutes?: number | null
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
  checked_in_at: string
  is_temporary_user: boolean
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
  role: 'admin' | 'user'
}
