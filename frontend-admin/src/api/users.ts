import { apiFetch } from './client'

export interface Parent {
  id: number
  first_name: string
  last_name: string
  phone: string
  birthdate: string
  is_active: boolean
}

export interface Student {
  id: number
  first_name: string
  last_name: string
  phone: string
  birthdate: string
  is_active: boolean
  school?: string
  grade?: string
  city?: string
  parent?: Parent
}

export interface Coach {
  id: number
  first_name: string
  last_name: string
  phone: string
  birthdate: string
  email?: string
  is_active: boolean
  is_approved: boolean
  specialty?: string
}

export interface SimpleUser {
  id: number
  first_name: string
  last_name: string
  phone: string
  birthdate: string
  email?: string
  is_active: boolean
}

export type StatusFilter = 'pending' | 'active'

export function listStudents(status?: StatusFilter): Promise<{ items: Student[] }> {
  const qs = status ? `?status=${status}` : ''
  return apiFetch(`/users/students${qs}`)
}

export function getStudent(id: number): Promise<Student> {
  return apiFetch(`/users/students/${id}`)
}

export function approveStudent(id: number): Promise<{ status: string }> {
  return apiFetch(`/users/students/${id}/approve`, { method: 'POST' })
}

export function listCoaches(status?: StatusFilter): Promise<{ items: Coach[] }> {
  const qs = status ? `?status=${status}` : ''
  return apiFetch(`/users/coaches${qs}`)
}

export function getCoach(id: number): Promise<Coach> {
  return apiFetch(`/users/coaches/${id}`)
}

export function approveCoach(id: number): Promise<{ status: string }> {
  return apiFetch(`/users/coaches/${id}/approve`, { method: 'POST' })
}

export function listCoordinators(): Promise<{ items: SimpleUser[] }> {
  return apiFetch(`/users/coordinators`)
}

export interface CoordinatorPayload {
  first_name: string
  last_name: string
  phone: string
  birthdate: string
}

export function createCoordinator(payload: CoordinatorPayload): Promise<SimpleUser> {
  return apiFetch(`/users/coordinators`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCoordinator(id: number, payload: Partial<CoordinatorPayload>): Promise<SimpleUser> {
  return apiFetch(`/users/coordinators/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function listAdmins(): Promise<{ items: SimpleUser[] }> {
  return apiFetch(`/users/admins`)
}

export interface AdminPayload {
  first_name: string
  last_name: string
  phone: string
  birthdate: string
  email: string
  password: string
}

export function createAdmin(payload: AdminPayload): Promise<SimpleUser> {
  return apiFetch(`/users/admins`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdmin(id: number, payload: Partial<AdminPayload>): Promise<SimpleUser> {
  return apiFetch(`/users/admins/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function sendCredentials(id: number): Promise<{ status: string }> {
  return apiFetch(`/users/${id}/send-credentials`, { method: 'POST' })
}
