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
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
