import { apiFetch } from './client'

export type MatchType = 'coach' | 'coordinator'

export interface MatchTarget {
  id: number
  first_name: string
  last_name: string
  phone: string
  city?: string
  specialty?: string
}

export interface MatchedTargetMini {
  id: number
  first_name: string
  last_name: string
}

export interface MatchingStudent {
  id: number
  first_name: string
  last_name: string
  city?: string
  school?: string
  grade?: string
  coach?: MatchedTargetMini
  coordinator?: MatchedTargetMini
}

export interface ListStudentsQuery {
  city?: string
  type?: MatchType
  unmatched?: boolean
}

export function listMatchingStudents(q: ListStudentsQuery): Promise<{ items: MatchingStudent[] }> {
  const params = new URLSearchParams()
  if (q.city) params.set('city', q.city)
  if (q.type) params.set('type', q.type)
  if (q.unmatched) params.set('unmatched', 'true')
  const qs = params.toString()
  return apiFetch(`/matching/students${qs ? `?${qs}` : ''}`)
}

export function listMatchingCities(): Promise<{ items: string[] }> {
  return apiFetch(`/matching/cities`)
}

export function listMatchingCoaches(): Promise<{ items: MatchTarget[] }> {
  return apiFetch(`/matching/coaches`)
}

export function listMatchingCoordinators(): Promise<{ items: MatchTarget[] }> {
  return apiFetch(`/matching/coordinators`)
}

export interface BulkMatchPayload {
  student_ids: number[]
  target_id: number
  type: MatchType
}

export function bulkMatch(payload: BulkMatchPayload): Promise<{ count: number }> {
  return apiFetch(`/matching/bulk`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function unmatch(studentID: number, type: MatchType): Promise<{ status: string }> {
  return apiFetch(`/matching/${studentID}?type=${type}`, { method: 'DELETE' })
}
