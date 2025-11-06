import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

/**
 * Fetches all instructors and admins ordered by name
 *
 * @returns Array of users with instructor or admin role
 * @throws Error if the database query fails
 */
export async function fetchInstructors(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, avatar_url, created_at')
    .in('role', ['instructor', 'admin'])
    .order('name')
    .returns<User[]>()

  if (error) throw error
  return data || []
}
