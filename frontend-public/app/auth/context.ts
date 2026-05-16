import { createContext } from "react";

import type { AuthUser, Role } from "~/api/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthCtxValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
}

export const AuthCtx = createContext<AuthCtxValue | null>(null);

export const ROLE_HOME: Record<Role, string> = {
  admin: "/login",
  coordinator: "/koordinator",
  coach: "/koc",
  student: "/ogrenci",
  parent: "/veli",
};
