import { apiFetch } from './client'

export type MeetingStatus = 'draft' | 'pending' | 'approved'

export interface MeetingParty {
  id: number
  first_name: string
  last_name: string
}

export interface Meeting {
  id: number
  status: MeetingStatus
  meeting_date: string
  content: string
  evaluation: string
  student?: MeetingParty
  coach?: MeetingParty
  created_at: string
  updated_at: string
}

export type AdminMeetingFilter = 'pending' | 'all' | 'draft' | 'approved'

export function listMeetings(filter: AdminMeetingFilter): Promise<{ items: Meeting[] }> {
  const qs = filter && filter !== 'all' ? `?status=${filter}` : ''
  return apiFetch(`/meetings${qs}`)
}

export function getMeeting(id: number): Promise<Meeting> {
  return apiFetch(`/meetings/${id}`)
}

export interface AdminMeetingUpdate {
  meeting_date?: string
  content?: string
  evaluation?: string
  status?: MeetingStatus
}

export function updateMeeting(id: number, payload: AdminMeetingUpdate): Promise<Meeting> {
  return apiFetch(`/meetings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function approveMeeting(id: number): Promise<Meeting> {
  return apiFetch(`/meetings/${id}/approve`, { method: 'POST' })
}
