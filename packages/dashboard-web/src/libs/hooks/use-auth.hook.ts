import { createContext, useContext } from "react";

export interface AuthInfo {
  userId: number;
  username: string;
  role: "admin" | "user";
}

export const AuthContext = createContext<AuthInfo | null>(null);

export function useAuth(): AuthInfo {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
