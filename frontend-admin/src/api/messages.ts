import { apiFetch } from './client'

export type MessageRecipientRole = 'admin' | 'coordinator'

export interface MessageParty {
  id: number
  first_name: string
  last_name: string
}

export interface Message {
  id: number
  thread_id: number
  sender_id: number
  sender_name?: string
  sender_role?: string
  recipient_role: MessageRecipientRole
  recipient_id?: number
  recipient_name?: string
  body: string
  read_at?: string
  created_at: string
}

export interface ThreadSummary {
  thread_id: number
  recipient_role: MessageRecipientRole
  recipient_id?: number
  recipient_name?: string
  other?: MessageParty
  last_message: Message
  unread_count: number
}

export function listThreads(mine?: boolean): Promise<{ items: ThreadSummary[] }> {
  const qs = mine === undefined ? '' : `?mine=${mine}`
  return apiFetch(`/messages/threads${qs}`)
}

export function getThread(id: number): Promise<{ items: Message[] }> {
  return apiFetch(`/messages/threads/${id}`)
}

export function replyToThread(id: number, body: string): Promise<Message> {
  return apiFetch(`/messages/threads/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function markThreadRead(id: number): Promise<{ status: string }> {
  return apiFetch(`/messages/threads/${id}/read`, { method: 'POST' })
}
