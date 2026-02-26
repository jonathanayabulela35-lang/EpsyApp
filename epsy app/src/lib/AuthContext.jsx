import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { base44 } from '@/api/base44Client'

const AuthContext = createContext(null)

// This app previously relied on Base44's hosted login.
// With Supabase, we manage auth locally and show a login UI when needed.

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function hydrate() {
      try {
        setIsLoadingAuth(true)
        setAuthError(null)

        const { data } = await supabase.auth.getSession()
        if (!data?.session) {
          if (!mounted) return
          setUser(null)
          setIsAuthenticated(false)
          setIsLoadingAuth(false)
          return
        }

        const me = await base44.auth.me()
        if (!mounted) return
        setUser(me)
        setIsAuthenticated(true)
        setIsLoadingAuth(false)
      } catch (e) {
        if (!mounted) return
        setUser(null)
        setIsAuthenticated(false)
        setIsLoadingAuth(false)
        setAuthError({ type: 'auth_required', message: e?.message || 'Authentication required' })
      }
    }

    hydrate()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (!session) {
        setUser(null)
        setIsAuthenticated(false)
        setAuthError({ type: 'auth_required', message: 'Authentication required' })
        return
      }
      try {
        const me = await base44.auth.me()
        if (!mounted) return
        setUser(me)
        setIsAuthenticated(true)
        setAuthError(null)
      } catch (e) {
        if (!mounted) return
        setUser(null)
        setIsAuthenticated(false)
        setAuthError({ type: 'auth_required', message: e?.message || 'Authentication required' })
      }
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout: (shouldRedirect = false) => base44.auth.logout(shouldRedirect ? window.location.origin : undefined),
      navigateToLogin: () => base44.auth.redirectToLogin(window.location.href),
    }),
    [user, isAuthenticated, isLoadingAuth, authError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
