import { apiFetch } from "./client";

export type MessageRecipientRole = "admin" | "coordinator";

export interface MessageParty {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Message {
  id: number;
  thread_id: number;
  sender_id: number;
  sender_name?: string;
  sender_role?: string;
  recipient_role: MessageRecipientRole;
  recipient_id?: number;
  recipient_name?: string;
  body: string;
  read_at?: string;
  created_at: string;
}

export interface ThreadSummary {
  thread_id: number;
  recipient_role: MessageRecipientRole;
  recipient_id?: number;
  recipient_name?: string;
  other?: MessageParty;
  last_message: Message;
  unread_count: number;
}

export function listThreads(): Promise<{ items: ThreadSummary[] }> {
  return apiFetch(`/messages/threads`);
}

export function getThread(id: number): Promise<{ items: Message[] }> {
  return apiFetch(`/messages/threads/${id}`);
}

export interface CreateMessagePayload {
  recipient_role?: MessageRecipientRole;
  body: string;
  thread_id?: number;
}

export function createMessage(payload: CreateMessagePayload): Promise<Message> {
  return apiFetch(`/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function markThreadRead(id: number): Promise<{ status: string }> {
  return apiFetch(`/messages/threads/${id}/read`, { method: "POST" });
}
