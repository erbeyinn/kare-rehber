import { apiFetch } from './client'

export interface OverdueCoach {
  id: number
  first_name: string
  last_name: string
  phone: string
  student_count: number
  last_meeting_at?: string | null
  days_overdue: number
}

export interface OverdueCoachesResponse {
  items: OverdueCoach[]
  days: number
}

export function listOverdueCoaches(days: number): Promise<OverdueCoachesResponse> {
  const qs = days > 0 ? `?days=${days}` : ''
  return apiFetch(`/reports/overdue-coaches${qs}`)
}

export interface Overview {
  students_total: number
  students_active: number
  students_inactive: number
  coaches_total: number
  coaches_active: number
  coaches_inactive: number
  coordinators_total: number
  admins_total: number
  meetings_this_week: number
  pending_approvals: number
}

export function getOverview(): Promise<Overview> {
  return apiFetch('/reports/overview')
}

export interface StudentStat {
  id: number
  first_name: string
  last_name: string
  city?: string | null
  is_active: boolean
  meeting_count: number
  last_meeting_at?: string | null
  coach_id?: number | null
  coach_name?: string | null
}

export interface StudentStatsResponse {
  items: StudentStat[]
}

export function listStudentStats(params: { city?: string; coachId?: number }): Promise<StudentStatsResponse> {
  const qs = new URLSearchParams()
  if (params.city) qs.set('city', params.city)
  if (params.coachId) qs.set('coach_id', String(params.coachId))
  const tail = qs.toString()
  return apiFetch(`/reports/students${tail ? `?${tail}` : ''}`)
}

export interface CoachStat {
  id: number
  first_name: string
  last_name: string
  is_active: boolean
  student_count: number
  meetings_total: number
  last_30_days: number
  last_meeting_at?: string | null
}

export interface CoachStatsResponse {
  items: CoachStat[]
}

export function listCoachStats(): Promise<CoachStatsResponse> {
  return apiFetch('/reports/coaches')
}

export interface CityStat {
  city: string
  student_count: number
  coach_count: number
}

export interface CityStatsResponse {
  items: CityStat[]
}

export function listCityStats(): Promise<CityStatsResponse> {
  return apiFetch('/reports/cities')
}

export interface DailyPoint {
  day: string
  count: number
}

export interface MeetingStatsResponse {
  from: string
  to: string
  total: number
  daily: DailyPoint[]
  status_counts: Record<string, number>
}

export function getMeetingStats(from: string, to: string): Promise<MeetingStatsResponse> {
  const qs = new URLSearchParams({ from, to })
  return apiFetch(`/reports/meetings?${qs.toString()}`)
}

export interface MissingMeeting {
  id: number
  first_name: string
  last_name: string
  city?: string | null
  coach_id?: number | null
  coach_name?: string | null
  last_meeting_at?: string | null
  days_overdue: number
}

export interface MissingMeetingsResponse {
  items: MissingMeeting[]
  days: number
}

export function listMissingMeetings(days: number): Promise<MissingMeetingsResponse> {
  const qs = days > 0 ? `?days=${days}` : ''
  return apiFetch(`/reports/missing-meetings${qs}`)
}
