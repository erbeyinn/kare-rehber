import { apiFetch } from "./client";

export type MeetingStatus = "draft" | "pending" | "approved";

export interface MeetingParty {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Meeting {
  id: number;
  status: MeetingStatus;
  meeting_date: string;
  content: string;
  evaluation: string;
  student?: MeetingParty;
  coach?: MeetingParty;
  created_at: string;
  updated_at: string;
}

export interface AssignedStudent {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  school?: string;
  grade?: string;
  city?: string;
}

// --- Coach ------------------------------------------------------------------

export function coachStudents(): Promise<{ items: AssignedStudent[] }> {
  return apiFetch(`/coach/students`);
}

export function coachStudentMeetings(studentId: number): Promise<{ items: Meeting[] }> {
  return apiFetch(`/coach/students/${studentId}/meetings`);
}

export function coachGetMeeting(id: number): Promise<Meeting> {
  return apiFetch(`/coach/meetings/${id}`);
}

export interface CoachCreatePayload {
  student_id: number;
  meeting_date: string;
  content: string;
  evaluation: string;
}

export function coachCreateMeeting(payload: CoachCreatePayload): Promise<Meeting> {
  return apiFetch(`/coach/meetings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface CoachUpdatePayload {
  meeting_date: string;
  content: string;
  evaluation: string;
}

export function coachUpdateMeeting(id: number, payload: CoachUpdatePayload): Promise<Meeting> {
  return apiFetch(`/coach/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function coachSubmitMeeting(id: number): Promise<Meeting> {
  return apiFetch(`/coach/meetings/${id}/submit`, { method: "POST" });
}

// --- Student / Parent / Coordinator -----------------------------------------

export function studentMeetings(): Promise<{ items: Meeting[] }> {
  return apiFetch(`/student/meetings`);
}

export function parentMeetings(): Promise<{ items: Meeting[] }> {
  return apiFetch(`/parent/meetings`);
}

export function coordinatorStudents(): Promise<{ items: AssignedStudent[] }> {
  return apiFetch(`/coordinator/students`);
}

export function coordinatorStudentMeetings(studentId: number): Promise<{ items: Meeting[] }> {
  return apiFetch(`/coordinator/students/${studentId}/meetings`);
}
