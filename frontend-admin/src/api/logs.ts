import { apiFetch } from './client'

export interface LogActor {
  id: number
  first_name: string
  last_name: string
}

export interface AuditLog {
  id: number
  entity_type: string
  entity_id: number
  action: string
  actor?: LogActor | null
  diff: unknown
  created_at: string
}

export interface LogsResponse {
  items: AuditLog[]
}

export interface LogQuery {
  entityType?: string
  entityId?: number
  actorId?: number
  from?: string
  to?: string
  limit?: number
}

export function listLogs(q: LogQuery): Promise<LogsResponse> {
  const qs = new URLSearchParams()
  if (q.entityType) qs.set('entity_type', q.entityType)
  if (q.entityId) qs.set('entity_id', String(q.entityId))
  if (q.actorId) qs.set('actor_id', String(q.actorId))
  if (q.from) qs.set('from', q.from)
  if (q.to) qs.set('to', q.to)
  if (q.limit) qs.set('limit', String(q.limit))
  const tail = qs.toString()
  return apiFetch(`/logs${tail ? `?${tail}` : ''}`)
}
