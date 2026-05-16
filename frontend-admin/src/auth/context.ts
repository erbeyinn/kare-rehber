import { createContext } from 'react'

import type { AuthUser } from '@/api/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthCtxValue {
  status: AuthStatus
  user: AuthUser | null
  signIn: (token: string, user: AuthUser) => void
  signOut: () => void
}

export const AuthCtx = createContext<AuthCtxValue | null>(null)
