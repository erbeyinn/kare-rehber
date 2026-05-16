import { apiFetch } from './client'

export type Role = 'admin' | 'coordinator' | 'coach' | 'student' | 'parent'

export interface AuthUser {
  id: number
  role: Role
  first_name: string
  last_name: string
  phone: string
  email?: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function me(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/me')
}
