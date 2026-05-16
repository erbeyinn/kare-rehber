import { apiFetch } from './client'

export type SMSRole = 'admin' | 'coordinator' | 'coach' | 'student' | 'parent'

export interface SMSRecipient {
  id: number
  first_name: string
  last_name: string
  phone: string
}

export interface BulkSendFailure {
  user_id: number
  phone?: string
  error: string
}

export interface BulkSendResult {
  sent: number
  failed: number
  failures?: BulkSendFailure[]
}

export interface SMSLog {
  id: number
  user_id?: number
  phone: string
  body: string
  status: string
  sent_at: string
}

export function sendIndividualSMS(userID: number, body: string): Promise<{ status: string }> {
  return apiFetch(`/sms/individual`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userID, body }),
  })
}

export function sendBulkSMS(userIDs: number[], body: string): Promise<BulkSendResult> {
  return apiFetch(`/sms/bulk`, {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIDs, body }),
  })
}

export function sendOverdueCoachesSMS(body: string, days?: number): Promise<BulkSendResult> {
  return apiFetch(`/sms/overdue-coaches`, {
    method: 'POST',
    body: JSON.stringify(days != null ? { body, days } : { body }),
  })
}

export interface RecipientsResponse {
  items: SMSRecipient[]
  count: number
}

export function listRecipients(role: SMSRole, city?: string): Promise<RecipientsResponse> {
  const params = new URLSearchParams({ role })
  if (city) params.set('city', city)
  return apiFetch(`/sms/recipients?${params.toString()}`)
}

export function searchUsers(q: string): Promise<{ items: SMSRecipient[] }> {
  return apiFetch(`/sms/users?q=${encodeURIComponent(q)}`)
}

export interface LogsQuery {
  user_id?: number
  from?: string
  to?: string
  limit?: number
}

export function listSMSLogs(q: LogsQuery): Promise<{ items: SMSLog[] }> {
  const params = new URLSearchParams()
  if (q.user_id) params.set('user_id', String(q.user_id))
  if (q.from) params.set('from', q.from)
  if (q.to) params.set('to', q.to)
  if (q.limit) params.set('limit', String(q.limit))
  const qs = params.toString()
  return apiFetch(`/sms/logs${qs ? `?${qs}` : ''}`)
}
