import { apiFetch } from "./client";

export interface MatchedUser {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface MyMatches {
  coach?: MatchedUser;
  coordinator?: MatchedUser;
}

export function myMatches(): Promise<MyMatches> {
  return apiFetch<MyMatches>("/me/matches");
}
