export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          address: string | null
          role: 'admin' | 'instructor' | 'user'
          bio: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          address?: string | null
          role?: 'admin' | 'instructor' | 'user'
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          address?: string | null
          role?: 'admin' | 'instructor' | 'user'
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          id: string
          name: string
          description: string | null
          instructor: string | null
          instructor_id: string | null
          instructor_payment_type: 'flat' | 'percentage'
          instructor_payment_value: number
          schedule: string | null
          banner_url: string | null
          schedule_days: string[] | null
          schedule_time: string | null
          duration_minutes: number | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          instructor?: string | null
          instructor_id?: string | null
          instructor_payment_type?: 'flat' | 'percentage'
          instructor_payment_value?: number
          schedule?: string | null
          banner_url?: string | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          duration_minutes?: number | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          instructor?: string | null
          instructor_id?: string | null
          instructor_payment_type?: 'flat' | 'percentage'
          instructor_payment_value?: number
          schedule?: string | null
          banner_url?: string | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          duration_minutes?: number | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "class_memberships_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "check_ins_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "temporary_users_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          }
        ]
      }
      class_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          num_classes: number
          price: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          num_classes: number
          price: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          num_classes?: number
          price?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      drop_in_credit_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          num_credits: number
          price: number
          payment_type: string
          payment_value: number | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          num_credits: number
          price: number
          payment_type?: string
          payment_value?: number | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          num_credits?: number
          price?: number
          payment_type?: string
          payment_value?: number | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_package_purchases: {
        Row: {
          id: string
          user_id: string
          package_id: string
          package_name: string
          num_classes: number
          amount_paid: number
          purchase_date: string
          assigned_by: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          package_name: string
          num_classes: number
          amount_paid: number
          purchase_date?: string
          assigned_by: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string
          package_name?: string
          num_classes?: number
          amount_paid?: number
          purchase_date?: string
          assigned_by?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_package_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "class_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_package_purchases_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      drop_in_credit_purchases: {
        Row: {
          id: string
          user_id: string
          package_id: string
          package_name: string
          credits_total: number
          credits_remaining: number
          amount_paid: number
          purchase_date: string
          assigned_by: string
          payment_type: string
          payment_value: number
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          package_name: string
          credits_total: number
          credits_remaining: number
          amount_paid: number
          purchase_date?: string
          assigned_by: string
          payment_type: string
          payment_value: number
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string
          package_name?: string
          credits_total?: number
          credits_remaining?: number
          amount_paid?: number
          purchase_date?: string
          assigned_by?: string
          payment_type?: string
          payment_value?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drop_in_credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_in_credit_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "drop_in_credit_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_in_credit_purchases_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      class_sessions: {
        Row: {
          id: string
          class_id: string
          session_date: string
          session_time: string
          created_from: string
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          session_date: string
          session_time: string
          created_from?: string
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          session_date?: string
          session_time?: string
          created_from?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          }
        ]
      }
      class_enrollments: {
        Row: {
          id: string
          user_id: string
          class_session_id: string
          package_purchase_id: string | null
          credit_purchase_id: string | null
          checked_in: boolean
          enrolled_at: string
          reschedule_requested_at: string | null
          reschedule_approved_at: string | null
          reschedule_approved_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          class_session_id: string
          package_purchase_id?: string | null
          credit_purchase_id?: string | null
          checked_in?: boolean
          enrolled_at?: string
          reschedule_requested_at?: string | null
          reschedule_approved_at?: string | null
          reschedule_approved_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          class_session_id?: string
          package_purchase_id?: string | null
          credit_purchase_id?: string | null
          checked_in?: boolean
          enrolled_at?: string
          reschedule_requested_at?: string | null
          reschedule_approved_at?: string | null
          reschedule_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      reschedule_requests: {
        Row: {
          id: string
          enrollment_id: string
          user_id: string
          current_session_id: string
          requested_session_id: string
          reason: string | null
          status: string
          admin_notes: string | null
          processed_by: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enrollment_id: string
          user_id: string
          current_session_id: string
          requested_session_id: string
          reason?: string | null
          status?: string
          admin_notes?: string | null
          processed_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enrollment_id?: string
          user_id?: string
          current_session_id?: string
          requested_session_id?: string
          reason?: string | null
          status?: string
          admin_notes?: string | null
          processed_by?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_requests_current_session_id_fkey"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_requests_requested_session_id_fkey"
            columns: ["requested_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      use_drop_in_credit: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
