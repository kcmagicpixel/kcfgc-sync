import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router";

export function useApi() {
  const navigate = useNavigate();
  const location = useLocation();

  const apiFetch = useCallback(
    async (input: string | URL | Request, init?: RequestInit) => {
      const res = await fetch(input, init);
      if (res.status === 401) {
        navigate("/login", { state: { from: location.pathname }, replace: true });
      }
      return res;
    },
    [navigate, location.pathname],
  );

  return apiFetch;
}
