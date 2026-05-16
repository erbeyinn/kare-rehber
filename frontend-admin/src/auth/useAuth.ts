import { useContext } from 'react'

import { AuthCtx } from './context'
import type { AuthCtxValue } from './context'

export function useAuth(): AuthCtxValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
