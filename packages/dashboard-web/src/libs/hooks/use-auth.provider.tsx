import { type ReactNode, useState, useEffect } from "react";
import { useApi } from "./use-api.hook";
import { AuthContext, type AuthInfo } from "./use-auth.hook";

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
