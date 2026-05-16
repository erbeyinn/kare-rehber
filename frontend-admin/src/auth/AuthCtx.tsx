import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { getToken, setToken } from '@/api/client'
import { me } from '@/api/auth'
import type { AuthUser } from '@/api/auth'

import { AuthCtx } from './context'
import type { AuthStatus } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? 'loading' : 'unauthenticated',
  )
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    me()
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setToken(null)
        setStatus('unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [status])

  const signIn = (token: string, u: AuthUser) => {
    setToken(token)
    setUser(u)
    setStatus('authenticated')
  }

  const signOut = () => {
    setToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }

  return <AuthCtx.Provider value={{ status, user, signIn, signOut }}>{children}</AuthCtx.Provider>
}
