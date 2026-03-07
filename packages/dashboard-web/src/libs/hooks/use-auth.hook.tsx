import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useApi } from "./use-api.hook";

interface AuthInfo {
  userId: number;
  username: string;
  role: "admin" | "user";
}

const AuthContext = createContext<AuthInfo | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const apiFetch = useApi();
  const [auth, setAuth] = useState<AuthInfo | null>(null);

  useEffect(() => {
    apiFetch("/api/auth/me").then(async (res) => {
      if (res.ok) setAuth(await res.json());
    });
  }, [apiFetch]);

  if (!auth) return null;
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthInfo {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
