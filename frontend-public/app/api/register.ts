import { apiFetch } from "./client";

export interface StudentRegisterPayload {
  first_name: string;
  last_name: string;
  phone: string;
  birthdate: string;
  school?: string;
  grade?: string;
  city?: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_phone: string;
  parent_birthdate: string;
}

export interface CoachRegisterPayload {
  first_name: string;
  last_name: string;
  phone: string;
  birthdate: string;
  email?: string;
  specialty?: string;
}

export function registerStudent(payload: StudentRegisterPayload) {
  return apiFetch<{ student_id: number; parent_id: number; status: string }>(
    "/register/student",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function registerCoach(payload: CoachRegisterPayload) {
  return apiFetch<{ coach_id: number; status: string }>("/register/coach", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
