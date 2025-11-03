import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User as AppUser } from '@/types'

interface AuthContextType {
  user: User | null
  profile: AppUser | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run auth initialization on mount
  }, [])

  const fetchProfile = async (userId: string, shouldSetLoading = true) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!data) {
        setProfile(null)
        return
      }

      if (!data.avatar_url && user?.user_metadata?.avatar_url) {
        const googleAvatarUrl = user.user_metadata.avatar_url
        await supabase
          .from('profiles')
          .update({ avatar_url: googleAvatarUrl })
          .eq('id', userId)
        data.avatar_url = googleAvatarUrl
      }

      setProfile(data as AppUser)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      if (shouldSetLoading) {
        setLoading(false)
      }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, false)
    }
  }

  const signOut = async () => {
    const currentSession = await supabase.auth.getSession()
    console.debug('Current session before logout:', currentSession)

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.error('Supabase signOut error:', error)
        if (error.message.includes('403') || error.status === 403) {
          console.debug('Session already invalid on server, clearing locally')
        }
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }

    setUser(null)
    setProfile(null)
    setSession(null)

    localStorage.removeItem('supabase.auth.token')
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- useAuth hook needs to be co-located with AuthProvider
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
