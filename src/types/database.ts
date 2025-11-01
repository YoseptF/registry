export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          address: string | null
          role: 'admin' | 'user'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          address?: string | null
          role?: 'admin' | 'user'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          address?: string | null
          role?: 'admin' | 'user'
          avatar_url?: string | null
          created_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          description: string | null
          instructor: string | null
          schedule: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          instructor?: string | null
          schedule?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          instructor?: string | null
          schedule?: string | null
          created_by?: string
          created_at?: string
        }
      }
      class_memberships: {
        Row: {
          id: string
          class_id: string
          user_id: string
          enrolled_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          enrolled_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          user_id?: string
          enrolled_at?: string
        }
      }
      check_ins: {
        Row: {
          id: string
          class_id: string
          user_id: string | null
          checked_in_at: string
          is_temporary_user: boolean
        }
        Insert: {
          id?: string
          class_id: string
          user_id?: string | null
          checked_in_at?: string
          is_temporary_user?: boolean
        }
        Update: {
          id?: string
          class_id?: string
          user_id?: string | null
          checked_in_at?: string
          is_temporary_user?: boolean
        }
      }
      temporary_users: {
        Row: {
          id: string
          name: string
          phone: string | null
          class_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          class_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          class_id?: string
          created_at?: string
        }
      }
    }
  }
}
